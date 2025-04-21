from fastapi import FastAPI, UploadFile, File, Request as FastAPIRequest
from google.auth.transport.requests import Request as GoogleAuthRequest
from transformers import XLMRobertaForSequenceClassification, XLMRobertaTokenizer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google.oauth2 import service_account
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
import base64
import json
import os
import requests
import whisper
import tempfile
import sys
from pydub import AudioSegment
import nltk
import vertexai
from vertexai.generative_models import GenerativeModel, SafetySetting
from googleapiclient import discovery
import shutil
from run_pipeline import run_pipeline_main
import inspect


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 测试时允许所有源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def print_routes():
    print("✅ Registered routes:")
    for route in app.routes:
        print(f"→ {route.path} [{route.methods}] -> {inspect.getsourcefile(route.endpoint)}")

#转录音频文件为文本
whisper_model= whisper.load_model("base")  # 加载 Whisper 模型一次即可
print("🧠 Whisper 模型已加载")  # ✅ 这句能否输出


@app.post("/analyze/Whisper")
async def analyze_whisper(file: UploadFile = File(...)):
    # 将上传的音频保存到临时文件
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        print("🎧 开始调用 Whisper 转写...")
        result = whisper_model.transcribe(tmp_path)
        transcript = result["text"]

        result = await analyze_text(transcript)

        return {
            "transcript": transcript,
            **result  # 返回 label / perspective_summary / sentence_analysis
        }

    except Exception as e:
        print("❌ Whisper 转写失败：", str(e))  # ✅ 打印错误
        return { "error": str(e) }



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


nltk.download('punkt')
nltk.download('punkt_tab')  # 👈 就是这个

# Google Cloud Service Account 配置
SERVICE_ACCOUNT_FILE = "thermal-origin-454105-s5-c6291f413f44.json"
SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]

credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES
)
credentials.refresh(GoogleAuthRequest())
access_token = credentials.token

# Vertex AI Gemini 模型设置
vertexai.init(
    project="thermal-origin-454105",
    location="us-central1",
    api_endpoint="us-central1-aiplatform.googleapis.com"
)

gemini_model = GenerativeModel(
    model_name="projects/829020429280/locations/us-central1/endpoints/6002987141494210560"
)
chat = gemini_model.start_chat()

# Perspective API 设置
API_KEY = "AIzaSyDGwQzJDQe_lJv7YnhnM3JFjQDA0HRZUf8"
perspective_client = discovery.build(
    "commentanalyzer",
    "v1alpha1",
    developerKey=API_KEY,
    discoveryServiceUrl="https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1",
    static_discovery=False,
)

# 🔍 拆句 + Gemini + Perspective 分析
async def analyze_text(text):
    sentences = nltk.sent_tokenize(text)
    prompt_suffix = "\n\nPlease determine whether this sentence is toxic; if it is, output 'toxic', if it is not, output 'non-toxic':\n\n"
    sentence_analysis = []
    is_toxic = False

    # 整体 Perspective API 分析
    perspective_summary = perspective_client.comments().analyze(
        body={
            "comment": {"text": text},
            "requestedAttributes": {
                "TOXICITY": {},
                "SEVERE_TOXICITY": {},
                "INSULT": {},
                "PROFANITY": {},
                "THREAT": {},
                "IDENTITY_ATTACK": {}
            }
        }
    ).execute().get("attributeScores", {})

    for sentence in sentences:
        # Gemini 回答是否 toxic
        try:
            gemini_reply = chat.send_message(sentence + prompt_suffix)
            gemini_label = gemini_reply.text.strip().lower()
        except Exception:
            gemini_label = "unknown"

        if gemini_label == "toxic":
            is_toxic = True

        # Perspective 分析单句
        try:
            toxicity_scores = perspective_client.comments().analyze(
                body={
                    "comment": {"text": sentence},
                    "requestedAttributes": {
                        "TOXICITY": {},
                        "SEVERE_TOXICITY": {},
                        "INSULT": {},
                        "PROFANITY": {},
                        "THREAT": {},
                        "IDENTITY_ATTACK": {}
                    }
                }
            ).execute().get("attributeScores", {})
        except:
            toxicity_scores = {}

        sentence_analysis.append({
            "sentence": sentence,
            "gemini_label": gemini_label,
            "toxicity_scores": toxicity_scores
        })

    return {
        "label": "toxic" if is_toxic else "non-toxic",
        "perspective_summary": perspective_summary,
        "sentence_analysis": sentence_analysis
    }

# === HuggingFace Text Classification Setup ===
# 加载 fine-tuned 模型和 tokenizer（只需加载一次）
classification_model= XLMRobertaForSequenceClassification.from_pretrained("momoali23/finetuned-xlm-r-tweeteval-hate")
tokenizer = XLMRobertaTokenizer.from_pretrained("momoali23/finetuned-xlm-r-tweeteval-hate")

@app.post("/analyze/fine-tuned")
async def analyze_custom_model(request: FastAPIRequest):
    data = await request.json()
    text = data.get("text", "")

    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = classification_model(**inputs)
        prediction = torch.argmax(outputs.logits, dim=1).item()
        score = torch.softmax(outputs.logits, dim=1).max().item()

    label_map = {
        0: "✅ Normal",
        1: "🚨 Hate Speech"
    }

    return {
        "label": label_map[prediction],
    }

# === HuggingFace Video Setup ===
model_path = "./classifier_trained"  # 本地路径，确保文件夹存在
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModelForSequenceClassification.from_pretrained(model_path)

classifier = pipeline("text-classification", model=model, tokenizer=tokenizer)


@app.post("/analyze/video")
async def analyze_video_fastapi(file: UploadFile = File(...)):
    video_path = "uploaded_video.mp4"
    output_dir = "outputs/video_analysis"

    # 保存上传的视频
    with open(video_path, "wb") as f:
        f.write(await file.read())

    # 执行分析流程（比如 Whisper + OCR + 分类器）
    try:
        run_pipeline_main(video_path, output_dir)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

   # 加载 prediction.json
    pred_file = os.path.join(output_dir, "prediction.json")
    if not os.path.exists(pred_file):
        return JSONResponse(status_code=500, content={"error": "Prediction result not found"})

    with open(pred_file, "r", encoding="utf-8") as f:
        prediction_data = json.load(f)

        # 统计 top label（如 hate_speech/offensive_speech/none）
        label_counts = {"hate_speech": 0, "offensive_speech": 0, "none": 0}
        for p in prediction_data:
            label_counts[p["label"]] += 1
        top_label = max(label_counts.items(), key=lambda x: x[1])[0]

        # 返回文本内容+top label
        return JSONResponse(content={
            "label": top_label,
            "texts": [p["text"] for p in prediction_data]
        })




# run_pipeline.py

import argparse
import os
import json
from modules.video_extractor import process_video
from modules.whisper_transcriber import transcribe_audio
from modules.frame_ocr import ocr_frames

from transformers import BertTokenizer, BertForSequenceClassification
import torch

LABELS = ["hate_speech", "offensive_speech", "none"]
ID2LABEL = {i: label for i, label in enumerate(LABELS)}

def classify_texts(texts, model_path="classifier_trained"):
    tokenizer = BertTokenizer.from_pretrained(model_path)
    model = BertForSequenceClassification.from_pretrained(model_path)
    model.eval()

    predictions = []
    for text in texts:
        inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            pred_label_id = torch.argmax(logits, dim=1).item()
            pred_label = ID2LABEL[pred_label_id]
            predictions.append({
                "text": text,
                "label": pred_label
            })
    return predictions

def main(args=None):
    if args is None:
        parser = argparse.ArgumentParser()
        parser.add_argument("--input", required=True, help="Path to input .mp4 file")
        parser.add_argument("--output", required=True, help="Output directory")
        args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    audio_path, frame_paths = process_video(args.input, args.output)
    print("[✓] 视频处理完成")

    transcript = transcribe_audio(audio_path)
    print("[✓] Whisper 转写完成")

    ocr_results = ocr_frames(frame_paths)
    print("[✓] OCR 图像识别完成")

    all_texts = [transcript] + list(ocr_results.values())
    merged_text_path = os.path.join(args.output, "merged_text.txt")
    with open(merged_text_path, "w", encoding="utf-8") as f:
        f.write("\n\n".join(all_texts))
    print(f"[✓] 合并文字写入：{merged_text_path}")

    prediction = classify_texts(all_texts)
    pred_path = os.path.join(args.output, "prediction.json")
    with open(pred_path, "w", encoding="utf-8") as f:
        json.dump(prediction, f, ensure_ascii=False, indent=2)
    print(f"[✓] 分类结果写入：{pred_path}")

def run_pipeline_main(input_path, output_dir):
    class Args:
        input = input_path
        output = output_dir
    main(Args())
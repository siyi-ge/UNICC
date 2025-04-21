# modules/whisper_transcriber.py

import whisper
import os

def transcribe_audio(audio_path: str, model_size: str = "base") -> str:
    """
    使用 Whisper 将音频转成文字，支持自动语言检测。
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"音频文件不存在: {audio_path}")

    print(f"[INFO] 加载 Whisper 模型（{model_size}）...")
    model = whisper.load_model(model_size)

    print(f"[INFO] 正在识别音频: {audio_path}")
    result = model.transcribe(audio_path)

    print(f"[✓] 识别完成，语言: {result['language']}")
    return result["text"]
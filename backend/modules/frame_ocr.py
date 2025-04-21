import os
import easyocr
from typing import List, Dict

LANG_GROUPS = [
    ["ch_sim", "en"],           # 中文 + 英文
    ["ar", "en"],               # 阿语 + 英文
    ["ru", "en"],               # 俄语 + 英文
    ["en", "fr", "es"]          # 其余联合国语言组合
]

def ocr_frames(frame_paths: List[str]) -> Dict[str, str]:
    print(f"[INFO] OCR 处理中，共 {len(frame_paths)} 张帧图像...")
    results = {}

    for lang_set in LANG_GROUPS:
        print(f"[INFO] 加载 OCR 语言模型: {lang_set}")
        reader = easyocr.Reader(lang_list=lang_set, gpu=False)

        for path in frame_paths:
            if path not in results:  # 避免重复处理
                text_blocks = reader.readtext(path, detail=0)
                results[path] = "\n".join(text_blocks)

    print(f"[✓] 图像文字识别完成")
    return results
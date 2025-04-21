import os
from moviepy.video.io.VideoFileClip import VideoFileClip
import cv2

def extract_audio(video_path, audio_output_path, sample_rate=16000):
    """
    从视频中提取音频，保存为 .wav 格式。
    """
    clip = VideoFileClip(video_path)
    clip.audio.write_audiofile(audio_output_path, fps=sample_rate)
    return audio_output_path

def extract_frames(video_path, frames_output_dir, interval_sec=1):
    """
    每隔 interval_sec 秒提取一帧图像，保存为 jpg 文件。
    默认每 1 秒提取一帧。
    """
    os.makedirs(frames_output_dir, exist_ok=True)

    vidcap = cv2.VideoCapture(video_path)
    fps = vidcap.get(cv2.CAP_PROP_FPS)
    total_frames = int(vidcap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps

    frame_paths = []
    frame_index = 0

    for sec in range(0, int(duration), interval_sec):
        vidcap.set(cv2.CAP_PROP_POS_MSEC, sec * 1000)  # 设置视频到指定秒数
        success, frame = vidcap.read()
        if not success:
            continue
        frame_path = os.path.join(frames_output_dir, f"frame_{frame_index:04d}.jpg")
        cv2.imwrite(frame_path, frame)
        frame_paths.append(frame_path)
        frame_index += 1

    vidcap.release()
    return frame_paths

def process_video(video_path, output_dir, interval_sec=1):
    """
    整合步骤：从视频中提取音频和图像帧，返回文件路径。
    """
    os.makedirs(output_dir, exist_ok=True)
    audio_path = os.path.join(output_dir, "audio.wav")
    frames_dir = os.path.join(output_dir, "frames")

    print(f"[INFO] 正在提取音频...")
    extract_audio(video_path, audio_path)

    print(f"[INFO] 正在提取帧图像，每 {interval_sec} 秒 1 帧...")
    frame_paths = extract_frames(video_path, frames_dir, interval_sec)

    return audio_path, frame_paths
import cv2
from rembg import remove, new_session
from moviepy.editor import VideoFileClip
from PIL import Image
import numpy as np
import onnxruntime as ort
import os

# Setup ONNX runtime with GPU support if available
providers = (
    ["CUDAExecutionProvider"] if ort.get_device() == "GPU" else ["CPUExecutionProvider"]
)
session = new_session("u2net_human_seg", providers=providers)


def process_frame(frame):
    """Process a single frame for background removal."""
    img = Image.fromarray(frame)
    img = remove(img, session=session)  # Use pre-initialized session for efficiency
    return np.array(img)


def process_video(input_video_path, output_dir):
    """Remove background from each frame of the video."""
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    clip = VideoFileClip(input_video_path)
    frame_width, frame_height = clip.size

    # Process each frame
    for i, frame in enumerate(clip.iter_frames()):
        processed_frame = process_frame(frame)
        output_path = os.path.join(output_dir, f"output-{i:03d}.png")
        Image.fromarray(processed_frame).save(output_path)

    print(f"Processed {i + 1} frames and saved to {output_dir}.")


# Usage: Process video and output frames
input_video = "output_video.mp4"
output_directory = "output_frames"
process_video(input_video, output_directory)

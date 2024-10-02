"""
remove_background.py

This script processes a video to remove its background using a pre-trained ONNX model and then interpolates the frames to achieve a target frame count. The processed frames can be saved as individual images or compiled into a video.

Modules and Libraries:
- os: For directory and file operations.
- subprocess: For running external commands.
- cv2: OpenCV for image processing.
- numpy: For array operations.
- onnxruntime: For running the ONNX model.
- moviepy.editor: For video processing and creation.
- PIL (Pillow): For image manipulation.
- rembg: For background removal using the ONNX model.

Functions:
- process_frame(frame): Processes a single frame to remove its background.
- process_video(input_video_path, output_dir, output_movie=False, start_frame=0, num_frames=None): Processes a video to remove the background from each frame and optionally creates a movie from the processed frames.
- interpolate_frames(frame_paths, output_dir, target_frame_count): Interpolates frames to achieve the target frame count using the rife-ncnn-vulkan tool.

Usage:
1. Process a video to remove the background and save the frames:
    frame_paths = process_video(input_video, output_directory, output_movie=False, start_frame=0, num_frames=28)

2. Interpolate the processed frames to achieve the target frame count:
    interpolated_dir = interpolate_frames(frame_paths, output_directory, target_frame_count=50)

3. Create a movie from the interpolated frames:
    output_movie_path = os.path.join(output_directory, "output_interpolated_movie.mp4")
    image_sequence_clip = ImageSequenceClip(
        [os.path.join(interpolated_dir, f) for f in sorted(os.listdir(interpolated_dir))],
        fps=30,
    )
    image_sequence_clip.write_videofile(output_movie_path, codec="libx264")
    print(f"Interpolated movie saved to {output_movie_path}.")

Notes:
- Ensure that the rife-ncnn-vulkan tool is correctly installed and accessible from the script.
- The script assumes that the input video and output directories are correctly specified.
- The script uses GPU support for ONNX runtime if available; otherwise, it defaults to CPU.
"""

import os
import subprocess

import cv2
import numpy as np
import onnxruntime as ort
from moviepy.editor import ImageSequenceClip, VideoFileClip
from PIL import Image
from rembg import new_session, remove

# Setup ONNX runtime with GPU support if available
providers = (
    ["CUDAExecutionProvider"] if ort.get_device() == "GPU" else ["CPUExecutionProvider"]
)
session = new_session()


def process_frame(frame):
    """Process a single frame for background removal."""
    img = Image.fromarray(frame)
    img = remove(img, session=session)  # Use pre-initialized session for efficiency
    return np.array(img)


def process_video(
    input_video_path, output_dir, output_movie=False, start_frame=0, num_frames=None
):
    """Remove background from each frame of the video and optionally create a movie."""
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    clip = VideoFileClip(input_video_path)
    frame_width, frame_height = clip.size
    total_frames = int(clip.fps * clip.duration)

    # If num_frames is not provided, use the total number of frames in the video
    if num_frames is None:
        num_frames = total_frames

    # Calculate end_frame based on num_frames
    end_frame = start_frame + num_frames

    # Ensure end_frame does not exceed total frames
    end_frame = min(end_frame, total_frames)

    # Process each frame
    frame_paths = []
    for i, frame in enumerate(clip.iter_frames()):
        if i < start_frame:
            continue
        if i >= end_frame:
            break
        processed_frame = process_frame(frame)
        output_path = os.path.join(output_dir, f"output-{i:03d}.png")
        Image.fromarray(processed_frame).save(output_path)
        frame_paths.append(output_path)

    print(f"Processed {len(frame_paths)} frames and saved to {output_dir}.")

    if output_movie:
        # Create a movie from the processed frames
        output_movie_path = os.path.join(output_dir, "output_movie.mp4")
        image_sequence_clip = ImageSequenceClip(frame_paths, fps=clip.fps)
        image_sequence_clip.write_videofile(output_movie_path, codec="libx264")
        print(f"Output movie saved to {output_movie_path}.")

    return frame_paths


def interpolate_frames(frame_paths, output_dir, target_frame_count):
    """Interpolate frames to achieve the target frame count using rife-ncnn-vulkan."""
    interpolated_dir = os.path.join(output_dir, "interpolated")
    os.makedirs(interpolated_dir, exist_ok=True)

    # Debugging: List files in the output directory before interpolation
    print(f"Files in output directory before interpolation: {os.listdir(output_dir)}")

    # Ensure all input files are in PNG format and exclude directories and non-PNG files
    for file in os.listdir(output_dir):
        if os.path.isdir(os.path.join(output_dir, file)):
            continue
        if not file.endswith(".png"):
            print(f"Ignoring non-PNG file: {file}")
            continue

    # Run rife-ncnn-vulkan to interpolate frames
    result = subprocess.run(
        [
            "/Users/jespervang/Downloads/rife-ncnn-vulkan-20221029-macos/rife-ncnn-vulkan",
            "-i",
            output_dir,
            "-o",
            interpolated_dir,
            "-n",
            str(target_frame_count),
            "-m",
            "rife-v4",
        ],
        capture_output=True,
        text=True,
    )

    # Debugging: Capture and print the output and error from rife-ncnn-vulkan
    print(f"rife-ncnn-vulkan stdout: {result.stdout}")
    print(f"rife-ncnn-vulkan stderr: {result.stderr}")

    # Debugging: List files in the interpolated directory after interpolation
    interpolated_files = os.listdir(interpolated_dir)
    print(f"Interpolated files: {interpolated_files}")

    return interpolated_dir


# Usage: Process video and output frames, and optionally create a movie
input_video = "py_scripts/360_face.mov"
output_directory = "py_scripts/output_360_face_frames"
frame_paths = process_video(
    input_video,
    output_directory,
    output_movie=False,
    start_frame=0,
)

# Interpolate frames to achieve the target frame count
interpolated_dir = interpolate_frames(
    frame_paths, output_directory, target_frame_count=50
)

# Debugging: Ensure interpolated_dir contains files
if not os.listdir(interpolated_dir):
    raise ValueError(f"No files found in interpolated directory: {interpolated_dir}")

# Create a movie from the interpolated frames
output_movie_path = os.path.join(output_directory, "output_interpolated_movie.mp4")
image_sequence_clip = ImageSequenceClip(
    [os.path.join(interpolated_dir, f) for f in sorted(os.listdir(interpolated_dir))],
    fps=30,
)
image_sequence_clip.write_videofile(output_movie_path, codec="libx264")
print(f"Interpolated movie saved to {output_movie_path}.")

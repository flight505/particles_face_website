import cv2
import os

# Path to your video file
video_path = "your_video.mp4"

# Create a directory to save the frames
output_dir = "frames"
os.makedirs(output_dir, exist_ok=True)

# Capture the video
vidcap = cv2.VideoCapture(video_path)
success, image = vidcap.read()
count = 0

# Extract frames and save them as images
while success:
    frame_path = os.path.join(output_dir, f"frame_{count:05d}.png")
    cv2.imwrite(frame_path, image)  # Save frame as PNG file
    success, image = vidcap.read()
    count += 1

print(f"Extracted {count} frames from {video_path}.")

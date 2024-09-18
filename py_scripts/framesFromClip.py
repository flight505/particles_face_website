import cv2
import os


def extract_frames_from_mov(input_mov_path: str, output_folder: str) -> None:
    # Ensure the output folder exists
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Open the video file
    video_capture = cv2.VideoCapture(input_mov_path)
    if not video_capture.isOpened():
        raise ValueError(f"Error opening video file: {input_mov_path}")

    frame_count = 0
    while True:
        # Read a frame from the video
        ret, frame = video_capture.read()
        if not ret:
            break

        # Save the frame as an image file
        frame_filename = os.path.join(output_folder, f"frame_{frame_count:04d}.jpg")
        cv2.imwrite(frame_filename, frame)
        frame_count += 1

    # Release the video capture object
    video_capture.release()
    print(f"Extracted {frame_count} frames to {output_folder}")


if __name__ == "__main__":
    input_mov_path = (
        "/Users/jespervang/Downloads/left1.mov"  # Replace with your .mov file path
    )
    output_folder = "/Users/jespervang/Downloads/face"  # Replace with your desired output folder path
    extract_frames_from_mov(input_mov_path, output_folder)

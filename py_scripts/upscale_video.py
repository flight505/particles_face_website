import os
import subprocess


def upscale_video(file_path: str):
    """
    Upscale a video using the fx-upscale tool.

    Args:
        file_path (str): The path to the video file.
    """
    command = ["fx-upscale", file_path]

    try:
        subprocess.run(command, check=True)
        print(f"Successfully upscaled {file_path}")
    except subprocess.CalledProcessError as e:
        print(f"Error upscaling {file_path}: {e}")


def process_videos(file_list: list):
    """
    Process a list of video files to upscale them.

    Args:
        file_list (list): List of video file paths.
    """
    for file_path in file_list:
        if os.path.isfile(file_path):
            upscale_video(file_path)
        else:
            print(f"File not found: {file_path}")


if __name__ == "__main__":
    # Example usage
    videos_to_upscale = ["py_scripts/left1.mov", "py_scripts/right1.mov"]
    process_videos(videos_to_upscale)

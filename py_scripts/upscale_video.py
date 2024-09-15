import argparse

import cv2
import numpy as np
import torch
from basicsr.archs.rrdbnet_arch import RRDBNet
from basicsr.utils.download_util import load_file_from_url
from huggingface_hub import hf_hub_download
from PIL import Image
from realesrgan import RealESRGANer


def init_realesrgan_model(model_name, device):
    model = RRDBNet(
        num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4
    )
    netscale = 4
    file_url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"
    model_path = load_file_from_url(
        url=file_url, model_dir="weights", progress=True, file_name=None
    )
    upsampler = RealESRGANer(
        scale=netscale,
        model_path=model_path,
        model=model,
        tile=0,
        tile_pad=10,
        pre_pad=0,
        half=True,
        device=device,
    )
    return upsampler


def process_frame(upsampler, frame):
    frame_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    output, _ = upsampler.enhance(frame_pil, outscale=4)
    return cv2.cvtColor(np.array(output), cv2.COLOR_RGB2BGR)


def upscale_video(input_path, output_path):
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    print(f"Using device: {device}")

    upsampler = init_realesrgan_model("RealESRGAN_x4plus", device)

    cap = cv2.VideoCapture(input_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width * 4, height * 4))

    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        upscaled_frame = process_frame(upsampler, frame)
        out.write(upscaled_frame)

        frame_count += 1
        print(f"Processed frame {frame_count}/{total_frames}")

    cap.release()
    out.release()
    cv2.destroyAllWindows()

    print(f"Upscaled video saved to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Upscale videos using RealESRGAN")
    parser.add_argument("input_video", help="Path to the input video file")
    parser.add_argument("output_video", help="Path to save the upscaled video")
    args = parser.parse_args()

    upscale_video(args.input_video, args.output_video)


if __name__ == "__main__":
    main()

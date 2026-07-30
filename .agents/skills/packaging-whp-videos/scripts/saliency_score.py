#!/usr/bin/env python3
"""
Predict where a viewer's gaze lands on a thumbnail at feed size using DeepGaze IIE
(Linardos et al., ICCV 2021) and write a heatmap overlay.

This predicts GAZE, not clicks — read it as a legibility instrument: attention
should land on the focal subject and the overlay text, not on background texture.

Requires the optional stack (one-time setup, ~2GB with weights):
  pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
  pip install git+https://github.com/matthias-k/DeepGaze.git scipy

Usage:
  python3 saliency_score.py renders/W1_v2.png --out W1_v2_saliency.png
"""
import argparse, os, sys

import numpy as np
from PIL import Image


def load_model():
    try:
        import torch
        import deepgaze_pytorch
    except ImportError as e:
        print(f"MISSING DEPENDENCY: {e.name}.\n\nInstall the saliency stack:\n"
              "  pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu\n"
              "  pip install git+https://github.com/matthias-k/DeepGaze.git scipy\n\n"
              "Evaluation rigor is not budget-capped for this channel: install rather than skip.",
              file=sys.stderr)
        sys.exit(2)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = deepgaze_pytorch.DeepGazeIIE(pretrained=True).to(device).eval()
    return model, torch, device


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image")
    ap.add_argument("--out", help="heatmap overlay path (default <image>_saliency.png)")
    ap.add_argument("--width", type=int, default=640,
                    help="analysis width; keep near feed-render scale (default 640)")
    args = ap.parse_args()

    model, torch, device = load_model()
    img = Image.open(args.image).convert("RGB")
    h = round(args.width * img.height / img.width)
    img_small = img.resize((args.width, h), Image.LANCZOS)
    arr = np.asarray(img_small).astype(np.float32)

    # Uniform centerbias: judge the image's own pull, not the dataset's center prior.
    centerbias = np.zeros((h, args.width), dtype=np.float32)
    image_tensor = torch.tensor(arr.transpose(2, 0, 1)[None], device=device)
    centerbias_tensor = torch.tensor(centerbias[None], device=device)

    with torch.no_grad():
        log_density = model(image_tensor, centerbias_tensor)
    density = np.exp(log_density.cpu().numpy()[0, 0])
    density = (density - density.min()) / (density.max() - density.min() + 1e-12)

    # Red-hot overlay on a dimmed image.
    heat = np.zeros_like(arr)
    heat[..., 0] = density * 255.0
    overlay = np.clip(arr * 0.45 + heat, 0, 255).astype(np.uint8)
    out = args.out or os.path.splitext(args.image)[0] + "_saliency.png"
    Image.fromarray(overlay).save(out)

    # Report the attention centroid and top-decile spread as a compact summary.
    ys, xs = np.mgrid[0:h, 0:args.width]
    cy, cx = float((density * ys).sum() / density.sum()), float((density * xs).sum() / density.sum())
    top = density >= np.quantile(density, 0.9)
    print(f"OK -> {out}")
    print(f"attention centroid: ({cx / args.width:.2f}, {cy / h:.2f}) of frame "
          f"(0,0=top-left); top-decile area: {top.mean() * 100:.1f}% of frame")


if __name__ == "__main__":
    main()

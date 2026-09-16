# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=10", "numpy>=1.26", "scipy>=1.11"]
# ///
"""Clean transparent edges and upscale PNGs, preserving the original drawing.

uv run scripts/clean-sprites.py INPUT_FOLDER OUTPUT_FOLDER --scale 2
Use --scale 1 for game-sized copies. No AI reconstruction or invented detail.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import distance_transform_edt


def clean(image, scale):
    rgba = np.array(image.convert("RGBA"))
    alpha = rgba[:, :, 3]
    if not np.any(alpha >= 240):
        raise ValueError("Image has no opaque artwork to preserve")
    # Extend opaque colors into partially transparent pixels to avoid matte fringes.
    nearest = distance_transform_edt(alpha < 240, return_distances=False, return_indices=True)
    edge = (alpha > 0) & (alpha < 240)
    rgba[edge, :3] = rgba[nearest[0][edge], nearest[1][edge], :3]
    softened = np.array(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(.3)), dtype=float)
    rgba[:, :, 3] = np.clip((softened-6)*255/243, 0, 255).astype("uint8")
    output = Image.fromarray(rgba)
    # Premultiplied alpha avoids black halos when filtering transparent pixels.
    return output.convert("RGBa").resize(
        (image.width*scale, image.height*scale), Image.Resampling.LANCZOS
    ).convert("RGBA")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--scale", type=int, choices=[1, 2, 4], default=2)
    args = parser.parse_args()
    if args.source.resolve() == args.destination.resolve():
        parser.error("Use a different output folder to preserve the originals.")
    files = sorted(p for p in args.source.glob("*.png") if not p.name.startswith("sticker-"))
    if not files:
        parser.error("No character PNGs found in the input folder.")
    args.destination.mkdir(parents=True, exist_ok=True)
    for source in files:
        with Image.open(source) as image:
            result = clean(image, args.scale)
            assert result.size == (image.width*args.scale, image.height*args.scale)
            assert result.getchannel("A").getextrema() == (0, 255), source.name
            result.save(args.destination/source.name, optimize=True)
            with Image.open(args.destination/source.name) as saved:
                assert saved.mode == "RGBA" and saved.size == result.size
    print(f"{len(files)} sprites cleaned at {args.scale}x: {args.destination}")


if __name__ == "__main__":
    main()

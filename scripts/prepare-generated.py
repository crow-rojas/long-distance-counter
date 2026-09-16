# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=10", "numpy>=1.26", "scipy>=1.11"]
# ///
"""Extract this project's Nano Banana JPEGs without modifying the originals.

uv run scripts/prepare-generated.py [SOURCE] [DESTINATION]
Outputs transparent 320px sprite frames/sheets and props up to 900px.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import binary_propagation, binary_erosion, label, distance_transform_edt


def cutout(image, dark=False, ramada=False, bird=False):
    rgb = np.asarray(image.convert("RGB")).astype(int)
    low, high = rgb.min(axis=2), rgb.max(axis=2)
    # ponytail: tuned for these nine JPEGs; new backgrounds need new thresholds.
    background = ((high-low) < 28) & (low > (40 if dark else 140))
    if dark:
        background &= high < 145
    if ramada:
        background |= (low > 125) & (high > 190) & ((high-low) < 115)
    seeds = np.zeros(background.shape, dtype=bool)
    seeds[0, :] = seeds[-1, :] = True
    seeds[:, 0] = seeds[:, -1] = True
    if bird:
        seeds[round(image.height*.65):, :] = True
    if ramada:
        # The checkerboard is also painted inside the enclosed roof and posts.
        for x, y in [(1024, 1100), (1024, 610), (1024, 746), (520, 1050), (1530, 1050)]:
            seeds[y, x] = True
    mask = ~binary_propagation(seeds & background, mask=background)
    components, count = label(mask)
    sizes = np.bincount(components.ravel())
    mask &= sizes[components] > max(80, mask.size*.00012)
    assert count and mask.any(), "No artwork found"
    # Extend interior ink to the edge, then downsample with premultiplied alpha.
    interior = binary_erosion(mask, iterations=2)
    nearest = distance_transform_edt(~interior, return_distances=False, return_indices=True)
    edge = mask & ~interior
    rgb[edge] = rgb[nearest[0][edge], nearest[1][edge]]
    alpha = Image.fromarray((mask*255).astype("uint8")).filter(ImageFilter.GaussianBlur(.65))
    rgba = Image.fromarray(rgb.astype("uint8")).convert("RGBA")
    rgba.putalpha(alpha)
    return rgba.crop(rgba.getbbox())


def resized(image, size):
    return image.convert("RGBa").resize(size, Image.Resampling.LANCZOS).convert("RGBA")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", type=Path, default=Path.home()/"Downloads/Chofis/resultados")
    parser.add_argument("destination", nargs="?", type=Path, default=Path.home()/"Downloads/Chofis/assets/generados")
    args = parser.parse_args()
    if args.source.resolve() == args.destination.resolve():
        parser.error("Use a separate destination to preserve the JPEGs.")
    args.destination.mkdir(parents=True, exist_ok=True)
    sheets = [
        ("chofis-carrera", "chofis-run", 4, [0, 2, 3], 238),
        ("chofis-salto", "chofis-jump", 2, [0, 1], 238),
        ("crow-interaccion", "crow-poses", 3, [0, 1, 2], 288),
        ("marin-school-interaccion", "marin-poses", 3, [0, 1, 2], 300),
        ("marin-devil-interaccion", "marin-devil-poses", 3, [0, 1, 2], 300),
        ("marin-bunny-interaccion", "marin-bunny-poses", 3, [0, 1, 2], 300),
    ]
    files = []
    for source, name, columns, indices, height in sheets:
        image = Image.open(args.source/f"{source}.jpeg")
        frames = [
            cutout(image.crop((round(i*image.width/columns), 0, round((i+1)*image.width/columns), image.height)),
                   dark=source == "marin-school-interaccion", bird=source.startswith("chofis"))
            for i in indices
        ]
        scale = min(height/max(frame.height for frame in frames), 296/max(frame.width for frame in frames))
        sheet = Image.new("RGBA", (320*len(frames), 320))
        for index, frame in enumerate(frames):
            frame = resized(frame, (round(frame.width*scale), round(frame.height*scale)))
            canvas = Image.new("RGBA", (320, 320))
            canvas.alpha_composite(frame, ((320-frame.width)//2, 308-frame.height))
            canvas.save(args.destination/f"{name}-{index}.png", optimize=True)
            sheet.alpha_composite(canvas, (index*320, 0))
        sheet.save(args.destination/f"{name}.png", optimize=True)
        files.append(args.destination/f"{name}.png")
    for source, name in [("ramada-chilena-comida", "ramada"), ("volatin", "volantin"), ("copihue", "copihue")]:
        image = cutout(Image.open(args.source/f"{source}.jpeg"), ramada=name == "ramada")
        scale = min(1, 900/max(image.size))
        image = resized(image, (round(image.width*scale), round(image.height*scale)))
        path = args.destination/f"{name}.png"
        image.save(path, optimize=True)
        files.append(path)
    for path in files:
        with Image.open(path) as image:
            assert image.mode == "RGBA" and image.getchannel("A").getextrema() == (0, 255), path
            if "poses" in path.name or "chofis-" in path.name:
                assert image.height == 320 and image.width % 320 == 0, path
    print(f"{len(files)} sheets/props and individual frames verified in {args.destination}")


if __name__ == "__main__":
    main()

# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=10", "numpy>=1.26", "scipy>=1.11"]
# ///
"""Extract the four v3 world drawings. Originals remain untouched.

uv run scripts/prepare-world.py [SOURCE] [DESTINATION]
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps
from scipy.ndimage import binary_erosion, binary_propagation, distance_transform_edt, label


def cutout(image, mist=False, lantern=False):
    rgb = np.asarray(image.convert("RGB")).astype(float)
    # ponytail: white-matte extraction for these four sheets, not arbitrary backgrounds.
    mask = rgb.min(axis=2) < 235
    if lantern:
        background = rgb.min(axis=2) > 150
        seeds = np.zeros(mask.shape, dtype=bool)
        seeds[0, :] = seeds[-1, :] = seeds[:, 0] = seeds[:, -1] = True
        mask &= ~binary_propagation(seeds & background, mask=background)
    components, _ = label(mask)
    sizes = np.bincount(components.ravel())
    mask &= sizes[components] > 120
    assert mask.any(), "No artwork found"
    if mist:
        mask = binary_erosion(mask)
        alpha = np.clip((245-rgb.min(axis=2))/100, 0, 1)*mask
        rgb = (rgb-255*(1-alpha[..., None]))/np.maximum(alpha[..., None], .001)
    else:
        interior = binary_erosion(mask, iterations=2)
        nearest = distance_transform_edt(~interior, return_distances=False, return_indices=True)
        rgb[mask & ~interior] = rgb[nearest[0][mask & ~interior], nearest[1][mask & ~interior]]
        alpha = np.asarray(Image.fromarray((mask*255).astype("uint8")).filter(ImageFilter.GaussianBlur(.55)))/255
    rgba = Image.fromarray(np.clip(rgb, 0, 255).astype("uint8")).convert("RGBA")
    rgba.putalpha(Image.fromarray((alpha*255).astype("uint8")))
    return ImageOps.expand(rgba.crop(rgba.getbbox()), border=4)


def resize(image, size):
    return image.convert("RGBa").resize(size, Image.Resampling.LANCZOS).convert("RGBA")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", type=Path, default=Path.home()/"Downloads/Chofis/resultados")
    parser.add_argument("destination", nargs="?", type=Path, default=Path.home()/"Downloads/Chofis/assets/generados/mundo")
    args = parser.parse_args()
    if args.source.resolve() == args.destination.resolve():
        parser.error("Keep originals and output in separate folders.")
    missing = [name for name in ["cielo-fonda-v3", "plataformas-fonda-v3", "decoracion-fonda-v3", "islas-lejanas-v3"]
               if not (args.source/f"{name}.jpeg").is_file()]
    if missing:
        parser.error(f"Missing source images: {', '.join(missing)}")
    args.destination.mkdir(parents=True, exist_ok=True)
    files = []

    def save(image, name):
        path = args.destination/f"{name}.png"
        image.save(path, optimize=True)
        files.append(path)

    sky = Image.open(args.source/"cielo-fonda-v3.jpeg").convert("RGB")
    sky.thumbnail((2048, 1024), Image.Resampling.LANCZOS)
    sky.save(args.destination/"cielo-fonda.webp", quality=90)

    sheet = Image.open(args.source/"plataformas-fonda-v3.jpeg")
    # The model used unequal column widths. Split in the white gutters.
    columns = [0, 560, 1320, sheet.width]
    for row, variant in enumerate(["stable", "fragile"]):
        for col, size in enumerate(["small", "medium", "large"]):
            art = cutout(sheet.crop((columns[col], row*848, columns[col+1], (row+1)*848)))
            coverage = (np.asarray(art.getchannel("A")) > 128).sum(axis=1)
            surface = np.flatnonzero(coverage > coverage.max()*.94)[0]
            scale = 768/art.width
            scaled = resize(art, (768, round(art.height*scale)))
            offset = 112-round(surface*scale)
            assert offset >= 0, "Grass would be cropped above the walkable edge"
            canvas = Image.new("RGBA", (768, scaled.height+offset+4))
            canvas.alpha_composite(scaled, (0, offset))
            save(canvas, f"island-{variant}-{size}")

    sheet = Image.open(args.source/"decoracion-fonda-v3.jpeg")
    for i, name in enumerate(["bench", "lantern", "flowerpot", "sign"]):
        x, y = (i % 2)*1024, (i//2)*1024
        art = cutout(sheet.crop((x, y, x+1024, y+1024)), lantern=name == "lantern")
        scale = min(1, 600/max(art.size))
        save(resize(art, (round(art.width*scale), round(art.height*scale))), name)

    sheet = Image.open(args.source/"islas-lejanas-v3.jpeg")
    for i in range(4):
        # Exclude the black separators the model added between panels.
        art = cutout(sheet.crop((i*364+5, 5, (i+1)*364-5, 715)), mist=True)
        save(art, f"distant-island-{i}")

    for path in files:
        with Image.open(path) as image:
            alpha = np.asarray(image.getchannel("A"))
            assert image.mode == "RGBA" and alpha.min() == 0 and alpha.max() == 255, path
            assert (alpha > 128).sum() > 500, path
            assert alpha[0].max() == 0 and alpha[-1].max() == 0, f"Cropped edge: {path}"
    print(f"Verified {len(files)} transparent cutouts and one sky in {args.destination}")


if __name__ == "__main__":
    main()

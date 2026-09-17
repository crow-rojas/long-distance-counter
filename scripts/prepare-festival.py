# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=10", "numpy>=1.26", "scipy>=1.11"]
# ///
"""Prepare the v4 decorations and color grade existing scenery without altering originals.

uv run scripts/prepare-festival.py ~/Downloads/Chofis /tmp/fonda-festival
Review the output before copying its root PNG/WebP files into public/game.
"""
import argparse
from pathlib import Path
import runpy

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

world = runpy.run_path(str(Path(__file__).with_name("prepare-world.py")))
cutout, resize = world["cutout"], world["resize"]


def scenery(image, rock=False):
    alpha = image.getchannel("A")
    rgb = ImageEnhance.Color(image.convert("RGB")).enhance(1.4)
    rgb = ImageEnhance.Brightness(rgb).enhance(1.08)
    pixels = np.asarray(rgb).astype(float)
    if rock:
        # ponytail: grade these authored rock colors, not a general material classifier.
        source = np.asarray(image.convert("RGB")).astype(float)
        stone = (np.clip((source[..., 2]+18-source[..., 0])/18, 0, 1) *
                 np.clip((source.min(axis=2)-60)/40, 0, 1) *
                 np.clip((180-source.max(axis=2))/30, 0, 1))
        pixels += stone[..., None]*[9, 4, 26]
        grass = (np.clip((source[..., 1]-source[..., 2]-15)/25, 0, 1) *
                 np.clip((source[..., 1]*1.1-source[..., 0])/15, 0, 1))
        grass[112:] = 0
        pixels *= 1+grass[..., None]*[0, .23, .12]
    result = Image.fromarray(np.clip(pixels, 0, 255).astype("uint8")).convert("RGBA")
    result.putalpha(alpha)
    assert result.size == image.size and result.getchannel("A") == alpha
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    source, dest = args.source.resolve(), args.destination.resolve()
    if dest == source or source in dest.parents and "resultados" in dest.parts:
        parser.error("Keep generated output outside the originals folder.")
    dest.mkdir(parents=True, exist_ok=True)
    pieces = dest / "pieces"
    pieces.mkdir(exist_ok=True)
    extracted = {}
    for food, names in [
        ("empanadas", ["empanadas", "pebre", "cloth-empanadas"]),
        ("completos", ["completo", "ingredients", "cloth-completos"]),
        ("terremoto", ["terremotos", "icecream", "cloth-terremotos"]),
    ]:
        sheet = Image.open(source / f"resultados/puesto-{food}-v4.jpeg")
        w, h = sheet.size
        # White gutters differ between the three generated sheets.
        split = .63 if food == "terremoto" else .55
        column = round(w*(.56 if food == "empanadas" else .5))
        boxes = [(0, 0, column, round(h*split)), (column, 0, w, round(h*split)),
                 (0, round(h*split), w, h)]
        for name, box in zip(names, boxes):
            crop = sheet.crop(box)
            pixels = np.asarray(crop.convert("RGB"))
            assert min(pixels[0].min(), pixels[-1].min(), pixels[:, 0].min(), pixels[:, -1].min()) > 200, f"Crop crosses artwork: {name}"
            art = cutout(crop)
            scale = min(1, 1000/max(art.size))
            art = resize(art, (round(art.width*scale), round(art.height*scale)))
            art.save(pieces / f"{name}.png", optimize=True)
            extracted[name] = art

    picnic = cutout(Image.open(source / "resultados/picnic-crow-v4.jpeg"))
    picnic = resize(picnic, (1000, round(picnic.height*1000/picnic.width)))
    picnic.save(dest / "picnic.png", optimize=True)
    generated = source / "assets/generados"
    for folder, names in [
        (generated, ["ramada", "copihue", "volantin"]),
        (generated / "mundo", ["bench", "lantern", "flowerpot", "sign"] +
         [f"island-{kind}-{size}" for kind in ["stable", "fragile"] for size in ["small", "medium", "large"]]),
    ]:
        for name in names:
            scenery(Image.open(folder / f"{name}.png").convert("RGBA"), name.startswith("island-")).save(
                dest / f"{name}.png", optimize=True)

    ramada = Image.open(dest / "ramada.png").convert("RGBA")
    assert ramada.size == (900, 818), "Counter anchors need reviewing for a different drawing"
    for theme, left, right in [
        ("empanadas", "empanadas", "pebre"),
        ("completos", "completo", "ingredients"),
        ("terremotos", "terremotos", "icecream"),
    ]:
        stall = ramada.copy()
        # The counter surface is y=600; fabric hangs just below its front lip.
        for name, x, y, width, origin in [
            (f"cloth-{theme}", 450, 627, 445, 0),
            (left, 315, 603, 245, 1),
            (right, 592, 603, 205, 1),
        ]:
            piece = extracted[name]
            scale = min(width/piece.width, (130 if origin and x > 450 else 150)/piece.height)
            piece = resize(piece, (round(piece.width*scale), round(piece.height*scale)))
            assert y-origin*piece.height >= 453, "Food would collide with the hanging lantern"
            stall.alpha_composite(piece, (round(x-piece.width/2), round(y-origin*piece.height)))
        stall.save(dest / f"ramada-{theme}.png", optimize=True)

    sky = Image.open(generated / "mundo/cielo-fonda.webp").convert("L")
    # Preserve the painted clouds and stars, replacing the gray cast with lavender dusk.
    sky = ImageOps.colorize(sky, black="#536993", mid="#A69BC5", white="#F4CEB5",
                            blackpoint=15, midpoint=110, whitepoint=200)
    sky.save(dest / "cielo-fonda.webp", quality=92)

    # Bake the outline once; per-object glow shaders stall rendering on some GPUs.
    for name in ["empanada", "completo", "terremoto"]:
        original = Image.open(Path(__file__).resolve().parents[1] / f"public/game/sticker-{name}.png").convert("RGBA")
        scale = 430/max(original.size)
        drawing = resize(original, (round(original.width*scale), round(original.height*scale)))
        canvas = Image.new("RGBA", (512, 512))
        canvas.alpha_composite(drawing, ((512-drawing.width)//2, (512-drawing.height)//2))
        glow = Image.new("RGBA", canvas.size, "#ffdf9d")
        glow.putalpha(canvas.getchannel("A").filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(12)))
        glow.alpha_composite(canvas)
        glow.save(dest / f"pickup-{name}.png", optimize=True)

    for path in [*dest.glob("*.png"), *pieces.glob("*.png")]:
        with Image.open(path) as image:
            alpha = np.asarray(image.getchannel("A"))
            assert alpha.min() == 0 and alpha.max() == 255, path
            assert max(alpha[0].max(), alpha[-1].max(), alpha[:, 0].max(), alpha[:, -1].max()) < 80, f"Cropped edge: {path}"
    print(f"Prepared {len(list(dest.glob('*.png')))} scenery images, 9 separate accessories and one sky in {dest}")


if __name__ == "__main__":
    main()

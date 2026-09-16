# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow", "numpy", "scipy", "pymupdf", "opencv-python-headless"]
# ///
"""Extract Chofis's original artwork into 23 transparent PNGs.

uv run scripts/prepare-assets.py [SOURCE_FOLDER] [OUTPUT_FOLDER]
Defaults to ~/Downloads/Chofis/originales and ~/Downloads/Chofis/assets.
"""
from pathlib import Path
import argparse
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
import cv2
import pymupdf

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path, nargs="?", default=Path.home()/"Downloads/Chofis/originales")
parser.add_argument("output", type=Path, nargs="?", default=Path.home()/"Downloads/Chofis/assets")
args = parser.parse_args()
ROOT, OUT = args.source, args.output
if not ROOT.is_dir() or ROOT.resolve() == OUT.resolve():
    parser.error("Use an existing source folder and a separate output folder.")
OUT.mkdir(parents=True, exist_ok=True)
manifest = []


def save(name, image, source, note="", canvas=None):
    box = image.getchannel("A").getbbox()
    assert box, name
    image = image.crop(box)
    if canvas:
        target = Image.new("RGBA", canvas)
        assert image.width <= canvas[0] and image.height <= canvas[1], name
        target.alpha_composite(image, ((canvas[0]-image.width)//2, canvas[1]-image.height-12))
        image = target
    else:
        target = Image.new("RGBA", (image.width+16, image.height+16))
        target.alpha_composite(image, (8, 8))
        image = target
    image.save(OUT / f"{name}.png", optimize=True)
    manifest.append(dict(name=name, file=f"{name}.png", width=image.width,
                         height=image.height, source=source, note=note))


def key_gray(image):
    rgb = np.array(image.convert("RGB")).astype(float)
    bg = np.median(np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]), axis=0)
    distance = np.max(abs(rgb-bg), axis=2)
    foreground = distance > 18
    labels, count = ndi.label(foreground)
    sizes = np.bincount(labels.ravel())
    foreground = (sizes[labels] >= 12) & (labels != 0)
    alpha = foreground.astype(float)
    edge = ndi.binary_dilation(~foreground) & foreground
    alpha[edge] = np.clip((distance[edge]-10)/35, 0, 1)
    # Remove gray matte from semitransparent boundary pixels.
    rgb = np.clip((rgb-bg*(1-alpha[..., None])) / np.maximum(alpha[..., None], .01), 0, 255)
    return Image.fromarray(np.dstack([rgb, alpha*255]).astype("uint8"))


def key_pink(image, preserve_pink_eyes=False):
    rgb = np.array(image.convert("RGB")).astype(float)
    r, g, b = rgb.transpose(2, 0, 1)
    pink = (r > 140) & (b > 120) & (r > g+55) & (b > g+45) & (b > r*.60)
    background = pink
    if preserve_pink_eyes:
        background[200:350,110:375] = False
    foreground = ~background
    labels, _ = ndi.label(foreground)
    sizes = np.bincount(labels.ravel())
    foreground = (sizes[labels] > 50) & (labels != 0)
    alpha = foreground.astype(float)
    edge = foreground & ndi.binary_dilation(background)
    alpha[edge] = .7
    # Reduce the pink screen's fringe only on the silhouette boundary.
    rgb[edge, 0] = np.minimum(rgb[edge, 0], rgb[edge, 1]*1.7+30)
    rgb[edge, 2] = np.minimum(rgb[edge, 2], rgb[edge, 1]*1.7+30)
    return Image.fromarray(np.dstack([rgb, alpha*255]).astype("uint8"))


def outline(image, points, background_colors=()):
    rgb = np.array(image.convert("RGB"))
    poly = Image.new("L", image.size)
    ImageDraw.Draw(poly).polygon(points, fill=255)
    inside = np.array(poly) > 0
    mask = np.full(inside.shape, cv2.GC_PR_BGD, dtype="uint8")
    mask[inside] = cv2.GC_PR_FGD
    mask[~ndi.binary_dilation(inside, iterations=18)] = cv2.GC_BGD
    mask[ndi.binary_erosion(inside, iterations=15)] = cv2.GC_FGD
    for color in background_colors:
        close = np.max(abs(rgb.astype(float)-color), axis=2) < 14
        mask[close] = cv2.GC_BGD
    cv2.setRNGSeed(0)
    cv2.grabCut(rgb, mask, None, np.zeros((1,65)), np.zeros((1,65)), 5, cv2.GC_INIT_WITH_MASK)
    foreground = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    labels, _ = ndi.label(foreground)
    sizes = np.bincount(labels.ravel())
    foreground &= sizes[labels] > 100
    alpha = foreground.astype(float)
    alpha[foreground & ndi.binary_dilation(~foreground)] = .75
    return Image.fromarray(np.dstack([rgb, alpha*255]).astype("uint8"))


poses = ["left", "front", "right", "angry", "happy", "sad"]
for bird in ["chofis", "crow"]:
    image = Image.open(ROOT / f"{bird}.jpg")
    for i, pose in enumerate(poses):
        x0 = [75, 390, 690][i % 3]
        x1 = [390, 685, 995][i % 3]
        y0, y1 = (35, 370) if i < 3 else (395, 740)
        save(f"{bird}-{pose}", key_gray(image.crop((x0,y0,x1,y1))), f"{bird}.jpg", canvas=(320,320))

image = Image.open(ROOT / "marin.jpg").rotate(90, expand=True)
for name, box in [
    ("marin-devil", (220,145,730,930)),
    ("marin-school", (780,165,1240,930)),
    ("marin-bunny", (1300,85,1750,930)),
]:
    save(name, key_pink(image.crop(box), name == "marin-school"), "marin.jpg",
         "Rotated screen photograph; original screen texture and perspective remain.")

doc = pymupdf.open(ROOT / "completo_empanada_terremoto_cuervo_18.pdf")
for name, xref, smask in [
    ("sticker-empanada",100,187), ("sticker-completo",101,188),
    ("sticker-crow",102,189), ("sticker-terremoto",112,195)
]:
    pix = pymupdf.Pixmap(doc,xref)
    pix = pymupdf.Pixmap(pix,pymupdf.Pixmap(doc,smask))
    save(name, Image.frombytes("RGBA",(pix.width,pix.height),pix.samples),
         "completo_empanada_terremoto_cuervo_18.pdf",
         "Original embedded image and alpha mask; duplicates omitted; artist marks preserved.")

image = Image.open(ROOT / "pibble.jpg")
points = [(0,818),(28,752),(51,714),(43,601),(57,516),(67,486),(72,406),
          (81,324),(117,268),(137,233),(134,171),(150,69),(181,19),(219,28),
          (252,75),(280,145),(352,114),(471,107),(590,116),(643,46),(699,0),
          (752,0),(774,68),(769,157),(750,209),(800,258),(850,353),(868,443),
          (856,474),(917,489),(961,535),(973,596),(953,669),(919,728),(944,781),(955,818)]
save("pibble", outline(image,points), "pibble.jpg",
     "Source already cuts off ears/body at image edges; missing drawing was not invented.")

image = Image.open(ROOT / "supergirl_krypto.jpg")
supergirl = [(714,394),(744,415),(772,403),(798,351),(860,313),(930,321),(968,333),
             (1024,335),(1057,365),(1060,422),(1095,455),(1100,480),(1079,512),
             (1115,560),(1108,605),(1087,626),(1082,667),(1060,690),(1024,698),
             (1029,749),(1037,777),(1047,795),(1058,809),(1054,824),(1036,833),
             (1118,896),(1148,923),(1115,953),(1060,986),(1049,1004),
             (1063,1070),(1079,1102),(1073,1124),(1053,1135),(997,1117),
             (969,1090),(955,1017),(914,1016),(898,1070),(876,1113),(810,1127),
             (779,1120),(767,1105),(779,1080),(800,1055),(807,966),(743,954),
             (722,908),(739,831),(776,754),(786,708),(773,691),(777,665),
             (803,635),(828,614),(779,608),(759,562),(769,519),(753,475),(729,449)]
krypto = [(412,951),(445,966),(479,950),(443,957),(434,943),(443,913),
          (474,892),(526,893),(550,902),(573,883),(607,892),(624,899),
          (624,870),(593,871),(567,857),(558,832),(568,811),(558,805),
          (574,791),(608,784),(627,787),(635,775),(659,787),(671,752),
          (684,749),(691,760),(704,753),(723,750),(732,758),(726,768),
          (741,787),(745,808),(763,806),(779,818),(777,841),(777,864),
          (761,876),(734,886),(729,915),(719,938),(705,949),(704,974),
          (720,987),(713,1007),(704,1025),(697,1044),(703,1084),(725,1099),
          (728,1116),(708,1122),(682,1118),(683,1129),(666,1133),(644,1125),
          (634,1114),(632,1062),(613,1056),(607,1081),(618,1093),(625,1104),
          (604,1114),(582,1110),(572,1100),(571,1076),(549,1074),(531,1080),
          (536,1101),(535,1118),(520,1128),(499,1128),(490,1120),(493,1095),
          (494,1080),(484,1070),(490,1048),(509,1019),(507,999),(478,1008),
          (448,1011),(439,1004),(449,993),(429,983),(416,967)]
colors = [(243,75,41),(252,104,80)]
sg = outline(image,supergirl,colors)
dog = outline(image,krypto,colors)
# The dog is in front; do not retain its pixels in the separate Supergirl cutout.
sg_array = np.array(sg)
sg_array[np.array(dog)[:,:,3] > 0,3] = 0
sg = Image.fromarray(sg_array)
save("supergirl",sg,"supergirl_krypto.jpg",
     "Visible artwork only; Krypto occludes part of the cape. No hidden parts reconstructed.")
save("krypto",dog,"supergirl_krypto.jpg","Visible artwork extracted with a guided silhouette.")
pair = sg.copy()
pair.alpha_composite(dog)
save("supergirl-krypto",pair,"supergirl_krypto.jpg","Pair preserves the original overlap.")

(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n")

# One runnable integrity check for the complete extraction.
assert len(manifest) == 23
for entry in manifest:
    image = Image.open(OUT/entry["file"])
    assert image.mode == "RGBA" and image.getchannel("A").getextrema() == (0,255), entry["name"]
    assert image.getchannel("A").getbbox(), entry["name"]

sheet = Image.new("RGB",(1200,((len(manifest)+4)//5)*260),"#eee8dc")
draw = ImageDraw.Draw(sheet)
for i, entry in enumerate(manifest):
    x,y=(i%5)*240,(i//5)*260
    for yy in range(y,y+225,15):
        for xx in range(x,x+240,15):
            draw.rectangle((xx,yy,xx+14,yy+14), fill="#e5ddcd" if (xx//15+yy//15)%2 else "#f5f0e7")
    image = Image.open(OUT/entry["file"])
    image.thumbnail((218,210))
    sheet.paste(image,(x+(240-image.width)//2,y+(225-image.height)//2),image)
    draw.text((x+10,y+235),entry["name"],fill="#252525")
sheet.save(OUT/"contact-sheet.jpg",quality=92)
print(f"Extracted and checked {len(manifest)} transparent assets in {OUT}")

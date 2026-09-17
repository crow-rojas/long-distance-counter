# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow>=10"]
# ///
"""Check visible art, ground support and lantern attachments: uv run scripts/check-map-layout.py.

The game keeps authored coordinates. This check reports conflicts; it never moves objects.
"""
import json
import math
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MAP = json.loads((ROOT / 'src/game/map.json').read_text())
issues = []
art = []
crow=next(f for f in MAP['friends'] if f['name']=='Crow')
floor=next(p for p in MAP['platforms'] if p['y']==crow['y'] and p['x']<=crow['x']<=p['x']+p['width'])


def image_bounds(name, x, y, width=None, height=100, origin=1, angle=0):
    image = Image.open(ROOT / f'public/game/{name}.png').convert('RGBA')
    if name.endswith('-poses'):
        sheet = image
        image = Image.new('RGBA', (320, 320))
        for frame_x in range(0, sheet.width, 320):
            image.alpha_composite(sheet.crop((frame_x, 0, frame_x+320, 320)))
        if name == 'marin-poses':
            image.alpha_composite(ImageOps.mirror(image.copy()))
    w, h = image.size
    left, top, right, bottom = image.getchannel('A').point(lambda a: 255 if a > 80 else 0).getbbox()
    sx, sy = (width / w if width else height / h), height / h
    theta = math.radians(angle)
    points = []
    for px, py in [(left, top), (right, top), (right, bottom), (left, bottom)]:
        dx, dy = (px-w/2)*sx, (py-origin*h)*sy
        points.append((x+dx*math.cos(theta)-dy*math.sin(theta), y+dx*math.sin(theta)+dy*math.cos(theta)))
    return [min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points), max(p[1] for p in points)]


def add(item, bounds, kind, parent=None):
    art.append(dict(id=item['id'], bounds=bounds, kind=kind, parent=parent))


def ground(item, bounds):
    matches = [p for p in MAP['platforms'] if p['kind'] not in ['moving-x', 'moving-y', 'fragile']
               and abs(p['y']-item['y']) < 2 and bounds[0] >= p['x']+8 and bounds[2] <= p['x']+p['width']-8]
    if not matches:
        issues.append(f"{item['id']}: no stable ground under the whole drawing")
    return matches[0]['id'] if matches else None


for p in MAP['platforms']:
    size = 'small' if p['width'] <= 180 else 'medium' if p['width'] <= 280 else 'large'
    name = f"island-{'fragile' if p['kind']=='fragile' else 'stable'}-{size}"
    h = Image.open(ROOT / f'public/game/{name}.png').height
    height=p['width']*h/768 if p['id']==floor['id'] else min(210,p['width']*.68)
    b = image_bounds(name, p['x']+p['width']/2, p['y'], p['width'], height, 112/h)
    # Include the complete travel range, not just the initial frame.
    if p['kind']=='moving-x': b[0]-=50; b[2]+=50
    if p['kind']=='moving-y': b[1]-=40; b[3]+=40
    add(p, b, 'platform')

for item in MAP['benches']+MAP['friends']+MAP['decorations']:
    name = item.get('image', 'bench')
    if name == 'garland':
        issues.append(f"{item['id']}: light string needs authored attachment points")
        continue
    origin = 391/395 if name=='bench' else .9625 if name.endswith('-poses') else item.get('originY', 1)
    b = image_bounds(name, item['x'], item['y']+(10 if name=='bench' else 6 if name=='lantern' or name.startswith('ramada') else 0), item['height']*600/395 if name=='bench' else None,
                     item['height'], origin, item.get('angle', 0))
    tilt = {'Marin':3, 'Pibble':6, 'Supergirl':2, 'Krypto':8}.get(item.get('name'), 0)
    samples = [b]
    for angle in range(-tilt, tilt+1):
        if tilt:
            samples.append(image_bounds(name, item['x'], item['y'], height=item['height'], origin=origin, angle=angle))
    if name=='volantin':
        for step in range(16):
            samples.append(image_bounds(name, item['x'], item['y']-12*step/15, height=item['height'],
                                        origin=origin, angle=item['angle']+step))
    b = [min(s[0] for s in samples), min(s[1] for s in samples),
         max(s[2] for s in samples), max(s[3] for s in samples)]
    parent = None
    if name=='lantern':
        roofs = [r for r in MAP['decorations'] if r['image'].startswith('ramada')
                 and abs(item['x']-r['x']) < r['height']*.35
                 and abs(item['y']-(r['y']-r['height']*.72)) < 2]
        if not roofs: issues.append(f"{item['id']}: lantern has no roof attachment")
        else: parent=roofs[0]['id']
    elif name=='copihue' and origin==0:
        stems = [p for p in MAP['platforms'] if abs(item['y']-p['y']-8)<2
                 and p['x']+8 <= item['x']+item['height']*.27 <= p['x']+p['width']-8]
        if not stems: issues.append(f"{item['id']}: hanging copihue has no island attachment")
        else: parent=stems[0]['id']
    elif name!='volantin':
        parent=ground(item, b)
    add(item, b, name, parent)

for item in MAP['items']:
    add(item, [item['x']-54,item['y']-86,item['x']+54,item['y']+54], 'pickup')
for item in MAP['signs']:
    b=[item['x']-87.5,item['y']-135,item['x']+87.5,item['y']]
    add(item,b,'sign',ground(item,b))

area=[MAP['ending']['x']-24,MAP['ending']['y']-200,max(crow['x']+120,floor['x']+floor['width']-36),MAP['ending']['y']+100]
for gate in [MAP['ending']['x'],area[2]-24]:
    if gate-43<floor['x']+8 or gate+43>floor['x']+floor['width']-8:
        issues.append("Crow entrance: both gate posts need ground underneath")
for a in art:
    owns_floor=a['kind']=='platform' and any(p['id']==a['id'] and p['y']==crow['y'] and p['x']<=crow['x']<=p['x']+p['width'] for p in MAP['platforms'])
    if a['id']==crow['id'] or owns_floor: continue
    if a['kind']=='picnic':
        # A low background prop may occupy the side alcove, outside both reunion poses and gate posts.
        if a['bounds'][0] < crow['x']+132 or a['bounds'][2] > area[2]-67:
            issues.append(f"{a['id']}: picnic must leave both reunion poses and the right gate clear")
        continue
    if min(a['bounds'][2],area[2])-max(a['bounds'][0],area[0])>4 and min(a['bounds'][3],area[3])-max(a['bounds'][1],area[1])>4:
        issues.append(f"{a['id']}: drawing enters Crow's reserved space")

for i, a in enumerate(art):
    for b in art[i+1:]:
        if a['parent']==b['id'] or b['parent']==a['id']: continue
        left=max(a['bounds'][0],b['bounds'][0]); right=min(a['bounds'][2],b['bounds'][2])
        top=max(a['bounds'][1],b['bounds'][1]); bottom=min(a['bounds'][3],b['bounds'][3])
        # ponytail: bounding boxes are conservative; inspect the reported art, not pixel collisions.
        if right-left > 4 and bottom-top > 4:
            issues.append(f"{a['id']} overlaps {b['id']} ({round(right-left)} x {round(bottom-top)})")

if __name__=='__main__':
    print(f"Checked {len(MAP['platforms'])} platforms and {len(art)-len(MAP['platforms'])} props/characters/pickups.")
    print('\n'.join(issues) if issues else 'No overlapping drawings, unsupported ground props or floating lanterns.')
    raise SystemExit(bool(issues))

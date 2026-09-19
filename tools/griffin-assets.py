"""Build vinuni-lesson-video-ds/assets/mascot/griffin/ from the Griffin art pack (the designers' folder).

  uv run --with numpy --with pillow --with scipy tools/griffin-assets.py <art pack folder> [out folder]

Every expression set is registered onto its calm picture (scale + shift, legs weighted over the head,
mirrored when a picture was drawn facing the other way), so a mood change swaps the picture in place.
Each set shares one canvas cropped to the union of its drawings, 820 px tall, feet on the bottom edge.
Gestures are single pictures on the same 820 px scale; face-<mood>.png are square avatars cut from `stand`;
badge-<mood>.png are the head-only drawings of 02_faces (GriffinBadge).
Output is a 256-colour palette PNG (flat cartoon colours: visually lossless, ~4x smaller).
Props come from 08_accessories_props, trimmed; `!` and `?` get the dot the pack's drawings are missing.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy.signal import fftconvolve

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '../vinuni-lesson-video-ds/assets/mascot/griffin')
OUT_H = 820
G1 = f'{SRC}/griffin_generated_images'
G2 = f'{SRC}/griffin_generated_images(1)/griffin_generated_images'
G3 = f'{SRC}/griffin_mascot_all_generated'
G4 = f'{SRC}/griffin_mascot_generated_images'
MOODS = ['neutral', 'happy', 'wink', 'surprised', 'thinking', 'sad', 'stern']
SETS = {
    'stand': [f'{G1}/{f}' for f in ['03_calm', '04_happy', '05_wink', '06_surprised', '07_looking_up', '08_sad_looking_down', '09_stern_serious']],
    'sit': [f'{G2}/{f}' for f in ['08_expression_calm', '09_expression_happy_eyes_closed', '10_expression_wink', '11_expression_surprised', '12_expression_looking_up_side', '13_expression_sad_looking_down', '14_expression_stern_serious']],
    'wings': [f'{G4}/{f}' for f in ['02_calm_open_eyes', '03_happy_closed_eyes', '04_wink_smile', '05_surprised_wide_eyes', '06_looking_up_side', '07_sad_looking_down', '08_stern_serious']],
    'turn': [f'{G3}/{f}' for f in ['04_calm_eyes', '05_happy_closed_eyes', '06_wink', '08_surprised_wide_eyes', '09_looking_up_side', '10_sad_looking_down', '11_stern_serious']],
}
GESTURES = {
    'cheer': f'{G2}/01_wings_up_cheerful',
    'walk-left': f'{G2}/03_three_quarter_left_walking',
    'walk-right': f'{G2}/04_three_quarter_right_walking',
    'welcome': f'{G2}/05_front_wings_spread_welcoming',
    'wave': f'{G2}/06_front_right_wing_wave',
    'rest': f'{G2}/07_sitting_wings_folded_tail_right',
}

SMALL = 300  # registration resolution (longest side)


def load(p):
    im = Image.open(p + '.png').convert('RGBA')
    return im


def mask_small(im, k):
    a = np.asarray(im.getchannel('A').resize((round(im.width * k), round(im.height * k)), Image.BILINEAR), dtype=np.float32) / 255
    return a


def register(ref, mov):
    """Best (scale, dx, dy) in full-res px mapping mov → ref, by weighted mask correlation over scales."""
    k = SMALL / max(ref.size)
    R = mask_small(ref, k)
    ys = np.nonzero(R.max(1) > 0.5)[0]
    top, bot = ys[0], ys[-1]
    w = np.where(np.arange(R.shape[0])[:, None] > top + 0.33 * (bot - top), 1.0, 0.25)
    Rw = R * w
    best = None
    for s in np.arange(0.88, 1.121, 0.004):
        M = mask_small(mov, k * s)
        # correlation of Rw with M at every shift
        c = fftconvolve(Rw, M[::-1, ::-1], mode='full')
        i = np.unravel_index(np.argmax(c), c.shape)
        dy = i[0] - (M.shape[0] - 1)
        dx = i[1] - (M.shape[1] - 1)
        # IoU at that placement
        H, W = R.shape
        P = np.zeros_like(R)
        y0, x0 = max(dy, 0), max(dx, 0)
        y1, x1 = min(dy + M.shape[0], H), min(dx + M.shape[1], W)
        if y1 <= y0 or x1 <= x0:
            continue
        P[y0:y1, x0:x1] = M[y0 - dy:y1 - dy, x0 - dx:x1 - dx]
        a, b = R > 0.5, P > 0.5
        iou = ((a & b) * w).sum() / ((a | b) * w).sum()
        if best is None or iou > best[0]:
            best = (iou, s, dx / k, dy / k)
    return best


def place(im, s, dx, dy, size):
    """im scaled by s and shifted by (dx, dy) onto a canvas of `size` (premultiplied to avoid dark fringes)."""
    pm = im.convert('RGBa')
    out = pm.transform(size, Image.AFFINE, (1 / s, 0, -dx / s, 0, 1 / s, -dy / s), resample=Image.BICUBIC)
    return out.convert('RGBA')


def save(im, path):
    # flat cartoon colours: a 256-colour palette with alpha is visually lossless and ~4x smaller
    im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)


def finish(images, names, outdir, prefix):
    boxes = [im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox() for im in images]
    box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    k = OUT_H / (box[3] - box[1])
    size = (round((box[2] - box[0]) * k), OUT_H)
    for im, n in zip(images, names):
        c = im.crop(box).convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')
        save(c, f'{outdir}/{prefix}{n}.png')
    return size


os.makedirs(OUT, exist_ok=True)
meta = {'sets': {}, 'gestures': {}}
for name, files in SETS.items():
    ims = [load(f) for f in files]
    ref = ims[0]
    pad = 80
    size = (ref.width + 2 * pad, ref.height + 2 * pad)
    placed = [place(ref, 1, pad, pad, size)]
    report = []
    for f, im in zip(files[1:], ims[1:]):
        iou, s, dx, dy = register(ref, im)
        flipped = im.transpose(Image.FLIP_LEFT_RIGHT)
        alt = register(ref, flipped)
        if alt[0] > iou + 0.05:
            (iou, s, dx, dy), im = alt, flipped
            f += ' (lật)'
        placed.append(place(im, s, dx + pad, dy + pad, size))
        report.append(f'{os.path.basename(f)[:22]} s={s:.3f} dx={dx:.0f} dy={dy:.0f} iou={iou:.3f}')
    sz = finish(placed, MOODS, OUT, f'{name}-')
    meta['sets'][name] = sz
    print(name, sz, *report, sep='\n  ')
for name, f in GESTURES.items():
    im = load(f)
    sz = finish([im], [name], OUT, 'gesture-')
    meta['gestures'][name] = sz
# square avatars (DialogueCard, GriffinBadge) cut from the stand set, on the card fill (C.bgAlt)
for m in MOODS:
    im = Image.open(f'{OUT}/stand-{m}.png').convert('RGBA')
    pad = Image.new('RGBA', (im.width + 200, im.height + 200), (0, 0, 0, 0))
    pad.paste(im, (100, 100))
    cx, cy, sz = round(im.width * 0.59) + 100, 290 + 100, 440
    c = pad.crop((cx - sz // 2, cy - sz // 2, cx + sz // 2, cy + sz // 2)).resize((256, 256), Image.LANCZOS)
    bg = Image.new('RGBA', c.size, (242, 247, 252, 255))
    bg.alpha_composite(c)
    bg.convert('RGB').save(f'{OUT}/face-{m}.png', optimize=True)
# badge faces (GriffinBadge): the head-only drawings of 02_faces, trimmed; `angry` is the pack's name for stern
for m in MOODS:
    im = Image.open(f"{SRC}/02_faces/face_{'angry' if m == 'stern' else m}.png").convert('RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    save(im, f'{OUT}/badge-{m}.png')
# props: copied from 08_accessories_props, trimmed. The pack's `!` and `?` are drawn without their dot, so
# one is painted under the stem in the drawing's own fill and outline (supersampled 4x for a clean edge).
from PIL import ImageDraw
PROPS = ['lightbulb', 'question_mark', 'exclamation', 'sparkle', 'book', 'laptop', 'graduation_hat']
DOTTED = {'exclamation': 0.72, 'question_mark': 0.62}  # dot diameter as a share of the stem's width
for name in PROPS:
    im = Image.open(f'{SRC}/08_accessories_props/{name}.png').convert('RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    if name in DOTTED:
        a = im.getchannel('A')
        # the stem: opaque run of the row 12 % above the bottom of the drawing
        row = int(im.height * 0.88)
        xs = [x for x in range(im.width) if a.getpixel((x, row)) > 128]
        cx, stem = (xs[0] + xs[-1]) / 2, xs[-1] - xs[0] + 1
        d = max(8, round(stem * DOTTED[name] + 6))
        gap = max(4, round(d * 0.35))
        canvas = Image.new('RGBA', (max(im.width, round(cx + d / 2) + 2), im.height + gap + d + 2), (0, 0, 0, 0))
        canvas.paste(im, (0, 0))
        k = 4
        dot = Image.new('RGBA', (canvas.width * k, canvas.height * k), (0, 0, 0, 0))
        top = im.height + gap
        box = [(cx - d / 2) * k, top * k, (cx + d / 2) * k, (top + d) * k]
        ImageDraw.Draw(dot).ellipse(box, fill=(244, 58, 58, 255), outline=(150, 20, 22, 255), width=round(2 * k))
        im = Image.alpha_composite(canvas, dot.resize(canvas.size, Image.LANCZOS))
    im.save(f'{OUT}/{name}.png', optimize=True)
# widths go into POSES in components/mascot/Griffin.jsx
print(json.dumps(meta))

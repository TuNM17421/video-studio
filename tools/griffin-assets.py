"""Build the Griffin pictures from the art pack (the designers' folder) into the media store.

  uv run --with numpy --with pillow --with scipy tools/griffin-assets.py <art pack folder>
  npm run media -- --dry-run && npm run media          # push media/files/mascot/griffin/ to R2

Pictures → media/files/mascot/griffin/<name>.<fingerprint>.png (not in git; served from R2). Tables →
vinuni-lesson-video-ds/components/mascot/griffinPoses.js and vinuni-lesson-video-ds/assets/mascot/griffin/
poses.json (in git): base URL, the file name of every picture, poses, moods, props.

Which picture is which pose × mood lives in tools/griffin-assets.json. Within a pose every picture is
registered onto the first one (scale + shift, legs weighted over the head, mirrored when a picture was
drawn facing the other way), so a mood change swaps the picture in place. A pose shares one canvas cropped
to the union of its drawings, 820 px tall, feet on the bottom edge → <pose>-<mood>.png, and the widths go to
components/mascot/griffinPoses.js (generated). face-<mood>.png are square avatars cut from `stand`;
badge-<mood>.png are the head-only drawings of 02_faces (GriffinBadge).
Output is a 256-colour palette PNG (flat cartoon colours: visually lossless, ~4x smaller).
Props come from 08_accessories_props, trimmed; `!` and `?` get the dot the pack's drawings are missing.
"""
import hashlib, json, os, shutil, sys, tempfile
import numpy as np
from PIL import Image
from scipy.signal import fftconvolve

SRC = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
# pictures go to the media store (pushed to R2 by `npm run media`), the two tables stay in the repo
KEY_PREFIX = 'mascot/griffin'
MEDIA_DIR = os.path.join(ROOT, 'media/files', KEY_PREFIX)
TABLE = os.path.join(ROOT, 'vinuni-lesson-video-ds/components/mascot/griffinPoses.js')
POSES_JSON = os.path.join(ROOT, 'vinuni-lesson-video-ds/assets/mascot/griffin/poses.json')
OUT = tempfile.mkdtemp(prefix='griffin-')
OUT_H = 820
CONFIG = json.load(open(os.path.join(HERE, 'griffin-assets.json'), encoding='utf-8'))
MOODS = list(CONFIG['moods'])

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
poses = {}
for name, pose in CONFIG['poses'].items():
    if pose.get('mirror'):
        # a pose drawn as another one flipped left-right: every mood of that pose, mirrored
        src = pose['mirror']
        if src not in poses:
            sys.exit(f'{name}: mirror "{src}" phải khai trước nó trong poses')
        moods = poses[src]['moods']
        for m in moods:
            Image.open(f'{OUT}/{src}-{m}.png').transpose(Image.FLIP_LEFT_RIGHT).save(f'{OUT}/{name}-{m}.png', optimize=True)
        poses[name] = {'label': pose['label'], 'group': pose['group'], 'w': poses[src]['w'], 'hx': pose['hx'], 'moods': moods, **({'walk': True} if pose.get('walk') else {})}
        print(name, f'= {src} lật ngang', ', '.join(moods), sep='\n  ')
        continue
    moods = list(pose['moods'])
    unknown = [m for m in moods if m not in MOODS]
    if unknown:
        sys.exit(f'{name}: biểu cảm lạ {unknown} — chỉ dùng {MOODS}')
    files = [f"{SRC}/{pose['moods'][m]}" for m in moods]
    ims = [load(f) for f in files]
    # the first mood is the reference the others are registered onto
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
        report.append(f'{os.path.basename(f)[:28]} s={s:.3f} dx={dx:.0f} dy={dy:.0f} iou={iou:.3f}')
    w, _ = finish(placed, moods, OUT, f'{name}-')
    poses[name] = {'label': pose['label'], 'group': pose['group'], 'w': w, 'hx': pose['hx'], 'moods': moods, **({'walk': True} if pose.get('walk') else {})}
    print(name, f'{w}×{OUT_H}', ', '.join(moods), *report, sep='\n  ')

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
    # a drawing that sits higher than the others gets transparent rows on top (griffin-assets.json → badges)
    dy = CONFIG.get('badges', {}).get(m, {}).get('dy', 0)
    if dy:
        pad = Image.new('RGBA', (im.width, im.height + dy), (0, 0, 0, 0))
        pad.paste(im, (0, dy))
        im = pad
    save(im, f'{OUT}/badge-{m}.png')
# props: from 08_accessories_props, trimmed. The pack draws `!` and `?` without their dot, so one is painted
# under the stem in the drawing's own fill and outline (supersampled 4x for a clean edge).
from PIL import ImageDraw
props = {}
for name, prop in CONFIG['props'].items():
    im = Image.open(f"{SRC}/08_accessories_props/{prop['file']}.png").convert('RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    if prop.get('dot'):
        a = im.getchannel('A')
        # the stem: opaque run of the row 12 % above the bottom of the drawing
        row = int(im.height * 0.88)
        xs = [x for x in range(im.width) if a.getpixel((x, row)) > 128]
        cx, stem = (xs[0] + xs[-1]) / 2, xs[-1] - xs[0] + 1
        d = max(8, round(stem * prop['dot'] + 6))
        gap = max(4, round(d * 0.35))
        canvas = Image.new('RGBA', (max(im.width, round(cx + d / 2) + 2), im.height + gap + d + 2), (0, 0, 0, 0))
        canvas.paste(im, (0, 0))
        k = 4
        dot = Image.new('RGBA', (canvas.width * k, canvas.height * k), (0, 0, 0, 0))
        top = im.height + gap
        box = [(cx - d / 2) * k, top * k, (cx + d / 2) * k, (top + d) * k]
        ImageDraw.Draw(dot).ellipse(box, fill=(244, 58, 58, 255), outline=(150, 20, 22, 255), width=round(2 * k))
        im = Image.alpha_composite(canvas, dot.resize(canvas.size, Image.LANCZOS))
    im.save(f"{OUT}/{prop['file']}.png", optimize=True)
    props[name] = {'label': prop['label'], 'file': prop['file'], 'w': im.width, 'h': im.height,
                   **({'k': prop['k']} if 'k' in prop else {})}

# Publish: every picture gets a content fingerprint in its name (stand-happy.3f2a9c1b04.png), so a redrawn
# picture is a new URL and no browser or CDN can serve the old one; the folder is replaced as a whole.
shutil.rmtree(MEDIA_DIR, ignore_errors=True)
os.makedirs(MEDIA_DIR)
files = {}
for fname in sorted(os.listdir(OUT)):
    stem = fname[:-4]
    digest = hashlib.sha256(open(os.path.join(OUT, fname), 'rb').read()).hexdigest()[:10]
    files[stem] = f'{stem}.{digest}.png'
    shutil.move(os.path.join(OUT, fname), os.path.join(MEDIA_DIR, files[stem]))
shutil.rmtree(OUT)
manifest = json.load(open(os.path.join(ROOT, 'media/manifest.json'), encoding='utf-8'))
base = f"{manifest['base'].rstrip('/')}/{KEY_PREFIX}/"

# The tables the component reads (griffinPoses.js) and the Studio reads (poses.json) — generated, so adding
# a mood or a prop never means editing Griffin.jsx or the Studio.
table = {'base': base, 'moods': CONFIG['moods'], 'poses': poses, 'props': props, 'files': files}
os.makedirs(os.path.dirname(POSES_JSON), exist_ok=True)
with open(POSES_JSON, 'w', encoding='utf-8') as fh:
    json.dump(table, fh, ensure_ascii=False, indent=2)
    fh.write('\n')
def js_table(obj):
    rows = [f'  {json.dumps(k) if "-" in k else k}: {json.dumps(v, ensure_ascii=False, separators=(", ", ": "))},' for k, v in obj.items()]
    return '{\n' + '\n'.join(rows) + '\n}'
with open(TABLE, 'w', encoding='utf-8') as fh:
    fh.write(
        '// Generated by tools/griffin-assets.py from tools/griffin-assets.json — do not edit by hand.\n'
        '// Each pose picture is assets/mascot/griffin/<pose>-<mood>.png, ' + str(OUT_H) + ' px tall (crest on the top edge,\n'
        '// feet on the bottom edge). w = its width · hx = head centre as a share of it · moods = the ones drawn,\n'
        '// the first being the default when a scene asks for one the pose does not have · walk = steps on its own.\n'
        '// Props: w/h = picture size · k = size against the other props.\n'
        '// The pictures live on the media store (R2): BASE + FILES[name], names carrying a content fingerprint.\n'
        f'export const PIC_H = {OUT_H};\n\n'
        f'export const BASE = {json.dumps(base)};\n\n'
        f'export const MOOD_LABELS = {js_table(CONFIG["moods"])};\n\n'
        f'export const POSES = {js_table(poses)};\n\n'
        f'export const PROPS = {js_table(props)};\n\n'
        f'export const FILES = {js_table(files)};\n'
    )
# voices.json: a character whose face is a Griffin picture (the Griffin character) follows its new
# fingerprinted name, or its avatar would point at a file the next `npm run media --prune` deletes.
vpath = os.path.join(ROOT, 'voices.json')
voices = json.load(open(vpath, encoding='utf-8'))
moved = 0
for c in voices.get('characters', []):
    a = c.get('avatar') or ''
    if a.startswith(f'{KEY_PREFIX}/'):
        stem = os.path.basename(a).split('.')[0]
        if stem in files and a != f'{KEY_PREFIX}/{files[stem]}':
            c['avatar'] = f'{KEY_PREFIX}/{files[stem]}'
            moved += 1
if moved:
    with open(vpath, 'w', encoding='utf-8') as fh:
        json.dump(voices, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    print(f'voices.json: {moved} avatar đổi theo ảnh mới')
print(f'{len(files)} ảnh → {os.path.relpath(MEDIA_DIR, ROOT)}/ — đẩy lên R2: npm run media -- --dry-run, rồi npm run media')

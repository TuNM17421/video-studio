#!/usr/bin/env python3
"""
Component thumbnails for Video Studio (styles/previews/<group>__<Component>.png).

Source: ds-bundle/_screenshots/*.png, the preview sheets /design-sync captures (run /design-sync first).
Each sheet is cropped to its first cell, minus the cell's name label. Needs Pillow (pip install pillow).

    python3 studio/scripts/make-previews.py
"""
import glob
import os

from PIL import Image, ImageChops

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "ds-bundle", "_screenshots")
OUT = os.path.join(ROOT, "styles", "previews")


def first_block(flags, gap=12):
    """First run of True values, allowing gaps shorter than `gap`."""
    idx = [i for i, v in enumerate(flags) if v]
    start = prev = idx[0]
    for i in idx[1:]:
        if i - prev > gap:
            return start, prev
        prev = i
    return start, prev


def main():
    os.makedirs(OUT, exist_ok=True)
    count = 0
    for src in sorted(glob.glob(os.path.join(SRC, "*__*.png"))):
        name = os.path.basename(src)
        if name.startswith(("player__", "contact")):
            continue
        im = Image.open(src).convert("RGB")
        w, h = im.size
        bg = Image.new("RGB", im.size, im.getpixel((2, 2)))
        mask = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 6 else 0)
        y0, y1 = first_block([mask.crop((0, y, w, y + 1)).getbbox() is not None for y in range(h)])
        band = mask.crop((0, y0, w, y1 + 1))
        x0, x1 = first_block([band.crop((x, 0, x + 1, y1 - y0 + 1)).getbbox() is not None for x in range(w)])
        cell = im.crop((max(0, x0 - 2), max(0, y0 - 2), min(w, x1 + 3), min(h, y1 + 3)))
        cw, ch = cell.size
        cell.crop((4, 36, cw - 4, ch - 4)).save(os.path.join(OUT, name), optimize=True)  # drop the name label
        count += 1
    print(f"{count} previews → {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()

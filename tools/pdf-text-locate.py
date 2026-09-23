#!/usr/bin/env python3
"""
PDF text locator — finds exact bounding box coordinates of text phrases in PDF pages.

Usage:
  python3 tools/pdf-text-locate.py "<pdf_path>" <page_number> "<search_phrase>"

Example:
  python3 tools/pdf-text-locate.py "slides.pdf" 37 "Trust calibration"

Output:
  Normalized coordinates (0-1 range) suitable for tools/slide-crop.mjs --box
"""

import sys
import fitz  # PyMuPDF

def normalize_rect(rect, page_width, page_height):
    """Convert PDF point coordinates to normalized 0-1 range."""
    x0, y0, x1, y1 = rect
    return (
        max(0, x0 / page_width),
        max(0, y0 / page_height),
        min(1, x1 / page_width),
        min(1, y1 / page_height),
    )

def find_text_locations(pdf_path, page_num, search_phrase):
    """
    Find text location(s) in PDF.

    Returns:
      - If exact phrase found: list of normalized rects
      - If phrase not found but individual words found: grouped normalized rect (with warning)
      - If nothing found: empty list
    """
    try:
        doc = fitz.open(pdf_path)
    except FileNotFoundError:
        print(f"❌ File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error opening PDF: {e}", file=sys.stderr)
        sys.exit(1)

    # Convert 1-based page number to 0-based index
    if page_num < 1 or page_num > len(doc):
        print(f"❌ Invalid page number {page_num}. PDF has {len(doc)} pages.", file=sys.stderr)
        sys.exit(1)

    page = doc[page_num - 1]
    page_rect = page.rect
    page_width = page_rect.width
    page_height = page_rect.height

    # Try to find the exact phrase
    rects = page.search_for(search_phrase)

    if rects:
        # Exact phrase found
        return "exact", [(normalize_rect(r, page_width, page_height), r) for r in rects]

    # Phrase not found — try word-by-word
    words = search_phrase.split()
    if len(words) <= 1:
        # Single word not found
        return "not_found", []

    # Search for individual words and collect bounding boxes
    all_word_rects = []
    found_words = []

    for word in words:
        word_rects = page.search_for(word)
        if word_rects:
            all_word_rects.extend(word_rects)
            found_words.append(word)

    if not all_word_rects:
        # No individual words found either
        return "not_found", []

    # Merge rects: find bounding box that encloses all word boxes
    x0_min = min(r[0] for r in all_word_rects)
    y0_min = min(r[1] for r in all_word_rects)
    x1_max = max(r[2] for r in all_word_rects)
    y1_max = max(r[3] for r in all_word_rects)

    merged_rect = fitz.Rect(x0_min, y0_min, x1_max, y1_max)
    normalized = normalize_rect(merged_rect, page_width, page_height)

    return "partial", [(normalized, merged_rect)], found_words

def format_box_string(normalized):
    """Format normalized rect as '0.062,0.081,0.398,0.132' for --box flag."""
    x0, y0, x1, y1 = normalized
    return f"{x0:.3f},{y0:.3f},{x1:.3f},{y1:.3f}"

def pt_to_px(pt_value, dpi=72):
    """Convert PDF points to pixels at standard DPI."""
    return int(pt_value * dpi / 72)

def main():
    if len(sys.argv) != 4:
        print("Usage: python3 tools/pdf-text-locate.py <pdf_path> <page_num> <search_phrase>")
        print("Example: python3 tools/pdf-text-locate.py slides.pdf 37 \"Trust calibration\"")
        sys.exit(1)

    pdf_path = sys.argv[1]
    try:
        page_num = int(sys.argv[2])
    except ValueError:
        print(f"❌ Page number must be integer, got: {sys.argv[2]}", file=sys.stderr)
        sys.exit(1)

    search_phrase = sys.argv[3]

    status, results, *extra = find_text_locations(pdf_path, page_num, search_phrase)

    if status == "exact":
        print(f"✓ Found exact phrase \"{search_phrase}\" — {len(results)} location(s) on page {page_num}:")
        for i, (normalized, raw_rect) in enumerate(results, 1):
            box_str = format_box_string(normalized)
            width_pt = raw_rect.width
            height_pt = raw_rect.height
            print(f"  [{i}] --box {box_str}   (size {width_pt:.0f}pt × {height_pt:.0f}pt)")
        print(f"\nCopy --box value and paste into:")
        print(f"  node tools/slide-crop.mjs \"{pdf_path}\" {page_num} --box <value> --out media/files/evidence/<name>.png")

    elif status == "partial":
        found_words = extra[0]
        normalized, raw_rect = results[0]
        box_str = format_box_string(normalized)
        print(f"⚠️  Phrase \"{search_phrase}\" NOT found as-is on page {page_num}")
        print(f"    but individual words were found: {', '.join(found_words)}")
        print(f"    Merged bounding box from word locations:")
        print(f"    --box {box_str}   (size {raw_rect.width:.0f}pt × {raw_rect.height:.0f}pt)")
        print(f"\n⚠️  CHECK THIS IN IMAGE PREVIEW BEFORE USING!")
        print(f"    1. Run: node tools/slide-crop.mjs \"{pdf_path}\" {page_num} --out /tmp/preview.png --dpi 200")
        print(f"    2. Open /tmp/preview.png and verify the region looks correct")
        print(f"    3. Only then use --box value above for actual crop")

    else:  # not_found
        print(f"❌ Could not find \"{search_phrase}\" or its words on page {page_num}")
        print(f"   Check spelling or try a shorter phrase")
        sys.exit(1)

if __name__ == "__main__":
    main()

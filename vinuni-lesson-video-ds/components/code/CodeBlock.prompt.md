# CodeBlock

A code card (SVG): a snippet in monospace with restrained, palette-only syntax colors, line numbers, per-line highlight and a typing reveal.

**Use for** a short snippet the narration reads — a local tool function ("cộng hai số"), a request body, a shell call, "khối mã … tô trường", "JSON phóng to role/content/system".
**Not for** a structured API payload with per-key glosses or id pairing (→ `JsonView`), an execution trace (→ `LogCard`), prose (→ `Card`).

Anatomy: bgAlt card · radius 20 · dotInactive 2 stroke · header 58 px (filename mono 19 textMuted, language Chip, MINH HỌA tag, 2 px divider) · gutter of line numbers (textMuted 55 %) · code in `MONO` at `fontSize` 22, line height × 1.45 · lines cut with "…" at the card edge (no wrapping — size `w` for the longest line: ≈ fontSize × 0.6 px per character + gutter).

Syntax mapping (palette only): key / keyword → accentStrong 700 · string → accent 600 · number / true / false / null → red 600 · function name → text 700 · punctuation → textMuted 500 · comment → textMuted 80 % · identifiers → text 500.

States: `highlight={[3, 5]}` → red-soft band + red left marker, others dim to 38 % (`dim={false}` keeps them) · `tone="accent"` → accent-tint band for a neutral pointer · `highlightAt` fades the band in over 18 f · `frame`/`start`/`cps` → typewriter over the whole text (grapheme-safe), red caret while typing · no `frame` = settled.

```jsx
<CodeBlock x={180} y={300} w={900} language="python" title="tools/cong_hai_so.py" illustrative
  code={'def cong_hai_so(a, b):\n    """Trả về tổng a + b."""\n    return a + b'}
  frame={frame} start={20} cps={36} highlight={[3]} highlightAt={120} />
```

Rules: ≤ 12 lines on screen (zoom = fewer lines at a larger `fontSize`, not a scaled card) · Vietnamese only in comments/strings · pass `illustrative` for code that was not actually run · connectors end on the card edge (`anchor({x, y, w, h: codeBlockHeight(props)}, 'right')`) · hold the settled card ≥ 60 f after typing ends.

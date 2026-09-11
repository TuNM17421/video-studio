# Brand

Official product logo, used only to NAME the product the lesson talks about (nominative use).

**Use for** a named product or protocol: `anthropic`, `claude`, `gemini`, `meta`, `huggingface`, `github`, `python`, `mcp`.
**Not for** generic ideas like "a chatbot" or "an API" (→ `LineIcon` / `Icon`), and never as decoration or proof.
OpenAI / ChatGPT and Microsoft Copilot are intentionally not included — take them from the owner's brand kit first.

Anatomy: the owner's mark (SVG drawing from Simple Icons, CC0) in the owner's brand color · optional product name under it.

States: `variant="color"` (default, brand color) · `variant="mono"` (one color: C.text or `color`) for busy diagrams.

```jsx
<Brand name="mcp" x={1500} y={420} size={72} label="Model Context Protocol" />
<Brand name="claude" x={420} y={420} size={64} variant="mono" />
```

Rules: never recolor to the kit palette, stretch, rotate or crop · keep clear space ≥ ½ size around the mark · never
place beside the VinUni mark as if partnered · credit "™ thuộc về chủ sở hữu" in the video credits · a screenshot of a
real product UI needs its own date + source note.

# SourceCard

A citation card — "thẻ nguồn trích đoạn": source title, page, a short quoted excerpt with the key
phrase marked, and whether it was checked.

**Use for** grounding an answer in a document, "câu trả lời đi qua cổng đối chiếu nguồn" (after a
`Gate`), naming a study ("Liu et al."), contrasting a verified citation with a claim that has none.
**Not for** a whole page of text (→ `DocumentSheet` with `lines`), a chat answer (→ `ChatWindow` /
`SpeechBubble`), a generic info card (→ `Card`).

Anatomy: card (radius 22, 3 px stroke by state) · LineIcon quote + title 20/700 · page 17/700 muted ·
excerpt 20/600 in quotes, word-wrapped, `highlight` on an amber (or accent) marker band · state chip
bottom-left (check "ĐÃ ĐỐI CHIẾU" green · x "KHÔNG CÓ NGUỒN" red).

States: verified · unverified (red dashed outline, white fill; no excerpt → two dashed empty lines) ·
neutral.

```jsx
<SourceCard x={1100} y={360} w={560} title="Quy chế học vụ 2026 · Điều 12" page="[Trang 15]"
  excerpt="Người học rút học phần trong 14 ngày đầu được hoàn 100% học phí."
  highlight="trong 14 ngày đầu" state="verified" opacity={appear(frame, 60)} />
```

Rules: excerpt ≤ 2–3 lines, quote the real text only · `highlight` must be an exact substring · made-up
sources carry `illustrative` · never draw a verified chip on a source the script does not verify.

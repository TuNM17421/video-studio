# ChatWindow

A generic, fictional chat-app mock (SVG) with turn-by-turn bubbles and a streaming reply.

**Use for** "bong bóng trò chuyện hiện từng mảnh", "ba bong bóng hội thoại xếp lượt", "Tách giao diện bong bóng trò chuyện khỏi hộp mô hình" (the chat UI as its own box, beside a model `GlassBox`).
**Not for** token-by-token model internals (→ `TokenChip` row), a web page (→ `BrowserFrame`), an email (→ `EmailCard`), a real assistant product's UI (never a look-alike).

Anatomy: white window · 3 px accent stroke · radius 22 · bgAlt header 64 px (bot icon ring · `title` 20 / 700 · optional `subtitle`) · list (20 px text, line height 28, gap 14; bubbles ≤ 76 % of the width, word-wrapped) · input pill + accent send button (80 px footer). Roles: **user** accent fill + white text, right · **assistant** bgAlt + hairline, left · **system** centered dotInactive chip, 17 px muted · **tool** dashed white bubble, wrench icon, MONO 17 px.

States / timing (pure functions of `frame`): message `at` → appear() over 12 frames with a 12 px rise · the LAST visible assistant message types in with `typeText()` from `streamStart` (default its `at`) at `cps`, with a steady caret while typing (no blink) · the list scrolls smoothly as messages arrive; bubbles pushed past the top fade · `revealUpTo` static step-through · `highlightIndex` red outline · no `frame` → settled. `illustrative` **defaults to true**.

```jsx
<ChatWindow x={1000} y={280} w={640} h={600} subtitle="trả lời theo lịch lớp" frame={frame} streamStart={54} cps={32}
  messages={[
    { role: 'user', text: 'Hạn nộp bài 3 của lớp CLASS-A là khi nào?', at: 20 },
    { role: 'tool', text: 'tra_lich(lop="CLASS-A", bai=3)', at: 38 },
    { role: 'assistant', text: 'Bài 3 hạn 21:00 thứ Sáu. Em nộp file PDF trên trang LMS nhé.', at: 50 },
  ]} />
```

Rules: ≤ 4–5 short messages per window (it is a lesson, not a transcript) · one streaming message at a time — the last assistant one · give typing enough time: frames ≈ chars × 30 / cps · realistic Vietnamese course copy, fictional names/codes (HS-017, CLASS-A).

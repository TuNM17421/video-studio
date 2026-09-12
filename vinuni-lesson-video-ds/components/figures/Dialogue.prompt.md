# DialogueCard

One character's line in a conversation video, revealed **word by word on the real voice**.

**Use for** "thẻ hội thoại", "hai nhân vật nói chuyện", "học viên hỏi — giảng viên trả lời": a video where
more than one voice speaks (see `templates/kich-ban-hoi-thoai.md`).
**Not for** a chat-app mock (→ `ChatWindow`), a single question in someone's words (→ `SpeechBubble`),
the narrator's own captions (→ the caption bar, `lib/captions.js`).

The text on the card **is** the narration. Pass `words` from `spokenWords(n)` and every word appears at the
frame it is actually said, so screen and voice can never drift. There is deliberately no prop for a
shortened caption — a hand-written summary is exactly what used to run out of sync with the audio.

Pass `avatar` (the URL `voice.cues.json` carries for that character) and a round face sits outside the card
on the speaker's own side; without it the card is name-only and nothing else changes.

Anatomy: character name above the card (19 / 700, in the character's hue) · bgAlt card, 3 px stroke,
radius 20 · tail under the card on the speaker's own side · line 26 / 600 in `C.text`, rows 38 px, wrapped
to the card width. Each word fades in over 7 frames where it lands — nothing slides, so the filled part of
the line stays readable.

```jsx
const { spokenWords } = createSpeech(RAW, VOICE);

const who = (n) => VOICE.cues.find((c) => c.n === n) || {};

<DialogueCard x={300} y={430} w={700} side="left"  speaker="Tới" tone="accent" avatar={who(1).avatar} words={spokenWords(1)} frame={frame} />
<DialogueCard x={920} y={640} w={700} side="right" speaker="Tú"  tone="red"    avatar={who(3).avatar} words={spokenWords(3)} frame={frame} />
```

Rules: one hue per character for the whole video, and keep it — the hue is how a viewer tracks who is
talking · a character stays on their own side, never swaps · at most two cards on screen at once (it is a
lesson, not a transcript) · `speaker` must be a name that exists in `voices.json`, the same one `cues.js`
casts with `speaker:` · content zone y 250–960 as everywhere else.

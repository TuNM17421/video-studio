---
name: make-video
description: Build a VinUni lesson video from a script, voice first — cues, ElevenLabs voice, scenes on the real timing, QA, render, transcript and chapters. Use for "dựng video", "làm video mới", "/make-video <id>", or when Video Studio (studio/) starts a stage.
---

# make-video — script → voice → scenes → MP4 → deliverables

Arguments: `<video-id>` and optionally a stage (`cues`, `scenes`, `deliver`). The request lives in
`projects/<id>/REQUEST.md`, written by Video Studio (`studio/`) or by hand. It names the style, the Day, the
script, optional feedback / old-video folders, notes and the scope. Read it first, then
`styles/<style>.json` (palette, showcase components, rules — the style's rules override defaults),
`vinuni-lesson-video-ds/README.md`, `vinuni-lesson-video-ds/SKILL.md` and the reference video
`vinuni-lesson-video-ds/ui_kits/lesson-video/videos/d2-01-lab/` (+ `projects/d2-01-lab/PROMPTS.md`).

Video dir below = `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id>/`. Reply in Vietnamese.

## Check the script before building — ask, never assume

The request names one video; the script file must match it. **Before stage 1, read the script end to end and
stop to ask the user** whenever it does not line up:
- the file holds **several videos / parts / sections** (a V0–V3 table, chapter headings, more than one "Tổng"
  duration) — say which part you think the id refers to and get a yes before writing cues;
- the **video id is ambiguous** (`d2-v2` = video V2 of the script, or version 2 of d2?), or the id, the Day,
  the section numbers and the script disagree;
- the script is **not the expected shape** (no narration lines, storyboard only, a transcript of an old video,
  a different lesson), is much longer or shorter than the requested video, or is cut off mid-scene;
- the content itself looks wrong: duplicated scenes, placeholder text, numbers or claims the script asks you
  to show but never states, instructions that break the design system (real photos, logos, other fonts/colors).

Quote the lines that made you stop, offer the reading you think is right, and wait. A wrong scope costs a full
rebuild and ElevenLabs credit; one question costs nothing. Record the answer in `projects/<id>/REQUEST.md`
("Phạm vi") and in PROMPTS.md, so the next run does not re-guess.

## Order (voice first)
1. **cues** (agent) — lock the narration.
2. **voice** (Video Studio, or the user in the CLI) — ElevenLabs with word timestamps, bound with `--write-cues`.
3. **scenes** (agent) — one scene per cue, authored at the recorded length, beats on real word times. QA.
4. **render** (Video Studio, or the user) — MP4 + transcript.
5. **deliver** (agent) — chapters, PROMPTS.md, final checks.

When Video Studio runs a stage it says so in the prompt: do ONLY that stage, then stop with a short
summary (what was made, open questions). Never run `tts.mjs generate`, never read `.env`, never push, never
run `/design-sync` — the studio or the user does those. Run by hand in the CLI (no studio), do the stages in
order and ask the user before spending ElevenLabs credit (show the dry-run first).

## Stage 1 · cues
- Copy the script to `projects/<id>/kich-ban-goc.md` if it is not there yet.
- If the request gives a feedback folder or old videos: read the feedback files; for old MP4s extract a few
  frames with ffmpeg (`node_modules/ffmpeg-static/ffmpeg` if ffmpeg is not on PATH) to see what to change.
  List every feedback item and how this version answers it (goes into PROMPTS.md at the end).
- Write `cues.js` in the video dir, same shape as the reference: `RAW` entries
  `{ n, seconds, section, title?, tag?, text, visual, voice?, pauseAfter?, silent?, quiz? }` — `text` is the
  narration **verbatim** from the script (change it only where the feedback explicitly asks, and record why),
  `seconds` a script estimate, `visual` what the scene shows. Export `SECTIONS`, `CUES`, `DURATION` and
  `export const { spokenAt, speechEnd } = createSpeech(RAW, VOICE);` with
  `import { VOICE } from './voice.js'` and `import { createSpeech } from '../../../../lib/speech.js'`.
- `quiz: true` marks a câu the quiz bed plays over — only the question itself and the pause where the viewer
  thinks (usually the `silent` cue), never the explanation that follows. Consecutive marked câu become one
  segment; the background bed goes silent across it and the quiz track fades in. Put `quiz` at the **end** of
  the entry: `voice-timing.mjs --write-cues` rewrites everything between `n:` and `frames:`, so a field parked
  there is deleted. Only mark câu when `projects/<id>/REQUEST.md` names a quiz track.
- `node tools/voice-timing.mjs --clear <video dir>` (creates the empty voice.js).
- Pronunciation swaps (English terms, abbreviations) → `projects/<id>/pronounce.json` (`{ "AI": "ây ai" }`).
- Check: `node tts-elevenlabs/tts.mjs generate --cues <video dir>/cues.js --pronounce <pronounce.json> --dry-run`
  prints what would be sent (free). Stop here in studio mode.

## Stage 2 · voice (not the agent in studio mode)
```console
node tts-elevenlabs/tts.mjs generate --cues <video dir>/cues.js --pronounce projects/<id>/pronounce.json --out voice/out/<id> [--pause 1.4]
node tools/voice-timing.mjs voice/out/<id>/voice.cues.json <video dir> --write-cues
```
Giọng có thể không đến từ ElevenLabs: thành viên tự thu, hoặc dùng model local. Khi đó
`node tools/voice-export.mjs <video dir> --out projects/<id>/voice-script` xuất bản đọc và
`node tools/voice-import.mjs --cues <video dir>/cues.js --from <thư mục audio>` (chạy `--scan` trước) dựng
master từ một thư mục `01.wav, 02.wav …`. Kết quả và các bước sau giống hệt đường ElevenLabs.
`--write-cues` writes each câu's measured `frames` / `speech` into cues.js; voice.js carries per-word
timestamps. Cached per câu: changing one câu's text re-bills only that câu.

## Stage 3 · scenes
- Timing is final: every scene lasts exactly its cue's `frames`. Place beats with `spokenAt(n, 'cụm từ')`
  (real word start) a few frames early; hold the settled state through `speechEnd(n)` + pause.
- Files, as in the reference: `shared.jsx` (eyebrow, captions, shell), `sNN.jsx` (one per cue), `video.jsx`
  (Series over TIMELINE), `timeline.js`, `card.html`, `player.html`, `STORYBOARD.md`.
- Rules: content zone y 250–960; captions ≤ 78 chars (lib/captions.js); colors only from `styles/<style>.json`
  and lib/tokens.js; Montserrat; connectors = particle on the drawn path, hidden on card faces, one pulse per
  arrival; no numbers or results the script does not give; prefer the style's showcase components when the
  content fits. Several scene groups can be built in parallel with forked agents.
- `npm run build && npm run verify` must end with "all checks passed".
- QA: shoot the settled frame of every scene (and mid-motion frames of busy ones) to `projects/<id>/qa/`
  (`sNN.png`, `sNN-fNNN.png`) with `node tools/shoot.mjs --batch <jobs.json>`; URL
  `<base>/ui_kits/lesson-video/index.html?scene=<id>&frame=<global frame>` where `<base>` is the preview
  server (studio: given in the prompt; CLI: `npm run serve` → http://127.0.0.1:8765). Open the stills, fix
  overlaps / clipping / empty frames, reshoot. Stop here in studio mode.

## Stage 4 · render (not the agent in studio mode)
```console
node tools/render.mjs --scene <id> --audio voice/out/<id>/voice.wav --out projects/<id>/render/<id>.mp4 --base <preview base>
node tools/transcript.mjs voice/out/<id>/voice.cues.json transcripts/<Day>/<id>.txt
```

## Stage 5 · deliver
- `chapters/<Day>/<id>-chương.txt`: `MM:SS: tên chương`, one line per script section (SECTIONS) at the start
  time of its first câu (from voice.cues.json `seconds`), titles summarised from the narration.
- `transcripts/<Day>/<id>.txt` exists (Stage 4); if not, generate it.
- `projects/<id>/PROMPTS.md`: source script, style, voice settings (model, pause), the feedback table,
  commands run, known limits — same headings as `projects/d2-01-lab/PROMPTS.md`.
- Final `npm run build && npm run verify`. Do not commit unless asked.

---
name: make-video
description: Build a VinUni lesson video from a script, voice first — cues, ElevenLabs voice, scenes on the real timing, QA, render, transcript and chapters. Use for "dựng video", "làm video mới", "/make-video <id>", or when Video Studio (studio/) starts a stage.
---

# make-video — script → voice → scenes → MP4 → deliverables

Arguments: `<video-id>` and optionally a stage (`cues`, `scenes`, `deliver`). The request lives in
`projects/<id>/REQUEST.md`, written by Video Studio (`studio/`) or by hand. It names the style, the Day, the
script, optional feedback / old-video folders, notes and the scope. Read it first, then
`styles/<style>.json` (palette, showcase components, rules — the style's rules override defaults),
`vinuni-lesson-video-ds/README.md` and `vinuni-lesson-video-ds/SKILL.md`.

**This file is the core every style shares.** How a style builds its scenes — file layout, components,
its reference video, its recurring mistakes, its extra QA criteria — lives in the style's own guide,
`styles/<style>.md` (REQUEST.md names it). A guide whose front matter says `extends: <parent>` adds to
the parent's guide: read the parent first. Where a guide and this file disagree on scenes, the guide wins.

Video dir below = `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id>/`. Reply in Vietnamese.

## Check the script before building — ask, never assume

For a new or substantially rewritten lesson, assign one dedicated script lane before cues. That lane writes narration only; the owner still verifies sources, reads the whole script aloud, repairs continuity, and records the review in `PROMPTS.md`.

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
1. **script lane → cues** — draft narration in a dedicated lane, then let the owner verify and lock it.
2. **voice** (Video Studio, or the user in the CLI) — ElevenLabs with word timestamps, bound with `--write-cues`.
3. **scenes** (agent) — one scene per cue, authored at the recorded length, beats on real word times. QA.
4. **render** (Video Studio, or the user) — MP4 + transcript.
5. **deliver** (agent) — chapters, PROMPTS.md, final checks.

When Video Studio runs a stage it says so in the prompt: do ONLY that stage, then stop with a short
summary. The harness runs deterministic gates and writes telemetry; the coding agent does not repeat build,
verify, still capture, render or transcript. Cues go through a free TTS dry-run; scene stills (in
`projects/<id>/qa/auto/`) go to an independent read-only QA session; findings become tracked feedback. Never run `tts.mjs generate`,
read `.env`, push or run `/design-sync` from a Studio agent stage.

In direct CLI mode, wrap a deterministic gate with `node tools/run-logged.mjs <stage> --video <id> -- <command…>`.
Bracket authoring with `node tools/video-workflow.mjs run start --video <id> --stage <stage> --actor <agent>`
and the matching `run finish`; this keeps token, time, machine, outcome and feedback history in the same ledger.

## Stage 1 · cues
- Copy the script to `projects/<id>/kich-ban-goc.md` if it is not there yet. Scripts follow
  `templates/kich-ban-co-ban.md`; every capability named in REQUEST.md adds its own
  `templates/modules/<id>.md` on top — read those files, they carry the rules for that capability.
  The mascot `Griffin` is one of them (`mascot`): use `Griffin` / `GriffinBadge` only when REQUEST.md turns it on,
  and only on the câu the script marks with a **Griffin** line.
- If the request gives a feedback folder or old videos: read the feedback files; for old MP4s extract a few
  frames with ffmpeg (`node_modules/ffmpeg-static/ffmpeg` if ffmpeg is not on PATH) to see what to change.
  List every feedback item and how this version answers it (goes into PROMPTS.md at the end).
- Write `cues.js` in the video dir, same shape as the reference: `RAW` entries
  `{ n, seconds, section, title?, tag?, text, visual, voice?, pauseAfter?, silent?, quiz? }` — `text` is the
  narration **verbatim** from the script (change it only where the feedback explicitly asks, and record why),
  `seconds` a script estimate, `visual` what the scene shows. Export `SECTIONS`, `CUES`, `DURATION` and
  `export const { spokenAt, speechEnd } = createSpeech(RAW, VOICE);` with
  `import { VOICE } from './voice.js'` and `import { createSpeech } from '../../../../lib/speech.js'`.
- `quiz: true` marks a câu the quiz bed plays over — only the pause where the viewer thinks (the `silent` cue,
  while the timer runs). Never the câu that reads the question out loud: the background bed carries that, and
  the quiz track comes in once the question is finished. Never the explanation that follows either, so the
  music is already gone before the answer is given. Consecutive marked câu become one
  segment; the background bed goes silent across it and the quiz track fades in. Put `quiz` at the **end** of
  the entry: `voice-timing.mjs --write-cues` rewrites everything between `n:` and `frames:`, so a field parked
  there is deleted. Only mark câu when `projects/<id>/REQUEST.md` turns the quiz capability on.
- `node tools/voice-timing.mjs --clear <video dir>` (creates the empty voice.js).
- Pronunciation swaps (English terms, abbreviations) → `projects/<id>/pronounce.json` (`{ "AI": "ây ai" }`).
- Check: `node tts-elevenlabs/tts.mjs generate --cues <video dir>/cues.js --pronounce <pronounce.json> --dry-run`
  prints what would be sent (free). Stop here in studio mode.

## Stage 2 · voice (not the agent in studio mode)
```console
node tts-elevenlabs/tts.mjs generate --cues <video dir>/cues.js --pronounce projects/<id>/pronounce.json --out voice/out/<id> [--pause 1.4]
node tools/voice-timing.mjs voice/out/<id>/voice.cues.json <video dir> --write-cues
```
Giọng có thể không đến từ ElevenLabs: thành viên tự thu, dùng model local, hoặc OmniVoice trên GPU Kaggle
(`voice-kaggle.md` cạnh file này). Khi đó
`node tools/voice-export.mjs <video dir> --out projects/<id>/voice-script` xuất bản đọc và
`node tools/voice-import.mjs --cues <video dir>/cues.js --from <thư mục audio>` (chạy `--scan` trước) dựng
master từ một thư mục `01.wav, 02.wav …`. Kết quả và các bước sau giống hệt đường ElevenLabs.
`--write-cues` writes each câu's measured `frames` / `speech` into cues.js; voice.js carries per-word
timestamps. Cached per câu: changing one câu's text re-bills only that câu.

## Stage 3 · scenes
Read the style guide `styles/<style>.md` (and its `extends` parent) first: it says how this style builds
scenes, which reference video to copy and which mistakes to check for. The rules below hold for every style.
- Timing is final: every câu lasts exactly its cue's `frames`. Place beats with `spokenAt(n, 'cụm từ')`
  (real word start) a few frames early; hold the settled state through `speechEnd(n)` + pause.
- Colors only from `styles/<style>.json` and lib/tokens.js; chrome (eyebrow, captions, footer) in Montserrat;
  no numbers or results the script does not give; prefer the style's showcase components when the content fits.
- No meaningless placeholders (grey bars, empty boxes, blank app windows) standing through a câu while the
  narration names the content: empty slots only when the script says "chưa biết / sẽ có" — otherwise fill
  them with the words being spoken.
- Captions ≤ 78 chars (lib/captions.js): read each câu's pages with `paginate` (verify prints only the
  video's total) and re-read every break before "từ / cho / bên"; a break that changes the meaning goes back
  to Stage 1 — never edit the narration here.
- `quiz: true` only on the `silent` cue (Stage 1 rule); `npm run verify` reports a problem when it sits on a
  spoken câu.
- `npm run build && npm run verify` must end with "all checks passed".
- QA: shoot three frames per câu — `start + 20`, the middle, `end − 3` (`sNN-a/b/c.png` or `sNN-fNNN.png`) —
  to `projects/<id>/qa/` with `node tools/shoot.mjs --batch <jobs.json>`; build jobs.json from `timeline.js`
  (`TIMELINE[i].start / .end` are global frames); URL
  `<base>/ui_kits/lesson-video/index.html?scene=<id>&frame=<global frame>` where `<base>` is the preview
  server (studio: given in the prompt; CLI: `npm run serve` → http://127.0.0.1:8765). Open every still, fix
  overlaps / clipping / empty frames / placeholders, reshoot. Stop here in studio mode.

## Stage 4 · render (not the agent in studio mode)
```console
node tools/render.mjs --scene <id> --audio voice/out/<id>/voice.wav --out projects/<id>/render/<id>.mp4 --base <preview base> [--no-captions]
node tools/transcript.mjs voice/out/<id>/voice.cues.json transcripts/<Day>/<id>.txt
```

## Stage 5 · deliver
- Before writing `chapters/<Day>/`, check the Day in REQUEST.md against the script head (`- **Ngày:** N`,
  lesson code `N1-01` / `D4-00`); if they disagree, stop and ask ("Check the script before building"), saying
  where Stage 4 already put `transcripts/<Day>/` — never pick one yourself.
- `chapters/<Day>/<id>-chương.txt`: `MM:SS: tên chương`, one line per script section (SECTIONS) at the start
  time of its first câu (from voice.cues.json `seconds`), titles summarised from the narration.
- `transcripts/<Day>/<id>.txt` exists (Stage 4); if not, generate it.
- `projects/<id>/PROMPTS.md`: source script, style, voice settings (model, pause), the feedback table,
  commands run, known limits — same headings as `projects/d2-01-lab/PROMPTS.md`.
- Final `npm run build && npm run verify`. Do not commit unless asked.

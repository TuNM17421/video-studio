# Claude-Design — lesson videos for VinUni "AI in Action 20K"

## One design system, experiments on a branch
`vinuni-lesson-video-ds/` is the only design system (the approved former "lab" direction: AgentLoop, Gate,
Swimlane, ChatWindow, CodeBlock, role hues…). Colors beyond the 9 base colors may only be declared in
`lib/tokens.js`; `tools/verify.mjs` must pass (warnings allowed, no problems).
- `main` — approved design system and official videos.
- `lab` — research, new components/colors/features. Merge into `main` only when the user approves.
Never keep a second copy of the design system in another folder. Commit before and after larger changes;
the repo is pushed to GitHub (private), `.env`, audio, MP4, `node_modules`, `ds-bundle/` are ignored.

Setup (see README "Setup lần đầu"): `npm install` (deps + links `node_modules/vinuni-lesson-video-ds`),
`npm run setup` (playwright Chromium), `tts-elevenlabs/.env` from `.env.example`. Tools find Chrome via
`$CHROME` → playwright's Chromium → system Chrome, and ffmpeg via `$FFMPEG` → ffmpeg-static → `ffmpeg` on PATH.
Read `vinuni-lesson-video-ds/README.md` (rules, tokens, components) and `vinuni-lesson-video-ds/SKILL.md`
before designing anything.

## Reference implementation
`vinuni-lesson-video-ds/ui_kits/lesson-video/videos/d2-01-lab/` (with `projects/d2-01-lab/`) is a complete,
QA'd video in the current style; `n2-00-gioi-thieu-ngay-2/` is a shorter one. Copy the structure:
- `cues.js` — one cue per narrated sentence: locked text (verbatim from the script), seconds, title
  (on-screen text). `spokenAt(n, phrase)` gives beat frames.
- `shared.jsx` — eyebrow, captions, common scene shell. `sNN.jsx` — one scene per cue, beats in `T`.
- `video.jsx` + `timeline.js` + `voice.js` — Series of scenes, retimed to the recorded voice.
- `STORYBOARD.md`, `card.html`, `player.html`.
Source script, notes and outputs live in `projects/<video-id>/` (kich-ban-goc.md, PROMPTS.md, render/).

## Pipeline for a new video (voice first) — skill `make-video`
`.claude/skills/make-video/SKILL.md` is the source of truth; the request is `projects/<id>/REQUEST.md`, the
style is `styles/<style>.json` (palette, showcase components, rules — they override defaults).
1. **cues** — script → `projects/<id>/kich-ban-goc.md`; `cues.js` (text verbatim; `createSpeech(RAW, VOICE)`
   from lib/speech.js); `voice-timing.mjs --clear`; TTS `--dry-run`.
2. **voice** — `node tts-elevenlabs/tts.mjs generate --cues <video>/cues.js --pronounce projects/<id>/pronounce.json --out tts-elevenlabs/out/<id>`
   (dry-run first, ask before spending credit; key in `tts-elevenlabs/.env`, never print/commit it), then
   `node tools/voice-timing.mjs tts-elevenlabs/out/<id>/voice.cues.json <video dir> --write-cues`
   (measured frames/speech into cues.js, word timestamps into voice.js).
3. **scenes** — author every scene at its recorded length; beats with `spokenAt(n, phrase)` (real word
   starts). Content zone y 250–960, captions ≤ 78 chars via lib/captions.js, colors from the style + lib/tokens.js,
   Montserrat, connectors: particle on the drawn path, hidden on card faces, one pulse per arrival; no
   numbers/results the script does not give. Parallel forks per scene group work well.
   `npm run build && npm run verify`; QA stills to `projects/<id>/qa/` with `node tools/shoot.mjs --batch`.
4. **render** — `node tools/render.mjs --scene <id> --audio tts-elevenlabs/out/<id>/voice.wav --out projects/<id>/render/<id>.mp4`
   (+ `--base` of the preview server), QA the MP4; `node tools/transcript.mjs <voice.cues.json> transcripts/DayNN/<id>.txt`.
5. **deliver** — `chapters/DayNN/<id>-chương.txt` (`MM:SS: tên chương`, one per script section),
   `projects/<id>/PROMPTS.md`, final build + verify.
Optional: `/design-sync` pushes `vinuni-lesson-video-ds/` to the Claude Design project in
`.design-sync/config.json` — only after the user approves the file list (each member uses their own account;
`/design-login` if DesignSync reports an auth error).

## Video Studio (`studio/`, Next.js, `npm run studio` → http://127.0.0.1:3100)
Local web UI over the same pipeline: the form writes REQUEST.md + `projects/<id>/.studio/state.json`; stages
cues/scenes/deliver run headless `claude -p` (dontAsk, allowlist in `studio/src/lib/server/agent.ts`); the
server itself runs TTS (key in RAM only), voice-timing, render and transcript. It serves the design system at
`/ds` (render/QA base). `STUDIO_TTS_MOCK=1` = silent mock voice for development. New styles = new
`styles/*.json`, no code change.

## Notes
- `studio/AGENTS.md` / `studio/CLAUDE.md` are written by `next dev`; read the Next.js docs in
  `studio/node_modules/next/dist/docs/` before changing studio code.
- ElevenLabs is used only here; the Video-studio Remotion repo (the original style source) mandates Google
  Cloud TTS. This repo no longer depends on Video-studio.
- Reply to the user in Vietnamese.

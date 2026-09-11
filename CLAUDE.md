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

## Pipeline for a new video (script → MP4 → deliverables)
1. Copy the script to `projects/<id>/kich-ban-goc.md`; write `cues.js` from it (text verbatim).
2. Build scenes (content zone y 250–960, captions ≤ 78 chars via lib/captions.js, colors from lib/tokens.js,
   Montserrat, connectors: particle on the drawn path, hidden on card faces, one pulse per arrival;
   no numbers/results the script does not give). Parallel forks per scene group work well.
3. `npm run build && npm run verify`; preview server `npm run serve` (port 8765);
   QA stills with `node tools/shoot.mjs --batch jobs.json` (…/index.html?scene=<id>&frame=N) — open them.
4. Voice (ElevenLabs, key in `tts-elevenlabs/.env`, never print/commit it):
   `cd tts-elevenlabs && node tts.mjs generate --cues ../vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id>/cues.js --pronounce pronounce.json`
   (`--dry-run` first; results cached). Then
   `node tools/voice-timing.mjs tts-elevenlabs/out/<id>/voice.cues.json <video dir>` and rebuild/verify.
5. `node tools/render.mjs --scene <id> --audio tts-elevenlabs/out/<id>/voice.wav --out projects/<id>/render/<id>.mp4`
   then QA the MP4 (duration, frames extracted from the MP4, audio levels).
6. Deliverables — always, for every finished video:
   `node tools/transcript.mjs <voice.cues.json> transcripts/DayNN/<id>.txt` (format `MM:SS - MM:SS: text`),
   `chapters/DayNN/<id>-chương.txt` (format `MM:SS: tên chương`, chapter = scene boundary / script section,
   title summarised from the narration), and `projects/<id>/PROMPTS.md` (source, voice settings, commands).
7. Optional: `/design-sync` pushes `vinuni-lesson-video-ds/` to the Claude Design project in
   `.design-sync/config.json` — only after the user approves the file list. Each team member syncs with their
   own claude.ai account (`/design-login` if DesignSync reports an auth error).

## Notes
- ElevenLabs is used only here; the Video-studio Remotion repo (the original style source) mandates Google
  Cloud TTS. This repo no longer depends on Video-studio.
- Reply to the user in Vietnamese.

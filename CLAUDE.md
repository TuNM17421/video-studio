# Claude-Design — lesson videos for VinUni "AI in Action 20K"

Videos are built here, outside the Video-studio repo (`~/Coding/Video-studio` is read-only for this work:
style source, `node_modules` for esbuild/react/ffmpeg/Chrome). Read `vinuni-lesson-video-ds/README.md`
(rules, tokens, components) and `vinuni-lesson-video-ds/SKILL.md` before designing anything.

## Reference implementation
`vinuni-lesson-video-ds/ui_kits/lesson-video/videos/n2-00-gioi-thieu-ngay-2/` is a complete, QA'd video.
Copy its structure for every new video:
- `cues.js` — one cue per narrated sentence: locked text (verbatim from the script), seconds, title
  (on-screen text), tag `MINH HỌA` for self-authored situations. `spokenAt(n, phrase)` gives beat frames.
- `shared.jsx` — eyebrow, captions, common scene shell. `sNN.jsx` — one scene per cue, beats in `T`.
- `video.jsx` + `timeline.js` + `voice.js` — Series of scenes, retimed to the recorded voice.
- `STORYBOARD.md`, `card.html`, `player.html`.
Source script, prompts and outputs live in `projects/<video-id>/` (script copy, PROMPTS.md, render/).

## Pipeline for a new video (script → MP4)
1. Copy the script to `projects/<id>/kich-ban-goc.md`; write `cues.js` from it (text verbatim).
2. Build scenes (content zone y 250–960, captions ≤ 78 chars via lib/captions.js, only the 9 colors,
   Montserrat, connectors: particle on the drawn path, hidden on card faces, one pulse per arrival;
   no numbers/results the script does not give). Parallel forks per scene group work well.
3. `node tools/build.mjs && node tools/verify.mjs`; preview server:
   `python3 -m http.server 8765 --bind 127.0.0.1 --directory vinuni-lesson-video-ds`;
   QA stills with `node tools/shoot.mjs --batch jobs.json` (…/index.html?scene=<id>&frame=N) — open them.
4. Voice (ElevenLabs, key in `tts-elevenlabs/.env`, never print/commit it):
   `cd tts-elevenlabs && node tts.mjs generate --cues <video>/cues.js --pronounce pronounce.json`
   (`--dry-run` first; results cached). Then
   `node tools/voice-timing.mjs tts-elevenlabs/out/<id>/voice.cues.json <video dir>` and rebuild/verify.
5. `node tools/render.mjs --scene <id> --audio tts-elevenlabs/out/<id>/voice.wav --out projects/<id>/render/<id>.mp4`
   then QA the MP4 (ffprobe, frames extracted from the MP4, audio levels).
6. Deliverables: `node tools/transcript.mjs <voice.cues.json> transcripts/DayNN/<id>.txt`
   (format `MM:SS - MM:SS: text`) and `chapters/DayNN/<id>-chương.txt` (format `MM:SS: tên chương`,
   chapter = scene boundary / script section, title summarised from the narration).
7. Optional: push the design system to Claude Design with DesignSync (project "VinUni Lesson Video",
   id 2e5e9d7a-7f11-4481-8a55-f337b3bb24d9) — only after the user approves the file list.

## Notes
- ElevenLabs is used only here; the Video-studio repo itself mandates Google Cloud TTS.
- The bundled ffmpeg is `~/Coding/Video-studio/node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg`
  (set LD_LIBRARY_PATH to its folder; no fps/tile filters, no s16le muxer — decode to WAV instead).
- Reply to the user in Vietnamese.

---
name: vinuni-lesson-video-design
description: Design system for VinUni "AI in Action 20K" lesson videos — white 16:9 1920×1080 · 30 fps scenes in the VinUni navy/blue/red palette with Montserrat, a red eyebrow + centered title header, brand watermark, navy burned-in subtitle bar, glassbox machines, particles flowing on connectors and continuously reshaping charts (3Blue1Brown technique). Use for any lesson-video scene, animated explainer, storyboard frame, slide, thumbnail or poster for this course, and whenever a design must match the existing Video-studio (Remotion) videos.
user-invocable: true
---

# VinUni Lesson Video design

Trước khi thiết kế, đọc trong `README.md` đúng hai mục: **"Hai dòng video: slide · poster"** (chọn
dòng — luật nào áp, luật nào không) và **"Mười hai luật cốt lõi"** (≈5,4 KB cả hai). Các mục còn lại
— token, giọng nội dung, motion grammar, scene pattern, bảng component — **tra khi cần**, đừng đọc
trước. Video dòng poster: doctrine ở `styles/poster.md`, không ở đây.

Rồi làm việc từ các file:

1. **Tokens** — `styles.css` (entry) → `tokens/colors_and_type.css` (CSS variables, type roles,
   Montserrat `@font-face`); `lib/tokens.js` for JS (`C` = the 9 allowed colors, `LAYOUT`).
2. **Components** — `components/**/Name.jsx` (React, pure: animated values come in as props),
   with `Name.d.ts` for props and `Name.prompt.md` for when/how to use them. Import from
   `components/index.js`. `SceneFrame` gives every scene its header, watermark, footer and subtitles.
3. **Motion** — `lib/motion.js` (Remotion-compatible `interpolate`, `spring`, `Easing` plus the
   named beats `appear`, `pulse`, `fadeWindow`, `smooth`) and `lib/geometry.js` (connector math:
   `pointAtDistance`, `anchor`, `sampleCubic`). A scene is a pure function of `useFrame()` at 30 fps.
4. **Scene templates** — `ui_kits/lesson-video/scenes/*.jsx`. Start from the closest pattern
   (hook, title card, chapter card, flow comparison, glassbox + reshaping distribution, next-token
   loop, guarded pipeline, recap rail, check question, editorial system map), then change the copy,
   geometry and frame constants. Preview: `ui_kits/lesson-video/index.html?scene=<id>`; freeze one
   frame at 1:1 with `&frame=<n>`.
5. **Complete videos**: see `ui_kits/lesson-video/videos/n2-00-gioi-thieu-ngay-2/`, a 16-cue
   overview video. `cues.js` holds the locked narration and `spokenAt` beats; `shared.jsx` holds the
   chrome, the `DayMap` and the captions; there is one `sNN.jsx` per cue; `video.jsx` joins them with
   `Series` and `STORYBOARD.md` has the storyboard. Build new multi-scene videos the same way.
6. **Deep dives** — `guidelines/motion-and-connectors.md`, `guidelines/content-and-copy.md`,
   `guidelines/claude-design-workflow.md` (prompts, export, porting back to Remotion).

## Before calling a scene done

- Only the 9 `C` colors (alpha variants allowed), only Montserrat 500/600/700, no emoji, no gradients.
- Header chrome, watermark and subtitle bar present; content stays inside y 250–960.
- Every visible object maps to a narrated idea. Lab: no `MINH HỌA` card/tag/stamp is drawn (the components drop it).
- Particles ride the drawn connector, hide on card faces, and each arrival pulses its card once.
- Frame constants are named, fit inside the scene duration, and the final state holds long enough to read.
- Captions are contiguous, ≤ 78 characters per page, with correct Vietnamese diacritics.
- Check the first sparse frame, a mid-motion frame, every hold and the densest final frame.

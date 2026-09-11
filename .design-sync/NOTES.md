# design-sync notes — VinUni Lesson Video DS

## Repo layout / build wiring
- **2026-09-11: the former lab folder was promoted to `vinuni-lesson-video-ds/`** — the only design system in the
  repo (the old 9-color stable folder and project 2e5e9d7a are retired). Experiments live on the git branch `lab`.
- **Repo is shared on GitHub.** Root `package.json` holds every dep (same pins as below); `npm install` creates a real
  root `node_modules` and its postinstall (`tools/link-ds.mjs`) links `node_modules/vinuni-lesson-video-ds -> ../vinuni-lesson-video-ds`
  (cfg.tokensPkg). `.ds-sync/lib` resolves ts-morph from the root `node_modules` by walking up. Each member syncs with their
  own claude.ai account and their own `projectId` (see README) — don't commit someone else's projectId to main.
- Not a published npm package. The DS lives in `vinuni-lesson-video-ds/` (hand-authored JSX + per-file `.d.ts`).
  For the converter it got a `package.json`, root `index.js` / `index.d.ts` barrels, `components/index.d.ts`
  and `lib/index.d.ts` (types for tokens/motion/geometry/captions/player/series). `cfg.entry` = `vinuni-lesson-video-ds/index.js`.
- `--node-modules ./node_modules` — a root symlink `node_modules -> .ds-sync/node_modules` (react/react-dom 19.2.3,
  matching `tools/package.json`). Pointing at `~/Coding/Video-studio/node_modules` does NOT work: the converter's
  workspace bound becomes Video-studio and every docsMap/extraFonts path is rejected as "outside the workspace root".
- Tokens: `cfg.tokensPkg` = the DS itself, via symlink `.ds-sync/node_modules/vinuni-lesson-video-ds -> ../../vinuni-lesson-video-ds`
  (recreate per clone, after `npm i` in `.ds-sync`). `cfg.extraFonts` harvests the Montserrat @font-face from tokens css.
- Playwright: use `playwright@1.61.1` in `.ds-sync` — it pins chromium build 1228, which is already in `~/.cache/ms-playwright`.
- Docs: per-component docs are `components/<g>/<File>.prompt.md` (several components share one file) — the converter's
  slug matcher can't find `*.prompt.md`, so `cfg.docsMap` maps each component. Player/Series docs live in `.design-sync/docs/`.
- Groups come from the src dir; multi-export files are pinned via `cfg.componentSrcMap`. `Flow` needed `@category flow`
  in its JSDoc (dir name == component name is filtered out of the group). `Easing` is excluded (object, not a component).

## Preview authoring (learned in the solo pass)
- Almost every component is an **SVG fragment positioned in 1920×1080 scene px** (`<g>`, `<text>`). It renders
  nothing outside an `<svg>`. Preview recipe: `<svg viewBox="0 0 W H" width="100%" style={{display:'block', background:C.bg, fontFamily:'var(--font-sans)'}}>`.
- **Font gotcha:** `SvgText`/`Multiline`/`RichText` set no font-family; they inherit from `.vk-scene`/`.vk-svg`.
  A bare `<svg>` renders them in a serif fallback — always set `fontFamily: 'var(--font-sans)'` on the svg.
- Full-scene components (SceneFrame, beats overlays): wrap in
  `<div style={{position:'relative',width:'100%',aspectRatio:'16 / 9',overflow:'hidden'}}><Player scene={S} duration={1} frame={0} controls={false}/></div>`
  — Player is `position:absolute; inset:0` and scales the 1920×1080 stage to fit.
- Animated props: pick a frame / progress that shows the settled state (`progress={1}`, `opacity` 1), plus at most one mid-motion cell.
- Best composition sources: the DS's own `components/<g>/card.html` (mountCard/mountFrame compositions) and `ui_kits/lesson-video/scenes/*.jsx`.
- Copy is Vietnamese, UPPERCASE noun + lowercase explanation; illustrative numbers carry `MINH HỌA`.

- HTML beats: BrandTitle/SectionCard/Statement = `SceneFrame header={false} overlay={...}` (Statement: `background={C.bgAlt}`);
  HookOverlay/QuestionCard/Recap = overlay under the normal header. Settled frames: BrandTitle/SectionCard/Statement 90,
  Hook 64, QuestionCard ≥ start+n*20+48, Recap last reveal + 90. Player `duration` must exceed the frozen `frame`.
- Chrome: SVG = CenterHeader, CornerTag, EditorialGrid (crop via viewBox); HTML = Eyebrow, Watermark, SubtitleBar,
  SceneFooter, EditorialHeader (need a `.vk-scene` parent → render inside the Player frame). Small HTML chrome uses a
  `Crop` helper (outer aspect box + inner absolutely-offset 16:9 Player) to zoom a stage region.
- Icons: each `<X>Icon` is a standalone 64×64 `<svg>` spreading props (nest in a scene svg with x/y/width/height; `color` sets stroke).
- Composition gotchas: Card centers `lines` vertically — put chips etc. below the copy in a taller card; NumberBadge at
  `card.x+36` collides with Card's label; Enclosure/GlassBox label pills are tight for long diacritic labels → pass `labelW`;
  ZoneLabel default size 16 is tiny in wide stages.
- Capture: cells are screenshotted in a 900×700 viewport — keep Stage viewBoxes landscape (w/h ≥ ~1.35) or the bottom clips.
  A render-time throw (e.g. forgetting to import `C`) leaves a BLANK cell and is NOT counted as an error — eyeball sheets for blanks.
- DayMap uses `overrides.DayMap.cardMode = column` (1720-px-wide strip is illegible in a grid cell).
- Guidelines land at `guidelines/guidelines/*.md` (converter preserves the package-relative path) — cosmetic, index.md links correctly.

## Visual expansion (P1/P2, 2026-09-11)
- Approved scope: P1/P2 components (control, ui, code, system, loop, table, context, Magnifier/SourceCard, DocumentSheet
  text/highlight/strike), role hues (option B), libs A1 (@remotion/paths, d3-shape/scale/interpolate, flubber, dagre),
  Lucide as primary icon source (I1 — only the 40 icons the components need are vendored; I2 "60 icons + draw-on" NOT
  approved), Brand namespace (I3). NOT approved: P3 (attention, history timeline, double diamond, ladder, AI-UX kit,
  personas, DuotonePhoto/Formula), M2/M3, D2.
- Runtime deps live in `.ds-sync/node_modules` (root `node_modules` symlink) and are declared in the DS `package.json`
  + `tools/package.json`. **Any `npm i` in `.ds-sync` deletes the `vinuni-lesson-video-ds` tokens symlink** — recreate it:
  `ln -sfn ../../vinuni-lesson-video-ds .ds-sync/node_modules/vinuni-lesson-video-ds` (build fails ENOENT on package.json otherwise).
- `tools/preview-harness.mjs <preview.tsx> <out.png> [--with file.jsx]` renders a preview straight from DS source in
  chromium (exit 1 on page errors) — used for parallel authoring without touching ds-bundle/.
- Group dir `ui/` is on the converter's generic-dir list → each ui component carries `@category ui` in its JSDoc
  (same trick as Flow/Brand). `BlockedBadge` (PermissionBoundary helper) is excluded via componentSrcMap null.
- `textWidth()` under-estimates Vietnamese Montserrat by ~8–10 %; new components wrap with a ×1.1 factor locally.
  Not changed globally on purpose (would shift Pill/Chip widths of graded components) — candidate for a deliberate
  recalibration + regrade.
- `Icon` / every `icon` prop falls back to LineIcon names; HTML beats use `iconComponent(name)`.

## Known render warns
- (none after authoring — all 69 components have authored previews)

## Re-sync risks
- `lib/index.d.ts` and `components/index.d.ts` are hand-maintained: a new lib export or component `.d.ts` must be added there
  or it's missing from the types/export scan. New multi-export components need `componentSrcMap` + `docsMap` entries.
- The tokens link is recreated by `npm install` (postinstall); `ds-bundle/` is regenerated by /design-sync.
- React pinned at 19.2.3 in `.ds-sync` (matches tools/package.json); bump both together.
- Previews freeze specific frames of animated beats — if beat timings in the source change, recheck Entering/Revealing/Popping cells.
- `Flow.jsx` carries `@category flow` purely for design-sync grouping; don't drop it.
- The durable set (.design-sync/{config.json,NOTES.md,conventions.md,previews/,docs/}) plus the DS additions
  (package.json, index.js, index.d.ts, lib/index.d.ts, components/index.d.ts) is committed to git.

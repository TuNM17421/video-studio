# Codex instructions for Claude-Design

## Required context

- Reply to the user in Vietnamese.
- Before planning or changing this repository, read `README.md` and `CLAUDE.md` completely. Treat the repository conventions in `CLAUDE.md` as required unless a later user instruction overrides them.
- Inspect `git status --short` before editing. Preserve existing and concurrent work; do not clean, overwrite, stage, commit, switch branches, or push unless the user explicitly asks.
- Read the actual source and package scripts before choosing commands. Do not infer behavior from names alone.

## Video workflow

- For any request to create, revise, QA, retime, or render a lesson video, read `.claude/skills/make-video/SKILL.md` completely and follow it as the repository's canonical video workflow. The `.claude` path is intentional and must be read even though Codex does not auto-discover it as a native skill.
- Also read the requested `projects/<id>/REQUEST.md`, the selected `styles/<style>.json`, `vinuni-lesson-video-ds/README.md`, `vinuni-lesson-video-ds/SKILL.md`, and the reference assets required by the workflow before designing scenes.
- Preserve the voice-first order and approval gates: cues -> user review -> TTS dry-run -> explicit approval before paid ElevenLabs generation -> voice timing -> scenes -> build/verify -> opened-still QA -> render -> transcript and chapters.
- Never inspect, print, paste, or commit secrets from `.env` files. A repository command may load credentials internally only when the user has authorized that paid operation.
- Do not use old or unrelated audio when a requested voice source is missing. Report the missing input instead.
- Do not run `/design-sync`, change the Claude Design project, or publish anything unless the user explicitly requests it and approves the proposed scope.

## Verification

- Run checks in proportion to the change. For video implementation, `npm run build && npm run verify` must pass.
- Visual acceptance requires opening the generated QA stills; a successful build or render command alone is not visual QA.
- Before declaring a final video complete, validate the rendered media, timing, audio presence, transcript, and chapters required by the workflow.

## Video Studio

- When changing `studio/`, also follow the nearest `studio/AGENTS.md`. Read the bundled Next.js documentation referenced there before editing framework code.
- Video Studio has separate Claude Code and Codex adapters. Keep their CLI arguments, JSON event parsing, session resume handling, and permission boundaries provider-specific; never implement a provider change as a binary-name swap.
- Treat `state.agent.provider` as immutable after video creation. Existing states without a provider belong to Claude. Do not add a normal UI or API for switching an in-progress video's provider; any future migration must be an explicit, audited admin operation.
- The Studio harness contract is `docs/VIDEO-WORKFLOW-HARNESS.md`. Coding agents author stage files only. The runner owns build, verify, still capture, render, transcript and final gates; do not spend an agent turn re-running deterministic commands.
- Every job and feedback round must be written to `.studio/runs.jsonl` / `.studio/feedback.jsonl`. Retry prompts must include the stage's open improvement items. Do not approve scenes while blocker/major feedback remains open. QA findings are identified by `stage + scene + code`, never by the model's wording.
- Visual QA is a separate, read-only session with a clean context (a temporary packet outside the repo). `STUDIO_QA_PROVIDER` picks the provider; the default `auto` picks an installed CLI other than the one authoring the video, and falls back to the same one only when nothing else is installed. Each provider keeps read-only in its own CLI terms (see `docs/VIDEO-WORKFLOW-HARNESS.md`). QA criteria are the shared ones plus the `## Tiêu chí QA` section of each enabled module — never hardcode capability-specific checks in the prompt.
- Every run records `machine` and, for agent runs, `model` when observed or explicitly configured. Never hardcode a model guess or silently drop the field.
- The same ledger applies outside Studio: wrap deterministic CLI gates with `tools/run-logged.mjs`, and bracket agent authoring with `tools/video-workflow.mjs run start` / `run finish`.

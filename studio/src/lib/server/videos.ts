import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { Artifacts, CuesInfo, StageId, StageStatus, VideoRequest, VideoState, VideoSummary } from "../types";
import { isAgentProvider } from "../agent-providers";
import { NO_MUSIC, SILENT, type MusicChoice } from "../music";
import { BASE_TEMPLATE_PATH } from "../modules";
import { cleanModules, moduleById } from "./modules";
import { defaultVoiceId, listVoices } from "./catalog";
import { isRunning } from "./jobs";
import { chaptersPath, exists, HttpError, mp4Path, projectDir, REPO, rel, stateDir, transcriptPath, videoDir, voiceOut, voiceScriptDir } from "./paths";

const execFileP = promisify(execFile);
const STAGES: StageId[] = ["cues", "voice", "scenes", "render", "deliver"];

export const DEFAULT_VOICE = {
  source: "elevenlabs" as const,
  voiceId: "",
  model: "eleven_turbo_v2_5",
  language: "vi",
  pause: 1.4,
  importDir: "",
  kaggleRefAudio: "",
  kaggleRefText: "",
  kaggleSpeed: 1.0,
};
/** A brand-new video starts on the catalog's default narrator; an existing one keeps whatever it stored. */
export const newVoice = () => ({ ...DEFAULT_VOICE, voiceId: defaultVoiceId() });

type LegacyVideoState = Omit<VideoState, "agent" | "music"> & {
  agent?: Partial<VideoState["agent"]>;
  sessionId?: unknown;
  /** Before quiz music there was one track, stored as a bare id — and "bg" was the only one. */
  music?: string | Partial<MusicChoice>;
};

/** The single pre-catalog track became bg-goc, the reference bed the catalog was built around. */
function normalizeMusic(stored: LegacyVideoState["music"]): MusicChoice {
  if (typeof stored === "string") return { ...SILENT, background: stored === "bg" ? "bg-goc" : NO_MUSIC };
  return { background: stored?.background ?? NO_MUSIC, quiz: stored?.quiz ?? NO_MUSIC };
}

/** Old Studio states predate provider binding. They belong to Claude and retain their Claude session. */
export function normalizeVideoState(value: unknown): VideoState {
  const stored = value as LegacyVideoState;
  const { sessionId: legacySessionId, ...state } = stored;
  const provider = isAgentProvider(stored.agent?.provider) ? stored.agent.provider : "claude";
  const music = normalizeMusic(stored.music);
  const modules = cleanModules(state.request?.modules);
  // Quiz existed as a music-only choice before it became a first-class capability card.
  if (music.quiz !== NO_MUSIC && !modules.includes("quiz")) modules.push("quiz");
  const currentSession = stored.agent?.sessionId;
  const sessionId = typeof currentSession === "string" || currentSession === null
    ? currentSession
    : typeof legacySessionId === "string" ? legacySessionId : null;
  return {
    ...state,
    agent: { provider, sessionId },
    request: { ...state.request, modules },
    voice: { ...DEFAULT_VOICE, ...stored.voice },
    music,
  } as VideoState;
}

function stateFile(id: string) {
  return path.join(stateDir(id), "state.json");
}

/** Day of a video made outside the studio: where its transcript or chapters live. */
function findDay(id: string) {
  for (const root of ["transcripts", "chapters"]) {
    const dir = path.join(/* turbopackIgnore: true */ REPO, root);
    if (!exists(dir)) continue;
    for (const day of fs.readdirSync(/* turbopackIgnore: true */ dir)) {
      const files = fs.readdirSync(/* turbopackIgnore: true */ path.join(dir, day));
      if (files.some((f) => f === `${id}.txt` || f.startsWith(`${id}-`))) return day;
    }
  }
  return "";
}

export function artifacts(id: string, day: string): Artifacts {
  const firstMp4 = () => {
    const dir = path.join(projectDir(id), "render");
    if (exists(mp4Path(id))) return mp4Path(id);
    if (!exists(dir)) return null;
    const f = fs.readdirSync(dir).find((x) => x.endsWith(".mp4"));
    return f ? path.join(dir, f) : null;
  };
  const chapters = () => {
    if (!day) return null;
    if (exists(chaptersPath(day, id))) return chaptersPath(day, id);
    const dir = path.join(REPO, "chapters", day);
    const f = exists(dir) ? fs.readdirSync(dir).find((x) => x.startsWith(`${id}-`)) : undefined;
    return f ? path.join(dir, f) : null;
  };
  const voiceJs = path.join(videoDir(id), "voice.js");
  const wav = path.join(voiceOut(id), "voice.wav");
  const mp4 = firstMp4();
  const ch = chapters();
  const prompts = path.join(projectDir(id), "PROMPTS.md");
  return {
    script: exists(path.join(projectDir(id), "kich-ban-goc.md")),
    cues: exists(path.join(videoDir(id), "cues.js")),
    voice: exists(path.join(voiceOut(id), "voice.cues.json")) && exists(voiceJs) && !/VOICE = null/.test(fs.readFileSync(voiceJs, "utf8")),
    voiceWav: exists(wav) ? rel(wav) : null,
    voiceScript: exists(path.join(voiceScriptDir(id), "doc-thu.md")),
    scenes: exists(path.join(videoDir(id), "video.jsx")),
    mp4: mp4 ? rel(mp4) : null,
    transcript: day && exists(transcriptPath(day, id)) ? rel(transcriptPath(day, id)) : null,
    chapters: ch ? rel(ch) : null,
    prompts: exists(prompts) ? rel(prompts) : null,
  };
}

/** Stage status inferred from files, for videos made before (or outside) the studio. */
function inferredStages(a: Artifacts): Record<StageId, StageStatus> {
  return {
    cues: a.cues ? "done" : "idle",
    voice: a.voice ? "done" : "idle",
    scenes: a.scenes ? "done" : "idle",
    render: a.mp4 ? "done" : "idle",
    deliver: a.transcript && a.chapters ? "done" : "idle",
  };
}

export function readState(id: string): { state: VideoState; managed: boolean } {
  if (!exists(projectDir(id)) && !exists(videoDir(id))) throw new HttpError(404, `Không có video ${id}.`);
  if (exists(stateFile(id))) {
    const state = normalizeVideoState(JSON.parse(fs.readFileSync(stateFile(id), "utf8")));
    // a server restart kills running agents: never leave a stage stuck in "running"
    if (!isRunning(id)) for (const s of STAGES) if (state.stages[s] === "running") state.stages[s] = "error";
    return { state, managed: true };
  }
  const day = findDay(id);
  const request: VideoRequest = {
    style: "lesson-lab", modules: [], day, title: id, scriptName: "kich-ban-goc.md", feedbackDir: "", oldVideoDir: "", notes: "",
    scope: { scenes: true, voice: true, render: true, transcript: true, chapters: true },
  };
  const now = new Date().toISOString();
  return {
    state: { id, createdAt: now, updatedAt: now, request, agent: { provider: "claude", sessionId: null }, stages: inferredStages(artifacts(id, day)), voice: newVoice(), music: { ...SILENT }, lastError: null },
    managed: false,
  };
}

export function writeState(state: VideoState) {
  state.updatedAt = new Date().toISOString();
  fs.mkdirSync(stateDir(state.id), { recursive: true });
  fs.writeFileSync(stateFile(state.id), `${JSON.stringify(state, null, 2)}\n`);
}

export function updateState(id: string, patch: (state: VideoState) => void) {
  const { state } = readState(id);
  patch(state);
  writeState(state);
  return state;
}

export function setStage(id: string, stage: StageId, status: StageStatus, error: string | null = null) {
  return updateState(id, (s) => {
    s.stages[stage] = status;
    s.lastError = error;
  });
}

export async function cuesInfo(id: string): Promise<CuesInfo | null> {
  if (!exists(path.join(videoDir(id), "cues.js"))) return null;
  try {
    const { stdout } = await execFileP(process.execPath, ["tools/cues-json.mjs", rel(videoDir(id))], { cwd: REPO, maxBuffer: 8 * 1024 * 1024 });
    return JSON.parse(stdout) as CuesInfo;
  } catch {
    return null;
  }
}

export function qaImages(id: string) {
  const dir = path.join(projectDir(id), "qa");
  if (!exists(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort().map((f) => rel(path.join(dir, f)));
}

export function listVideos(): VideoSummary[] {
  const ids = new Set<string>();
  const projects = path.join(REPO, "projects");
  if (exists(projects)) for (const d of fs.readdirSync(projects, { withFileTypes: true })) if (d.isDirectory()) ids.add(d.name);
  return [...ids].sort().map((id) => {
    const { state, managed } = readState(id);
    const a = artifacts(id, state.request.day);
    return {
      id,
      day: state.request.day,
      style: state.request.style,
      title: state.request.title || id,
      cueCount: null,
      managed,
      stages: managed ? state.stages : inferredStages(a),
      artifacts: a,
      running: isRunning(id),
      updatedAt: managed ? state.updatedAt : null,
    };
  });
}

export function styleName(id: string) {
  const file = path.join(REPO, "styles", `${id}.json`);
  return exists(file) ? (JSON.parse(fs.readFileSync(file, "utf8")).name as string) : id;
}

/** REQUEST.md: what the agent (and anyone running the video by hand) reads first. */
/** What each chosen capability demands of the script — written into REQUEST.md, which is what the agent reads. */
function moduleSections(modules: string[]) {
  // Every script follows the base template; each chosen capability adds only its own file on top. This part
  // is generic, so a capability added as a new templates/modules/<id>.md reaches the agent with no code.
  const lines: string[] = [
    "## Mẫu kịch bản",
    "",
    `Kịch bản theo \`${BASE_TEMPLATE_PATH}\`.`,
  ];
  for (const id of modules) {
    const m = moduleById(id);
    if (m) lines.push(`Có **${m.name}**: đọc thêm \`${m.template}\` — file đó chỉ ghi phần thêm so với mẫu cơ bản.`);
  }
  lines.push("");
  if (modules.includes("dialogue")) {
    const { voices, characters } = listVoices();
    const names = characters.length
      ? characters.map((c) => `${c.name} (giọng ${voices.find((v) => v.id === c.voice)?.name || c.voice})`).join(" · ")
      : voices.map((v) => `${v.name}${v.gender ? ` (${v.gender})` : ""}`).join(" · ");
    lines.push(
      "## Hội thoại",
      "",
      "Video này có nhiều người nói. Trong `cues.js`",
      "mỗi câu phải khai `speaker` (tên một nhân vật dưới đây) cùng `delivery` (kiểu đọc: ke · giang · nhe · hoi · nhan).",
      "",
      `Chỉ được dùng các nhân vật đã có: ${names}. Tên khác sẽ bị chặn ở bước dry-run.`,
      "Gom các câu liền nhau của cùng một người lại — ngữ điệu không nối qua ranh giới nhân vật.",
      "Thẻ hội thoại dùng `DialogueCard` với `words={spokenWords(n)}` và `avatar` lấy từ `VOICE.cues[i].avatar`;",
      "không viết caption tay, không tự đặt phía hay màu — nhân vật đã mang sẵn.",
      "",
    );
  }
  return lines;
}

/** What the agent must do for a quiz — cues must be marked even when the video uses no quiz music. */
function quizSection(enabled: boolean, quiz: string) {
  if (!enabled) return [];
  return [
    "## Quiz",
    "",
    quiz === NO_MUSIC
      ? "Video này có quiz nhưng không dùng nhạc quiz. Trong `cues.js`, vẫn đánh dấu `quiz: true` cho **đúng khoảng chờ người"
      : `Video này có nhạc quiz (\`${quiz}\`). Trong \`cues.js\`, đánh dấu \`quiz: true\` cho **đúng khoảng chờ người`,
    "xem suy nghĩ** — cue `silent`, lúc đồng hồ chạy và không có lời đọc.",
    "",
    "**Không** đánh dấu câu đọc câu hỏi: người hỏi đang nói thì vẫn là nhạc nền, nhạc quiz chỉ vào khi câu hỏi đã",
    "dứt. Cũng **không** đánh dấu phần chữa bài — nhạc phải tắt trước khi bắt đầu giải thích.",
    "",
    "Các câu liền nhau cùng có `quiz: true` được gom thành một đoạn. Đặt trường này ở cuối phần khai của câu,",
    "**đừng** đặt ngay sau `n:` — `voice-timing.mjs --write-cues` ghi `frames`/`speech` vào đúng chỗ đó và sẽ xoá mất nó.",
    "",
    quiz === NO_MUSIC
      ? "Không có nhạc quiz; giữ nguyên khoảng suy nghĩ theo kịch bản."
      : "Trong đoạn quiz, nhạc nền tự động tắt hẳn và nhạc quiz vào (có fade 0,5 giây hai đầu) — không phải làm gì thêm.",
    "",
  ];
}

export function requestMarkdown(id: string, r: VideoRequest, agentLabel?: string, quizMusic: string = NO_MUSIC) {
  const lines = [
    `# Yêu cầu dựng video ${id}`,
    "",
    `- Tên video: ${r.title || id}`,
    `- Style: ${styleName(r.style)} (\`styles/${r.style}.json\`)`,
    `- Ngày: ${r.day}`,
    `- Kịch bản: \`projects/${id}/kich-ban-goc.md\`${r.scriptName ? ` (tệp gốc: ${r.scriptName})` : ""}`,
    `- Feedback bản cũ: ${r.feedbackDir ? `\`${r.feedbackDir}\`` : "không có"}`,
    `- Video cũ: ${r.oldVideoDir ? `\`${r.oldVideoDir}\`` : "không có"}`,
    ...(agentLabel ? [`- Agent: ${agentLabel} (gắn cố định khi tạo video)`] : []),
    `- Phạm vi: ${[r.scope.scenes && "dựng cảnh + QA", r.scope.voice && "giọng đọc", r.scope.render && "render MP4", r.scope.transcript && "transcript", r.scope.chapters && "file chương"].filter(Boolean).join(", ")}`,
    `- Bổ sung: ${r.modules.length ? r.modules.map((m) => moduleById(m)?.name || m).join(", ") : "không có"}`,
    "",
    ...moduleSections(r.modules),
    ...quizSection(r.modules.includes("quiz") || quizMusic !== NO_MUSIC, quizMusic),
    "## Ghi chú",
    "",
    r.notes.trim() || "Không có.",
    "",
    "## Cách làm",
    "",
    "Làm theo skill `make-video` (`.claude/skills/make-video/SKILL.md`), thứ tự: cues → giọng → cảnh → render → bàn giao.",
    "",
  ];
  return lines.join("\n");
}

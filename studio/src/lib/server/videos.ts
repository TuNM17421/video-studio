import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { NO_MUSIC } from "../music";
import type { Artifacts, CuesInfo, StageId, StageStatus, VideoRequest, VideoState, VideoSummary } from "../types";
import { isAgentProvider } from "../agent-providers";
import { isRunning } from "./jobs";
import { chaptersPath, exists, HttpError, mp4Path, projectDir, REPO, rel, stateDir, transcriptPath, videoDir, voiceOut, voiceScriptDir } from "./paths";

const execFileP = promisify(execFile);
const STAGES: StageId[] = ["cues", "voice", "scenes", "render", "deliver"];

export const DEFAULT_VOICE = { source: "elevenlabs" as const, voiceId: "", model: "eleven_turbo_v2_5", language: "vi", pause: 1.4, importDir: "" };

type LegacyVideoState = Omit<VideoState, "agent"> & {
  agent?: Partial<VideoState["agent"]>;
  sessionId?: unknown;
};

/** Old Studio states predate provider binding. They belong to Claude and retain their Claude session. */
export function normalizeVideoState(value: unknown): VideoState {
  const stored = value as LegacyVideoState;
  const { sessionId: legacySessionId, ...state } = stored;
  const provider = isAgentProvider(stored.agent?.provider) ? stored.agent.provider : "claude";
  const currentSession = stored.agent?.sessionId;
  const sessionId = typeof currentSession === "string" || currentSession === null
    ? currentSession
    : typeof legacySessionId === "string" ? legacySessionId : null;
  return { ...state, agent: { provider, sessionId }, voice: { ...DEFAULT_VOICE, ...stored.voice } } as VideoState;
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
    state.music ??= NO_MUSIC; // back-fill state.json written before the music field existed
    return { state, managed: true };
  }
  const day = findDay(id);
  const request: VideoRequest = {
    style: "lesson-lab", day, title: id, scriptName: "kich-ban-goc.md", feedbackDir: "", oldVideoDir: "", notes: "",
    scope: { scenes: true, voice: true, render: true, transcript: true, chapters: true },
  };
  const now = new Date().toISOString();
  return {
    state: { id, createdAt: now, updatedAt: now, request, agent: { provider: "claude", sessionId: null }, stages: inferredStages(artifacts(id, day)), voice: { ...DEFAULT_VOICE }, music: NO_MUSIC, lastError: null },
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
export function requestMarkdown(id: string, r: VideoRequest, agentLabel?: string) {
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
    "",
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

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { Artifacts, CuesInfo, StageId, StageStatus, VideoFormat, VideoRequest, VideoState, VideoSummary } from "../types";
import { isAgentProvider } from "../agent-providers";
import { NO_MUSIC, SILENT, type MusicChoice } from "../music";
import { DEFAULT_BUILD_NO, isBuildNo, ITEM_ID_MAX, itemIdFor } from "../qa-manifest";
import { BASE_TEMPLATE_PATH } from "../modules";
import { DEFAULT_REVIEW, normalizeReview } from "../review";
import { cleanModules, moduleById } from "./modules";
import { sfxCatalog } from "./sfx";
import { styleGuideLine } from "./style-guides";
import { defaultVoiceId, listVoices } from "./catalog";
import { videoCost } from "./cost";
import { isRunning } from "./jobs";
import { chaptersPath, exists, HttpError, mp4Path, projectDir, qaManifestPath, REPO, rel, stateDir, transcriptPath, videoDir, voiceOut, voiceScriptDir } from "./paths";

const execFileP = promisify(execFile);
const STAGES: StageId[] = ["cues", "voice", "scenes", "render", "deliver"];

export const DEFAULT_VOICE = { source: "elevenlabs" as const, voiceId: "", model: "eleven_turbo_v2_5", language: "vi", pause: 1.4, importDir: "", speakers: {} as Record<string, string> };
/** A brand-new video starts on the catalog's default narrator; an existing one keeps whatever it stored. */
export const newVoice = () => ({ ...DEFAULT_VOICE, voiceId: defaultVoiceId() });

type LegacyVideoState = Omit<VideoState, "agent" | "music" | "captions" | "review" | "buildNo"> & {
  /** Missing before the QA-platform manifest; every older video is a first submission. */
  buildNo?: unknown;
  /** Missing before cross-review became a per-video switch. */
  review?: unknown;
  agent?: Partial<VideoState["agent"]>;
  sessionId?: unknown;
  /** Before quiz music there was one track, stored as a bare id — and "bg" was the only one. */
  music?: string | Partial<MusicChoice>;
  /** Missing before captions became optional — every video had them. */
  captions?: unknown;
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
    // itemId defaults to the video id, which is what this course sends as the platform's item code.
    request: { ...state.request, modules, itemId: typeof state.request?.itemId === "string" ? state.request.itemId : "" },
    voice: { ...DEFAULT_VOICE, ...stored.voice },
    music,
    captions: stored.captions !== false,
    buildNo: isBuildNo(stored.buildNo) ? stored.buildNo : DEFAULT_BUILD_NO,
    // Videos made before cross-review could be switched keep the behaviour they had: review on.
    review: normalizeReview(stored.review),
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
    qaManifest: exists(qaManifestPath(id)) ? rel(qaManifestPath(id)) : null,
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
    // a practice sample keeps its real state but is read-only, like a video made outside the studio
    return { state, managed: !state.sample };
  }
  const day = findDay(id);
  const request: VideoRequest = {
    style: "lesson-lab", modules: [], day, itemId: "", title: id, scriptName: "kich-ban-goc.md", feedbackDir: "", oldVideoDir: "", notes: "",
    scope: { scenes: true, voice: true, render: true, transcript: true, chapters: true },
  };
  const now = new Date().toISOString();
  return {
    state: { id, createdAt: now, updatedAt: now, request, agent: { provider: "claude", sessionId: null }, stages: inferredStages(artifacts(id, day)), voice: newVoice(), music: { ...SILENT }, captions: true, buildNo: DEFAULT_BUILD_NO, review: { ...DEFAULT_REVIEW }, lastError: null },
    managed: false,
  };
}

export function writeState(state: VideoState) {
  state.updatedAt = new Date().toISOString();
  fs.mkdirSync(stateDir(state.id), { recursive: true });
  // Through a temp file: a write cut short (Studio stopped, disk full) left half a JSON document, and one
  // unreadable state.json failed the whole video list, not just that video.
  const file = stateFile(state.id);
  const tmp = `${file}.${process.pid}.tmp`;
  const text = `${JSON.stringify(state, null, 2)}\n`;
  fs.writeFileSync(tmp, text);
  try {
    replaceFile(tmp, file);
  } catch {
    // Windows refuses to replace a file another program holds open (antivirus, indexer, a sync client) for a
    // moment. After a few tries write it in place, as before — never fail a job over it.
    fs.writeFileSync(file, text);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

const BUSY = new Set(["EPERM", "EACCES", "EBUSY"]);
const pause = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** rename over an existing file, retried while Windows says the target is in use. */
function replaceFile(from: string, to: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (error) {
      if (attempt >= 4 || !BUSY.has((error as NodeJS.ErrnoException).code ?? "")) throw error;
      pause(15 * (attempt + 1));
    }
  }
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

/** Stills in qa/ (shot by hand) and qa/auto/ (the scene gate's own folder). */
export function qaImages(id: string) {
  const dir = path.join(projectDir(id), "qa");
  return [dir, path.join(dir, "auto")].flatMap((d) => exists(d)
    ? fs.readdirSync(d).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort().map((f) => rel(path.join(d, f)))
    : []);
}

/**
 * A `projects/<id>/` holding nothing but `.studio/` is bookkeeping, not a video. The workflow ledger writes
 * `projects/<videoId>/.studio/runs.jsonl` for every run, and a run's `videoId` is not always a video: the
 * research pipeline passes `research-<rid>` as its telemetry ref (`research/agent.ts`), so one directory
 * appeared in this list per research turn. A video made outside Studio always has more than that — its
 * script and renders in `projects/<id>/`, or its scenes in the design system.
 */
export function isLedgerOnlyProject(roots: { project: string; scenes: string; state: string }) {
  if (exists(roots.state) || exists(roots.scenes)) return false;
  return exists(roots.project) && fs.readdirSync(roots.project).every((entry) => entry === ".studio");
}

export function listVideos(): VideoSummary[] {
  const ids = new Set<string>();
  const projects = path.join(REPO, "projects");
  if (exists(projects)) {
    for (const d of fs.readdirSync(projects, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      if (isLedgerOnlyProject({ project: projectDir(d.name), scenes: videoDir(d.name), state: stateFile(d.name) })) continue;
      ids.add(d.name);
    }
  }
  return [...ids].sort().flatMap((id) => {
    let read: ReturnType<typeof readState>;
    // One video whose state.json cannot be read must not take the list of every other video down with it;
    // opening that video still shows the error.
    try { read = readState(id); } catch (error) {
      console.error(`Bỏ qua ${id} trong danh sách: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
    const { state, managed } = read;
    const a = artifacts(id, state.request.day);
    return [{
      id,
      day: state.request.day,
      style: state.request.style,
      title: state.request.title || id,
      cueCount: null,
      managed,
      stages: managed || state.sample ? state.stages : inferredStages(a),
      artifacts: a,
      running: isRunning(id),
      updatedAt: managed ? state.updatedAt : null,
      cost: videoCost(id),
    }];
  });
}

export function styleName(id: string) {
  const file = path.join(REPO, "styles", `${id}.json`);
  return exists(file) ? (JSON.parse(fs.readFileSync(file, "utf8")).name as string) : id;
}

/** Capabilities the style cannot build yet (styles/<id>.json `unsupportedModules`). */
export function styleUnsupportedModules(id: string): string[] {
  const file = path.join(REPO, "styles", `${id}.json`);
  if (!exists(file)) return [];
  const list = (JSON.parse(fs.readFileSync(file, "utf8")) as { unsupportedModules?: unknown }).unsupportedModules;
  return Array.isArray(list) ? list.filter((m): m is string => typeof m === "string") : [];
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
    // only characters someone has lent a voice to can be cast; the others would stop the dry-run
    const cast = characters.filter((c) => c.voice);
    const names = cast.length
      ? cast.map((c) => `${c.name} (giọng ${voices.find((v) => v.id === c.voice)?.name || c.voice})`).join(" · ")
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
function quizSection(enabled: boolean) {
  if (!enabled) return [];
  return [
    "## Quiz",
    "",
    "Video này có quiz. Trong `cues.js`, đánh dấu `quiz: true` cho **đúng khoảng chờ người xem suy nghĩ** — cue",
    "`silent`, lúc đồng hồ chạy và không có lời đọc. Có dùng nhạc quiz hay không (và bài nào) chọn ở bước Render,",
    "nên luôn đánh dấu dù chưa biết nhạc.",
    "",
    "**Không** đánh dấu câu đọc câu hỏi: người hỏi đang nói thì vẫn là nhạc nền, nhạc quiz chỉ vào khi câu hỏi đã",
    "dứt. Cũng **không** đánh dấu phần chữa bài — nhạc phải tắt trước khi bắt đầu giải thích.",
    "",
    "Các câu liền nhau cùng có `quiz: true` được gom thành một đoạn. Đặt trường này ở cuối phần khai của câu,",
    "**đừng** đặt ngay sau `n:` — `voice-timing.mjs --write-cues` ghi `frames`/`speech` vào đúng chỗ đó và sẽ xoá mất nó.",
    "",
    "Nếu có nhạc quiz, trong đoạn quiz nhạc nền tự động tắt hẳn và nhạc quiz vào (fade 0,5 giây hai đầu) — không phải làm gì thêm.",
    "",
  ];
}

/**
 * Griffin is opt-in. The design system ships the component and the agent would otherwise be free to use it,
 * so the request says so either way — on: how to place it; off: not at all.
 */
/**
 * Danh mục tiếng phải nằm TRONG REQUEST.md, không chỉ trong file module: catalog đổi theo kho media (thêm
 * một tiếng là thêm một mục trong `sfx.json`), và agent chỉ được gọi id có thật — bịa một id thì chỗ đó
 * lặng lẽ rơi khỏi bản trộn. Cùng lý do với danh sách nhân vật của video hội thoại.
 */
function sfxSection(enabled: boolean) {
  if (!enabled) {
    return [
      "## Tiếng động",
      "",
      "Video này **không** có tiếng động: không viết dòng `- **Tiếng:**` hay `- **Nền:**` trong kịch bản.",
      "",
    ];
  }
  const catalog = sfxCatalog();
  const lines = [
    "## Tiếng động",
    "",
    "Video này có tiếng động. Chỗ nào thấy rõ là phải có tiếng thì khai thẳng trong kịch bản bằng dòng",
    "`- **Tiếng:** <id> @ \"<cụm từ trong lời>\"` của câu đó, hoặc `- **Nền:** <id>` ngay dưới tiêu đề một phần.",
    "Không khai gì cũng được — Studio tự đề xuất sau khi có giọng, và người dựng duyệt từng chỗ ở bước Render.",
    "",
    "**Chỉ được dùng id có trong danh mục dưới đây.** Id khác sẽ bị bỏ khi dựng bản trộn.",
    "",
  ];
  for (const layer of catalog.layers) {
    const sounds = catalog.sounds.filter((s) => s.layer === layer.id);
    if (!sounds.length) continue;
    const limit = layer.max != null
      ? ` · trần cứng ${layer.max} lần cả video`
      : layer.maxPerMinute != null ? ` · ngân sách ${layer.maxPerMinute} sự kiện mỗi phút` : "";
    lines.push(`**${layer.label}**${limit}`, "");
    for (const sound of sounds) lines.push(`- \`${sound.id}\` — ${sound.use}`);
    lines.push("");
  }
  lines.push(
    "Không đặt tiếng vào khoảng chờ quiz, không đặt giữa một con số hay tên riêng đang đọc, và không đặt ở",
    "chỗ trên hình không có gì thay đổi.",
    "",
  );
  return lines;
}

function mascotSection(enabled: boolean) {
  if (!enabled) {
    return [
      "## Linh vật",
      "",
      "Video này **không** có linh vật: không dùng `Griffin` / `GriffinBadge`, không để Griffin nói (`speaker`).",
      "",
    ];
  }
  return [
    "## Linh vật Griffin",
    "",
    "Video này có Griffin. Đầu kịch bản ghi vai (**Đi cùng** hoặc **Dẫn**); câu có dòng **Griffin** là câu có linh vật,",
    "câu không có dòng đó thì không vẽ Griffin.",
    "",
    "- Vẽ bằng `Griffin` (cả con) hoặc `GriffinBadge` từ `components/mascot/` — dáng, biểu cảm, đạo cụ theo",
    "  `Griffin.prompt.md`; đặt mỗi lần đổi đúng chữ kịch bản gắn vào bằng `spokenAt(n, cụm từ)`.",
    "- Vai **Dẫn**: mọi câu trong `cues.js` khai `speaker: 'Griffin'` (giọng mượn qua nhân vật trong `voices.json`),",
    "  như video mẫu `ui_kits/lesson-video/videos/mau-huong-dan/`. Vai **Đi cùng**: Griffin không nói.",
    "- Chân Griffin ở y ≈ 930 để cả con nằm trong vùng nội dung; một Griffin mỗi cảnh; nhường chỗ ở cảnh dày chữ.",
    "",
  ];
}


/** Nhãn người đọc của khổ hình. */
export const FORMAT_LABEL: Record<string, string> = {
  "16x9": "Ngang 16:9 · 1920×1080 (máy tính, LMS)",
  "9x16": "Dọc 9:16 · 1080×1920 (điện thoại)",
};

/**
 * Khổ hình phải được soát như `isModuleId` soát năng lực, vì cùng một lý do: một giá trị lạ lọt qua thành
 * "không khai" rồi im lặng về 16:9, mà REQUEST.md là thứ agent tuân theo khi đặt toạ độ đầu tiên.
 */
export const isVideoFormat = (value: unknown): value is VideoFormat => value === "16x9" || value === "9x16";

/**
 * `VideoRequest` của một video mới, dựng từ thân request của bước Kế hoạch — cắt độ dài, bỏ trường lạ, soát
 * khổ hình. Tách khỏi route API vì chỗ này **đã** đánh rơi một trường: nó liệt kê từng trường một, nên
 * `format` không bao giờ vào `state.json` và REQUEST.md luôn dặn agent dựng ngang dù người dùng chọn dọc.
 * Là hàm thuần thì test giữ được đủ trường, và lần sau thêm trường mới mà quên ở đây thì test đỏ.
 */
export function videoRequestFromBody(
  r: VideoRequest,
  { modules, scriptName }: { modules: string[]; scriptName: string },
): VideoRequest {
  // Soát như `isModuleId` soát năng lực: một khổ lạ không được im lặng thành "không khai" rồi về 16:9, vì
  // khung là luật dựng cảnh trong REQUEST.md chứ không phải một dòng ghi chú.
  if (r.format !== undefined && !isVideoFormat(r.format)) throw new HttpError(400, `Không có khổ hình: ${String(r.format)}`);
  return {
    style: r.style,
    format: r.format ?? "16x9",
    modules,
    day: r.day,
    itemId: String(r.itemId || "").trim().slice(0, ITEM_ID_MAX),
    title: String(r.title || "").slice(0, 200),
    scriptName: String(scriptName || "").slice(0, 200),
    feedbackDir: r.feedbackDir || "",
    oldVideoDir: r.oldVideoDir || "",
    notes: String(r.notes || "").slice(0, 5000),
    scope: { scenes: true, voice: !!r.scope.voice, render: !!r.scope.render, transcript: !!r.scope.transcript, chapters: !!r.scope.chapters },
  };
}

/**
 * Khổ hình đi vào REQUEST.md như một **luật dựng cảnh**, không phải một dòng ghi chú: agent phải biết nó
 * đang bày nội dung trên khung nào trước khi đặt toạ độ đầu tiên. #62 đã đo cái giá của việc biết sau —
 * render khung dọc từ cảnh ngang chỉ cắt mất góc phải, 44 % khung còn lại là khoảng trắng.
 */
function formatSection(format: string) {
  if (format !== "9x16") {
    return [
      "## Khổ hình",
      "",
      "Khổ **ngang 16:9** (1920×1080) — mặc định. `video.jsx` không cần khai `format` trong `meta`.",
      "",
    ];
  }
  return [
    "## Khổ hình — DỌC 9:16",
    "",
    "Video này dựng cho **khung dọc 1080×1920** (điện thoại). Đây không phải bản cắt của khổ ngang:",
    "cảnh phải được bày lại theo cột ngay từ đầu.",
    "",
    "- `video.jsx` khai `format: '9x16'` trong `meta`. Thiếu dòng này thì player, ảnh QA và render đều",
    "  chạy ở khổ ngang và cảnh bị cắt mất bên phải.",
    "- Toạ độ lấy từ `useLayout()` (`lib/player.jsx`), **không** dùng hằng số `LAYOUT`: hằng số đó là khổ ngang.",
    "- Vùng nội dung: x 48–1032, y 360–1740. Mọi thứ nằm ngoài khoảng đó bị cắt hoặc chui xuống thanh phụ đề.",
    "- **Bày theo cột, không theo hàng.** Khổ ngang kể chuyện trái → phải (nhân vật hai bên, sơ đồ nằm ngang);",
    "  khổ dọc kể trên → xuống (nhân vật xếp chồng, mũi tên đi xuống, so sánh A/B là hai thẻ chồng lên nhau",
    "  chứ không phải cạnh nhau). Mẫu: `ui_kits/lesson-video/scenes/11-doc-cot-9x16.jsx`.",
    "- Mỗi màn chỉ chứa được **ít khối hơn** khổ ngang: bề ngang chỉ còn 56 %. Thà tách thêm cảnh còn hơn nhồi.",
    "- Phụ đề chỉ **46 ký tự** một dòng (khổ ngang là 78). Gọi `cueCaptions(CUES, { max: L.captionMaxChars })`.",
    "- Chrome đã tự xếp lại: watermark ở trên, eyebrow xuống dưới nó — đừng tự đặt lại hai thứ đó.",
    "",
  ];
}

export function requestMarkdown(id: string, r: VideoRequest, agentLabel?: string) {
  const format = r.format || "16x9";
  const lines = [
    `# Yêu cầu dựng video ${id}`,
    "",
    `- Tên video: ${r.title || id}`,
    `- Mã item gửi QA: ${itemIdFor(r.itemId, id)}`,
    `- Style: ${styleName(r.style)} (\`styles/${r.style}.json\`)`,
    `- Khổ hình: ${FORMAT_LABEL[format] || format}`,
    ...(styleGuideLine(r.style) ? [`- ${styleGuideLine(r.style)}`] : []),
    `- Ngày: ${r.day}`,
    `- Kịch bản: \`projects/${id}/kich-ban-goc.md\`${r.scriptName ? ` (tệp gốc: ${r.scriptName})` : ""}`,
    `- Feedback bản cũ: ${r.feedbackDir ? `\`${r.feedbackDir}\`` : "không có"}`,
    `- Video cũ: ${r.oldVideoDir ? `\`${r.oldVideoDir}\`` : "không có"}`,
    ...(agentLabel ? [`- Agent: ${agentLabel} (gắn cố định khi tạo video)`] : []),
    `- Phạm vi: ${[r.scope.scenes && "dựng cảnh + QA", r.scope.voice && "giọng đọc", r.scope.render && "render MP4", r.scope.transcript && "transcript", r.scope.chapters && "file chương"].filter(Boolean).join(", ")}`,
    `- Bổ sung: ${r.modules.length ? r.modules.map((m) => moduleById(m)?.name || m).join(", ") : "không có"}`,
    "",
    ...formatSection(format),
    ...moduleSections(r.modules),
    ...quizSection(r.modules.includes("quiz")),
    ...mascotSection(r.modules.includes("mascot")),
    ...sfxSection(r.modules.includes("sfx")),
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

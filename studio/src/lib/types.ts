import type { MusicChoice } from "./music";
import type { BuildNo } from "./qa-manifest";

export type StageId = "cues" | "voice" | "scenes" | "render" | "deliver";
export type StageStatus = "idle" | "running" | "review" | "done" | "error";
import type { ImagesView } from "./images";

export type JobKind = StageId | "research" | "images" | "sfx" | "review" | "dry-run" | "voice-script" | "import-scan" | "omnivoice-setup" | "omnivoice-generate" | "align-setup" | "kaggle-setup" | "kaggle-generate" | "voice-retake" | "voice-retake-pick" | "cue-edit";
export type AgentProvider = "claude" | "codex" | "antigravity";

export interface AgentConfig {
  defaultProvider: AgentProvider;
  selectionLocked: boolean;
  /** Cross-review defaults for new videos, and which CLIs this machine actually has. */
  review: { defaults: ReviewSettings; installed: AgentProvider[] };
}

/** `/api/gateway-settings` — the 9router cost-tracking toggle for Codex, plus a live diagnosis. */
export interface GatewayStatus {
  status: "disabled" | "unreachable" | "key_missing" | "ok";
  message: string;
  settings: { enabled: boolean; keyName: string; profile: string };
}

/** `/api/telemetry-settings` — where video metrics are sent; `hasToken` only, the token itself never round-trips. */
export interface TelemetryStatus {
  url: string;
  hasToken: boolean;
  autoSync: boolean;
  ok: boolean;
  message: string;
}

/** Cross-review of scene stills by a separate read-only session (lib/review.ts). Changeable any time. */
export interface ReviewSettings {
  enabled: boolean;
  /** `auto` = an installed CLI other than the authoring one; otherwise that exact CLI. */
  provider: "auto" | AgentProvider;
}

export interface AgentBinding {
  provider: AgentProvider;
  sessionId: string | null;
}

export interface Scope {
  scenes: boolean;
  voice: boolean;
  render: boolean;
  transcript: boolean;
  chapters: boolean;
}

/**
 * Khổ hình của video — chọn ở bước Kế hoạch, TRƯỚC khi dựng cảnh, vì nó đổi cách bày nội dung chứ không
 * chỉ đổi cỡ khung. Xem `vinuni-lesson-video-ds/lib/tokens.js` → FORMATS.
 */
export type VideoFormat = "16x9" | "9x16";

/**
 * Nhịp hình của bản MP4 (`render.mjs --fps`) — chọn ở bước Render, KHÁC với khổ hình ở trên: khổ đổi cách
 * bày cảnh nên phải chọn trước khi dựng, còn nhịp chỉ là mật độ lấy mẫu lúc render. Danh mục lựa chọn và
 * mặc định ở `lib/render-spec.ts`.
 */
export type RenderFps = 30 | 60;

export interface VideoRequest {
  style: string;
  /** Khổ hình; bỏ trống = "16x9" (video làm trước khi có lựa chọn này). */
  format?: VideoFormat;
  /** Tính năng nội dung chọn thêm (lib/modules.ts), ví dụ "dialogue" hoặc "quiz". */
  modules: string[];
  day: string;
  /**
   * Mã item gửi kèm MP4 cho platform QA (`item_id` trong manifest.json). Mặc định là id video; sửa được ở
   * bước Kế hoạch vì platform khoá lỗi soát theo mã này, không theo thư mục. Rỗng = dùng id video.
   */
  itemId: string;
  title: string;
  scriptName: string;
  feedbackDir: string;
  oldVideoDir: string;
  notes: string;
  scope: Scope;
}

/** Where a video's narration comes from: the ElevenLabs API, or audio recorded/generated elsewhere. */
export type VoiceSource = "elevenlabs" | "kaggle" | "import" | "local";

/** Trạng thái môi trường OmniVoice trên máy này (tools/setup-omnivoice.mjs --check). */
export interface OmnivoiceStatus {
  installed: boolean;
  bin: string | null;
  venv: string;
  /** `tight` = chạy được nhưng sát: dưới 8 GB VRAM, hoặc không có GPU. */
  device: { id: "cuda" | "mps" | "cpu"; label: string; vramGb: number | null; tight: boolean };
  modelId: string;
  /** Trọng số model phải tải về, GB. */
  modelGb: number;
  /**
   * Bước nhập soát từng file bằng Whisper, và Whisper nằm trong venv riêng (một bản cho cả máy) — khác hẳn
   * venv của OmniVoice. Thiếu nó thì sinh giọng xong vẫn không nhập được, nên panel phải biết trước.
   */
  align: boolean;
  /** Server `omnivoice-demo`: model nằm sẵn trong RAM nên sinh giọng nhanh hơn chạy batch. */
  server: { running: boolean; pid: number | null; port: number; url: string | null; log: string };
}

/** Đường OmniVoice trên Kaggle: máy này chỉ cần `kaggle` CLI (tools/setup-kaggle.mjs --check) và credentials. */
export interface KaggleStatus {
  installed: boolean;
  bin: string | null;
  version: string | null;
  venv: string;
  /** CLI lấy từ venv riêng của repo, hay có sẵn trên PATH. */
  from: "venv" | "path" | null;
  /** Credentials đang giữ trong RAM của server (không bao giờ trả key về). */
  hasCreds: boolean;
  username: string | null;
  /** Whisper của bước nhập (`voice/.venv`) — cần để soát từng câu tải về. */
  align: boolean;
  /**
   * Model local có trên máy này không: "Sinh lại câu này" chạy trên máy kể cả với giọng tải từ Kaggle, nên
   * máy không có model thì panel không mời bấm.
   */
  localModel: boolean;
}

export interface VoiceSettings {
  source: VoiceSource;
  voiceId: string;
  model: string;
  language: string;
  pause: number;
  /** Last folder of per-câu audio picked for an import. */
  importDir: string;
  /**
   * Model local: giọng cho riêng một vai, khi không muốn dùng giọng voices.json đã gán sẵn cho nhân vật.
   * Khoá là tên người nói viết trong cues.js (`""` = người dẫn của video một giọng), giá trị là tên/id một
   * giọng trong danh mục hoặc đường dẫn tới một file audio trên máy để nhân bản. Thiếu khoá = theo mặc định.
   */
  speakers: Record<string, string>;
}

/** Một vai trong lượt sinh giọng local: ai đọc, bằng giọng nào, mẫu đã sẵn sàng chưa. */
export interface LocalRole {
  /** Tên viết trong cues.js; null với video một người dẫn. */
  speaker: string | null;
  name: string;
  character: string | null;
  avatar: string | null;
  side: string;
  tone: string;
  source: "catalog" | "file";
  voiceId: string | null;
  voiceName: string | null;
  file: string | null;
  /** Người dùng đã tự chọn giọng cho vai này, thay vì để mặc định của voices.json. */
  picked: boolean;
  cues: number;
  ready: boolean;
  note: string | null;
  error: string | null;
}

export interface LocalCast {
  dialogue: boolean;
  cues: number;
  spoken: number;
  ok: boolean;
  roles: LocalRole[];
  problems: string[];
}

/**
 * Something the recording of one câu seems to have lost or doubled (tools/lib/voice-align.mjs
 * speechIssues). A reason to listen, not a verdict: Whisper mishears on its own. `start`/`end` are
 * seconds in the câu's own file; `end: null` runs to the end of the file.
 */
export interface SpeechIssue {
  code: "truncation" | "dropped" | "repeat";
  words: string;
  start: number;
  end: number | null;
}

/** One take of a câu judged by tools/voice-retake.mjs — the same checks as a row of the import table. */
export interface RetakeTake {
  /**
   * "t1", "t2"… for the takes of the last retake, "orig" for the take the folder had before any retake,
   * "prev" for the take in use just before the last retake (when that was a take placed earlier).
   */
  name: string;
  /** Repo-relative path of the take's file. */
  file: string;
  seconds: number | null;
  matchRatio: number | null;
  heardText: string | null;
  issues: SpeechIssue[];
  level: "ok" | "warn" | "error";
  duration: "short" | "long" | "unmeasured" | null;
  /** Passes every check the import table applies — the only kind of take ever picked automatically. */
  pass: boolean;
}

/** The last retake of one câu (tools/voice-retake.mjs --json). */
export interface RetakeResult {
  n: number;
  key: string;
  /** Repo-relative folder the takes belong to. */
  dir: string;
  takes: RetakeTake[];
  original: RetakeTake | null;
  previous: RetakeTake | null;
  /** The take placed — automatically (best passing) or by the user; null when nothing was placed. */
  chosen: string | null;
  replaced: boolean;
  /**
   * replaced = a failing take was swapped for the best passing one; kept-passing = the take in use passes, so
   * the new ones are only listed; none-passed = nothing to swap in; picked = the user chose.
   */
  decision: "replaced" | "kept-passing" | "none-passed" | "picked";
  /** Which take the folder holds for this câu now, by content: a take name, "orig", "prev", "other" or "none". */
  inUse: string;
  at: string;
}

/** What Studio keeps per câu of the folder on screen (.studio/retakes.json): the last result, and the run in flight. */
export interface RetakeEntry extends Partial<RetakeResult> {
  n: number;
  /** A retake or a pick of this câu is running now. */
  running?: "retake" | "pick" | null;
  /** Why the last attempt failed; the takes of the run before it are still listed and usable. */
  error?: string | null;
  /** Which attempt `error` is about: generating takes, or putting a chosen take in place. */
  failed?: "retake" | "pick" | null;
}

/** One câu in an import report: which file it got, and everything that looked wrong about it. */
export interface ImportRow {
  n: number;
  key: string;
  file: string | null;
  silent: boolean;
  text: string;
  expectedSeconds: number;
  seconds?: number;
  level: "ok" | "warn" | "error";
  notes: string[];
  matchRatio?: number;
  heardText?: string;
  heardWords?: number;
  avgLogprob?: number | null;
  issues?: SpeechIssue[];
}

export interface ImportReport {
  id: string;
  from: string;
  cues: number;
  needFile: number;
  matched: number;
  pause: number;
  align: { used: boolean; model: string | null; note: string | null };
  ok: boolean;
  missing: number[];
  extra: { file: string; reason: string }[];
  clashes: { file: string; n: number; kept: string }[];
  rows: ImportRow[];
  /** Only on a completed import. */
  out?: string;
  durationInFrames?: number;
  seconds?: number;
}

export interface VoiceScript {
  dir: string;
  cues: number;
  spoken: number;
  files: string[];
  text: string;
}

export interface VoiceBound {
  source: VoiceSource;
  voiceId: string;
  model: string;
  at: string;
}

export interface VideoState {
  id: string;
  createdAt: string;
  updatedAt: string;
  request: VideoRequest;
  agent: AgentBinding;
  stages: Record<StageId, StageStatus>;
  voice: VoiceSettings;
  /**
   * The voice actually bound to the video, recorded when a generate/import binds it. `voice` is only the
   * form (a tab looked at, a folder scanned); this is what the result card reports. Absent on videos voiced
   * before it existed — the card falls back to `voice`.
   */
  voiceBound?: VoiceBound | null;
  /**
   * Track ids from music.json, never part of TTS. Both are picked on the render step; `quiz` only plays
   * over the cues marked `quiz: true` in cues.js.
   */
  music: MusicChoice;
  /** Burn the navy subtitle bar into the MP4 (render step; off = render.mjs --no-captions). */
  captions: boolean;
  /**
   * Nhịp hình của bản MP4 (`render.mjs --fps`), chọn ở bước Render. Đây là đơn vị lúc *render*, không phải
   * lúc dựng cảnh: cảnh vẫn viết bằng frame nguyên ở 30 fps, nên đổi nhịp không đụng cue, giọng hay cảnh.
   * Video mới mặc định 60; video tạo trước khi có lựa chọn này giữ 30 (lib/render-spec.ts).
   */
  fps: RenderFps;
  /**
   * Bản dựng thứ mấy của video này, gửi cho platform QA (`build_no`): 1 gửi soát lần đầu, 2 sau sửa,
   * 3 bản phát hành. Người dựng chọn ở bước Render — số lần render không suy ra được điều này.
   */
  buildNo: BuildNo;
  review: ReviewSettings;
  lastError: string | null;
  /**
   * A finished video shipped with the repo for the tour's practice mode (projects/mau-huong-dan): shown with
   * its real title and stages, but read-only — no agent, voice or render can be started on it.
   */
  sample?: boolean;
}

export interface LogEntry {
  t: number;
  kind: "agent" | "tool" | "result" | "system" | "error" | "output";
  text: string;
}

export interface JobInfo {
  kind: JobKind;
  status: "running" | "done" | "error" | "stopped";
  startedAt: number;
  /** `etaMs` is measured by the server from this job's own progress, so it excludes any phase before it. */
  progress: { percent: number | null; message: string; etaMs?: number | null } | null;
}

export interface Cue {
  n: number;
  text: string;
  title: string;
  section: number | null;
  visual: string;
  silent: boolean;
  /** Part of a question the viewer is meant to answer — the quiz track plays over these cues. */
  quiz: boolean;
  /** Tiếng động kịch bản đã khai cho câu này (dòng `- **Tiếng:**`), nếu có. */
  sfx: { id: string; word: string | null } | null;
  start: number;
  end: number;
}

export interface CuesInfo {
  exists: boolean;
  sections: string[];
  duration: number;
  voiced: boolean;
  voiceDuration: number | null;
  wordTimings: boolean;
  cues: Cue[];
}

export interface DryRun {
  model: string;
  format: string;
  voice: string | null;
  chars: number;
  billable: number;
  toGenerate: number;
  cues: { n: number; chars: number; cached: boolean; silent: boolean; text: string; speaker: string | null; avatar: string | null; speed: number }[];
}

export interface Artifacts {
  script: boolean;
  cues: boolean;
  voice: boolean;
  voiceWav: string | null;
  voiceScript: boolean;
  scenes: boolean;
  mp4: string | null;
  transcript: string | null;
  /** manifest.json beside the MP4 — what the QA platform needs to accept an upload. */
  qaManifest: string | null;
  chapters: string | null;
  prompts: string | null;
}

export interface WorkflowFeedback {
  id: string;
  stage: string;
  source: string;
  severity: "blocker" | "major" | "minor";
  message: string;
  status: "open" | "planned" | "applied" | "verified" | "wontfix";
  recurrence: number;
  acceptance: string;
}

export interface WorkflowReport {
  runs: { total: number; running: number; agent: number; deterministic: number; failures: number };
  automationRatio: number;
  usage: { inputTokens: number; cachedInputTokens: number; outputTokens: number; costUsd: number; toolCalls: number; measuredRuns: number };
  byStage: Record<string, { runs: number; agentTokens: number; durationMs: number; failures: number }>;
  byModel: Record<string, { runs: number; tokens: number; costUsd: number; failures: number }>;
  byMachine: Record<string, { runs: number; durationMs: number; failures: number }>;
  mostExpensiveStage: string | null;
  feedback: { open: number; blocker: number; major: number; minor: number; items: WorkflowFeedback[] };
  files: { runs: string; feedback: string; plan: string };
}

/** One step of the automated checks around an agent stage (lib/server/harness.ts). */
export type HarnessStepId = "agent" | "dry-run" | "build" | "verify" | "stills" | "review";
export type HarnessStepStatus = "pending" | "running" | "done" | "error" | "skipped";
export interface HarnessStep {
  id: HarnessStepId;
  label: string;
  status: HarnessStepStatus;
  startedAt?: number;
  finishedAt?: number;
  /** "4 ảnh", "Codex", or the reason it failed. */
  detail?: string;
}
export type HarnessStage = "cues" | "scenes" | "deliver";
/** The latest run of the checks for one stage; persisted in .studio/harness/<stage>.json. */
export interface HarnessRun {
  stage: HarnessStage;
  /** `agent` = an agent turn then the gates; `review` = gates + review only (Chạy lại review); `edit` = a câu edited by hand, then the dry-run. */
  kind: "agent" | "review" | "edit";
  status: "running" | "done" | "error" | "stopped";
  startedAt: number;
  finishedAt?: number;
  steps: HarnessStep[];
  review?: { provider: AgentProvider; runId: string; verdict: "pass" | "needs_changes"; summary: string };
}

/** A cross-review finding as the ledger holds it now (status moves as it is fixed or skipped). */
export interface QaFindingItem {
  id: string;
  severity: "blocker" | "major" | "minor";
  code?: string;
  scope?: string;
  message: string;
  evidence?: string;
  acceptance?: string;
  status: "open" | "planned" | "applied" | "verified" | "wontfix";
  recurrence: number;
  qaProvider?: string;
  runId?: string | null;
  /** The review run that no longer saw it (set when QA verifies it). */
  resolvedBy?: string;
  /** The QA run that stopped seeing the finding; `resolvedBy` keeps the same value for the review panel. */
  verifiedBy?: string;
  /** Why the user skipped it (status wontfix), and when. */
  skipReason?: string | null;
  decidedAt?: string;
  lastSeenAt: string;
}

export interface VideoDetail {
  state: VideoState;
  managed: boolean;
  cues: CuesInfo | null;
  qa: string[];
  artifacts: Artifacts;
  job: JobInfo | null;
  logs: LogEntry[];
  dryRun: DryRun | null;
  importReport: ImportReport | null;
  /** Câu regenerated with "Sinh lại câu này", by câu number — only for the folder being imported now. */
  retakes: Record<string, RetakeEntry>;
  workflow: WorkflowReport;
  /** CLIs installed on this machine — who can be picked to cross-review. */
  installedAgents: AgentProvider[];
  harness: Partial<Record<HarnessStage, HarnessRun>>;
  /** Every cross-review finding on the scenes stage, whatever its status. */
  findings: QaFindingItem[];
  /** Feedback that stops the Duyệt button right now (the same rule the approve API applies). */
  blocking: Record<"cues" | "scenes", number>;
  /** Image suggestions (capability `images`); null when the video does not use it. */
  images: ImagesView | null;
  cost: VideoCost;
}

/** A câu edited by hand in the cues step (lib/server/cue-edit.ts, tools/cue-edit.mjs). */
export type CueEditField = "text" | "title" | "visual";
export interface CueEditResult {
  n: number;
  changed: Partial<Record<CueEditField, { before: string; after: string }>>;
  /** The script's `- **Lời:**` line: rewritten, or why it was left alone. */
  script: "updated" | "not-found" | "ambiguous" | "none";
  /** The TTS dry-run the edited cues went through. */
  gate: "ok" | "failed" | "skipped";
  gateError?: string;
}

/** What a video has cost so far (lib/video-cost.ts): agent USD and ElevenLabs characters, each with what is missing. */
export interface VideoCost {
  /** USD reported by the agent runs that report one (Claude Code): API price, also on a subscription. */
  agentUsd: number;
  /** Every agent run that ran: authoring, visual QA and image suggestions, any CLI. */
  agentRuns: number;
  pricedRuns: number;
  /** Runs that reported tokens but no price (Codex), their tokens in + out, and which CLIs they were. */
  tokenRuns: number;
  tokens: number;
  tokenProviders: string[];
  /** Runs that reported nothing (Antigravity, runs from before the ledger). */
  silentRuns: number;
  /** Characters ElevenLabs billed, summed over the voice runs that recorded it. */
  ttsCharacters: number;
  ttsRuns: number;
  /** ElevenLabs runs from before the Studio recorded billed characters. */
  ttsUnrecorded: number;
}

export interface VideoSummary {
  id: string;
  day: string;
  style: string;
  title: string;
  cueCount: number | null;
  managed: boolean;
  stages: Record<StageId, StageStatus>;
  artifacts: Artifacts;
  running: boolean;
  updatedAt: string | null;
  cost: VideoCost;
}

export interface PaletteColor {
  hex: string;
  name: string;
  role: string;
}

export interface Showcase {
  component: string;
  group: string;
  image: string;
}

/** A file in the public R2 media bucket, already resolved to a URL the browser can play. */
export interface MediaAsset {
  key: string;
  url: string;
  type: string;
  bytes: number;
}

/**
 * One narrator in the committed catalog (voices.json). `engine` says who can speak it — "elevenlabs" now,
 * "local" once a cloned model reads the same line — so adding a local voice later is a JSON edit.
 */
export interface VoiceDef {
  id: string;
  name: string;
  engine: "elevenlabs" | "local";
  gender?: string;
  summary?: string;
  /** Resolved from the media manifest; null when the sample has not been pushed to R2. */
  sample: MediaAsset | null;
  isDefault: boolean;
}

/** A role on screen: its own face, side and hue, speaking with a voice from the catalog. */
export interface CharacterDef {
  id: string;
  name: string;
  /** Voice id it borrows; null while no voice has been given to it (it cannot be cast yet). */
  voice: string | null;
  /** Media key of the face. */
  avatar?: string | null;
  /** The face resolved against the media manifest; null when there is none or it was never pushed. */
  avatarUrl?: string | null;
  side?: "left" | "right";
  /** A hue name from the video design system's DialogueCard (accent, strong, red…), not a Studio color. */
  tone?: string;
  summary?: string;
  /** Other names a script may write in `speaker` for this character. */
  aliases?: string[];
}

export interface VoiceCatalog {
  characters: CharacterDef[];
  /** The line every sample reads, so the picker can say what you are about to hear. */
  sampleText: string;
  voices: VoiceDef[];
}

export interface StyleDef {
  id: string;
  name: string;
  order: number;
  extends?: string;
  summary: string;
  palette: PaletteColor[];
  showcase: Showcase[];
  /** Resolved from the media manifest; null when nothing has been pushed for this style. */
  sampleVideo: MediaAsset | null;
  rules: string[];
  /**
   * Content capabilities (templates/modules/<id>.md) this style cannot build yet — e.g. the whiteboard has no
   * dialogue card or quiz timer. The plan step greys their cards out and REQUEST.md never asks for them.
   */
  unsupportedModules?: string[];
  /** How this style builds scenes: `styles/<id>.md` and the guides it extends, parent first (style-guides.ts). */
  guides?: string[];
  /** Resolved from `extends`: the parent's palette / showcase, shown before this style's additions. */
  base?: { name: string; palette: PaletteColor[]; showcase: Showcase[] };
}

export interface LibraryComponent {
  name: string;
  group: string;
  doc: string | null;
  image: string | null;
  lab: boolean;
}

export interface LibraryGroup {
  id: string;
  card: string | null;
  components: LibraryComponent[];
}

export interface Library {
  groups: LibraryGroup[];
  videos: { id: string; player: string; format?: string }[];
}

/**
 * `/api/telemetry-local` — this machine's outbox as the "Số liệu" tab shows it. Built from a field whitelist:
 * values never outside it reach the browser, and a key outside it is reported by name only.
 * `acked` is only what sync-state.json receipts establish; there is no per-event "failed" state, because the
 * uploader only records the last attempt's error for the whole run.
 */
export type TelemetryEventStatus = "acked" | "pending" | "blocked" | "rejected";

export interface TelemetryPreviewEvent {
  status: TelemetryEventStatus;
  /** Why the uploader would refuse it (field path, never its value). */
  blockedReason: string | null;
  /** Why the collector refused it, from `outbox.rejected.jsonl`: the uploader will not try it again. */
  rejectedReason: string | null;
  /** Keys outside the preview whitelist that the raw event carries. */
  extraKeys: string[];
  event: Record<string, unknown>;
}

export interface TelemetryVideoMetrics {
  video: string;
  runs: number;
  finished: number;
  errors: number;
  durationMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  /** Sum of measured costs only; null when no event carried a cost with a source. */
  costUsd: number | null;
  costMeasured: number;
  costUnknown: number;
  feedbackOpen: number;
  lastAt: string | null;
}

export interface LocalTelemetry {
  outbox: { total: number; unreadableLines: number; byType: Record<string, number> };
  counts: { acked: number; pending: number; blocked: number; rejected: number };
  receipts: {
    found: boolean;
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    lastError: string | null;
  };
  sending: { url: string; hasToken: boolean; autoSync: boolean; enabled: boolean; syncing: boolean };
  /** Encrypted, opt-in AI logs: counted only — their content is never previewed. */
  aiLogs: { count: number; enabled: boolean; rejected: number };
  videos: TelemetryVideoMetrics[];
  preview: TelemetryPreviewEvent[];
  previewLimit: number;
}

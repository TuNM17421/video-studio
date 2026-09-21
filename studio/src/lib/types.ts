import type { MusicChoice } from "./music";

export type StageId = "cues" | "voice" | "scenes" | "render" | "deliver";
export type StageStatus = "idle" | "running" | "review" | "done" | "error";
export type JobKind = StageId | "review" | "dry-run" | "voice-script" | "import-scan" | "omnivoice-setup" | "omnivoice-generate" | "align-setup";
export type AgentProvider = "claude" | "codex" | "antigravity";

export interface AgentConfig {
  defaultProvider: AgentProvider;
  selectionLocked: boolean;
  /** Cross-review defaults for new videos, and which CLIs this machine actually has. */
  review: { defaults: ReviewSettings; installed: AgentProvider[] };
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

export interface VideoRequest {
  style: string;
  /** Tính năng nội dung chọn thêm (lib/modules.ts), ví dụ "dialogue" hoặc "quiz". */
  modules: string[];
  day: string;
  title: string;
  scriptName: string;
  feedbackDir: string;
  oldVideoDir: string;
  notes: string;
  scope: Scope;
}

/** Where a video's narration comes from: the ElevenLabs API, or audio recorded/generated elsewhere. */
export type VoiceSource = "elevenlabs" | "import" | "local";

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
   * Bước nhập soát từng file bằng Whisper, và Whisper nằm ở `voice/.venv` — một môi trường khác hẳn
   * venv của OmniVoice. Thiếu nó thì sinh giọng xong vẫn không nhập được, nên panel phải biết trước.
   */
  align: boolean;
  /** Server `omnivoice-demo`: model nằm sẵn trong RAM nên sinh giọng nhanh hơn chạy batch. */
  server: { running: boolean; pid: number | null; port: number; url: string | null; log: string };
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

export interface VideoState {
  id: string;
  createdAt: string;
  updatedAt: string;
  request: VideoRequest;
  agent: AgentBinding;
  stages: Record<StageId, StageStatus>;
  voice: VoiceSettings;
  /**
   * Track ids from music.json, never part of TTS. Both are picked on the render step; `quiz` only plays
   * over the cues marked `quiz: true` in cues.js.
   */
  music: MusicChoice;
  /** Burn the navy subtitle bar into the MP4 (render step; off = render.mjs --no-captions). */
  captions: boolean;
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
  /** `agent` = an agent turn then the gates; `review` = gates + review only (Chạy lại review). */
  kind: "agent" | "review";
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
  workflow: WorkflowReport;
  /** CLIs installed on this machine — who can be picked to cross-review. */
  installedAgents: AgentProvider[];
  harness: Partial<Record<HarnessStage, HarnessRun>>;
  /** Every cross-review finding on the scenes stage, whatever its status. */
  findings: QaFindingItem[];
  /** Feedback that stops the Duyệt button right now (the same rule the approve API applies). */
  blocking: Record<"cues" | "scenes", number>;
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
  videos: { id: string; player: string }[];
}

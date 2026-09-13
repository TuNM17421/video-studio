import type { MusicChoice } from "./music";

export type StageId = "cues" | "voice" | "scenes" | "render" | "deliver";
export type StageStatus = "idle" | "running" | "review" | "done" | "error";
export type JobKind = StageId | "dry-run" | "voice-script" | "import-scan";
export type AgentProvider = "claude" | "codex" | "antigravity";

export interface AgentConfig {
  defaultProvider: AgentProvider;
  selectionLocked: boolean;
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
export type VoiceSource = "elevenlabs" | "import";

export interface VoiceSettings {
  source: VoiceSource;
  voiceId: string;
  model: string;
  language: string;
  pause: number;
  /** Last folder of per-câu audio picked for an import. */
  importDir: string;
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
   * Track ids from music.json, never part of TTS. `background` is picked on the render step; `quiz` is
   * picked with the script, because it only plays over the cues marked `quiz: true` in cues.js.
   */
  music: MusicChoice;
  lastError: string | null;
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
  /** Voice id it borrows. */
  voice: string;
  /** Media key of the face. */
  avatar?: string;
  side?: "left" | "right";
  tone?: string;
  summary?: string;
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

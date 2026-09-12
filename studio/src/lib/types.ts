export type StageId = "cues" | "voice" | "scenes" | "render" | "deliver";
export type StageStatus = "idle" | "running" | "review" | "done" | "error";
export type JobKind = StageId | "dry-run" | "voice-script" | "import-scan";
export type AgentProvider = "claude" | "codex";

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
  /** Background music track id ("none" or a MUSIC_TRACKS id from lib/music.ts); render-only, not part of TTS. */
  music: string;
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
  progress: { percent: number | null; message: string } | null;
}

export interface Cue {
  n: number;
  text: string;
  title: string;
  section: number | null;
  visual: string;
  silent: boolean;
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
  cues: { n: number; chars: number; cached: boolean; silent: boolean; text: string }[];
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
  /** Whether assets/music/<track> is present — it is fetched from storage, not carried in git. */
  musicAvailable: boolean;
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

export interface StyleDef {
  id: string;
  name: string;
  order: number;
  extends?: string;
  summary: string;
  palette: PaletteColor[];
  showcase: Showcase[];
  sampleVideo: string | null;
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

export type StageId = "cues" | "voice" | "scenes" | "render" | "deliver";
export type StageStatus = "idle" | "running" | "review" | "done" | "error";
export type JobKind = StageId | "dry-run";

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

export interface VoiceSettings {
  voiceId: string;
  model: string;
  language: string;
  pause: number;
}

export interface VideoState {
  id: string;
  createdAt: string;
  updatedAt: string;
  request: VideoRequest;
  sessionId: string | null;
  stages: Record<StageId, StageStatus>;
  voice: VoiceSettings;
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

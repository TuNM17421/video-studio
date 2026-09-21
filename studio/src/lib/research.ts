import type { AgentProvider, JobInfo, LogEntry } from "./types";

/**
 * Kiểu dữ liệu của pipeline research ("Đóng gói kịch bản") — dùng chung cho trang và máy chủ.
 *
 * Nguồn sự thật là thư mục `research/<rid>/` trên đĩa. Hình dạng các file do `tools/` quy định (công cụ
 * dòng lệnh mà agent nào cũng chạy được); ở đây chỉ mô tả lại để TypeScript đọc chúng.
 */

export type ResearchStage = "extract" | "gate1" | "research" | "gate2" | "write" | "review" | "revise" | "gate3" | "done";
export type ResearchStatus = "idle" | "running" | "waiting" | "failed" | "done";

export type ClaimKind = "number" | "date" | "product" | "technical" | "quote" | "example";
export type Difficulty = "easy" | "normal" | "hard";
export type Priority = "high" | "normal" | "low";
export type Verdict = "ok" | "fix" | "wrong" | "insufficient";
export type Stance = "supports" | "contradicts" | "context";
export type SourceKind = "official" | "paper" | "reference" | "news" | "blog";

export interface OutlineSlide {
  slide: number;
  heading?: string;
  points?: string[];
  skip?: boolean;
}

export interface Claim {
  id: string;
  slides: number[];
  text: string;
  question: string;
  kind: ClaimKind;
  difficulty: Difficulty;
  timeSensitive: boolean;
  priority: Priority;
  key: string;
}

export interface Finding {
  claim: string;
  verdict: Verdict;
  answer: string;
  corrected?: string;
  reason?: string;
  sources: { id?: string; url?: string; kind?: SourceKind; title?: string; publisher?: string; published?: string | null }[];
  evidence: { source: string; quote: string; stance: Stance }[];
  reused?: { from: string; checkedAt: string };
}

export interface ClaimCheck {
  claim: string;
  ok: boolean;
  verdict: Verdict | null;
  quotes: { total: number; verified: number; unverifiable: number };
  problems: string[];
  warnings: string[];
  /** Bảng nguồn bộ soát đã dựng — vào feedback.json để lượt research lại sửa đúng chỗ. */
  sources?: { ref: string; stance: string | null; status: string; note: string | null; publisher: string | null; domain: string | null; kind: string | null; published: string | null }[];
  missing?: boolean;
  reused?: { from: string; checkedAt: string };
  savedFact?: string;
}

export interface SourceInfo {
  id: string;
  url: string;
  finalUrl?: string;
  title?: string | null;
  publisher?: string | null;
  published?: string | null;
  modified?: string | null;
  ok: boolean;
  error?: string;
  chars?: number;
}

export interface ScriptIssue {
  level: "problem" | "warning";
  cue: number | null;
  line: number | null;
  message: string;
}

export interface ScriptCheck {
  ok: boolean;
  stats: { cues: number; words: number; seconds: number };
  coverage: { slides: number; covered: number; missing: number[] };
  issues: ScriptIssue[];
  checkedAt?: string;
}

export interface EditReview {
  score: Partial<Record<"accuracy" | "hook" | "flow" | "clarity" | "spoken", number>>;
  issues: { cue: number | null; type: string; problem: string; fix: string }[];
}

export type RunStep = "extract" | "research" | "write" | "fix" | "edit";

export interface ResearchRun {
  n: number;
  step: RunStep;
  claims?: string[];
  agent: AgentProvider;
  model?: string | null;
  startedAt: string;
  endedAt?: string;
  /** ok · failed · stalled (không hoạt động quá lâu) · cap (vượt trần theo khối lượng) · stopped */
  result?: "ok" | "failed" | "stalled" | "cap" | "stopped";
  usage?: { input: number; output: number; cacheRead: number; cacheWrite: number };
  costUsd?: number;
}

export interface Deck {
  name: string;
  format: "pdf" | "pptx";
  file: string;
  text: string | null;
  slides: number | null;
  bytes: number;
  emptySlides?: number[];
}

export interface ResearchState {
  version: 1;
  id: string;
  title: string;
  createdAt: string;
  agent: AgentProvider;
  options: { cues: number };
  deck: Deck;
  stage: ResearchStage;
  status: ResearchStatus;
  error: string | null;
  gates: {
    gate1?: { at: string; claims: number };
    /** `dropped`: ý người duyệt bỏ ở cổng 2 — giữ lại chữ, vì claims.json được ghi lại không còn dòng đó. */
    gate2?: { at: string; auto: boolean; decisions?: Record<string, Gate2Decision>; dropped?: { id: string; text: string; slides: number[] }[] };
    gate3?: { at: string };
  };
  /** Số lượt research đã chạy cho từng claim — tối đa 2 (một lần làm, một lần sửa theo lỗi soát). */
  attempts: Record<string, number>;
  runs: ResearchRun[];
  /** Góp ý của người duyệt ở cổng 3, mới nhất ở cuối. */
  feedback?: { at: string; text: string }[];
  /** Claim người dùng vừa bấm "Research lại": lượt tới không lấy chúng từ thư viện dữ kiện. */
  noReuse?: string[];
  /**
   * Agent chính của chặng hiện tại (viết, sửa theo góp ý, sửa theo biên tập) đã xong, chỉ còn soát định dạng.
   * "Chạy tiếp" sau một lần soát hỏng thì chỉ soát lại — gọi agent lần nữa là áp góp ý hai lần.
   */
  lintPending?: boolean;
  /** Lượt mẫu chỉ-xem (`research/template-research`, chưa có — chờ chọn slide được phép commit). */
  sample?: boolean;
}

export type Gate2Decision = "drop" | "retry" | "accept";

export interface ResearchView {
  state: ResearchState;
  outline: OutlineSlide[] | null;
  claims: Claim[];
  findings: Record<string, Finding>;
  evidence: Record<string, ClaimCheck>;
  sources: Record<string, SourceInfo>;
  script: string | null;
  scriptCheck: ScriptCheck | null;
  edit: EditReview | null;
  job: JobInfo | null;
  logs: LogEntry[];
}

export interface ResearchSummary {
  id: string;
  title: string;
  createdAt: string;
  stage: ResearchStage;
  status: ResearchStatus;
  agent: AgentProvider;
  claims: number;
  passed: number;
  sample: boolean;
}

export const STAGE_LABEL: Record<ResearchStage, string> = {
  extract: "Bóc tách",
  gate1: "Chờ duyệt claim",
  research: "Research",
  gate2: "Chờ quyết định",
  write: "Viết kịch bản",
  review: "Soát & biên tập",
  revise: "Sửa theo góp ý",
  gate3: "Chờ duyệt kịch bản",
  done: "Xong",
};

export const KIND_LABEL: Record<ClaimKind, string> = {
  number: "Số liệu",
  date: "Mốc thời gian",
  product: "Sản phẩm, phiên bản",
  technical: "Khẳng định kỹ thuật",
  quote: "Trích lời",
  example: "Ví dụ",
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Dễ", normal: "Vừa", hard: "Khó" };
export const PRIORITY_LABEL: Record<Priority, string> = { high: "Ưu tiên cao", normal: "Bình thường", low: "Thấp" };

export const VERDICT_LABEL: Record<Verdict, string> = {
  ok: "Slide đúng",
  fix: "Cần sửa",
  wrong: "Slide sai",
  insufficient: "Không đủ nguồn",
};

export const STANCE_LABEL: Record<Stance, string> = { supports: "Ủng hộ", contradicts: "Phản bác", context: "Bối cảnh" };

export const RUN_RESULT_LABEL: Record<NonNullable<ResearchRun["result"]>, string> = {
  ok: "xong",
  failed: "lỗi",
  stalled: "đứng im quá lâu, đã dừng",
  cap: "vượt trần theo khối lượng, đã dừng",
  stopped: "đã dừng",
};

export const GATE2_LABEL: Record<Gate2Decision, string> = {
  retry: "Research lại",
  drop: "Bỏ claim",
  accept: "Ghi nhận không đủ nguồn",
};

/** Claim mới người duyệt thêm ở cổng 1 — trường nào để trống thì máy chủ điền mặc định. */
export function blankClaim(id: string): Claim {
  return { id, slides: [], text: "", question: "", kind: "technical", difficulty: "normal", timeSensitive: false, priority: "normal", key: "" };
}

/** Tổng token của các lượt agent — thứ người dùng cần thấy để biết lượt nào tốn. */
export function totalUsage(runs: ResearchRun[]) {
  return runs.reduce((sum, r) => ({
    input: sum.input + (r.usage?.input ?? 0) + (r.usage?.cacheWrite ?? 0),
    cached: sum.cached + (r.usage?.cacheRead ?? 0),
    output: sum.output + (r.usage?.output ?? 0),
  }), { input: 0, cached: 0, output: 0 });
}

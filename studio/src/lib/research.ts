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
/** Nhãn trong ô chọn (cột đã ghi "Ưu tiên"); trên thẻ claim thì dùng `PRIORITY_TAG`. */
export const PRIORITY_LABEL: Record<Priority, string> = { high: "Cao", normal: "Bình thường", low: "Thấp" };
/** Thẻ claim chỉ nói ưu tiên khi nó khác mặc định — "Bình thường" trên cả 12 thẻ chỉ là thêm chữ để đọc. */
export const PRIORITY_TAG: Partial<Record<Priority, string>> = { high: "Ưu tiên cao", low: "Ưu tiên thấp" };

// Lời giải thích từng nhãn ở cổng 1 — nói đúng điều code làm (tools/lib/research-check.mjs, runner.ts), vì người
// duyệt chọn độ khó là chọn số nguồn phải có và số lượt agent phải chạy.
export const DIFFICULTY_HELP: Record<Difficulty, string> = {
  easy: "Đủ với 1 nguồn gốc (trang chính thức, bài nghiên cứu, tài liệu tham khảo) hoặc 2 nơi xuất bản khác nhau. Research 6 claim mỗi lượt agent.",
  normal: "Cần 2 nơi xuất bản độc lập, hoặc 1 trang chính thức. Research 4 claim mỗi lượt agent.",
  hard: "Như Vừa, và có cảnh báo nếu không nguồn nào là nguồn gốc (chỉ báo, blog thuật lại). Research 2 claim mỗi lượt agent — tốn lượt nhất.",
};
export const PRIORITY_HELP: Record<Priority, string> = {
  high: "Research trước trong lô. Claim có cảnh báo sau khi soát thì dừng ở cổng 2 cho bạn xem.",
  normal: "Thứ tự bình thường trong lô.",
  low: "Xếp cuối trong lô. Không bớt nguồn, không bỏ research.",
};
export const TIME_SENSITIVE_HELP = "Nguồn mới nhất phải đăng trong 12 tháng; dữ kiện chỉ được dùng lại 90 ngày thay vì 365; có cảnh báo thì dừng ở cổng 2.";
export const KIND_HELP = "Chỉ để phân loại — không đổi cách research.";
export const SLIDES_HELP = "Kịch bản dẫn nguồn theo slide này. Để trống là cả bài.";
export const TEXT_HELP = "Chép sát lời slide — thư viện dữ kiện nhận lại claim theo đúng câu này.";
export const REUSE_NOTE = "Đã đổi câu hoặc câu hỏi so với bản agent: claim này sẽ research từ đầu, không dùng lại dữ kiện đã kiểm ở bài trước (nếu có).";

/** Trần số claim một lượt research — máy chủ cũng cắt ở đây (runner.ts `cleanClaims`, research-check.mjs). */
export const MAX_CLAIMS = 25;
/** Số claim mỗi lượt agent theo độ khó: claim dễ đi lô lớn (ít lượt, ít token cố định), claim khó đi lô nhỏ. */
export const RESEARCH_BATCH: Record<Difficulty, number> = { easy: 6, normal: 4, hard: 2 };
const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };
export const difficultyOf = (c: Claim): Difficulty => (c.difficulty in RESEARCH_BATCH ? c.difficulty : "normal");

/**
 * Lô claim cho từng lượt agent. Nằm ở đây chứ không ở máy chủ để cổng 1 báo trước được số lượt agent sẽ chạy —
 * con số người duyệt đổi được bằng cách bỏ qua claim hay hạ độ khó.
 */
export function batches(claims: Claim[]): Claim[][] {
  const out: Claim[][] = [];
  for (const d of ["hard", "normal", "easy"] as Difficulty[]) {
    const group = claims.filter((c) => difficultyOf(c) === d).sort((a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1));
    for (let i = 0; i < group.length; i += RESEARCH_BATCH[d]) out.push(group.slice(i, i + RESEARCH_BATCH[d]));
  }
  return out;
}

/**
 * Dàn ý nói bao nhiêu — theo mục, không theo slide: agent đánh số theo slide gốc nên số có thể nhảy (1–72 với 60 mục)
 * hay lặp (hai mục cùng số 47 khi PDF có trang dựng dần), và "60 slide" thì sai cả hai chiều.
 */
export function outlineSummary(outline: OutlineSlide[]): string {
  if (!outline.length) return "0 mục";
  const numbers = outline.map((o) => o.slide);
  const lo = Math.min(...numbers);
  const hi = Math.max(...numbers);
  return `${outline.length} mục, slide ${lo === hi ? lo : `${lo}–${hi}`}`;
}

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

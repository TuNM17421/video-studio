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
  /** Ghi chú không phải cảnh báo (vd. "dùng lại dữ kiện đã soát ngày …") — hiện cho người duyệt, không làm cổng 2 dừng. */
  notes?: string[];
  /** Mốc thời gian của dữ kiện hay đổi (nguồn mới nhất, hoặc ngày Studio tải trang docs chính thức) — kịch bản nói "tính đến …". */
  asOf?: string;
  /** Vân tay finding.json lúc soát — finding bị ghi lại sau đó thì lần soát sau soát lại nó. */
  findingHash?: string | null;
  /** Bảng nguồn bộ soát đã dựng — đi vào prompt của lượt research lại để nó sửa đúng chỗ. */
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
  /** Phân loại cho máy (tools/lib/script-lint.mjs): `length` = dài quá mức đặt; `pronounce` = việc của bước làm video. */
  code?: string;
}

export interface ScriptCheck {
  ok: boolean;
  stats: { cues: number; words: number; seconds: number };
  /** So với số câu đã đặt khi tạo lượt; null khi không có mức đặt. */
  length?: { target: number; words: number; maxCues: number; ratio: number } | null;
  coverage: { slides: number; covered: number; missing: number[] };
  issues: ScriptIssue[];
  checkedAt?: string;
}

export interface EditIssue {
  cue: number | null;
  type: string;
  problem: string;
  fix: string;
  /** Vài từ chép nguyên văn từ Lời của câu đó — để còn tìm được câu sau khi lượt sửa đánh số lại. */
  quote?: string;
}

export interface EditReview {
  score: Partial<Record<"accuracy" | "hook" | "flow" | "clarity" | "spoken", number>>;
  issues: EditIssue[];
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
  /** "code": dàn ý do code dựng từ chữ từng slide (input/slides.json) — agent bóc tách chỉ ghi claims.json. */
  outline?: "code";
  slides: number | null;
  bytes: number;
  emptySlides?: number[];
  /** Trang PDF gần như không có chữ — agent mở đúng trang đó trong PDF khi cần xem hình. */
  thinSlides?: number[];
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
  easy: "Đủ với 1 nguồn gốc (trang chính thức, bài nghiên cứu, tài liệu tham khảo) hoặc 2 nơi xuất bản khác nhau. Tra 6 điều mỗi lần gọi agent.",
  normal: "Cần 2 nơi xuất bản độc lập, hoặc 1 trang chính thức. Tra 4 điều mỗi lần gọi agent.",
  hard: "Như Vừa, và có cảnh báo nếu không nguồn nào là nguồn gốc (chỉ báo, blog thuật lại). Tra 2 điều mỗi lần gọi agent — tốn lần gọi nhất.",
};
export const PRIORITY_HELP: Record<Priority, string> = {
  high: "Tra trước trong nhóm. Điều có cảnh báo sau khi đối chiếu thì dừng ở hình thoi Bạn quyết cho bạn xem.",
  normal: "Thứ tự bình thường trong nhóm.",
  low: "Xếp cuối trong nhóm. Không bớt nguồn, không bỏ tra nguồn.",
};
export const TIME_SENSITIVE_HELP = "Nguồn mới nhất phải đăng trong 12 tháng; dữ kiện chỉ được dùng lại 90 ngày thay vì 365; có cảnh báo thì dừng ở hình thoi Bạn quyết.";
export const KIND_HELP = "Chỉ để phân loại — không đổi cách tra nguồn.";
export const SLIDES_HELP = "Kịch bản dẫn nguồn theo slide này. Để trống là cả bài.";
export const TEXT_HELP = "Chép sát lời slide — thư viện dữ kiện nhận lại điều này theo đúng câu này.";
export const REUSE_NOTE = "Đã đổi câu hoặc câu hỏi so với bản agent: điều này sẽ tra nguồn từ đầu, không dùng lại dữ kiện đã kiểm ở bài trước (nếu có).";

/**
 * Độ dài kịch bản theo số câu người dùng đặt khi tạo lượt. Cùng số với tools/lib/script-lint.mjs (`WORDS_PER_CUE`,
 * `LENGTH_WARN`, `SYLLABLES_PER_SECOND`) — phần soát bắt đúng mức prompt đã báo cho người viết; test giữ hai bên khớp.
 * 24 từ một câu: các video đã QA trung vị 22 từ (d2-01-lab), dài nhất 28.
 */
export const SCRIPT_BUDGET = { wordsPerCue: 24, minWords: 15, maxWords: 30, warnAbove: 1.2, syllablesPerSecond: 2.9 };

export function scriptBudget(cues: number) {
  const words = cues * SCRIPT_BUDGET.wordsPerCue;
  return { cues, maxCues: Math.floor(cues * SCRIPT_BUDGET.warnAbove), words, minutes: Math.round(words / SCRIPT_BUDGET.syllablesPerSecond / 6) / 10 };
}

const flatText = (s: string) => s.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * Góp ý biên tập nằm ở câu nào. Biên tập chấm bản **trước** lượt sửa theo góp ý, và lượt sửa gộp/tách/bỏ câu nên số
 * câu dời đi — gắn theo số thì góp ý hiện cạnh nhầm câu. Gắn theo đoạn trích (`quote`, ít nhất ba từ): không còn ở
 * câu nào nghĩa là câu đó đã được viết lại, tức góp ý đã xử lý. Góp ý không có đoạn trích (bản cũ) thì theo số câu.
 */
export function placeEditIssues(cues: { n: number; text: string }[], issues: EditIssue[]) {
  const byCue = new Map<number, EditIssue[]>();
  const resolved: EditIssue[] = [];
  const general: EditIssue[] = [];
  const texts = cues.map((c) => ({ n: c.n, text: flatText(c.text) }));
  for (const issue of issues) {
    const quote = issue.quote ? flatText(issue.quote) : "";
    let n: number | null = issue.cue;
    if (quote.split(" ").length >= 3) {
      const hit = texts.find((c) => c.n === issue.cue && c.text.includes(quote)) ?? texts.find((c) => c.text.includes(quote));
      if (!hit) { resolved.push(issue); continue; }
      n = hit.n;
    }
    if (n === null || !texts.some((c) => c.n === n)) { general.push(issue); continue; }
    byCue.set(n, [...(byCue.get(n) ?? []), issue]);
  }
  return { byCue, resolved, general };
}

/** Trần số claim một lượt research — máy chủ cũng cắt ở đây (runner.ts `cleanClaims`, research-check.mjs). */
export const MAX_CLAIMS = 25;
/** Số claim mỗi lượt agent theo độ khó: claim dễ đi lô lớn (ít lượt, ít token cố định), claim khó đi lô nhỏ. */
export const RESEARCH_BATCH: Record<Difficulty, number> = { easy: 6, normal: 4, hard: 2 };
/**
 * Lượt research lại gom tối đa chừng này claim. Mỗi lần agent gọi công cụ là cả hội thoại gửi lại, nên chi phí một
 * lượt tăng nhanh hơn số claim: lượt thật làm lại bốn claim một lúc tốn $1,94 — gần bằng cả năm lượt đầu cộng lại.
 */
export const RETRY_BATCH = 2;

/**
 * Số claim đáng research cho kịch bản khoảng `cues` câu: một nửa số câu, ít nhất 4, không quá `MAX_CLAIMS`. Cùng phép
 * tính với `claimCap` ở tools/lib/research-check.mjs (có test). Lượt thật: 14 claim cho 20 câu, 4 claim không câu nào dùng.
 */
export function claimCap(cues: number) {
  return Number.isInteger(cues) && cues > 0 ? Math.min(MAX_CLAIMS, Math.max(4, Math.ceil(cues / 2))) : MAX_CLAIMS;
}
const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };
export const difficultyOf = (c: Claim): Difficulty => (c.difficulty in RESEARCH_BATCH ? c.difficulty : "normal");

/**
 * Lô claim cho từng lượt agent. Nằm ở đây chứ không ở máy chủ để cổng 1 báo trước được số lượt agent sẽ chạy —
 * con số người duyệt đổi được bằng cách bỏ qua claim hay hạ độ khó.
 */
export function batches(claims: Claim[], size?: number): Claim[][] {
  const out: Claim[][] = [];
  for (const d of ["hard", "normal", "easy"] as Difficulty[]) {
    const group = claims.filter((c) => difficultyOf(c) === d).sort((a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1));
    const n = Math.min(size ?? RESEARCH_BATCH[d], RESEARCH_BATCH[d]);
    for (let i = 0; i < group.length; i += n) out.push(group.slice(i, i + n));
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

export const RUN_RESULT_LABEL: Record<NonNullable<ResearchRun["result"]>, string> = {
  ok: "xong",
  failed: "lỗi",
  stalled: "đứng im quá lâu, đã dừng",
  cap: "vượt trần theo khối lượng, đã dừng",
  stopped: "đã dừng",
};

/**
 * Vì sao một claim phải dừng ở cổng 2, hay null nếu nó đi tiếp được.
 *
 * Không chỉ "trượt soát": `insufficient` **qua** được soát bằng chứng (luật "phải có trích đoạn" và luật số
 * nguồn đều miễn cho verdict đó, đúng như thiết kế — người duyệt có quyền ghi nhận một ý không đủ nguồn).
 * Nhưng nếu nó tự qua thì một lượt agent không có web cho ra bốn finding `insufficient` sẽ mở cổng 2 với dòng
 * "mọi claim đạt soát", và người duyệt không bao giờ thấy màn hình chọn. Cảnh báo nặng cũng vậy: "kết luận ok
 * nhưng có trích đoạn phản bác" hay "dữ kiện hay đổi mà không nguồn nào ghi ngày" bay thẳng qua cổng, trong khi
 * đó đúng là lúc cần một người nhìn. Claim người duyệt đã quyết định rồi thì không hỏi lại.
 */
export function gate2Reason(claim: Claim, ev: ClaimCheck | undefined, decisions?: Record<string, Gate2Decision>): string | null {
  if (!ev?.ok) return ev?.missing ? "chưa có kết quả research" : "trượt soát bằng chứng";
  if (decisions?.[claim.id]) return null;
  if (ev.verdict === "insufficient") return "agent báo không tìm đủ nguồn";
  const heavy = claim.priority === "high" || claim.timeSensitive;
  return heavy && ev.warnings?.length ? ev.warnings[0] : null;
}

/**
 * Các claim đang chờ người duyệt ở cổng 2 — **một** danh sách cho cả máy chủ (dừng ở cổng, nhận quyết định)
 * lẫn bảng chọn. Hai bên từng lọc khác nhau: máy chủ dừng cả claim qua soát mà `insufficient`, còn bảng chỉ
 * liệt kê claim trượt soát — cổng mở ra với "0 claim", bấm Tiếp tục thì quay lại đúng cổng đó mãi.
 */
export function gate2Waiting(claims: Claim[], evidence: Record<string, ClaimCheck>, decisions?: Record<string, Gate2Decision>) {
  return claims.map((claim) => ({ claim, why: gate2Reason(claim, evidence[claim.id], decisions) })).filter((w): w is { claim: Claim; why: string } => w.why !== null);
}

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

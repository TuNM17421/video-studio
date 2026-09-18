/**
 * Đóng gói kịch bản (beta) — agent tự tìm tài liệu trên web rồi viết kịch bản có dẫn nguồn.
 *
 * Tách hẳn khỏi `types.ts` là cố ý: luồng tạo video đang ổn định, và mọi thứ ở đây còn đang thay đổi.
 * Khi nào chốt được hình dạng thì mới nối vào `VideoRequest`/`StageId`, không phải trước.
 */

/** Mức tin của một nguồn. Viết tiếng Việt không dấu như `deliveries` trong voices.json — chúng hiện thẳng
 *  lên giao diện và đi vào `nguon.json`, nên đọc được bằng mắt quan trọng hơn là hợp với code. */
export type SourceTrust = "cao" | "vua" | "chua-kiem-chung";

export const TRUST_LABEL: Record<SourceTrust, string> = {
  cao: "Đáng tin",
  vua: "Tạm được",
  "chua-kiem-chung": "Chưa kiểm chứng",
};

/** Một tài liệu trong hồ sơ nguồn (`scout/<slug>/nguon.json`). */
export interface SourceDoc {
  id: string;
  url: string;
  title: string;
  publisher: string;
  /** Ngày đăng theo chính trang đó; `null` khi trang không ghi — thứ người duyệt cần thấy, không phải giấu đi. */
  published: string | null;
  fetchedAt: string;
  /**
   * Toàn văn trang đã tải, đường dẫn tương đối từ thư mục lượt chạy (thường là `sources/<id>.md`).
   * `null` = mới có kết quả tìm kiếm, chưa tải trang — khi đó trích dẫn của nó không soát được.
   */
  file: string | null;
  trust: SourceTrust;
  /** Vì sao tin (hoặc không tin) được nguồn này. */
  why: string;
  quotes: string[];
}

/**
 * Hồ sơ tài liệu của một lượt chạy.
 *
 * Để ngoài `cues.js` là cố ý: `voice-timing.mjs --write-cues` ghi đè toàn bộ vùng giữa `n:` và `frames:`
 * của mỗi câu, nên một trường `source` đặt trong đó sẽ bị xoá mất ở bước gắn giọng — đúng cái bẫy mà
 * `quiz: true` đã vấp và SKILL.md phải ghi chú riêng.
 */
export interface Dossier {
  topic: string;
  createdAt: string;
  sources: SourceDoc[];
  /** Số câu → id nguồn. Đây là thứ làm cho "mỗi câu truy được về nguồn" thành kiểm được. */
  cues: Record<string, string[]>;
}

/** Một trích đoạn không tìm thấy trong file đã tải: hoặc bị bịa, hoặc trang đã đổi sau khi tải. */
export interface QuoteProblem {
  source: string;
  quote: string;
  reason: string;
}

/** Một câu trong báo cáo soát: nó dựa vào nguồn nào, đủ số nguồn tối thiểu chưa. */
export interface CueSourceRow {
  n: number;
  sources: string[];
  /** Slide của giảng viên mà câu dựa vào (`"slide:3"` trong `cues`) — chỉ có ở lượt chạy từ slide. */
  slides?: number[];
  level: "ok" | "warn" | "error";
  note: string | null;
}

/**
 * Kết quả `tools/scout-verify.mjs` — thuần cục bộ: chỉ đọc file trên đĩa, không gọi mạng, không cần khoá.
 * Agent không qua mặt được nó vì nó chỉ so chuỗi với thứ chính agent đã ghi xuống.
 */
export interface SourceCheck {
  minSources: number;
  sources: { total: number; fetched: number; unfetched: number };
  quotes: { total: number; ok: number; problems: QuoteProblem[] };
  /** Rỗng khi kịch bản chưa được viết. */
  cues: CueSourceRow[];
  ok: boolean;
  problems: string[];
}

/** Người dùng khai gì trước khi chạy. Ở lượt từ slide, `topic` là tên bài giảng (lấy từ tên file). */
export interface ScoutInput {
  topic: string;
  /** Mỗi câu phải dựa trên ít nhất bấy nhiêu nguồn độc lập. */
  minSources: number;
  /** Số câu mong muốn của kịch bản — ước lượng, agent không bị buộc đúng con số. */
  cues: number;
}

// ── lượt chạy từ slide ───────────────────────────────────────────────────────────

/** Slide giảng viên đưa, đã lưu vào thư mục lượt chạy. */
export interface SlideDeck {
  name: string;
  format: "pdf" | "pptx";
  /** File gốc, tương đối với thư mục lượt chạy. */
  file: string;
  /** Chữ đã bóc sẵn từng slide (`slide.md`) — chỉ có với PPTX; PDF thì agent tự đọc file gốc. */
  text: string | null;
  /** `null` khi không đếm được (PDF nén cấu trúc trang). */
  slides: number | null;
  bytes: number;
}

/** Vì sao một chỗ trên slide cần research. Viết không dấu vì nó đi vào `muc-research.json`. */
export type ItemKind = "so-lieu" | "khang-dinh" | "cap-nhat" | "dinh-nghia" | "vi-du";

export const KIND_LABEL: Record<ItemKind, string> = {
  "so-lieu": "Số liệu",
  "khang-dinh": "Khẳng định",
  "cap-nhat": "Có thể đã cũ",
  "dinh-nghia": "Định nghĩa",
  "vi-du": "Cần ví dụ",
};

/** Một chỗ trên slide cần kiểm hoặc bổ sung trên web — người dùng duyệt danh sách này trước khi research. */
export interface ResearchItem {
  /** m1, m2… — agent dùng đúng mã này trong TodoWrite và `items/<mã>.json`. */
  id: string;
  slides: number[];
  /** Tên ngắn, hiện trên nút của workflow. */
  title: string;
  /** Slide nói gì, hoặc cần kiểm điều gì. */
  claim: string;
  kind: ItemKind;
  why: string;
  queries: string[];
  selected: boolean;
}

export interface SlideOutline {
  slide: number;
  heading: string;
  points: string[];
}

/** Kết quả bước bóc tách (`muc-research.json`). */
export interface Extraction {
  title: string;
  slides: number | null;
  outline: SlideOutline[];
  items: ResearchItem[];
}

/** Kết luận của agent cho một mục (`items/<mã>.json`). */
export type Verdict = "xac-nhan" | "dieu-chinh" | "mau-thuan" | "khong-du-nguon";

export const VERDICT_LABEL: Record<Verdict, string> = {
  "xac-nhan": "Khớp slide",
  "dieu-chinh": "Cần sửa slide",
  "mau-thuan": "Nguồn mâu thuẫn",
  "khong-du-nguon": "Không đủ nguồn",
};

export interface ItemFinding {
  id: string;
  verdict: Verdict;
  finding: string;
  sources: string[];
}

/** Trạng thái một nút của workflow. */
export type NodeState = "pending" | "active" | "done";

/** Mã giả của nút "Viết kịch bản" trong `itemStates` — agent cũng liệt kê nó trong TodoWrite. */
export const SCRIPT_NODE = "script";

export type ScoutStage = "extract" | "research";

/**
 * Một sự kiện trong lượt chạy. Đây là thứ trang beta dựng ra "flow": mỗi lần agent gọi WebSearch hay
 * WebFetch đều thành một dòng nhìn thấy được, thay vì chìm trong nhật ký chữ.
 *
 * `stage` và `item` cho biết sự kiện thuộc nút nào của workflow: `item` là mục agent đang làm theo
 * TodoWrite của chính nó lúc đó (hoặc `SCRIPT_NODE`).
 */
export type ScoutEvent = { stage?: ScoutStage; item?: string } & (
  | { t: number; kind: "start"; topic: string; dir: string }
  | { t: number; kind: "say"; text: string }
  | { t: number; kind: "search"; query: string }
  | { t: number; kind: "fetch"; url: string; ask: string }
  | { t: number; kind: "save"; file: string }
  | { t: number; kind: "tool"; name: string; detail: string }
  | { t: number; kind: "error"; text: string }
  | { t: number; kind: "progress"; states: Record<string, NodeState> }
  | { t: number; kind: "review"; items: number }
  | { t: number; kind: "done"; ok: boolean; summary: string }
);

/** `review` = đã bóc tách xong slide, chờ người dùng duyệt danh sách mục cần research. */
export type ScoutStatus = "idle" | "running" | "review" | "done" | "error" | "stopped";

export interface ScoutRun {
  slug: string;
  input: ScoutInput;
  mode: "topic" | "slide";
  stage: ScoutStage;
  status: ScoutStatus;
  startedAt: number;
  /** Đường dẫn thư mục lượt chạy, tương đối với gốc repo. */
  dir: string;
  events: ScoutEvent[];
  deck: SlideDeck | null;
  extraction: Extraction | null;
  /** Các mục người dùng đã xác nhận, đúng thứ tự agent làm. */
  items: ResearchItem[];
  /** Mã mục (và `SCRIPT_NODE`) → trạng thái. */
  itemStates: Record<string, NodeState>;
  findings: Record<string, ItemFinding>;
  dossier: Dossier | null;
  check: SourceCheck | null;
  /** Kịch bản đã viết xong chưa, và đường dẫn của nó. */
  script: string | null;
}

/** Đếm nhanh cho thẻ tổng kết trên trang. */
export function countEvents(events: ScoutEvent[]) {
  let searches = 0;
  let fetches = 0;
  let saves = 0;
  for (const e of events) {
    if (e.kind === "search") searches++;
    else if (e.kind === "fetch") fetches++;
    else if (e.kind === "save") saves++;
  }
  return { searches, fetches, saves };
}

/**
 * Chủ đề → tên thư mục. Bỏ dấu tiếng Việt vì tên thư mục đi vào đường dẫn, lệnh và URL; `đ` phải xử lý
 * riêng vì nó không phải `d` + dấu tổ hợp nên NFD không tách ra được.
 */
export function slugify(topic: string) {
  const plain = topic
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (plain.length <= 40) return plain || "chu-de";
  // Cắt ở ranh giới từ: cắt thẳng ở ký tự thứ 40 hay để lại nửa từ ("…va-vi" của "vì sao"), đọc tên thư
  // mục xong không đoán ra chủ đề nữa. Không có gạch nào trong 40 ký tự đầu thì đành cắt cứng.
  const cut = plain.slice(0, 40);
  const lastBreak = cut.lastIndexOf("-");
  return (lastBreak > 12 ? cut.slice(0, lastBreak) : cut).replace(/-+$/g, "");
}

// ── làm sạch dữ liệu agent và người dùng gửi lên ─────────────────────────────────

const KINDS = Object.keys(KIND_LABEL) as ItemKind[];
const VERDICTS = Object.keys(VERDICT_LABEL) as Verdict[];
/** Một nguồn thì không còn là "xác nhận chéo" nữa, mà mười nguồn mỗi câu thì lượt chạy không bao giờ xong. */
export const clampSources = (value: unknown) => Math.min(5, Math.max(1, Math.round(Number(value) || 2)));
export const clampCues = (value: unknown) => Math.min(80, Math.max(5, Math.round(Number(value) || 20)));
/** Trần của danh sách mục: nhiều hơn thì một lượt research một-agent-lần-lượt chạy quá lâu. */
export const MAX_ITEMS = 20;

const text = (value: unknown, max: number) => {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};
const slideNumbers = (value: unknown) =>
  (Array.isArray(value) ? value : [value]).map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 12);

/**
 * Một danh sách mục đã làm sạch — dùng cho cả JSON agent ghi ra lẫn bản người dùng sửa rồi gửi lên.
 * Mã được đánh lại từ đầu (m1, m2…) theo thứ tự danh sách: agent có thể ghi trùng hay bỏ sót mã, còn mục
 * người dùng thêm tay thì chưa có mã nào; mã phải liền và duy nhất vì TodoWrite và `items/<mã>.json` bám
 * vào nó.
 */
export function cleanItems(raw: unknown): ResearchItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ResearchItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const claim = text(e.claim, 600);
    const title = text(e.title, 80) || text(claim, 60);
    if (!title) continue;
    items.push({
      id: `m${items.length + 1}`,
      slides: slideNumbers(e.slides),
      title,
      claim,
      kind: KINDS.includes(e.kind as ItemKind) ? (e.kind as ItemKind) : "khang-dinh",
      why: text(e.why, 400),
      queries: (Array.isArray(e.queries) ? e.queries : []).map((q) => text(q, 120)).filter(Boolean).slice(0, 4),
      selected: e.selected !== false,
    });
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}

/** `muc-research.json` → Extraction; `null` khi file không dùng được (không phải JSON, không có mục nào). */
export function parseExtraction(raw: unknown, slides: number | null): Extraction | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const items = cleanItems(r.items);
  const outline = (Array.isArray(r.outline) ? r.outline : []).flatMap((o) => {
    if (!o || typeof o !== "object") return [];
    const x = o as Record<string, unknown>;
    const slide = Number(x.slide);
    if (!Number.isInteger(slide) || slide < 1) return [];
    return [{
      slide,
      heading: text(x.heading, 160),
      points: (Array.isArray(x.points) ? x.points : []).map((p) => text(p, 300)).filter(Boolean).slice(0, 12),
    }];
  });
  if (!items.length && !outline.length) return null;
  const counted = Number(r.slides);
  return {
    title: text(r.title, 160),
    slides: slides ?? (Number.isInteger(counted) && counted > 0 ? counted : null),
    outline,
    items,
  };
}

/** `items/<mã>.json` → ItemFinding; `null` khi thiếu kết luận. */
export function parseFinding(raw: unknown, id: string): ItemFinding | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const verdict = VERDICTS.includes(r.verdict as Verdict) ? (r.verdict as Verdict) : null;
  if (!verdict) return null;
  return {
    id,
    verdict,
    finding: text(r.finding, 800),
    sources: (Array.isArray(r.sources) ? r.sources : []).map((s) => text(s, 20)).filter(Boolean),
  };
}

/**
 * Danh sách việc của agent (đầu vào TodoWrite) → trạng thái từng nút.
 *
 * Agent được dặn mở đầu mỗi việc bằng mã mục ("m3 · …") và thêm một việc "Viết kịch bản" cuối cùng; đó là
 * tín hiệu duy nhất nói nó đang ở mục nào, vì WebSearch/WebFetch không mang theo mã. Việc nào không khớp
 * mã nào thì bỏ qua — agent tự thêm việc phụ không làm lệch workflow.
 */
export function todoStates(todos: unknown, ids: string[]) {
  const states: Record<string, NodeState> = {};
  let active: string | null = null;
  if (!Array.isArray(todos)) return { states, active };
  for (const todo of todos) {
    if (!todo || typeof todo !== "object") continue;
    const t = todo as Record<string, unknown>;
    const content = String(t.content ?? t.activeForm ?? "");
    const code = /^\W*(m\d+)\b/i.exec(content)?.[1]?.toLowerCase();
    // Chỉ việc mở đầu bằng "Viết kịch bản" — đúng câu agent được dặn — mới là nút kịch bản; một việc phụ
    // như "Đọc mẫu kịch bản" nhắc tới chữ đó mà không phải bước viết.
    const node = code && ids.includes(code) ? code : /^\W*vi[eế]t k[iị]ch b[aả]n/i.test(content) ? SCRIPT_NODE : null;
    if (!node) continue;
    const state: NodeState = t.status === "completed" ? "done" : t.status === "in_progress" ? "active" : "pending";
    states[node] = state;
    if (state === "active") active = node;
  }
  return { states, active };
}

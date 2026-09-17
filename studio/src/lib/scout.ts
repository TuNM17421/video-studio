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

/** Người dùng khai gì trước khi chạy. */
export interface ScoutInput {
  topic: string;
  /** Mỗi câu phải dựa trên ít nhất bấy nhiêu nguồn độc lập. */
  minSources: number;
  /** Số câu mong muốn của kịch bản — ước lượng, agent không bị buộc đúng con số. */
  cues: number;
}

/**
 * Một sự kiện trong lượt chạy. Đây là thứ trang beta dựng ra "flow": mỗi lần agent gọi WebSearch hay
 * WebFetch đều thành một dòng nhìn thấy được, thay vì chìm trong nhật ký chữ.
 */
export type ScoutEvent =
  | { t: number; kind: "start"; topic: string; dir: string }
  | { t: number; kind: "say"; text: string }
  | { t: number; kind: "search"; query: string }
  | { t: number; kind: "fetch"; url: string; ask: string }
  | { t: number; kind: "save"; file: string }
  | { t: number; kind: "tool"; name: string; detail: string }
  | { t: number; kind: "error"; text: string }
  | { t: number; kind: "done"; ok: boolean; summary: string };

export type ScoutStatus = "idle" | "running" | "done" | "error" | "stopped";

export interface ScoutRun {
  slug: string;
  input: ScoutInput;
  status: ScoutStatus;
  startedAt: number;
  /** Đường dẫn thư mục lượt chạy, tương đối với gốc repo. */
  dir: string;
  events: ScoutEvent[];
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

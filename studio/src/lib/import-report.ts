import type { ImportReport, ImportRow, SpeechIssue } from "./types";

/**
 * Báo cáo kiểm thư mục có phải của đúng thư mục đang xem không.
 *
 * Hai bên ghi đường dẫn theo hai kiểu khác hẳn nhau, nên so bằng `===` là luôn sai: `voice-import.mjs`
 * ghi `from` **tương đối theo gốc repo, dấu `/`** (`projects/<id>/voice-script/omnivoice`), còn
 * `state.voice.importDir` là **tuyệt đối, dấu `\` trên Windows**. So thẳng thì nút Nhập khoá vĩnh viễn
 * dù vừa kiểm xong.
 *
 * So bằng đuôi, và đuôi phải bắt đầu ở ranh giới thư mục — nếu không thì `projects/12te` khớp nhầm với
 * `projects/x12te`.
 */
const slash = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "");

export function reportMatchesDir(report: ImportReport | null, dir: string): boolean {
  if (!report || !dir) return false;
  const have = slash(dir);
  const want = slash(report.from);
  if (!want) return false;
  return have === want || have.endsWith(`/${want}`);
}

/**
 * Bảng "Nghe từng câu" đếm theo **câu đọc**: khoảng dừng không có tệp nên không phải câu, đếm chung vào là
 * dòng trên nói 39 câu còn tiêu đề nói 40.
 */
export interface ImportCounts {
  spoken: number;
  pauses: number;
  ok: number;
  warn: number;
  error: number;
  /** Máy đã nghe lại nội dung (Whisper) — không thì "ổn" chỉ có nghĩa là đủ tệp. */
  heard: boolean;
}

export function importCounts(report: ImportReport): ImportCounts {
  const spoken = report.rows.filter((r) => !r.silent);
  return {
    spoken: spoken.length,
    pauses: report.rows.length - spoken.length,
    ok: spoken.filter((r) => r.level === "ok").length,
    warn: spoken.filter((r) => r.level === "warn").length,
    error: spoken.filter((r) => r.level === "error").length,
    heard: report.align.used,
  };
}

export type VerdictTone = "ok" | "warn" | "error";

/**
 * Dòng kết luận trên bảng: giọng này nhập được chưa, và làm gì tiếp. Cảnh báo không chặn nút Nhập giọng
 * nên câu chữ nói thẳng ra, kẻo người mới tưởng phải sửa hết mọi dòng vàng.
 */
export function importVerdict(c: ImportCounts): { tone: VerdictTone; headline: string; rest: string | null; hint: string } {
  if (c.error) return {
    tone: "error",
    headline: `${c.error} câu cần sửa`,
    rest: [c.warn ? `${c.warn} câu nên nghe lại` : null, c.ok ? `${c.ok} câu ổn` : null].filter(Boolean).join(" · ") || null,
    hint: "Câu cần sửa đang chặn nút Nhập giọng — cách sửa ghi ngay dưới từng câu.",
  };
  if (c.warn) return {
    tone: "warn",
    headline: `${c.warn} câu nên nghe lại`,
    rest: c.ok ? `${c.ok} câu ổn` : null,
    hint: "Nghe thấy ổn thì cứ nhập — cảnh báo không chặn việc nhập.",
  };
  return c.heard
    ? { tone: "ok", headline: `Giọng ổn cả ${c.spoken} câu`, rest: null, hint: "Máy đã nghe lại từng câu và so với kịch bản — có thể nhập ngay." }
    : { tone: "ok", headline: `Đủ tệp cho ${c.spoken} câu`, rest: null, hint: "Máy chưa nghe lại nội dung — nghe thử vài câu trước khi nhập." };
}

/** Dòng nhỏ cạnh "Nghe từng câu": bao nhiêu câu, và phần cần để ý. */
export function countText(c: ImportCounts): string {
  const size = `${c.spoken} câu${c.pauses ? ` + ${c.pauses} khoảng dừng` : ""}`;
  const flagged = [c.error ? `${c.error} câu cần sửa` : null, c.warn ? `${c.warn} câu nên nghe lại` : null].filter(Boolean);
  if (flagged.length) return `${size} · ${flagged.join(" · ")}`;
  return c.heard ? `${size} · đều ổn` : size;
}

const seconds = (s: string) => s.replace(/s$/, " giây");

/**
 * Ghi chú của `tools/voice-import.mjs` viết cho nhật ký ("ngắn bất thường (2,7s so với ~7,0s)"); đây là cách
 * bảng nói lại cho người dựng video. `null` = không cần nói (khoảng dừng, hoặc điều đã có trong dòng lỗi cụ
 * thể). Câu lạ thì giữ nguyên, chỉ viết hoa chữ đầu — thà hơi kỹ thuật còn hơn nuốt mất một cảnh báo.
 * Các tiền tố này được test giữ khớp với tool (import-report.test.ts).
 */
const NOTES: [RegExp, (m: RegExpExecArray, row: ImportRow) => string | null][] = [
  [/^khoảng dừng /, () => null],
  [/^thiếu file audio/, () => "Chưa có tệp âm thanh cho câu này."],
  [/^tên không theo quy ước (.+)$/, (m, row) => `Tệp ${row.file ?? ""} chưa đặt tên đúng kiểu ${m[1]} — vẫn dùng được.`],
  [/^ngắn bất thường \((.+) so với ~(.+)\)$/, (m) => `Ngắn hơn dự kiến: ${seconds(m[1])}, thường khoảng ${seconds(m[2])}.`],
  [/^dài bất thường \((.+) so với ~(.+)\)$/, (m) => `Dài hơn dự kiến: ${seconds(m[1])}, thường khoảng ${seconds(m[2])}.`],
  [/^không giải mã được/, () => "Không đọc được tệp này — có thể tệp hỏng hoặc sai định dạng."],
  [/^không nhận diện được giọng/, () => "Máy không nghe ra lời — nghe thử xem tệp có tiếng không."],
  [/^nội dung nghe được không khớp lời/, () => "Nghe không giống lời câu này — có thể nhầm tệp."],
  [/^chỉ khớp một phần lời/, (_m, row) => row.issues?.length ? null
    : row.matchRatio != null ? `Máy chỉ nghe ra ${Math.round(row.matchRatio * 100)}% lời của câu — nghe cả câu cho chắc.`
      : "Máy chỉ nghe ra một phần lời — nghe cả câu cho chắc."],
];

export function friendlyNote(note: string, row: ImportRow): string | null {
  for (const [re, say] of NOTES) {
    const m = re.exec(note);
    if (m) return say(m, row);
  }
  return note.charAt(0).toLocaleUpperCase("vi") + note.slice(1);
}

/**
 * Chỗ trong lời của câu mà máy nghi (mất đuôi, thiếu chữ, lặp chữ), để gạch chân đúng mấy chữ đó. So theo
 * chữ, bỏ qua dấu câu và hoa/thường — chữ lặp là chữ Whisper viết, không phải chữ của kịch bản. Mất đuôi lấy
 * chỗ khớp cuối cùng, còn lại lấy chỗ đầu tiên; không tìm thấy thì thôi, không gạch. `text` phải ở dạng NFC
 * (bảng đưa vào `r.text.normalize("NFC")` và vẽ đúng chuỗi đó, để vị trí khớp với chữ trên màn hình).
 */
export function issueSpans(text: string, issues: SpeechIssue[] | undefined): [number, number, SpeechIssue["code"]][] {
  const spans: [number, number, SpeechIssue["code"]][] = [];
  for (const issue of issues ?? []) {
    const tokens = issue.words.normalize("NFC").match(/[\p{L}\p{N}]+/gu);
    if (!tokens) continue;
    // Only letters and digits reach the pattern, so there is nothing to escape. Whole words only: "ra" must
    // not underline the end of "trang".
    const re = new RegExp(String.raw`(?<![\p{L}\p{N}])` + tokens.join(String.raw`[^\p{L}\p{N}]+`) + String.raw`(?![\p{L}\p{N}])`, "giu");
    let hit: RegExpExecArray | null = null;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      hit = m;
      if (issue.code !== "truncation") break;
    }
    if (!hit) continue;
    const start = hit.index, end = hit.index + hit[0].length;
    if (spans.some(([a, b]) => start < b && a < end)) continue;
    spans.push([start, end, issue.code]);
  }
  return spans.sort((a, b) => a[0] - b[0]);
}

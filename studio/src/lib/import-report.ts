import type { ImportReport } from "./types";

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

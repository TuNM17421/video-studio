import path from "node:path";
import { handle, sendFile } from "@/lib/server/http";
import { assertId, HttpError, REPO } from "@/lib/server/paths";
import { readState } from "@/lib/server/videos";
import { lastImportReport, retakesFor } from "@/lib/server/voice";

/**
 * `from` in the report is relative to the repo root — "../../Music/thu-am" for a folder outside it, which
 * is the usual case for recorded audio — so compare resolved absolute paths, not path endings.
 */
const sameDir = (a: string, b: string) => {
  const [x, y] = [path.resolve(a), path.resolve(b)];
  return process.platform === "win32" ? x.toLowerCase() === y.toLowerCase() : x === y;
};

/**
 * Nghe một câu của thư mục audio TRƯỚC khi nhập: bảng đối chiếu gắn cờ câu nào, người dùng bấm nghe đúng
 * câu đó thay vì mở thư mục ra dò tên tệp.
 *
 * Chỉ phát tệp mà lượt kiểm gần nhất đã ghép cho câu `n`, trong đúng thư mục của lượt kiểm ấy. Tên tệp lấy
 * từ báo cáo và phải là tên trần — không nhận đường dẫn từ phía trình duyệt, nên route này không đọc được
 * gì ngoài các tệp audio người dùng đã chọn để nhập.
 */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  assertId(id);
  const query = new URL(req.url).searchParams;
  const n = Number(query.get("n"));

  const dir = readState(id).state.voice.importDir;

  // A take from "Sinh lại câu này": only the takes listed for câu n of the folder being imported now, and
  // only inside projects/<id>/voice-script/retake/ — the name comes from the query, the path never does.
  const take = query.get("take");
  if (take !== null) {
    const result = retakesFor(id, dir)[String(n)];
    const entry = [...(result?.takes ?? []), result?.original, result?.previous].find((t) => t?.name === take);
    const root = path.join(REPO, "projects", id, "voice-script", "retake");
    const file = entry ? path.resolve(REPO, entry.file) : null;
    const inside = file && (process.platform === "win32" ? file.toLowerCase().startsWith(root.toLowerCase() + path.sep) : file.startsWith(root + path.sep));
    if (!file || !inside) throw new HttpError(404, "Không có bản này.");
    return sendFile(req, file);
  }

  const report = lastImportReport(id);
  if (!report || !dir || !sameDir(path.resolve(REPO, report.from), dir)) throw new HttpError(404, "Chưa kiểm thư mục audio này.");
  const row = report.rows.find((r) => r.n === n);
  const file = row?.file;
  if (!row || !file || file !== path.basename(file)) throw new HttpError(404, "Câu này không có tệp audio.");
  // The table on screen says which file and length it means. A job that finished in the background
  // (Kaggle, local model) may have scanned another folder since — or regenerated 03.wav in the same
  // one — and playing the new file under the old row would attribute it to the wrong recording.
  const [f, s] = [query.get("f"), query.get("s")];
  if ((f !== null && f !== file) || (s && Number(s) !== row.seconds)) {
    throw new HttpError(409, "Bảng đối chiếu đã cũ — bấm Kiểm tra lại.");
  }
  return sendFile(req, path.join(path.resolve(dir), file));
});

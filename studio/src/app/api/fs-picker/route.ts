import { openFilePicker, type FilePickerKind, type FilePickerPurpose } from "@/lib/server/file-picker";
import { handle } from "@/lib/server/http";
import { HttpError } from "@/lib/server/paths";

const KINDS = new Set<FilePickerKind>(["file", "directory"]);
const PURPOSES = new Set<FilePickerPurpose>(["feedback", "video", "voice", "scenes"]);

export const POST = handle(async (req: Request) => {
  const body = await req.json().catch(() => null) as { kind?: unknown; purpose?: unknown } | null;
  const kind = body?.kind;
  const purpose = body?.purpose;
  if (typeof kind !== "string" || !KINDS.has(kind as FilePickerKind)) {
    throw new HttpError(400, "Kiểu lựa chọn phải là tệp hoặc thư mục.");
  }
  if (typeof purpose !== "string" || !PURPOSES.has(purpose as FilePickerPurpose)) {
    throw new HttpError(400, "Nguồn lựa chọn không hợp lệ.");
  }
  return Response.json(await openFilePicker(kind as FilePickerKind, purpose as FilePickerPurpose));
});

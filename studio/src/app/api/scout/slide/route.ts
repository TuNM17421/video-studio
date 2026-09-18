import path from "node:path";
import { clampCues, clampSources } from "@/lib/scout";
import { handle } from "@/lib/server/http";
import { HttpError } from "@/lib/server/paths";
import { startSlideScout } from "@/lib/server/scout";
import { MAX_SLIDE_BYTES } from "@/lib/server/slides";

/**
 * Nhận slide của giảng viên (.pdf / .pptx) và bắt đầu bước bóc tách.
 *
 * Tên bài giảng lấy từ ô người dùng gõ, không có thì từ tên file — nó thành tên thư mục của lượt chạy.
 */
export const POST = handle(async (req: Request) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) throw new HttpError(400, "Chưa chọn file slide.");
  const ext = path.extname(file.name).slice(1).toLowerCase();
  if (ext !== "pdf" && ext !== "pptx") throw new HttpError(400, "Chỉ nhận slide .pdf hoặc .pptx.");
  if (file.size > MAX_SLIDE_BYTES) throw new HttpError(413, `Slide lớn quá ${MAX_SLIDE_BYTES / 1024 / 1024} MB.`);

  const title = String(form?.get("title") ?? "").trim().slice(0, 300) || file.name.slice(0, file.name.length - ext.length - 1);
  const input = { topic: title, minSources: clampSources(form?.get("minSources")), cues: clampCues(form?.get("cues")) };
  try {
    return Response.json(startSlideScout(input, { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) }), { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không chạy được.";
    // File hỏng là lỗi của đầu vào; đang có lượt chạy khác là xung đột.
    throw new HttpError(/đang có một lượt/i.test(message) ? 409 : 400, message);
  }
});

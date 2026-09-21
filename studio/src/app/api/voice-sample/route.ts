import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { handle } from "@/lib/server/http";
import { HttpError, REPO } from "@/lib/server/paths";
import { refCheck } from "@/lib/server/voice";

/**
 * Nhận một file giọng mẫu người dùng chọn bằng hộp thoại thường của trình duyệt.
 *
 * Trình duyệt không bao giờ cho trang web biết đường dẫn của file, chỉ cho nội dung — mà model local cần
 * một đường dẫn trên đĩa. Studio chạy ngay trên máy này, nên chép một bản vào voice/cache/refs/uploads/
 * là đủ; đặt tên theo hash nội dung để cùng một file không bị chép hai lần. File .txt cùng tên đi kèm
 * (đúng lời của đoạn mẫu) được đặt cạnh, đúng chỗ tools/lib/omnivoice.mjs refSidecar() tìm.
 */

/** Cùng danh sách AUDIO_EXT trong tools/lib/voice-files.mjs. */
const AUDIO_EXT = new Set(["wav", "mp3", "m4a", "mp4", "aac", "flac", "ogg", "opus", "webm"]);
/** Mẫu 10–20 giây chỉ vài MB; trần này chặn nhầm lẫn kéo cả một bài giảng vào. */
const MAX_BYTES = 25 * 1024 * 1024;
const UPLOADS = path.join(REPO, "voice", "cache", "refs", "uploads");

const ext = (name: string) => path.extname(name).slice(1).toLowerCase();
const stem = (name: string) => name.slice(0, name.length - path.extname(name).length).toLowerCase();

export const POST = handle(async (req: Request) => {
  const form = await req.formData().catch(() => null);
  if (!form) throw new HttpError(400, "Thiếu file tải lên.");
  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  const audio = files.find((f) => AUDIO_EXT.has(ext(f.name)));
  if (!audio) throw new HttpError(400, `Cần một file audio (${[...AUDIO_EXT].map((e) => `.${e}`).join(" ")}).`);
  if (audio.size > MAX_BYTES) throw new HttpError(413, "File mẫu quá lớn — một đoạn 10–20 giây là đủ.");
  const text = files.find((f) => ext(f.name) === "txt" && stem(f.name) === stem(audio.name));

  const bytes = Buffer.from(await audio.arrayBuffer());
  const id = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  fs.mkdirSync(/* turbopackIgnore: true */ UPLOADS, { recursive: true });
  const dest = path.join(UPLOADS, `${id}.${ext(audio.name)}`);
  fs.writeFileSync(/* turbopackIgnore: true */ dest, bytes);

  let sidecar: string | null = null;
  if (text) {
    sidecar = path.join(UPLOADS, `${id}.txt`);
    fs.writeFileSync(/* turbopackIgnore: true */ sidecar, Buffer.from(await text.arrayBuffer()));
  }

  // Nghe thử ngay tại đây. Không nghe ra lời thì trả path null để ô chọn giữ trạng thái "chưa chọn" kèm
  // lý do, thay vì để lượt sinh chết giữa chừng. Bản chép thì GIỮ: tên theo hash nên chọn lại cùng file là
  // cùng đường dẫn — xoá ở đây từng làm mất file mà một lựa chọn đang lưu vẫn trỏ tới; kết quả nghe hỏng
  // đã được nhớ cạnh cache, nên file đó không tốn thêm lượt Whisper nào nữa.
  const ref = await refCheck(dest);
  return Response.json({ path: ref.ok ? dest : null, name: audio.name, size: audio.size, sidecar, ref });
});

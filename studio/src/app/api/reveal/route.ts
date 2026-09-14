import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { handle } from "@/lib/server/http";
import { HttpError, REPO } from "@/lib/server/paths";

/**
 * Mở một thư mục bằng trình quản lý tệp của máy — để nghe thử mấy file wav vừa sinh thì bấm một nút,
 * không phải tự dán đường dẫn.
 *
 * Studio chỉ nghe trên loopback và `handle` đã chặn yêu cầu khác origin, nhưng lệnh này mở cửa sổ trên
 * máy người dùng nên vẫn khoá chặt: chỉ nhận thư mục **có thật** và **nằm trong repo**. Không nối chuỗi
 * vào shell — đường dẫn đi qua mảng đối số, nên tên thư mục có dấu cách hay ký tự lạ cũng không thành lệnh.
 */
const OPENER = {
  win32: "explorer.exe",
  darwin: "open",
} as const;

export const POST = handle(async (req: Request) => {
  const { dir } = (await req.json().catch(() => ({}))) as { dir?: string };
  const target = path.resolve(String(dir || ""));
  if (!dir || !path.isAbsolute(target)) throw new HttpError(400, "Thiếu đường dẫn thư mục.");
  if (target !== REPO && !`${target}${path.sep}`.startsWith(REPO + path.sep)) {
    throw new HttpError(400, "Chỉ mở được thư mục trong repo.");
  }
  if (!fs.existsSync(/* turbopackIgnore: true */ target) || !fs.statSync(/* turbopackIgnore: true */ target).isDirectory()) {
    throw new HttpError(404, "Thư mục không còn ở đó.");
  }

  const bin = OPENER[process.platform as keyof typeof OPENER] ?? "xdg-open";
  // explorer.exe trả mã thoát 1 cả khi mở thành công — đừng đọc mã thoát của nó.
  const child = spawn(/* turbopackIgnore: true */ bin, [target], { detached: true, stdio: "ignore" });
  const failed = await new Promise<string | null>((resolve) => {
    child.on("error", (error) => resolve(error.message));
    child.on("spawn", () => resolve(null));
  });
  child.unref();
  if (failed) throw new HttpError(500, `Không mở được trình quản lý tệp (${bin}): ${failed}`);
  return Response.json({ opened: path.relative(REPO, target) || "." });
});

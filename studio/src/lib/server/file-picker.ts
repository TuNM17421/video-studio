import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { HttpError } from "./paths";

const execFileP = promisify(execFile);
const ZENITY = "/usr/bin/zenity";

export type FilePickerKind = "file" | "directory";
export type FilePickerPurpose = "feedback" | "video" | "voice" | "voice-ref";

const TITLES: Record<FilePickerPurpose, string> = {
  video: "Chọn video cũ",
  voice: "Chọn thư mục audio giọng đọc",
  "voice-ref": "Chọn audio mẫu để OmniVoice nhân giọng",
  feedback: "Chọn feedback bản cũ",
};

export function filePickerArgs(kind: FilePickerKind, purpose: FilePickerPurpose) {
  const args = [
    "--file-selection",
    `--title=${TITLES[purpose]}`,
    "--modal",
    "--width=920",
    "--height=620",
  ];
  if (kind === "directory") args.push("--directory");
  if (kind === "file" && purpose === "video") {
    args.push("--file-filter=Video | *.mp4 *.mov *.webm *.mkv *.avi");
    args.push("--file-filter=Tất cả tệp | *");
  }
  if (kind === "file" && purpose === "voice-ref") {
    args.push("--file-filter=WAV | *.wav");
  }
  return args;
}

function exitCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "number" ? code : Number(code);
}

/** Open the desktop's native file dialog and return a path the local agent can read. */
export async function openFilePicker(kind: FilePickerKind, purpose: FilePickerPurpose) {
  if (!fs.existsSync(ZENITY)) {
    throw new HttpError(501, "Máy chưa có Zenity. Hãy dùng mục nhập đường dẫn thủ công.");
  }
  if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    throw new HttpError(503, "Không tìm thấy phiên desktop để mở trình chọn tệp. Hãy nhập đường dẫn thủ công.");
  }

  let stdout: string;
  try {
    ({ stdout } = await execFileP(ZENITY, filePickerArgs(kind, purpose), {
      encoding: "utf8",
      maxBuffer: 64 * 1024,
      timeout: 10 * 60 * 1000,
    }));
  } catch (error) {
    if (exitCode(error) === 1) return { cancelled: true as const };
    throw new HttpError(500, "Không thể mở trình chọn tệp. Hãy thử lại hoặc nhập đường dẫn thủ công.");
  }

  const selected = stdout.trim();
  if (!selected) return { cancelled: true as const };
  if (!path.isAbsolute(selected) || !fs.existsSync(/* turbopackIgnore: true */ selected)) {
    throw new HttpError(400, "Nguồn vừa chọn không còn tồn tại. Hãy chọn lại.");
  }

  const resolved = fs.realpathSync(/* turbopackIgnore: true */ selected);
  const stat = fs.statSync(/* turbopackIgnore: true */ resolved);
  if (kind === "file" && !stat.isFile()) throw new HttpError(400, "Hãy chọn một tệp, không phải thư mục.");
  if (kind === "directory" && !stat.isDirectory()) throw new HttpError(400, "Hãy chọn một thư mục.");

  return {
    cancelled: false as const,
    path: resolved,
    name: path.basename(resolved),
    dir: stat.isDirectory(),
    files: stat.isDirectory()
      ? fs.readdirSync(/* turbopackIgnore: true */ resolved).filter((entry) => !entry.startsWith(".")).length
      : 1,
    size: stat.isFile() ? stat.size : undefined,
  };
}

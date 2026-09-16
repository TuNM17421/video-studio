import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { HttpError } from "./paths";

const execFileP = promisify(execFile);
const ZENITY = "/usr/bin/zenity";
const POWERSHELL = "powershell.exe";

export type FilePickerKind = "file" | "directory";
export type FilePickerPurpose = "feedback" | "video" | "voice";

const VIDEO_EXT = ["mp4", "mov", "webm", "mkv", "avi"];

function pickerTitle(purpose: FilePickerPurpose) {
  return purpose === "video" ? "Chọn video cũ" : purpose === "voice" ? "Chọn thư mục audio giọng đọc" : "Chọn feedback bản cũ";
}

/** Zenity (Linux): the desktop's GTK dialog. */
export function filePickerArgs(kind: FilePickerKind, purpose: FilePickerPurpose) {
  const args = [
    "--file-selection",
    `--title=${pickerTitle(purpose)}`,
    "--modal",
    "--width=920",
    "--height=620",
  ];
  if (kind === "directory") args.push("--directory");
  if (kind === "file" && purpose === "video") {
    args.push(`--file-filter=Video | ${VIDEO_EXT.map((e) => `*.${e}`).join(" ")}`);
    args.push("--file-filter=Tất cả tệp | *");
  }
  return args;
}

/**
 * Windows: the WinForms dialogs, driven from PowerShell. The studio server runs on the same machine as
 * the browser, so a dialog the server opens lands on the user's own desktop. The script prints the chosen
 * path (UTF-8, so Vietnamese folder names survive) or nothing when the user cancels; it never fails on
 * cancel, so an empty stdout is the only "cancelled" signal.
 */
export function windowsPickerScript(kind: FilePickerKind, purpose: FilePickerPurpose) {
  const title = pickerTitle(purpose).replace(/'/g, "''");
  const filter = kind !== "file"
    ? ""
    : purpose === "video"
      ? `Video (${VIDEO_EXT.map((e) => `*.${e}`).join(";")})|${VIDEO_EXT.map((e) => `*.${e}`).join(";")}|Tất cả tệp (*.*)|*.*`
      : "Tất cả tệp (*.*)|*.*";
  // A hidden always-on-top owner form pulls the dialog in front of the browser window. Progress is muted
  // because Add-Type reports "Preparing modules…" as a progress record, which lands on stderr as CLIXML;
  // any real failure stops the script so the caller sees a non-zero exit instead of a silent "cancelled".
  return [
    "$ProgressPreference = 'SilentlyContinue'",
    "$ErrorActionPreference = 'Stop'",
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
    "Add-Type -AssemblyName System.Windows.Forms",
    "$owner = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true; ShowInTaskbar = $false; Opacity = 0 }",
    kind === "directory"
      ? `$d = New-Object System.Windows.Forms.FolderBrowserDialog -Property @{ Description = '${title}'; ShowNewFolderButton = $false }`
      : `$d = New-Object System.Windows.Forms.OpenFileDialog -Property @{ Title = '${title}'; Filter = '${filter.replace(/'/g, "''")}'; Multiselect = $false; CheckFileExists = $true }`,
    "if ($d.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {",
    kind === "directory" ? "  Write-Output $d.SelectedPath" : "  Write-Output $d.FileName",
    "}",
  ].join("\n");
}

function exitCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "number" ? code : Number(code);
}

async function chooseWithZenity(kind: FilePickerKind, purpose: FilePickerPurpose): Promise<string | null> {
  if (!fs.existsSync(ZENITY)) {
    throw new HttpError(501, "Máy chưa có Zenity. Hãy dùng mục nhập đường dẫn thủ công.");
  }
  if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    throw new HttpError(503, "Không tìm thấy phiên desktop để mở trình chọn tệp. Hãy nhập đường dẫn thủ công.");
  }
  try {
    const { stdout } = await execFileP(ZENITY, filePickerArgs(kind, purpose), {
      encoding: "utf8",
      maxBuffer: 64 * 1024,
      timeout: 10 * 60 * 1000,
    });
    return stdout.trim() || null;
  } catch (error) {
    if (exitCode(error) === 1) return null;
    throw new HttpError(500, "Không thể mở trình chọn tệp. Hãy thử lại hoặc nhập đường dẫn thủ công.");
  }
}

async function chooseWithWindows(kind: FilePickerKind, purpose: FilePickerPurpose): Promise<string | null> {
  // -EncodedCommand carries the script as UTF-16, so the Vietnamese title never meets a code page.
  const encoded = Buffer.from(windowsPickerScript(kind, purpose), "utf16le").toString("base64");
  try {
    const { stdout } = await execFileP(POWERSHELL, ["-NoProfile", "-NonInteractive", "-STA", "-EncodedCommand", encoded], {
      encoding: "utf8",
      maxBuffer: 64 * 1024,
      timeout: 10 * 60 * 1000,
      windowsHide: true,
    });
    return stdout.trim() || null;
  } catch {
    throw new HttpError(500, "Không thể mở trình chọn tệp. Hãy thử lại hoặc nhập đường dẫn thủ công.");
  }
}

/** Open the desktop's native file dialog and return a path the local agent can read. */
export async function openFilePicker(kind: FilePickerKind, purpose: FilePickerPurpose) {
  const selected = process.platform === "win32"
    ? await chooseWithWindows(kind, purpose)
    : await chooseWithZenity(kind, purpose);
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

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { assertId, DS, HttpError, REPO } from "./paths";

const execFileP = promisify(execFile);
const GIO = "/usr/bin/gio";

export interface TrashRoots {
  repo: string;
  designSystem: string;
}

export interface VideoTrashTarget {
  kind: "project" | "scenes" | "voice" | "transcript" | "chapters";
  path: string;
}

const DEFAULT_ROOTS: TrashRoots = { repo: REPO, designSystem: DS };

function existingTarget(kind: VideoTrashTarget["kind"], target: string) {
  return fs.existsSync(/* turbopackIgnore: true */ target) ? [{ kind, path: target }] : [];
}

function dayFiles(root: string, names: string[], kind: VideoTrashTarget["kind"]) {
  if (!fs.existsSync(/* turbopackIgnore: true */ root)) return [];
  const targets: VideoTrashTarget[] = [];
  for (const day of fs.readdirSync(/* turbopackIgnore: true */ root, { withFileTypes: true })) {
    if (!day.isDirectory()) continue;
    for (const name of names) targets.push(...existingTarget(kind, path.join(root, day.name, name)));
  }
  return targets;
}

/** Every standalone location owned by one video. Shared build outputs are deliberately excluded. */
export function collectVideoTrashTargets(id: string, roots: TrashRoots = DEFAULT_ROOTS) {
  assertId(id);
  return [
    ...existingTarget("project", path.join(roots.repo, "projects", id)),
    ...existingTarget("scenes", path.join(roots.designSystem, "ui_kits/lesson-video/videos", id)),
    ...existingTarget("voice", path.join(roots.repo, "voice/out", id)),
    ...existingTarget("voice", path.join(roots.repo, "tts-elevenlabs/out", id)),
    ...dayFiles(path.join(roots.repo, "transcripts"), [`${id}.txt`], "transcript"),
    ...dayFiles(path.join(roots.repo, "chapters"), [`${id}-chương.txt`, `${id}-chapters.txt`], "chapters"),
  ];
}

/**
 * Windows: the Recycle Bin through SHFileOperation, the call Explorer's Delete uses. Before this the delete
 * button answered 501 on every Windows machine — the whole team. The flags matter: FOF_ALLOWUNDO recycles, and
 * FOF_WANTNUKEWARNING makes Windows ask before it would delete for good instead (a folder over the bin's size
 * limit, a drive with no bin) — .NET's VisualBasic DeleteDirectory, tried first, deletes those silently.
 * FOF_NOERRORUI keeps error dialogs off the desktop; the code comes back instead. The paths travel as JSON in
 * an environment variable and the script as -EncodedCommand, so no quoting can split `C:\Users\Tài\…`. The
 * path list is memory the script allocates itself: .NET's string marshalling stops at the first NUL, and
 * SHFileOperation takes NUL-separated paths.
 */
const RECYCLE = [
  "$ErrorActionPreference = 'Stop'",
  'Add-Type -TypeDefinition @"',
  "using System;",
  "using System.Runtime.InteropServices;",
  "public static class VsRecycle {",
  "  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]",
  "  struct Op { public IntPtr hwnd; public uint wFunc; public IntPtr pFrom; public IntPtr pTo; public ushort fFlags; public bool aborted; public IntPtr maps; public IntPtr title; }",
  '  [DllImport("shell32.dll", CharSet = CharSet.Unicode)] static extern int SHFileOperation(ref Op op);',
  "  public static int Run(string[] paths, out bool aborted) {",
  '    IntPtr from = Marshal.StringToHGlobalUni(string.Join("\\0", paths) + "\\0\\0");',
  "    try {",
  "      // FO_DELETE; FOF_SILENT | FOF_NOCONFIRMATION | FOF_ALLOWUNDO | FOF_NOERRORUI | FOF_WANTNUKEWARNING",
  "      var op = new Op { wFunc = 3, pFrom = from, fFlags = 0x4 | 0x10 | 0x40 | 0x400 | 0x4000 };",
  "      int code = SHFileOperation(ref op);",
  "      aborted = op.aborted;",
  "      return code;",
  "    } finally { Marshal.FreeHGlobal(from); }",
  "  }",
  "}",
  '"@',
  // No @(…) around it: in Windows PowerShell that wraps the whole array as one element, and the cast then
  // joins every path into a single string (measured).
  "$paths = [string[]](ConvertFrom-Json $env:VS_TRASH_PATHS)",
  "$aborted = $false",
  "$code = [VsRecycle]::Run($paths, [ref]$aborted)",
  "if ($code -ne 0) { throw ('SHFileOperation 0x{0:X}' -f $code) }",
  "if ($aborted) { throw 'Đã huỷ, chưa xoá thêm gì.' }",
].join("\n");

/** A pending "delete permanently?" question must not hold the request open forever. */
const TRASH_TIMEOUT_MS = 5 * 60_000;

function trashCommand(paths: string[]): { cmd: string; args: string[]; env?: NodeJS.ProcessEnv } {
  if (process.platform === "win32") {
    const script = Buffer.from(RECYCLE, "utf16le").toString("base64");
    return { cmd: "powershell.exe", args: ["-NoProfile", "-NonInteractive", "-EncodedCommand", script], env: { ...process.env, VS_TRASH_PATHS: JSON.stringify(paths) } };
  }
  if (!fs.existsSync(GIO)) throw new HttpError(501, "Máy chưa có GIO nên không thể đưa video vào Thùng rác.");
  return { cmd: GIO, args: ["trash", "--force", ...paths] };
}

export async function moveToSystemTrash(paths: string[]) {
  const { cmd, args, env } = trashCommand(paths);
  try {
    await execFileP(cmd, args, { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: TRASH_TIMEOUT_MS, ...(env ? { env } : {}) });
  } catch (error) {
    // The message of a failed execFile repeats the whole command line — here a page of base64. The first
    // line the program wrote to stderr is the reason.
    const stderr = String((error as { stderr?: unknown }).stderr ?? "").split(/\r?\n/).find((line) => line.trim());
    const killed = (error as { killed?: boolean }).killed ? "Hết thời gian chờ." : "";
    const reason = killed || stderr || (error instanceof Error ? error.message : "");
    throw new HttpError(500, `Không thể đưa toàn bộ dữ liệu vào Thùng rác.${reason ? ` ${reason}` : ""}`);
  }
}

/** Move all video-owned artifacts to the desktop Trash; nothing is permanently unlinked. */
export async function trashVideo(
  id: string,
  roots: TrashRoots = DEFAULT_ROOTS,
  mover: (paths: string[]) => Promise<void> = moveToSystemTrash,
) {
  const targets = collectVideoTrashTargets(id, roots);
  if (!targets.length) throw new HttpError(404, `Không tìm thấy dữ liệu của video ${id}.`);
  await mover(targets.map((target) => target.path));
  const remaining = targets.filter((target) => fs.existsSync(/* turbopackIgnore: true */ target.path));
  if (remaining.length) throw new HttpError(500, `Còn ${remaining.length} vị trí chưa được chuyển vào Thùng rác.`);
  return targets;
}

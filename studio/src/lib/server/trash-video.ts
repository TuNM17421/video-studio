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
 * Windows: the Recycle Bin through .NET's VisualBasic FileSystem, which ships with every Windows PowerShell.
 * The paths travel as JSON in an environment variable, so no quoting can split a folder like `C:\Users\Tài\…`.
 * Before this the delete button answered 501 on every Windows machine — the whole team.
 */
const RECYCLE = [
  "$ErrorActionPreference = 'Stop'",
  "Add-Type -AssemblyName Microsoft.VisualBasic",
  "foreach ($p in (ConvertFrom-Json $env:VS_TRASH_PATHS)) {",
  "  if (Test-Path -LiteralPath $p -PathType Container) { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($p, 'OnlyErrorDialogs', 'SendToRecycleBin') }",
  "  elseif (Test-Path -LiteralPath $p) { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p, 'OnlyErrorDialogs', 'SendToRecycleBin') }",
  "}",
].join("\n");

function trashCommand(paths: string[]): { cmd: string; args: string[]; env?: NodeJS.ProcessEnv } {
  if (process.platform === "win32") {
    return { cmd: "powershell.exe", args: ["-NoProfile", "-NonInteractive", "-Command", RECYCLE], env: { ...process.env, VS_TRASH_PATHS: JSON.stringify(paths) } };
  }
  if (!fs.existsSync(GIO)) throw new HttpError(501, "Máy chưa có GIO nên không thể đưa video vào Thùng rác.");
  return { cmd: GIO, args: ["trash", "--force", ...paths] };
}

export async function moveToSystemTrash(paths: string[]) {
  const { cmd, args, env } = trashCommand(paths);
  try {
    await execFileP(cmd, args, { encoding: "utf8", maxBuffer: 1024 * 1024, ...(env ? { env } : {}) });
  } catch (error) {
    const detail = error instanceof Error && error.message ? ` ${error.message}` : "";
    throw new HttpError(500, `Không thể đưa toàn bộ dữ liệu vào Thùng rác.${detail}`);
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

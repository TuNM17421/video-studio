import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { VideoState } from "../types";
import { exists, HttpError, importedDir, importedPage, projectDir, REPO, rel, stateDir, videoDir } from "./paths";
import { readState } from "./videos";

/**
 * Bàn giao sang Claude Design: Studio sinh bản brief, người dùng dán sang bên đó, rồi kéo kết quả về.
 *
 * Chỉ sinh brief, không gửi đi: công cụ `DesignSync` đọc/ghi được file của project trên claude.ai/design
 * nhưng **không có method nào gửi prompt cho agent thiết kế**, nên bước dán vẫn là việc của người. Phần
 * Studio làm được — và là phần tốn công nhất — là gom lời đọc, thời lượng **đo thật** của từng câu và phần
 * riêng của style thành một bản brief không lẫn đường dẫn của repo.
 *
 * Lõi nằm ở `tools/claude-design.mjs` để dùng được cả ngoài Studio (xem `tools/lib/claude-design.mjs`).
 */

export interface DesignBrief {
  /** Đường dẫn tương đối repo, để hiện cho người dùng biết file nằm đâu. */
  file: string;
  /** Nội dung brief, để nút Sao chép lấy thẳng chứ không phải đọc file lần nữa. */
  text: string;
  /** Thời lượng lấy từ giọng đã thu, hay mới là ước của kịch bản. */
  measured: boolean;
  cues: number;
  frames: number;
  /** Khổ hình brief được viết cho. Khác khổ của video (đổi sau khi sinh) thì brief đang nói sai cỡ khung. */
  format?: string;
  /** Style không có `styles/<id>.claude-design.md`: brief thiếu hẳn phần riêng của style. */
  styleMissing?: boolean;
  /** Số ảnh tư liệu đã duyệt mà brief nhắc tới — người dùng phải tải chúng lên project bên kia. */
  images?: number;
}

/** Những gì brief và lượt nhập gần nhất để lại, để mở lại Studio vẫn thấy mà không đoán từ chữ trong brief. */
interface Handoff {
  brief?: Pick<DesignBrief, "cues" | "frames" | "measured" | "format" | "styleMissing" | "images">;
  import?: ImportedBundle;
}
const HANDOFF = (id: string) => path.join(stateDir(id), "claude-design.json");
function readHandoff(id: string): Handoff {
  try { return JSON.parse(fs.readFileSync(HANDOFF(id), "utf8")) as Handoff; } catch { return {}; }
}
function writeHandoff(id: string, patch: Handoff) {
  fs.mkdirSync(stateDir(id), { recursive: true });
  fs.writeFileSync(HANDOFF(id), `${JSON.stringify({ ...readHandoff(id), ...patch }, null, 2)}\n`);
}

const BRIEF = (id: string) => path.join(projectDir(id), "prompt-claude-design.md");

function runTool(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(process.execPath, args, { cwd: REPO, maxBuffer: 8 << 20 }, (error, stdout, stderr) => {
      const code = error && typeof (error as { code?: number }).code === "number" ? (error as { code: number }).code : error ? 1 : 0;
      resolve({ code, stdout, stderr });
    });
  });
}

/**
 * Sinh brief cho một video. Cần `cues.js` đã có — tức bước Lời & cue đã chạy xong; thời lượng thật chỉ có
 * sau bước Giọng đọc, nên brief sinh trước đó tự ghi rõ là ước lượng.
 */
export async function writeBrief(id: string): Promise<DesignBrief> {
  const { state, managed } = readState(id);
  if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
  if (!exists(path.join(videoDir(id), "cues.js"))) {
    throw new HttpError(400, "Chưa có cues.js — chạy bước Lời & cue trước khi sinh brief.");
  }

  const out = BRIEF(id);
  // Khổ hình và năng lực là của bước Kế hoạch; người dựng bên kia không có REQUEST.md, nên brief là chỗ
  // duy nhất chúng tới được. Brief từng luôn nói "1920×1080" kể cả cho video dọc.
  const { code, stdout, stderr } = await runTool([
    "tools/claude-design.mjs", "prompt", rel(videoDir(id)), "--style", state.request.style,
    "--format", state.request.format || "16x9", "--modules", state.request.modules.join(","), "--out", rel(out),
  ]);
  if (code !== 0) throw new HttpError(500, stderr.trim().split("\n").pop() || "Không sinh được brief.");

  const text = fs.readFileSync(out, "utf8");
  // Dòng JSON tool in ra stdout là nguồn số đáng tin hơn là đọc lại brief bằng regex.
  const line = stdout.trim().split("\n").pop() || "{}";
  const summary = JSON.parse(line) as { cues?: number; frames?: number; measured?: boolean; format?: string; styleBlock?: boolean; images?: number };
  const meta = {
    cues: summary.cues ?? 0,
    frames: summary.frames ?? 0,
    measured: Boolean(summary.measured),
    format: summary.format || "16x9",
    styleMissing: summary.styleBlock === false,
    images: summary.images ?? 0,
  };
  writeHandoff(id, { brief: meta });
  return { file: rel(out), text, ...meta };
}

/** Brief đã sinh lần trước, để mở lại Studio vẫn thấy mà không phải sinh lại. */
export function readBrief(id: string): DesignBrief | null {
  const out = BRIEF(id);
  if (!exists(out)) return null;
  const text = fs.readFileSync(out, "utf8");
  const saved = readHandoff(id).brief;
  if (saved) return { file: rel(out), text, ...saved };
  // Brief sinh trước khi có file ghi nhớ: đọc lại từ chính chữ của nó. Khổ thì chỉ có thể là ngang — bản
  // brief đời đó không biết khổ nào khác, và đó chính là điều người dùng cần thấy nếu video là dọc.
  const cues = /## Danh sách (\d+) cảnh/.exec(text);
  const frames = /tổng \*\*([\d.,]+) frame\*\*/.exec(text);
  return {
    file: rel(out),
    text,
    cues: cues ? Number(cues[1]) : 0,
    frames: frames ? Number(frames[1].replace(/[.,]/g, "")) : 0,
    measured: !text.includes("Giọng đọc chưa thu"),
    format: "16x9",
  };
}

export interface BundleCheck { name: string; ok: boolean; detail: string; level: "ok" | "warning" | "problem" }
export interface ImportReport {
  ok: boolean;
  /** File .html của trang, để dựng URL render. */
  page: string | null;
  files: number;
  /** Đường tương đối repo, nơi file được chép tới. */
  dest: string;
  checks: BundleCheck[];
  /** Có mặt khi đã chép thật. */
  copied?: number;
  /** Số ảnh tư liệu của video được chép theo trang. */
  images?: number;
}
/** Lượt nhập gần nhất, đã chép thật — thứ bước Dựng cảnh và Render dựa vào sau khi tải lại trang. */
export interface ImportedBundle extends ImportReport {
  at: string;
  folder: string;
}

/**
 * Nhập cảnh dựng bên Claude Design: người dùng tải thư mục project về, chọn nó ở đây, Studio soát rồi chép
 * vào `ds-bundle/cd/<id>/`.
 *
 * Soát trước khi chép, cùng tinh thần với phép quét thư mục audio: một thư mục thiếu file hay lệch tổng
 * frame vẫn render ra đủ frame — chỉ là cảnh trắng hoặc trôi so với lời, và chỉ lộ ra sau khi đã render
 * xong cả bài. `--scan` chỉ soát, không chép.
 */
export async function importBundle(id: string, folder: string, scanOnly: boolean): Promise<ImportReport> {
  const { state, managed } = readState(id);
  if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
  if (!folder.trim()) throw new HttpError(400, "Chọn thư mục tải về từ Claude Design.");
  if (!path.isAbsolute(folder) || !exists(folder)) throw new HttpError(400, `Không tìm thấy thư mục ${folder}`);

  const args = ["tools/claude-design.mjs", "import", rel(videoDir(id)), "--from", folder, "--format", state.request.format || "16x9"];
  if (scanOnly) args.push("--scan");
  const { code, stdout, stderr } = await runTool(args);
  const parsed = stdout.trim().split("\n").pop();
  if (!parsed) throw new HttpError(500, stderr.trim().split("\n").pop() || "Không soát được thư mục.");
  const report = JSON.parse(parsed) as ImportReport;
  if (code !== 0 && !scanOnly) throw new HttpError(400, "Thư mục không qua phép soát — xem danh sách kiểm.");
  if (!scanOnly) writeHandoff(id, { import: { ...report, at: new Date().toISOString(), folder } });
  return report;
}

/**
 * Bản đang nằm trong `ds-bundle/cd/<id>/`, hoặc null. Chỉ tin file ghi nhớ khi trang còn đó: `ds-bundle/` bị
 * /design-sync dựng lại hay xoá tay thì "đã nhập" phải biến mất theo, không thì render chụp một trang 404.
 */
export function importedBundle(id: string): ImportedBundle | null {
  const page = importedPage(id);
  if (!page) return null;
  const saved = readHandoff(id).import;
  if (saved && saved.page === page) return saved;
  // Nhập trước khi có file ghi nhớ (hoặc chép tay): vẫn là một bản nhập, chỉ không còn bảng kiểm.
  return { ok: true, page, files: fs.readdirSync(importedDir(id)).length, dest: rel(importedDir(id)), checks: [], at: fs.statSync(path.join(importedDir(id), page)).mtime.toISOString(), folder: "" };
}

export const byClaudeDesign = (state: VideoState) => state.request.sceneBuilder === "claude-design";

/**
 * Chặn mọi đường gọi agent dựng cảnh ở máy khi video dựng bằng Claude Design. Agent ghi vào `videos/<id>/`,
 * còn render chụp trang nhập về — chạy nó là tốn token cho một bản không bao giờ được render.
 */
export function assertLocalScenes(state: VideoState) {
  if (byClaudeDesign(state)) {
    throw new HttpError(400, "Video này dựng cảnh bằng Claude Design, nên agent ở máy không dựng hay sửa cảnh. Sửa ở claude.ai/design rồi nhập lại, hoặc chọn Quay lại agent ở máy.");
  }
}

/**
 * Trạng thái bước Dựng cảnh ngay sau khi đổi chỗ dựng. Mỗi đường có bản của riêng nó, nên "chờ duyệt" chỉ
 * đúng khi đường vừa chọn đã có thứ để duyệt: trang nhập về (Claude Design) hoặc `video.jsx` (agent ở máy).
 */
export function scenesStageFor(id: string, builder: "agent" | "claude-design") {
  const has = builder === "claude-design" ? Boolean(importedPage(id)) : exists(path.join(videoDir(id), "video.jsx"));
  return has ? "review" as const : "idle" as const;
}

/** URL trang vừa nhập, để render bằng `--url`. `base` là server đang phục vụ ds-bundle. */
export const importedUrl = (id: string, page: string, base: string) =>
  `${base.replace(/\/$/, "")}/cd/${id}/${page}`;

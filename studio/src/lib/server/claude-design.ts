import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { exists, HttpError, projectDir, REPO, rel, videoDir } from "./paths";
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
  const { code, stderr } = await runTool([
    "tools/claude-design.mjs", "prompt", rel(videoDir(id)), "--style", state.request.style, "--out", rel(out),
  ]);
  if (code !== 0) throw new HttpError(500, stderr.trim().split("\n").pop() || "Không sinh được brief.");

  const text = fs.readFileSync(out, "utf8");
  // Dòng tổng kết tool in ra stderr là nguồn số đáng tin hơn là đọc lại brief bằng regex.
  const summary = /· (\d+) câu · ([\d.,]+) frame · thời lượng (đo thật|ƯỚC LƯỢNG)/.exec(stderr);
  return {
    file: rel(out),
    text,
    cues: summary ? Number(summary[1]) : 0,
    frames: summary ? Number(summary[2].replace(/[.,]/g, "")) : 0,
    measured: summary ? summary[3] === "đo thật" : false,
  };
}

/** Brief đã sinh lần trước, để mở lại Studio vẫn thấy mà không phải sinh lại. */
export function readBrief(id: string): DesignBrief | null {
  const out = BRIEF(id);
  if (!exists(out)) return null;
  const text = fs.readFileSync(out, "utf8");
  const cues = /## Danh sách (\d+) cảnh/.exec(text);
  const frames = /tổng \*\*([\d.,]+) frame\*\*/.exec(text);
  return {
    file: rel(out),
    text,
    cues: cues ? Number(cues[1]) : 0,
    frames: frames ? Number(frames[1].replace(/[.,]/g, "")) : 0,
    measured: !text.includes("Giọng đọc chưa thu"),
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
  const { managed } = readState(id);
  if (!managed) throw new HttpError(400, "Video này được làm ngoài Video Studio.");
  if (!folder.trim()) throw new HttpError(400, "Chọn thư mục tải về từ Claude Design.");
  if (!path.isAbsolute(folder) || !exists(folder)) throw new HttpError(400, `Không tìm thấy thư mục ${folder}`);

  const args = ["tools/claude-design.mjs", "import", rel(videoDir(id)), "--from", folder];
  if (scanOnly) args.push("--scan");
  const { code, stdout, stderr } = await runTool(args);
  const parsed = stdout.trim().split("\n").pop();
  if (!parsed) throw new HttpError(500, stderr.trim().split("\n").pop() || "Không soát được thư mục.");
  const report = JSON.parse(parsed) as ImportReport;
  if (code !== 0 && !scanOnly) throw new HttpError(400, "Thư mục không qua phép soát — xem danh sách kiểm.");
  return report;
}

/** URL trang vừa nhập, để render bằng `--url`. `base` là server đang phục vụ ds-bundle. */
export const importedUrl = (id: string, page: string, base: string) =>
  `${base.replace(/\/$/, "")}/cd/${id}/${page}`;

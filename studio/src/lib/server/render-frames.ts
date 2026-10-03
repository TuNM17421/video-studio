import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Frame của một lần render được giữ lại khi render dừng giữa chừng (bấm Dừng, tab nghẹn, máy tắt), để lần
 * sau `render.mjs --keep-frames` chỉ chụp phần còn thiếu thay vì chụp lại cả video từ frame 0. Nhưng frame cũ
 * chỉ dùng được khi hình chưa đổi: cảnh, giọng (thời lượng), phụ đề, nhịp fps hay bundle design system đổi thì ghép
 * frame cũ vào là ra một video nửa cũ nửa mới. Vân tay dưới đây gom đúng những thứ quyết định một frame trông
 * thế nào; lệch là xoá sạch thư mục frame rồi chụp lại từ đầu.
 */
export interface FrameInputs {
  /** Thư mục video trong design system: cảnh, cues.js, voice.js, video.jsx (khổ hình), ảnh tư liệu. */
  videoDir: string;
  /** File hoặc thư mục chung quyết định hình: bundle, CSS và font của design system, chính render.mjs. */
  shared: string[];
  captions: boolean;
  /** Nhịp render: frame đánh số theo frame đầu ra, nên đổi 30 ↔ 60 thì `render.mjs` từ chối thư mục cũ. */
  fps: number;
}

function hashTree(hash: ReturnType<typeof createHash>, root: string, dir = root) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) hashTree(hash, root, full);
    else if (entry.isFile()) {
      hash.update(`${path.relative(root, full).split(path.sep).join("/")}\0`);
      hash.update(fs.readFileSync(full));
      hash.update("\0");
    }
  }
}

export function frameFingerprint(inputs: FrameInputs) {
  const hash = createHash("sha256");
  hash.update(`captions=${inputs.captions ? 1 : 0}\0fps=${inputs.fps}\0`);
  for (const entry of inputs.shared) {
    hash.update(`${entry}\0`);
    if (!fs.existsSync(entry)) hash.update("(missing)\0");
    else if (fs.statSync(entry).isDirectory()) hashTree(hash, entry);
    else hash.update(fs.readFileSync(entry)).update("\0");
  }
  hashTree(hash, inputs.videoDir);
  return hash.digest("hex");
}

const STAMP = ".fingerprint";

/**
 * Chuẩn bị thư mục frame cho một lần render: giữ frame cũ nếu vân tay khớp, xoá nếu lệch. Trả về số frame
 * còn dùng lại được (để ghi nhật ký) — 0 khi thư mục mới hoặc vừa bị xoá.
 */
export function prepareFramesDir(dir: string, fingerprint: string) {
  const stamp = path.join(dir, STAMP);
  const previous = fs.existsSync(stamp) ? fs.readFileSync(stamp, "utf8").trim() : null;
  let reusable = 0;
  if (previous === fingerprint) {
    reusable = fs.readdirSync(dir).filter((f) => /^f\d+\.png$/.test(f)).length;
  } else {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(stamp, `${fingerprint}\n`);
  return { reusable, discarded: previous !== null && previous !== fingerprint };
}

/** MP4 đã ra: frame không còn giá trị gì, mà một video 10 phút là vài GB PNG. */
export function clearFramesDir(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
}

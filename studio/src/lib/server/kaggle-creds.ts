import fs from "node:fs";
import path from "node:path";
import { registry } from "./jobs";
import { HttpError, REPO } from "./paths";

export const hasKaggleCreds = () => Boolean(registry.kaggle);
export const kaggleUsername = () => registry.kaggle?.username ?? "";

/**
 * Kaggle có hai loại khoá: API key cũ (32 ký tự hex, trong kaggle.json) và access token mới tạo ở
 * Settings → API. CLI 2.x nhận cả hai nhưng qua hai biến khác nhau, nên phân loại ngay lúc nhận.
 */
const LEGACY_KEY = /^[0-9a-f]{32}$/i;

export function setKaggleCreds(username: string, key: string) {
  const u = username.trim();
  const k = key.trim();
  // Username ở đây là chủ của kernel (`<username>/<slug>`), CLI không tự suy ra được từ key cũ.
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(u)) throw new HttpError(400, "Kaggle username không hợp lệ.");
  if (k.length < 10 || /\s/.test(k)) throw new HttpError(400, "Kaggle API key/token không hợp lệ.");
  registry.kaggle = { username: u, key: k };
}

export const clearKaggleCreds = () => { registry.kaggle = null; };

/**
 * Parse the kaggle.json downloaded from Kaggle → Settings → API. Kept in memory only, exactly like
 * the ElevenLabs key — never written to ~/.kaggle/kaggle.json or any file this repo's agents can read.
 */
export function parseKaggleJson(raw: string) {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new HttpError(400, "Tệp không phải JSON hợp lệ."); }
  const row = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
  const username = String(row.username || "");
  const key = String(row.key || "");
  if (!username || !key) throw new HttpError(400, "Thiếu username hoặc key trong kaggle.json.");
  return { username, key };
}

/**
 * Một thư mục cấu hình rỗng cho CLI. Không có nó, CLI đọc cả ~/.kaggle/kaggle.json hay access_token có
 * sẵn trên máy — và access token thì thắng credentials Studio đưa vào, nên kernel có thể bị đẩy lên một
 * tài khoản khác với tài khoản người dùng vừa nhập (id kernel lại mang tên tài khoản kia).
 */
// Không đặt trong venv: venv giờ có thể nằm ở thư mục dùng chung hay ở worktree khác (tools/lib/shared-env.mjs).
const CONFIG_DIR = path.join(REPO, "voice/cache/kaggle-config");

/** Env for spawning the `kaggle` CLI: credentials only reach that one subprocess, never on disk. */
export function kaggleEnv(): NodeJS.ProcessEnv {
  if (!registry.kaggle) throw new HttpError(400, "Nhập Kaggle username/key trước.");
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const env: NodeJS.ProcessEnv = { ...process.env, KAGGLE_CONFIG_DIR: CONFIG_DIR };
  for (const name of ["KAGGLE_USERNAME", "KAGGLE_KEY", "KAGGLE_API_TOKEN", "KAGGLE_API_V1_TOKEN"]) delete env[name];
  const { username, key } = registry.kaggle;
  if (LEGACY_KEY.test(key)) return { ...env, KAGGLE_USERNAME: username, KAGGLE_KEY: key };
  return { ...env, KAGGLE_API_TOKEN: key };
}

/** Xoá mọi dấu vết của key trong một dòng log — CLI có thể in lại request lỗi kèm header. */
export function redactKaggle(line: string) {
  const key = registry.kaggle?.key;
  return key ? line.split(key).join("•••") : line;
}

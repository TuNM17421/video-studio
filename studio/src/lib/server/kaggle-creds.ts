import { registry } from "./jobs";
import { HttpError } from "./paths";

export const hasKaggleCreds = () => Boolean(registry.kaggle);
export const kaggleUsername = () => registry.kaggle?.username ?? "";

export function setKaggleCreds(username: string, key: string) {
  const u = username.trim();
  const k = key.trim();
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(u)) throw new HttpError(400, "Kaggle username không hợp lệ.");
  if (k.length < 10 || /\s/.test(k)) throw new HttpError(400, "Kaggle API key không hợp lệ.");
  registry.kaggle = { username: u, key: k };
}

export const clearKaggleCreds = () => { registry.kaggle = null; };

/**
 * Parse the kaggle.json downloaded from Account → Create New Token. Kept in memory only, exactly like
 * the ElevenLabs key — never written to ~/.kaggle/kaggle.json or any file this repo's agents can read.
 */
export function parseKaggleJson(raw: string) {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new HttpError(400, "Tệp không phải JSON hợp lệ."); }
  const row = parsed as Record<string, unknown>;
  const username = String(row.username || "");
  const key = String(row.key || "");
  if (!username || !key) throw new HttpError(400, "Thiếu username hoặc key trong kaggle.json.");
  return { username, key };
}

/** Env for spawning the `kaggle` CLI: credentials only reach that one subprocess, never on disk. */
export function kaggleEnv() {
  if (!registry.kaggle) throw new HttpError(400, "Nhập Kaggle username/key trước.");
  return { ...process.env, KAGGLE_USERNAME: registry.kaggle.username, KAGGLE_KEY: registry.kaggle.key };
}

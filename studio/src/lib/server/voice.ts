import fs from "node:fs";
import path from "node:path";
import type { DryRun, ImportReport, VoiceScript, VoiceSettings } from "../types";
import { finishJob, log, registry, run, setProgress, startJob, wasStopped } from "./jobs";
import { HttpError, projectDir, REPO, rel, stateDir, videoDir, voiceOut, voiceScriptDir } from "./paths";
import { readState, setStage, updateState } from "./videos";

export const hasKey = () => Boolean(registry.elevenKey);
export function setKey(key: string) {
  const trimmed = key.trim();
  if (trimmed.length < 20 || /\s/.test(trimmed)) throw new HttpError(400, "API key không hợp lệ.");
  registry.elevenKey = trimmed;
}
export const clearKey = () => { registry.elevenKey = null; };

/**
 * The voice id already configured for the CLI, offered as the default for a new video. Only
 * ELEVENLABS_VOICE_ID is read — the key in the same file stays in RAM only, entered through the UI.
 */
export function envVoiceId() {
  try {
    const env = fs.readFileSync(path.join(REPO, "tts-elevenlabs/.env"), "utf8");
    const match = env.match(/^\s*ELEVENLABS_VOICE_ID\s*=\s*(.+)$/m);
    const id = match?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
    return /^[A-Za-z0-9]{8,40}$/.test(id) ? id : "";
  } catch {
    return "";
  }
}

/** The account's voices, for the picker. Needs the session key; never cached, so a new voice shows up. */
export async function listVoices() {
  const key = registry.elevenKey;
  if (!key) throw new HttpError(400, "Nhập API key ElevenLabs trước.");
  const res = await fetch("https://api.elevenlabs.io/v2/voices?page_size=100", { headers: { "xi-api-key": key } });
  // A key scoped to text-to-speech only still synthesizes fine but cannot list voices, so say which
  // of the two it is instead of a bare status code — the voice id can still be typed in by hand.
  if (res.status === 401) throw new HttpError(502, "Key này không có quyền đọc danh sách giọng (voices read). Vẫn tạo giọng được — nhập thẳng Voice ID.");
  if (!res.ok) throw new HttpError(502, `ElevenLabs trả lỗi ${res.status} khi lấy danh sách giọng.`);
  const json = (await res.json()) as { voices?: { voice_id: string; name: string; labels?: Record<string, string> }[] };
  return (json.voices ?? []).map((v) => ({
    id: v.voice_id,
    name: v.name,
    detail: [v.labels?.accent, v.labels?.gender, v.labels?.use_case].filter(Boolean).join(" · "),
  }));
}

/** Env for tts.mjs: every setting explicit, so tts-elevenlabs/.env (if any) never supplies the key. */
function ttsEnv(v: VoiceSettings, key: string) {
  return {
    ...process.env,
    ELEVENLABS_API_KEY: key,
    ELEVENLABS_VOICE_ID: v.voiceId,
    ELEVENLABS_MODEL_ID: v.model,
    ELEVENLABS_LANGUAGE: v.language,
  };
}

function ttsArgs(id: string, v: VoiceSettings) {
  const pronounce = path.join(projectDir(id), "pronounce.json");
  return [
    "tts-elevenlabs/tts.mjs", "generate",
    "--cues", rel(path.join(videoDir(id), "cues.js")),
    "--out", rel(voiceOut(id)),
    "--pause", String(v.pause),
    ...(fs.existsSync(pronounce) ? ["--pronounce", rel(pronounce)] : []),
    // development only: silent placeholder audio, no ElevenLabs call (STUDIO_TTS_MOCK=1 npm run dev)
    ...(process.env.STUDIO_TTS_MOCK === "1" ? ["--mock"] : []),
  ];
}

export function validateVoice(v: VoiceSettings) {
  if (!(v.pause >= 0 && v.pause <= 5)) throw new HttpError(400, "Khoảng nghỉ phải trong 0–5 giây.");
  if (v.source === "import") return;
  if (!/^[A-Za-z0-9]{8,40}$/.test(v.voiceId)) throw new HttpError(400, "Voice ID không hợp lệ.");
  if (!/^eleven_[a-z0-9_]+$/.test(v.model)) throw new HttpError(400, "Model không hợp lệ.");
  if (!["vi", "auto"].includes(v.language)) throw new HttpError(400, "Ngôn ngữ không hợp lệ.");
}

const dryRunFile = (id: string) => path.join(stateDir(id), "dry-run.json");
export function lastDryRun(id: string): DryRun | null {
  try { return JSON.parse(fs.readFileSync(dryRunFile(id), "utf8")); } catch { return null; }
}

/** Free: what would be sent and how many characters are not cached yet. */
export async function dryRun(id: string, v: VoiceSettings) {
  validateVoice(v);
  updateState(id, (s) => { s.voice = v; });
  let out = "";
  const errors: string[] = [];
  startJob(id, "dry-run");
  const code = await run(id, process.execPath, [...ttsArgs(id, v), "--dry-run", "--json"], {
    env: ttsEnv(v, ""),
    onLine: (line, stream) => { if (stream === "stdout") out += line; else errors.push(line); },
  });
  finishJob(id, code === 0 ? "done" : "error");
  if (code !== 0) throw new HttpError(500, errors.join("\n").replace(/^✗ /, "") || "Không chạy được dry-run.");
  const result = JSON.parse(out) as DryRun;
  fs.mkdirSync(stateDir(id), { recursive: true });
  fs.writeFileSync(dryRunFile(id), JSON.stringify(result));
  return result;
}

/** Paid: synthesize (cached câu are free), assemble the master, bind it to the video with --write-cues. */
export async function generateVoice(id: string) {
  const key = registry.elevenKey;
  if (!key) throw new HttpError(400, "Nhập API key ElevenLabs trước.");
  const { state } = readState(id);
  const v = state.voice;
  validateVoice(v);
  startJob(id, "voice");
  setStage(id, "voice", "running");
  log(id, "system", `Tạo giọng · ${v.model} · nghỉ ${v.pause} s`);
  const total = lastDryRun(id)?.toGenerate || 0;
  let done = 0;
  const code = await run(id, process.execPath, ttsArgs(id, v), {
    env: ttsEnv(v, key),
    onLine(line, stream) {
      // never echo anything that could contain the key (tts.mjs does not print it; this is belt and braces)
      const safe = line.split(key).join("•••");
      log(id, stream === "stderr" ? "error" : "output", safe);
      if (/→ ElevenLabs/.test(line)) {
        done++;
        setProgress(id, total ? Math.min(99, (done / total) * 100) : null, `Đang tạo câu ${done}${total ? `/${total}` : ""}…`);
      }
    },
  });
  if (code !== 0 || wasStopped(id)) {
    setStage(id, "voice", "error", wasStopped(id) ? "Đã dừng." : "Tạo giọng thất bại, xem nhật ký.");
    finishJob(id, "error");
    return false;
  }
  setProgress(id, null, "Gắn giọng vào video…");
  const bind = await bindVoice(id);
  setStage(id, "voice", bind ? "done" : "error", bind ? null : "Không gắn được giọng vào video.");
  finishJob(id, bind ? "done" : "error");
  return bind;
}

/** voice.cues.json → voice.js + measured frames back into cues.js, so scenes are authored at real length. */
async function bindVoice(id: string) {
  const code = await run(id, process.execPath, ["tools/voice-timing.mjs", rel(path.join(voiceOut(id), "voice.cues.json")), rel(videoDir(id)), "--write-cues"], {
    onLine: (line, stream) => log(id, stream === "stderr" ? "error" : "output", line),
  });
  return code === 0;
}

// ── narration recorded or generated outside the repo ─────────────────────────

/** Run a repo tool that prints one JSON object on stdout; stderr is the human-readable progress. */
async function toolJson<T>(id: string, args: string[], onLine?: (line: string) => void) {
  let out = "";
  const errors: string[] = [];
  const code = await run(id, process.execPath, args, {
    onLine: (line, stream) => {
      if (stream === "stdout") { out += line; return; }
      errors.push(line);
      onLine?.(line);
    },
  });
  if (code !== 0) throw new HttpError(500, errors.join("\n").replace(/^✗ /, "") || "Không chạy được công cụ.");
  try { return JSON.parse(out) as T; } catch { throw new HttpError(500, errors.join("\n") || "Công cụ trả về dữ liệu không đọc được."); }
}

/** Write the reading script + the local-model exports so a member can record the narration elsewhere. */
export async function exportScript(id: string) {
  startJob(id, "voice-script");
  try {
    const result = await toolJson<VoiceScript>(id, ["tools/voice-export.mjs", rel(videoDir(id)), "--out", rel(voiceScriptDir(id)), "--json"]);
    log(id, "system", `Xuất lời đọc · ${result.spoken}/${result.cues} câu → ${rel(voiceScriptDir(id))}`);
    finishJob(id, "done");
    return result;
  } catch (error) {
    finishJob(id, "error");
    throw error;
  }
}

const importReportFile = (id: string) => path.join(stateDir(id), "import-report.json");
export function lastImportReport(id: string): ImportReport | null {
  try { return JSON.parse(fs.readFileSync(importReportFile(id), "utf8")); } catch { return null; }
}

function importArgs(id: string, dir: string, v: VoiceSettings) {
  return [
    "tools/voice-import.mjs",
    "--cues", rel(path.join(videoDir(id), "cues.js")),
    "--from", dir,
    "--out", rel(voiceOut(id)),
    "--pause", String(v.pause),
    "--json",
  ];
}

/** The folder must be a real directory outside the repo's own generated output. */
function assertImportDir(dir: string) {
  const target = path.resolve(dir);
  if (!path.isAbsolute(dir)) throw new HttpError(400, "Hãy chọn thư mục bằng đường dẫn đầy đủ.");
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) throw new HttpError(400, "Không tìm thấy thư mục audio đó.");
  if (target === REPO || `${target}${path.sep}`.startsWith(path.join(REPO, "voice", "out") + path.sep)) {
    throw new HttpError(400, "Hãy chọn thư mục audio của bạn, không phải thư mục kết quả của hệ thống.");
  }
  return target;
}

/** Free: which file goes to which câu, and everything that looks wrong — nothing is written. */
export async function scanImport(id: string, dir: string, v: VoiceSettings) {
  validateVoice(v);
  const target = assertImportDir(dir);
  updateState(id, (s) => { s.voice = { ...v, importDir: target }; });
  startJob(id, "import-scan");
  try {
    const report = await toolJson<ImportReport>(id, [...importArgs(id, target, v), "--scan"], (line) => {
      if (/^align \d+\/\d+/.test(line)) setProgress(id, null, `Đang nhận diện giọng · ${line.replace(/^align /, "")}`);
    });
    fs.mkdirSync(stateDir(id), { recursive: true });
    fs.writeFileSync(importReportFile(id), JSON.stringify(report));
    log(id, "system", `Kiểm tra thư mục giọng · ${report.matched}/${report.needFile} câu · ${report.rows.filter((r) => r.level === "error").length} lỗi`);
    finishJob(id, "done");
    return report;
  } catch (error) {
    finishJob(id, "error");
    throw error;
  }
}

/** Assemble the master from the folder and bind it to the video, exactly as the ElevenLabs path does. */
export async function importVoice(id: string, force: boolean) {
  const { state } = readState(id);
  const v = state.voice;
  const target = assertImportDir(v.importDir);
  startJob(id, "voice");
  setStage(id, "voice", "running");
  log(id, "system", `Nhập giọng · ${path.basename(target)} · nghỉ ${v.pause} s`);
  let report: ImportReport;
  try {
    report = await toolJson<ImportReport>(id, [...importArgs(id, target, v), ...(force ? ["--force"] : [])], (line) => {
      log(id, "output", line);
      if (/^align \d+\/\d+/.test(line)) setProgress(id, null, `Đang nhận diện giọng · ${line.replace(/^align /, "")}`);
    });
  } catch (error) {
    const message = error instanceof HttpError ? error.message : String(error);
    setStage(id, "voice", "error", message);
    finishJob(id, "error");
    return false;
  }
  fs.writeFileSync(importReportFile(id), JSON.stringify(report));
  if (wasStopped(id)) {
    setStage(id, "voice", "error", "Đã dừng.");
    finishJob(id, "error");
    return false;
  }
  setProgress(id, null, "Gắn giọng vào video…");
  const bind = await bindVoice(id);
  setStage(id, "voice", bind ? "done" : "error", bind ? null : "Không gắn được giọng vào video.");
  finishJob(id, bind ? "done" : "error");
  return bind;
}

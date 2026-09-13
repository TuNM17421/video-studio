import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { DryRun, ImportReport, OmnivoiceStatus, VoiceScript, VoiceSettings } from "../types";
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

/**
 * Trạng thái môi trường OmniVoice. `--check` thoát mã 1 khi chưa cài, nên đọc stdout rồi mới xét mã —
 * "chưa cài" là một câu trả lời hợp lệ, không phải lỗi.
 */
/** Chạy một tool của repo và đọc JSON nó in ra; mã thoát khác 0 vẫn có thể kèm JSON hợp lệ. */
function toolState<T>(args: string[], fallback: T): Promise<T> {
  return new Promise((resolve) => {
    execFile(process.execPath, args, { cwd: REPO }, (_error, stdout) => {
      try { resolve(JSON.parse(stdout) as T); } catch { resolve(fallback); }
    });
  });
}

type ServerState = OmnivoiceStatus["server"];
const NO_SERVER: ServerState = { running: false, pid: null, port: 7860, url: null, log: "voice/.omnivoice/server.log" };

/**
 * Bước nhập soát từng file bằng Whisper, và Whisper sống ở `voice/.venv` — venv khác hẳn cái mà
 * OmniVoice dựng. Không hỏi trước thì người dùng sinh xong 40 câu (hàng chục phút GPU) mới đụng tường.
 */
const alignInstalled = () =>
  ["bin/python", "Scripts/python.exe"].some((p) => fs.existsSync(path.join(REPO, "voice/.venv", p)));

export async function omnivoiceStatus(): Promise<OmnivoiceStatus> {
  const [env, server] = await Promise.all([
    toolState(["tools/setup-omnivoice.mjs", "--check"], {
      installed: false, bin: null, venv: "voice/.venv-omnivoice",
      device: { id: "cpu" as const, label: "không xác định", vramGb: null, tight: true },
      modelId: "k2-fsa/OmniVoice", modelGb: 3.3,
    }),
    toolState(["tools/omnivoice-server.mjs", "status", "--json"], NO_SERVER),
  ]);
  // Đường dẫn hiện nguyên văn trong giao diện, mà dấu \ của Windows đọc như ký tự escape — đưa về / cho
  // giống mọi chỗ khác trong Studio (và giống đúng những gì README bảo người dùng gõ).
  const slash = (p: string) => p.replace(/\\/g, "/");
  return {
    ...env,
    venv: slash(env.venv),
    align: alignInstalled(),
    server: { running: server.running, pid: server.pid, port: server.port, url: server.url, log: slash(server.log) },
  };
}

/**
 * Cài môi trường nhận diện giọng (`npm run setup:voice`). Chung một job với các bước khác để người dùng
 * không phải mở terminal giữa chừng — đây là cái tường duy nhất của luồng model local.
 */
export async function setupAlign(id: string) {
  startJob(id, "align-setup");
  setProgress(id, null, "Cài môi trường nhận diện giọng (Whisper)…");
  log(id, "system", "Cài Whisper vào voice/.venv — bước nhập dùng nó để soát từng file có đúng câu không.");
  const code = await run(id, process.execPath, ["tools/setup-voice-align.mjs"], {
    onLine: (line) => log(id, "output", line),
  });
  const stopped = wasStopped(id);
  finishJob(id, code === 0 ? "done" : "error");
  if (code !== 0) throw new HttpError(500, stopped ? "Đã dừng cài đặt." : "Cài môi trường nhận diện giọng thất bại, xem nhật ký.");
  return omnivoiceStatus();
}

/**
 * Bật/tắt server. Tiến trình chạy tách hẳn (detached) nên không dùng job của video: một job bị Dừng sẽ
 * giết luôn server, mà server là thứ dùng chung cho mọi video.
 */
export async function omnivoiceServer(action: "start" | "stop"): Promise<OmnivoiceStatus> {
  await toolState(["tools/omnivoice-server.mjs", action, "--json"], NO_SERVER);
  return omnivoiceStatus();
}

/**
 * Cài OmniVoice. Chạy như một job của video đang mở để nhật ký và nút Dừng dùng chung một chỗ, dù thứ
 * nó cài là của cả máy chứ không riêng video nào — tải vài GB, không thể để người dùng ngồi nhìn màn im.
 */
export async function setupOmnivoice(id: string) {
  startJob(id, "omnivoice-setup");
  setProgress(id, null, "Cài model local (OmniVoice)…");
  log(id, "system", "Cài model local: torch + omnivoice vào voice/.venv-omnivoice");
  const code = await run(id, process.execPath, ["tools/setup-omnivoice.mjs"], {
    onLine: (line) => log(id, "output", line),
  });
  const stopped = wasStopped(id);
  finishJob(id, code === 0 ? "done" : "error");
  if (code !== 0) throw new HttpError(500, stopped ? "Đã dừng cài đặt." : "Cài model local thất bại, xem nhật ký.");
  return omnivoiceStatus();
}

/**
 * Sinh cả video bằng model local. Kết quả là một thư mục 01.wav, 02.wav… — tức là đúng thứ bước "Nhập
 * audio có sẵn" nhận, nên từ đây trở đi đường đi giống hệt giọng tự thu: kiểm thư mục rồi nhập.
 */
export async function generateLocal(id: string, voiceId: string) {
  const out = path.join(voiceScriptDir(id), "omnivoice");
  startJob(id, "omnivoice-generate");
  setProgress(id, null, "Sinh giọng bằng model local…");
  try {
    const result = await toolJson<{ dir: string; files: number; cues: number; voice: string }>(id, [
      "tools/omnivoice-generate.mjs",
      "--cues", rel(path.join(videoDir(id), "cues.js")),
      "--voice", voiceId,
      "--out", rel(out),
      "--json",
    ], (line) => log(id, "output", line));
    // Trỏ sẵn thư mục vừa sinh vào ô nhập, để bước tiếp theo chỉ còn bấm kiểm tra. Đồng thời xoá báo
    // cáo quét cũ: giữ lại thì màn hình Nhập hiện "không có vấn đề" cho một thư mục vừa bị ghi đè.
    updateState(id, (s) => { s.voice = { ...s.voice, importDir: out }; });
    fs.rmSync(importReportFile(id), { force: true });
    log(id, "system", `Model local đã sinh ${result.files}/${result.cues} câu · giọng ${result.voice} → ${result.dir}`);
    finishJob(id, "done");
    return result;
  } catch (error) {
    finishJob(id, "error");
    if (wasStopped(id)) throw new HttpError(500, "Đã dừng.");
    throw error;
  }
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

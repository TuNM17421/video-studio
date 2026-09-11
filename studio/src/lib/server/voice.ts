import fs from "node:fs";
import path from "node:path";
import type { DryRun, VoiceSettings } from "../types";
import { finishJob, log, registry, run, setProgress, startJob, wasStopped } from "./jobs";
import { HttpError, projectDir, rel, stateDir, videoDir, voiceOut } from "./paths";
import { readState, setStage, updateState } from "./videos";

export const hasKey = () => Boolean(registry.elevenKey);
export function setKey(key: string) {
  const trimmed = key.trim();
  if (trimmed.length < 20 || /\s/.test(trimmed)) throw new HttpError(400, "API key không hợp lệ.");
  registry.elevenKey = trimmed;
}
export const clearKey = () => { registry.elevenKey = null; };

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
  if (!/^[A-Za-z0-9]{8,40}$/.test(v.voiceId)) throw new HttpError(400, "Voice ID không hợp lệ.");
  if (!/^eleven_[a-z0-9_]+$/.test(v.model)) throw new HttpError(400, "Model không hợp lệ.");
  if (!["vi", "auto"].includes(v.language)) throw new HttpError(400, "Ngôn ngữ không hợp lệ.");
  if (!(v.pause >= 0 && v.pause <= 5)) throw new HttpError(400, "Khoảng nghỉ phải trong 0–5 giây.");
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
  const bind = await run(id, process.execPath, ["tools/voice-timing.mjs", rel(path.join(voiceOut(id), "voice.cues.json")), rel(videoDir(id)), "--write-cues"], {
    onLine: (line, stream) => log(id, stream === "stderr" ? "error" : "output", line),
  });
  setStage(id, "voice", bind === 0 ? "done" : "error", bind === 0 ? null : "Không gắn được giọng vào video.");
  finishJob(id, bind === 0 ? "done" : "error");
  return bind === 0;
}

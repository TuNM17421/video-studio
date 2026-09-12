/**
 * The voice catalog (voices.json at the repo root): which narrators this course uses, what each one sounds
 * like, and which sample on the media bucket lets you hear it. One committed file so a voice is chosen by
 * name in the studio and on the command line, instead of an opaque id pasted into .env.
 *
 * `engine` says who can speak it — "elevenlabs" today, "local" once a cloned model can read the same line.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CATALOG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../voices.json');

export function readVoices() {
  if (!fs.existsSync(CATALOG)) return { sampleText: '', voices: [], deliveries: {}, speedRange: [0.7, 1.2] };
  const raw = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  return {
    sampleText: raw.sampleText || '',
    voices: raw.voices || [],
    deliveries: raw.deliveries || {},
    speedRange: raw.speedRange || [0.7, 1.2],
  };
}

export const defaultVoice = () => readVoices().voices.find((v) => v.default) || null;

/** Accepts an ElevenLabs id or a catalog name ("Nhật Phong"); an unknown id passes through unchanged. */
export function resolveVoice(value) {
  const wanted = String(value || '').trim();
  if (!wanted) return null;
  const { voices } = readVoices();
  const byId = voices.find((v) => v.id === wanted);
  if (byId) return byId;
  const lower = wanted.toLowerCase();
  const byName = voices.find((v) => v.name.toLowerCase() === lower);
  if (byName) return byName;
  return /^[A-Za-z0-9]{8,40}$/.test(wanted) ? { id: wanted, name: wanted, engine: 'elevenlabs', unknown: true } : null;
}

/**
 * Who says this câu. Dialogue is cast strictly from the catalog: a name nobody recorded is a script bug,
 * and failing here — free, before any request — beats discovering it after ElevenLabs has been billed for
 * a video read entirely in the wrong voice. A new character means a new entry in voices.json, by a dev.
 */
export function castSpeaker(speaker) {
  const { voices } = readVoices();
  const wanted = String(speaker || '').trim();
  const found = voices.find((v) => v.id === wanted || v.name.toLowerCase() === wanted.toLowerCase());
  if (found) return found;
  const names = voices.map((v) => v.name).join(' · ');
  throw new Error(`không có nhân vật "${wanted}" trong voices.json.\n  Hội thoại chỉ dùng được các giọng đã có: ${names}\n  Cần thêm nhân vật mới thì báo dev bổ sung vào voices.json.`);
}

/**
 * Reading speed for one câu: the character's own pace times the delivery preset, kept inside what the API
 * accepts. Clamping is reported rather than silent — a câu that lost its intended pace should be visible.
 */
export function speedFor(voice, delivery) {
  const { deliveries, speedRange } = readVoices();
  const key = String(delivery || '').trim();
  if (key && !deliveries[key]) {
    throw new Error(`không có kiểu đọc "${key}".\n  Các kiểu hiện có: ${Object.keys(deliveries).join(' · ')}`);
  }
  const wanted = (voice?.speed ?? 1) * (key ? deliveries[key].speed : 1);
  const [min, max] = speedRange;
  const speed = Math.min(max, Math.max(min, wanted));
  return { speed: Number(speed.toFixed(3)), clamped: Math.abs(speed - wanted) > 1e-9, wanted: Number(wanted.toFixed(3)) };
}

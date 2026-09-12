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
  if (!fs.existsSync(CATALOG)) return { sampleText: '', voices: [] };
  const raw = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  return { sampleText: raw.sampleText || '', voices: raw.voices || [] };
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

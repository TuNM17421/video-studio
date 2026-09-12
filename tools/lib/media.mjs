/**
 * Public URL of a file in the media bucket, read from the committed media/manifest.json.
 *
 * Mirrors studio/src/lib/server/media.ts for the command-line side of the pipeline: tts.mjs needs it to
 * write a character's avatar URL into voice.cues.json, so scenes get a ready URL and the design system
 * never has to know where this repo keeps its media.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MANIFEST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../media/manifest.json');

export function readManifest() {
  try {
    const raw = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    return { base: (process.env.MEDIA_BASE || raw.base || '').replace(/\/+$/, ''), assets: raw.assets || {} };
  } catch {
    return { base: '', assets: {} };
  }
}

/** null when the key was never pushed — an absent file, not a broken URL. */
export function mediaUrl(key) {
  const { base, assets } = readManifest();
  if (!key || !base || !assets[key]) return null;
  return `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

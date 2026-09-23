#!/usr/bin/env node
/**
 * Fetch the heavy files of the practice sample video(s) from the media store (R2) into the places the
 * Studio reads them from. The text side of a sample (script, cues, scenes, Studio state, voice timings)
 * is in git; the recording, the MP4 and the QA stills are not — they live under `samples/<id>/` on R2:
 *
 *   samples/<id>/voice.wav     → voice/out/<id>/voice.wav
 *   samples/<id>/<name>.mp4    → projects/<id>/render/<name>.mp4
 *   samples/<id>/qa/<file>     → projects/<id>/qa/<file>
 *
 *   node tools/sample-fetch.mjs [<id>…]      (npm run sample)   — every sample in the manifest by default
 *
 * A file already on disk with the manifest's sha256 is skipped, so re-running is free. Without it the
 * Studio still opens the sample; it only has no sound, no MP4 and no QA stills to show.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mediaUrl, readManifest } from './lib/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Where a key under samples/<id>/ lands locally. */
function localPath(key) {
  const [, id, ...rest] = key.split('/');
  const name = rest.join('/');
  if (name === 'voice.wav') return path.join(ROOT, 'voice/out', id, 'voice.wav');
  if (name.endsWith('.mp4') && rest.length === 1) return path.join(ROOT, 'projects', id, 'render', name);
  if (rest[0] === 'qa') return path.join(ROOT, 'projects', id, 'qa', ...rest.slice(1));
  return null;
}

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const { assets } = readManifest();
const wanted = process.argv.slice(2);
const keys = Object.keys(assets).filter((k) => {
  const [root, id] = k.split('/');
  return root === 'samples' && (!wanted.length || wanted.includes(id));
});
if (!keys.length) {
  console.error(`Không có video mẫu nào${wanted.length ? ` tên ${wanted.join(', ')}` : ''} trong media/manifest.json.`);
  process.exit(1);
}

let got = 0;
let kept = 0;
for (const key of keys) {
  const dest = localPath(key);
  if (!dest) {
    console.warn(`  ? ${key} — không biết đặt ở đâu, bỏ qua`);
    continue;
  }
  if (fs.existsSync(dest) && sha256(dest) === assets[key].sha256) {
    kept++;
    continue;
  }
  const res = await fetch(mediaUrl(key));
  if (!res.ok) {
    console.error(`✖ ${key}: HTTP ${res.status} — kiểm tra mạng`);
    process.exit(1);
  }
  const body = Buffer.from(await res.arrayBuffer());
  const hash = crypto.createHash('sha256').update(body).digest('hex');
  if (hash !== assets[key].sha256) {
    console.error(`✖ ${key}: nội dung tải về không khớp manifest — chạy lại, hoặc báo người giữ kho media`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, body);
  got++;
  console.log(`  ↓ ${path.relative(ROOT, dest)}`);
}
console.log(`✓ video mẫu: ${got} tệp tải về, ${kept} tệp đã có sẵn.`);

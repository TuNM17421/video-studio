#!/usr/bin/env node
/**
 * Print the voice catalog: who a script may cast, and the reading speeds it may ask for.
 *
 *   npm run voices
 *
 * A dialogue script can only name voices that appear here (see templates/kich-ban-hoi-thoai.md).
 * Adding one is a dev job: clone the voice, take a ~10 s sample with tools/voice-sample.mjs, push it with
 * `npm run media`, then declare it in voices.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readVoices } from './lib/voices.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { voices, deliveries, speedRange, sampleText } = readVoices();

const manifest = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'media/manifest.json'), 'utf8')); } catch { return { base: '', assets: {} }; }
})();
const sampleUrl = (key) => (key && manifest.base && manifest.assets?.[key] ? `${manifest.base}/${key}` : '(chưa đẩy lên kho media)');

if (!voices.length) {
  console.log('\nvoices.json chưa có giọng nào.\n');
  process.exit(0);
}

console.log(`\nGIỌNG DÙNG ĐƯỢC — ${voices.length} giọng trong voices.json\n`);
for (const v of voices) {
  console.log(`  ${v.name}${v.default ? '  (mặc định)' : ''}`);
  console.log(`    id      ${v.id}`);
  console.log(`    ${[v.gender, v.engine, v.speed !== 1 ? `tốc độ nền ×${v.speed}` : null].filter(Boolean).join(' · ')}`);
  if (v.summary) console.log(`    ${v.summary}`);
  console.log(`    nghe    ${sampleUrl(v.sample)}\n`);
}

console.log(`KIỂU ĐỌC — đổi tốc độ, tạo nhịp lên xuống (khoảng API nhận: ×${speedRange[0]}–${speedRange[1]})\n`);
for (const [key, d] of Object.entries(deliveries)) {
  console.log(`  ${key.padEnd(6)} ${String(d.label).padEnd(10)} ×${d.speed.toFixed(2)}   ${d.use || ''}`);
}

console.log(`\nMẫu nghe thử đều đọc cùng một đoạn:\n  “${sampleText}”\n`);
console.log('Kịch bản hội thoại chỉ được đặt tên nhân vật trùng các giọng trên.');
console.log('Xem cách viết: templates/kich-ban-hoi-thoai.md\n');

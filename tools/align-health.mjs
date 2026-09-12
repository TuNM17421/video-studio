#!/usr/bin/env node
/**
 * Is the imported-voice word alignment good enough?
 *
 *   node tools/align-health.mjs [--json]
 *
 * Reads every voice/out/<id>/align-report.json and the Video Studio log of the same video, and measures
 * the two things docs/decisions/voice-align.md says would justify moving from Whisper's own word
 * timestamps to a forced aligner (Whisper + CTC):
 *
 *   1. how many câu Whisper only partly recognised — those get interpolated beats, not measured ones;
 *   2. how often the scenes stage had to be sent back with a complaint about timing.
 *
 * Prints a verdict against the thresholds in that document. It reports; it never changes anything.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = process.argv.includes('--json');

// Thresholds — keep in step with docs/decisions/voice-align.md.
const WEAK_MATCH = 0.65;
const WEAK_SHARE = 0.1;
const MIN_VIDEOS = 3;
const NOISY_ROUNDS = 2;
const NOISY_VIDEOS = 2;
const TIMING = /lệch|chưa khớp|không khớp|sai nhịp|trật nhịp|hiện sớm|hiện muộn|quá sớm|quá muộn|trễ nhịp|đồng bộ|spokenAt|timing|beat/i;

const parse = (text) => { try { return JSON.parse(text); } catch { return null; } };
const read = (file) => (fs.existsSync(file) ? parse(fs.readFileSync(file, 'utf8')) : null);

/** Scenes rounds sent back to the agent, and how many of them complained about timing. */
function feedback(id) {
  const file = path.join(ROOT, 'projects', id, '.studio/log.jsonl');
  if (!fs.existsSync(file)) return { rounds: 0, timing: 0 };
  let rounds = 0;
  let timing = 0;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const entry = parse(line);
    const m = entry?.text?.match(/^Góp ý gửi agent \(scenes\): ([\s\S]*)$/);
    if (!m) continue;
    rounds++;
    if (TIMING.test(m[1])) timing++;
  }
  return { rounds, timing };
}

const outRoot = path.join(ROOT, 'voice/out');
const videos = [];
for (const id of fs.existsSync(outRoot) ? fs.readdirSync(outRoot).sort() : []) {
  const report = read(path.join(outRoot, id, 'align-report.json'));
  const receipt = read(path.join(outRoot, id, 'voice.cues.json'));
  if (!report || receipt?.generator !== 'import') continue;
  const scored = report.rows.filter((r) => r.matchRatio != null);
  const weak = scored.filter((r) => r.matchRatio < WEAK_MATCH);
  const noWords = report.rows.filter((r) => !r.silent && r.matchRatio == null);
  videos.push({
    id,
    at: report.at ?? null,
    model: report.align?.model ?? null,
    aligned: Boolean(report.align?.used),
    forced: Boolean(report.forced),
    cues: report.needFile,
    scored: scored.length,
    weak: weak.length,
    weakCues: weak.map((r) => r.key),
    noWords: noWords.length,
    ...feedback(id),
  });
}

const aligned = videos.filter((v) => v.aligned);
const scored = aligned.reduce((s, v) => s + v.scored, 0);
const weak = aligned.reduce((s, v) => s + v.weak, 0);
const weakShare = scored ? weak / scored : 0;
const noisy = aligned.filter((v) => v.timing >= NOISY_ROUNDS);

const reasons = [];
if (aligned.length >= MIN_VIDEOS && noisy.length >= NOISY_VIDEOS) {
  reasons.push(`${noisy.length} video phải sửa nhịp từ ${NOISY_ROUNDS} vòng trở lên (${noisy.map((v) => v.id).join(', ')})`);
}
if (scored && weakShare >= WEAK_SHARE) {
  reasons.push(`${(weakShare * 100).toFixed(1)}% câu chỉ khớp dưới ${Math.round(WEAK_MATCH * 100)}% (${weak}/${scored})`);
}
const verdict = reasons.length ? 'migrate' : aligned.length < MIN_VIDEOS ? 'insufficient-data' : 'ok';

if (json) {
  console.log(JSON.stringify({ verdict, reasons, thresholds: { WEAK_MATCH, WEAK_SHARE, MIN_VIDEOS, NOISY_ROUNDS, NOISY_VIDEOS }, videos }, null, 2));
} else if (!aligned.length) {
  console.log('Chưa có video nào dùng giọng nhập kèm nhận diện từ. Không có gì để đánh giá.');
} else {
  console.log(`${aligned.length} video dùng giọng nhập · ${scored} câu có đối chiếu · ${weak} câu khớp yếu (${(weakShare * 100).toFixed(1)}%)\n`);
  for (const v of aligned) {
    console.log(`${v.id} · ${v.cues} câu · khớp yếu ${v.weak}${v.weakCues.length ? ` (${v.weakCues.join(', ')})` : ''}${v.noWords ? ` · ${v.noWords} câu không có mốc từ` : ''}${v.forced ? ' · nhập ép (--force)' : ''}`);
    console.log(`  dựng cảnh: ${v.rounds} vòng góp ý, ${v.timing} vòng nói về nhịp`);
  }
  console.log(`\nKết luận: ${verdict === 'migrate' ? 'NÊN CHUYỂN sang Whisper + CTC align' : verdict === 'ok' ? 'chưa cần đổi cách align' : `chưa đủ dữ liệu (cần ${MIN_VIDEOS} video, mới có ${aligned.length})`}`);
  for (const r of reasons) console.log(`  · ${r}`);
  console.log('\nNgưỡng và phương án thay thế: docs/decisions/voice-align.md');
}

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const usage = 'Usage: node tools/voice-kaggle.mjs --batch <file.jsonl> --ref-audio <file.wav> --ref-text <chuỗi hoặc @file> --out <dir> [--speed 1.0]';
const fail = (message) => { console.error(`✗ ${message}\n${usage}`); process.exit(1); };
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) { console.log(usage); process.exit(0); }
const opts = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--batch', '--ref-audio', '--ref-text', '--out', '--speed'].includes(args[i]) || !args[i + 1]) fail(`Tham số không hợp lệ: ${args[i] || '(trống)'}`);
  if (opts[args[i]]) fail(`Tham số lặp: ${args[i]}`);
  opts[args[i]] = args[i + 1];
}
for (const name of ['--batch', '--ref-audio', '--ref-text', '--out']) if (!opts[name]) fail(`Thiếu ${name}`);
// 1.0 mặc định: đọc nhanh hơn làm OmniVoice nuốt mất từ đầu câu (n5-01 phải quay lại 1.0 vì lý do này
// ở đường model local — cùng model, cùng rủi ro trên Kaggle). Chỉ đổi khi người dùng chủ động đặt.
const speed = Number(opts['--speed'] ?? 1.0);
if (!Number.isFinite(speed) || speed <= 0) fail('--speed phải là số dương');

try {
  const batch = fs.readFileSync(opts['--batch'], 'utf8').split(/\r?\n/).filter((line) => line.trim()).map((line, i) => {
    let item;
    try { item = JSON.parse(line); } catch { throw new Error(`JSON sai ở dòng ${i + 1}`); }
    if (!/^[A-Za-z0-9_-]+$/.test(item.id || '') || !item.text?.trim() || !item.language_id) throw new Error(`id/text/language_id không hợp lệ ở dòng ${i + 1}`);
    return item;
  });
  if (!batch.length || new Set(batch.map((item) => item.id)).size !== batch.length) throw new Error('Batch trống hoặc trùng id');
  const audio = fs.readFileSync(opts['--ref-audio']);
  if (audio.toString('ascii', 0, 4) !== 'RIFF' || audio.toString('ascii', 8, 12) !== 'WAVE') throw new Error('ref-audio phải là WAV');
  const text = opts['--ref-text'].startsWith('@') ? fs.readFileSync(opts['--ref-text'].slice(1), 'utf8').trim() : opts['--ref-text'];
  if (!text.trim()) throw new Error('ref-text trống');
  const out = path.resolve(opts['--out']);
  const slug = path.basename(out).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'omnivoice-voice';
  const owner = process.env.KAGGLE_USERNAME || 'YOUR_KAGGLE_USERNAME';
  const id = `${owner}/${slug}`;
  const metadata = { id, title: slug, code_file: 'run.py', language: 'python', kernel_type: 'script', is_private: true, enable_gpu: true, enable_internet: true, machine_shape: 'NvidiaTeslaT4', dataset_sources: [], competition_sources: [], kernel_sources: [] };
  const run = `import base64, json, os, subprocess, sys, time\nsubprocess.run([sys.executable, "-m", "pip", "install", "-q", "omnivoice", "soundfile"], check=True)\nimport torch\nimport soundfile as sf\nfrom omnivoice import OmniVoice\n\nREF_AUDIO_B64 = ${JSON.stringify(audio.toString('base64'))}\nREF_TEXT = ${JSON.stringify(text)}\nBATCH = json.loads(${JSON.stringify(JSON.stringify(batch))})\nSPEED = ${speed}\n\nwith open("ref_audio.wav", "wb") as f:\n    f.write(base64.b64decode(REF_AUDIO_B64))\nmodel = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map="cuda:0", dtype=torch.float16)\nos.makedirs("out", exist_ok=True)\nfor item in BATCH:\n    best = None\n    expected_min = len(item["text"].split()) * 0.18\n    for attempt in range(3):\n        audio = model.generate(text=item["text"], ref_audio="ref_audio.wav", ref_text=REF_TEXT, num_step=32, speed=SPEED)\n        duration = len(audio[0]) / 24000\n        print(item["id"], "attempt", attempt + 1, "seconds", duration, flush=True)\n        if best is None or duration > best[1]:\n            best = (audio, duration)\n        if duration >= expected_min:\n            break\n    sf.write(os.path.join("out", item["id"] + ".wav"), best[0][0], 24000)\n    print("wrote", item["id"], best[1], flush=True)\n`;
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'kernel-metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  fs.writeFileSync(path.join(out, 'run.py'), run);
  console.log(`✓ ${batch.length} câu → ${out}`);
  if (!process.env.KAGGLE_USERNAME) console.log('! Đặt KAGGLE_USERNAME hoặc sửa id trong kernel-metadata.json trước khi push.');
  console.log('! Bắt buộc dùng --accelerator NvidiaTeslaT4; P100 (sm_60) có thể lỗi "no kernel image is available" với PyTorch mới.');
  console.log(`kaggle kernels push -p ${JSON.stringify(out)} --accelerator NvidiaTeslaT4`);
  console.log(`kaggle kernels output ${id} -p ${JSON.stringify(path.join(out, 'results'))}`);
} catch (error) { fail(error.message); }

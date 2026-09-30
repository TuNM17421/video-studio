#!/usr/bin/env node
/**
 * Backend giọng ZeroTTS — cùng hình dạng CLI với `voice-kaggle.mjs`, nhưng KHÔNG clone và chạy CPU.
 *
 *   node tools/voice-zerotts.mjs --batch <voice-batch.jsonl> --out <dir> [--voice baotrang]
 *                                [--pin <phiên bản zerotts>] [--title <tên kernel>]
 *
 * Đọc `voice-batch.jsonl` do `voice-export.mjs` sinh → dựng thư mục kernel Kaggle → in lệnh push và
 * lệnh lấy output. Kết quả là `out/<id>.wav` đúng tên câu, nên `voice-import.mjs --scan` nhận như
 * mọi backend khác.
 *
 * ── Ba khác biệt so với OmniVoice, đều CỐ Ý ───────────────────────────────────────────────────
 *  1. **Không ref audio, không clone.** Clone của ZeroTTS bắt upload giọng mẫu lên
 *     `platform.zeroweight.ai` — bên thứ ba Thái CHƯA duyệt. Chỉ dùng 8 giọng dựng sẵn trong
 *     package. Vì vậy lên Kaggle chỉ có LỜI, không có một mẫu audio nào.
 *  2. **Kernel CPU** (`enable_gpu: false`). ZeroTTS chạy onnxruntime; lượt đo 21/09 ra RTF ≈ 3,2×
 *     thời lượng audio. Không tốn quota GPU — đó là một phần lý do Thái chọn nó.
 *  3. **Không vòng retry chấm bằng Whisper.** OmniVoice cần tới 5 lượt/câu vì nó NUỐT MỆNH ĐỀ khi
 *     sinh theo đoạn dài. ZeroTTS tự chunk câu và đọc ổn định, nên kernel sinh một lượt rồi vẫn
 *     chấm Whisper để BÁO CÁO (không sinh lại) — rẻ hơn nhiều mà vẫn có số để nghiệm thu.
 *
 * ── Cái bẫy đã trả giá một lượt push ──────────────────────────────────────────────────────────
 * `from_pretrained(<repo id>)` để huggingface_hub tự cache sẽ tạo SYMLINK, và onnxruntime từ chối
 * nạp external data qua symlink: *"External data path escapes model directory"*. Phải
 * `snapshot_download(local_dir=…, local_dir_use_symlinks=False)`. Xem FM-23 trong `failure-modes.md`.
 *
 * ── Chạy local (CHƯA BẬT) ─────────────────────────────────────────────────────────────────────
 * `--local` sẽ gọi python trong `voice/.venv` thay vì dựng kernel. Cố ý CHƯA cài `zerotts` lên máy
 * Thái (luật: hỏi trước khi thêm tooling), nên cờ này hiện in hướng dẫn rồi thoát 2. Bật khi Thái
 * duyệt — phần python trong kernel và phần local là CÙNG một đoạn mã (`PY_BODY`), nên bật chỉ là
 * đổi chỗ chạy, không phải viết lại.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BACKENDS, resolveBackend } from './lib/voice-backends.mjs';

const usage = `Sinh giọng bằng ZeroTTS (8 giọng dựng sẵn, CPU, KHÔNG clone).

  node tools/voice-zerotts.mjs --batch <file.jsonl> --out <dir> [--voice baotrang]
                               [--pin <version>] [--title <tên>] [--local]

  --batch   voice-batch.jsonl do \`voice-export.mjs\` sinh
  --out     thư mục kernel sẽ dựng ra
  --voice   một trong ${BACKENDS.zerotts.voices.join(' · ')} (mặc định ${BACKENDS.zerotts.defaultVoice})
  --pin     ghim phiên bản package \`zerotts\` (khuyến nghị: điền bản smoke-test đã chạy)
  --title   tên/slug kernel; mặc định lấy tên thư mục --out
  --local   CHƯA BẬT — chạy trong voice/.venv, chờ Thái duyệt cài tooling

KHÔNG có --ref-audio: backend này không clone giọng và không gửi audio đi đâu.`;

const fail = (m) => { console.error(`✗ ${m}\n\n${usage}`); process.exit(1); };
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(usage); process.exit(0); }
const VALUE_FLAGS = new Set(['batch', 'out', 'voice', 'pin', 'title']);
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) fail(`tham số lạ: ${argv[i]}`);
  const name = argv[i].slice(2);
  if (!VALUE_FLAGS.has(name) && !['local'].includes(name)) fail(`cờ không nhận: --${name}`);
  flags[name] = VALUE_FLAGS.has(name) ? argv[++i] : true;
}
for (const f of ['ref-audio', 'ref-text', 'speed']) {
  if (flags[f]) fail(`--${f} không áp dụng: ZeroTTS dùng giọng dựng sẵn, không clone và không đổi tốc độ`);
}
if (!flags.batch) fail('thiếu --batch');
if (!flags.out) fail('thiếu --out');

if (flags.local) {
  console.error('✗ --local CHƯA BẬT ở vòng này.');
  console.error('  `zerotts` cố ý chưa cài lên máy Thái (luật: hỏi trước khi thêm tooling).');
  console.error('  Bật bằng cách cài `zerotts` vào voice/.venv rồi bỏ nhánh này — phần python đã dùng chung.');
  process.exit(2);
}

let picked;
try { picked = resolveBackend(`zerotts:${flags.voice || BACKENDS.zerotts.defaultVoice}`); }
catch (e) { fail(e.message); }
const voice = picked.voice;
const pin = flags.pin ? String(flags.pin) : BACKENDS.zerotts.version;

// ── batch ────────────────────────────────────────────────────────────────────────────────────
const batchFile = path.resolve(String(flags.batch));
if (!fs.existsSync(batchFile)) fail(`không thấy ${batchFile}`);
const lines = fs.readFileSync(batchFile, 'utf8').split(/\r?\n/).filter((l) => l.trim());
if (!lines.length) fail(`${path.basename(batchFile)} rỗng — không câu nào cần sinh (xem gen-manifest.json; --all để ép)`);
const batch = lines.map((line, i) => {
  let item;
  try { item = JSON.parse(line); } catch { fail(`JSON sai ở dòng ${i + 1}`); }
  if (!/^[A-Za-z0-9_-]+$/.test(item.id || '')) fail(`id không hợp lệ ở dòng ${i + 1}`);
  if (!String(item.text || '').trim()) fail(`text rỗng ở dòng ${i + 1}`);
  return { id: item.id, text: item.text };
});
if (new Set(batch.map((b) => b.id)).size !== batch.length) fail('batch có id trùng');

// ── kernel ───────────────────────────────────────────────────────────────────────────────────
const out = path.resolve(String(flags.out));
const slug = String(flags.title || path.basename(out)).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'zerotts-voice';
const owner = process.env.KAGGLE_USERNAME || 'YOUR_KAGGLE_USERNAME';
const kernelId = `${owner}/${slug}`;

/**
 * `enable_gpu: false` là cả điểm của backend này. `enable_internet: true` vì kernel phải `pip
 * install zerotts` và `snapshot_download` trọng số — không có đường nào khác mà không upload gì.
 */
const metadata = {
  id: kernelId, title: slug, code_file: 'run.py', language: 'python', kernel_type: 'script',
  is_private: true, enable_gpu: false, enable_internet: true,
  dataset_sources: [], competition_sources: [], kernel_sources: [],
};

const LIT_BEGIN = '# --- literals begin (gate: tools/voice-zerotts.mjs thực thi đúng khối này trước khi push) ---';
const LIT_END = '# --- literals end ---';

const PY_BODY = String.raw`
import json, os, sys, time, subprocess, traceback

${LIT_BEGIN}
PIN = __PIN__
VOICE = __VOICE__
BATCH = json.loads(__BATCH__)
${LIT_END}
REPORT = {"backend": "zerotts", "voice": VOICE, "ok": False, "items": {}}

def sh(*a):
    subprocess.run(list(a), check=True)

t0 = time.time()
spec = "zerotts==" + PIN if PIN else "zerotts"
sh(sys.executable, "-m", "pip", "install", "-q", spec, "soundfile", "faster-whisper")
REPORT["pip_seconds"] = round(time.time() - t0, 1)

import numpy as np
import soundfile as sf
from huggingface_hub import snapshot_download
from zerotts import ZeroTTS

REPORT["zerotts_version"] = getattr(__import__("zerotts"), "__version__", None)
try:
    import importlib.metadata as md
    REPORT["zerotts_dist_version"] = md.version("zerotts")
except Exception:
    REPORT["zerotts_dist_version"] = None

# FM-23: huggingface_hub cache dung SYMLINK; onnxruntime tu choi external data qua symlink
# ("External data path escapes model directory"). Phai tai THAT ra mot thu muc.
t = time.time()
local = snapshot_download(repo_id="zeroweight-ai/ZeroTTS", local_dir="zerotts_model",
                          local_dir_use_symlinks=False)
tts = ZeroTTS.from_pretrained(local)
REPORT["load_seconds"] = round(time.time() - t, 1)

voices = list(tts.list_voices())
REPORT["voices"] = voices
if VOICE not in voices:
    raise SystemExit("giong %r khong co trong package: %r" % (VOICE, voices))

def synth(text):
    # ZeroTTS tu chunk cau dai; dung dung ham cua package de khong tu che mot kieu cat khac.
    try:
        from zerotts.chunking import chunk_text, clean_segment_punctuation, normalize_punctuation
        segs = [clean_segment_punctuation(s) for s in chunk_text(normalize_punctuation(text), max_chunk_sec=15)]
    except Exception as e:
        print("chunking khong dung duoc:", repr(e)[:160], flush=True)
        segs = [text]
    parts = [np.asarray(tts.synthesize(s, voice=VOICE)).reshape(-1) for s in segs]
    return (np.concatenate(parts) if len(parts) > 1 else parts[0]), len(segs)

os.makedirs("out", exist_ok=True)
gen_t0 = time.time()
for item in BATCH:
    t = time.time()
    audio, nseg = synth(item["text"])
    p = os.path.join("out", item["id"] + ".wav")
    tts.save_audio(audio, p)
    info = sf.info(p)
    rec = {"gen_seconds": round(time.time() - t, 2), "audio_seconds": round(info.duration, 2),
           "sample_rate": info.samplerate, "segments": nseg,
           "syllables": len(item["text"].split())}
    rec["rate"] = round(rec["syllables"] / max(rec["audio_seconds"], 0.01), 2)
    REPORT["items"][item["id"]] = rec
    print(item["id"], rec, flush=True)
REPORT["generate_seconds"] = round(time.time() - gen_t0, 1)

# Cham Whisper de BAO CAO, khong de sinh lai: ZeroTTS khong nuot menh de nhu OmniVoice nen
# mot luot la du; con so nay chi de nghiem thu.
try:
    import difflib
    from faster_whisper import WhisperModel
    asr = WhisperModel("small", device="cpu", compute_type="int8")

    def norm(s):
        return [w.lower().strip(".,!?:;\"'()") for w in s.split() if w.strip()]

    for item in BATCH:
        p = os.path.join("out", item["id"] + ".wav")
        segments, _ = asr.transcribe(p, language="vi")
        heard = " ".join(seg.text for seg in segments)
        a, b = norm(item["text"]), norm(heard)
        r = difflib.SequenceMatcher(None, a, b).ratio() if a else 1.0
        REPORT["items"][item["id"]]["match"] = round(r, 3)
        REPORT["items"][item["id"]]["heard"] = heard.strip()
        print("match", item["id"], round(r, 3), flush=True)
    REPORT["asr"] = "faster-whisper small (chi de bao cao, khong sinh lai)"
except Exception:
    REPORT["asr_error"] = traceback.format_exc()[-800:]

REPORT["ok"] = True
REPORT["total_seconds"] = round(time.time() - t0, 1)
with open("out/report.json", "w", encoding="utf-8") as f:
    json.dump(REPORT, f, ensure_ascii=False, indent=1)
print("=== XONG ===", json.dumps({"ok": True, "n": len(BATCH),
      "total_seconds": REPORT["total_seconds"]}), flush=True)
`;

/**
 * `pyLiteral` chứ không phải `JSON.stringify` — đã trả giá một lượt push: `JSON.stringify(null)` ra
 * `null`, và Python không có `null`, nên kernel chết ở DÒNG 4 với `NameError: name 'null' is not
 * defined` sau khi đã xếp hàng xong. Mọi giá trị JS nhúng vào Python phải đi qua hàm này.
 */
const pyLiteral = (v) => {
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  return JSON.stringify(v);
};

const run = PY_BODY
  .replace('__PIN__', pyLiteral(pin))
  .replace('__VOICE__', pyLiteral(voice))
  .replace('__BATCH__', pyLiteral(JSON.stringify(batch)));

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'kernel-metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'run.py'), run);

/**
 * Gate trước khi push. Hai tầng, vì tầng một MỘT MÌNH KHÔNG ĐỦ — đã đo:
 *
 *  1. `py_compile` cả file: bắt lỗi CÚ PHÁP.
 *  2. **Thực thi riêng khối literal** đã nhúng: bắt lỗi GIÁ TRỊ. Đây mới là tầng bắt đúng con bug
 *     đã đốt một lượt push — `JSON.stringify(null)` sinh `PIN = null`, mà `PIN = null` **hợp lệ về
 *     cú pháp** trong Python (nó là một tham chiếu tên), nên `py_compile` xanh và lỗi chỉ lộ ra ở
 *     `NameError` sau khi kernel đã boot xong và `pip install` xong.
 *
 * Khối literal chỉ dùng `json`, chạy trong 0,05 giây và không chạm mạng — rẻ hơn một lượt push
 * nhiều bậc. Không có python3 local thì nói rõ là CHƯA kiểm, không im lặng coi như đạt.
 */
const runFile = path.join(out, 'run.py');
const hasPy = spawnSync('python3', ['-c', 'pass']).status === 0;
if (!hasPy) {
  console.log('  ⚠ CHƯA kiểm được run.py: không gọi được python3 local');
} else {
  const syn = spawnSync('python3', ['-c', 'import py_compile,sys; py_compile.compile(sys.argv[1], doraise=True)', runFile], { encoding: 'utf8' });
  if (syn.status !== 0) {
    console.error(`✗ run.py sai CÚ PHÁP Python — không push:\n${(syn.stderr || '').trim()}`);
    process.exit(1);
  }
  const body = fs.readFileSync(runFile, 'utf8');
  const a = body.indexOf(LIT_BEGIN);
  const b = body.indexOf(LIT_END);
  if (a < 0 || b < 0) fail('không tìm thấy khối literal trong run.py — gate bị vô hiệu, dừng lại');
  const block = `import json\n${body.slice(a + LIT_BEGIN.length, b)}\nassert isinstance(BATCH, list) and BATCH, "BATCH rỗng"\nassert isinstance(VOICE, str) and VOICE, "VOICE sai kiểu"\nassert PIN is None or isinstance(PIN, str), "PIN sai kiểu"\n`;
  const ex = spawnSync('python3', ['-c', block], { encoding: 'utf8' });
  if (ex.status !== 0) {
    console.error(`✗ khối literal nhúng vào run.py KHÔNG chạy được trong Python — không push:\n${(ex.stderr || '').trim().split('\n').slice(-3).join('\n')}`);
    process.exit(1);
  }
}
/**
 * Metadata cho ledger và cho `voice-import`: clip nằm trong thư mục nào thì backend của nó ghi ngay
 * cạnh, không phải suy từ tên kernel. `voice-import --backend` đọc file này nếu không truyền cờ.
 */
fs.writeFileSync(path.join(out, 'voice-backend.json'), `${JSON.stringify({
  schema: 'vinuni-voice-backend/1',
  backend: 'zerotts',
  voice,
  model: BACKENDS.zerotts.model,
  version: pin,
  sampleRate: BACKENDS.zerotts.sampleRate,
  clone: false,
  hardware: 'kaggle-cpu',
  batch: batch.length,
  at: new Date().toISOString(),
}, null, 2)}\n`);

const rel = path.relative(process.cwd(), out);
console.log(`✓ ${batch.length} câu · giọng ${voice} · ${rel}`);
console.log(`  kernel CPU (enable_gpu: false) — không tốn quota GPU`);
if (!pin) console.log('  ⚠ CHƯA pin phiên bản `zerotts`: lượt sau có thể kéo bản khác và giọng đổi. Dùng --pin sau lượt đầu.');
if (!process.env.KAGGLE_USERNAME) console.log('  ⚠ đặt KAGGLE_USERNAME hoặc sửa id trong kernel-metadata.json trước khi push.');
console.log('  Không gửi ref audio, không gửi file nào khác của repo — chỉ lời của các câu trong batch.\n');
console.log(`kaggle kernels push -p ${JSON.stringify(rel)}`);
console.log(`kaggle kernels output ${kernelId} -p ${JSON.stringify(path.join(rel, 'results'))}`);
console.log(`\nXong thì: node tools/voice-import.mjs --cues <vdir>/cues.js --from ${JSON.stringify(path.join(rel, 'results/out'))} --backend zerotts:${voice} --scan`);

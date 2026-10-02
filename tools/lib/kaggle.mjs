/**
 * OmniVoice trên GPU của Kaggle — cùng model, cùng file JSONL với đường model local, chỉ khác chỗ chạy.
 *
 * Máy chạy Studio chỉ cần `kaggle` CLI (không cần GPU, không cần torch): dựng một kernel private chứa lời
 * đọc + mẫu giọng, đẩy lên, chờ, tải thư mục `out/` về, rồi đi tiếp bằng đúng bước nhập của giọng tự thu.
 *
 * CLI nằm trong một venv riêng: Ubuntu/Debian mới chặn `pip install` vào Python hệ thống (PEP 668), nên
 * "pip install kaggle" chạy tay thường hỏng ngay ở máy của thành viên. Venv đó là một bản cho cả máy
 * (tools/lib/shared-env.mjs, như Whisper và OmniVoice); có sẵn `kaggle` trên PATH thì dùng luôn cái đó.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { displayPath, findVenv, installDir, KAGGLE_VENV } from './shared-env.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** Venv có `kaggle` ({ dir, bin, from }) ở bất kỳ chỗ nào shared-env tìm tới, hoặc null. */
export const kaggleVenv = () => findVenv(KAGGLE_VENV, { probe: 'kaggle' });

/**
 * Bản CLI của `kaggle` import xong là tự đòi xác thực, kể cả với `--version`. Credentials giả chỉ để nó
 * chịu in số phiên bản — không gọi mạng, và credentials thật vẫn chỉ nằm trong RAM của Studio.
 */
const PROBE_ENV = { KAGGLE_USERNAME: 'probe', KAGGLE_KEY: 'probe-not-a-real-key' };

function version(bin) {
  const res = spawnSync(bin, ['--version'], { encoding: 'utf8', env: { ...process.env, ...PROBE_ENV }, shell: process.platform === 'win32' });
  if (res.status !== 0) return null;
  return (res.stdout || '').trim().replace(/^Kaggle (API|CLI)\s*/i, '') || 'không rõ';
}

/** `kaggle` nào dùng được: venv (một bản cho cả máy) trước, rồi tới cái trên PATH. */
export function kaggleStatus() {
  const found = kaggleVenv();
  const venvDir = displayPath(found?.dir ?? installDir(KAGGLE_VENV));
  const candidates = [found?.bin, 'kaggle'].filter(Boolean);
  for (const bin of candidates) {
    const v = version(bin);
    if (v) return { installed: true, bin, version: v, venv: venvDir, from: bin === found?.bin ? 'venv' : 'path' };
  }
  return { installed: false, bin: null, version: null, venv: venvDir, from: null };
}

// ── kernel ───────────────────────────────────────────────────────────────────

/**
 * Tên kernel theo mã video: hai video phải là hai kernel. Dùng chung một tên thì video sau đẩy thành phiên
 * bản mới của kernel video trước, và `kernels output` tải về giọng của video kia.
 * Kaggle suy slug từ title (chữ thường, gạch nối, 5–50 ký tự), nên title chính là slug.
 */
export function kernelSlug(videoId) {
  const base = String(videoId || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!base) throw new Error('Thiếu mã video để đặt tên kernel.');
  return `vs-${base}`.slice(0, 44).replace(/-+$/, '') + '-voice';
}

/**
 * Mẫu giọng nhúng thẳng vào run.py (base64) chỉ dành cho file người dùng đưa vào; giọng trong danh mục
 * thì kernel tự tải từ kho media công khai. Kaggle từ chối mã nguồn kernel cỡ ~1 MB, nên giữ phần nhúng
 * dưới mức này. Nhúng FLAC 24 kHz mono (~25–30 KB/giây giọng nói, gồm cả base64) thay vì WAV (~64 KB/giây)
 * — đủ cho mẫu 15–20 giây như đường local khuyên, kernel giải lại thành WAV trước khi đưa cho OmniVoice.
 */
export const MAX_EMBED_BYTES = 800_000;

/** Số câu mỗi lượt trên T4 16 GB — cùng bậc với batchSizeFor() của đường local cho card 12–24 GB. */
export const KAGGLE_BATCH_SIZE = 8;

/**
 * run.py của kernel. Dữ liệu vào là JSON, còn khung script cố định, nên không có lời đọc nào chen được
 * vào mã Python.
 *
 *   refs  { "<khoá>": { url } | { flac } } — mẫu giọng (URL kho media, hoặc FLAC base64), mỗi vai một khoá
 *   rows  [{ id, text, ref, ref_text, language_id, speed? }] — một dòng mỗi câu có lời
 *
 * Sinh bằng chính `omnivoice-infer-batch` mà đường local gọi, nên hai đường cho cùng một kết quả. Câu ra
 * ngắn bất thường (dưới số từ × 0,18 giây — dấu hiệu nuốt từ đầu câu) được sinh lại tối đa hai lần, giữ
 * bản dài nhất. Thiếu dù một câu là thoát mã 1 để kernel báo "error" thay vì trả về kết quả dở.
 */
export function buildRunPy({ refs, rows, batchSize = KAGGLE_BATCH_SIZE }) {
  const data = JSON.stringify({ refs, rows, batchSize });
  return `import base64, json, os, shutil, subprocess, sys, urllib.request

DATA = json.loads(${JSON.stringify(data)})

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "omnivoice", "soundfile"], check=True)
import soundfile as sf

os.makedirs("refs", exist_ok=True)
paths = {}
for key, ref in DATA["refs"].items():
    target = os.path.join("refs", key + ".wav")
    if "flac" in ref:
        packed = os.path.join("refs", key + ".flac")
        with open(packed, "wb") as f:
            f.write(base64.b64decode(ref["flac"]))
        audio, rate = sf.read(packed)
        sf.write(target, audio, rate, subtype="PCM_16")
    else:
        # Kho media đứng sau Cloudflare, và Cloudflare chặn User-Agent mặc định của urllib
        # ("Python-urllib/3.12") bằng 403. Gửi một UA bình thường thì tải được.
        req = urllib.request.Request(ref["url"], headers={"User-Agent": "video-studio/1.0"})
        with urllib.request.urlopen(req) as src, open(target, "wb") as dst:
            shutil.copyfileobj(src, dst)
    paths[key] = os.path.abspath(target)
    print("ref", key, os.path.getsize(target), "bytes", flush=True)

def line(row):
    item = {"id": row["id"], "text": row["text"], "ref_audio": paths[row["ref"]], "ref_text": row["ref_text"], "language_id": row["language_id"]}
    if row.get("speed"):
        item["speed"] = row["speed"]
    return json.dumps(item, ensure_ascii=False)

cli = shutil.which("omnivoice-infer-batch") or os.path.join(os.path.dirname(sys.executable), "omnivoice-infer-batch")

def infer(rows, res_dir):
    os.makedirs(res_dir, exist_ok=True)
    listing = res_dir + ".jsonl"
    with open(listing, "w", encoding="utf-8") as f:
        f.write("\\n".join(line(r) for r in rows) + "\\n")
    subprocess.run([cli, "--model", "k2-fsa/OmniVoice", "--test_list", listing, "--res_dir", res_dir, "--batch_size", str(DATA["batchSize"])], check=True)

def seconds(file):
    try:
        info = sf.info(file)
        return info.frames / info.samplerate
    except Exception:
        return 0.0

def short(row, file):
    return seconds(file) < len(row["text"].split()) * 0.18

infer(DATA["rows"], "out")
for attempt in (1, 2):
    retry = [r for r in DATA["rows"] if not os.path.exists(os.path.join("out", r["id"] + ".wav")) or short(r, os.path.join("out", r["id"] + ".wav"))]
    if not retry:
        break
    print("retry", attempt, [r["id"] for r in retry], flush=True)
    folder = "retry%d" % attempt
    try:
        infer(retry, folder)
    except subprocess.CalledProcessError as error:
        print("retry failed", error, flush=True)
        continue
    for r in retry:
        fresh, kept = os.path.join(folder, r["id"] + ".wav"), os.path.join("out", r["id"] + ".wav")
        if os.path.exists(fresh) and seconds(fresh) > seconds(kept):
            shutil.copyfile(fresh, kept)
    shutil.rmtree(folder, ignore_errors=True)

missing = [r["id"] for r in DATA["rows"] if not os.path.exists(os.path.join("out", r["id"] + ".wav"))]
for r in DATA["rows"]:
    file = os.path.join("out", r["id"] + ".wav")
    if os.path.exists(file):
        print("wrote", r["id"], round(seconds(file), 2), flush=True)
shutil.rmtree("refs", ignore_errors=True)
if missing:
    print("MISSING", " ".join(missing), flush=True)
    sys.exit(1)
`;
}

export function kernelMetadata({ owner, slug }) {
  return {
    id: `${owner}/${slug}`,
    title: slug,
    code_file: 'run.py',
    language: 'python',
    kernel_type: 'script',
    is_private: true,
    enable_gpu: true,
    // pip install omnivoice, trọng số model trên Hugging Face và mẫu giọng trên kho media đều cần mạng.
    enable_internet: true,
    dataset_sources: [],
    competition_sources: [],
    kernel_sources: [],
  };
}

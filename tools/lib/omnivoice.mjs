/**
 * OmniVoice (k2-fsa/OmniVoice, Apache-2.0) — giọng đọc sinh bằng model chạy dưới máy, không tốn credit.
 *
 * Nó ở một môi trường Python **riêng**, không dùng chung `voice/.venv` của Whisper: OmniVoice kéo theo
 * torch 2.8 còn faster-whisper kéo theo CTranslate2, và `voice/.venv` là thứ bước nhập giọng dựa vào để
 * lấy mốc từng từ. Một lần `pip install` hỏng bên kia là mất luôn khả năng nhập giọng, nên tách hẳn ra.
 *
 * Không cần clone repo: bản phát hành nằm trên PyPI (`pip install omnivoice`), còn trọng số model thì
 * OmniVoice tự tải từ Hugging Face trong lần chạy đầu.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const VENV = path.join(ROOT, 'voice/.venv-omnivoice');
export const MODEL_ID = 'k2-fsa/OmniVoice';
export const SETUP_HINT = 'Chưa cài model local. Chạy: npm run setup:omnivoice';

const exe = (name) => (process.platform === 'win32' ? `${name}.exe` : name);

/** Đường dẫn một lệnh trong venv, hoặc null nếu chưa có. */
export function venvBin(name) {
  for (const dir of ['bin', 'Scripts']) {
    const p = path.join(VENV, dir, exe(name));
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export const venvPython = () => venvBin('python');
/** Lệnh sinh giọng hàng loạt — đúng cái `voice-export.mjs` đã sinh sẵn test_list cho. */
export const inferBatchBin = () => venvBin('omnivoice-infer-batch');

/**
 * Phần cứng quyết định bản torch nào được cài. CPU chạy được nhưng chậm, nên chỉ là đường lui.
 * (Trang chủ OmniVoice ghi rõ ba nhánh: CUDA cu128 · Apple Silicon · Intel XPU.)
 */
/** Trọng số model trên Hugging Face: 2,45 GB phần chính + 0,81 GB audio tokenizer. */
export const MODEL_GB = 3.3;
/** Dưới mức này thì nạp được model nhưng câu dài dễ tràn VRAM. */
const TIGHT_VRAM_GB = 8;

/**
 * Hàm thuần để kiểm thử được: máy Mac Intel, máy Linux không GPU, máy Windows có card… đều là những
 * cấu hình người khác chạy repo này mà máy dựng không có. Nhận đầu vào đã đo sẵn thay vì tự đi hỏi
 * hệ điều hành, nên tools/lib/omnivoice.test.mjs dựng được mọi tổ hợp.
 *
 * `nvidia` là một dòng của `nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits`.
 */
export function deviceFrom({ platform, arch, nvidia = '', totalMemGb = null }) {
  if (platform === 'darwin') {
    // Chỉ Apple Silicon mới có MPS. Mac Intel rơi về CPU — cài bản torch MPS ở đó là cài nhầm.
    if (arch !== 'arm64') return { id: 'cpu', label: 'Mac Intel (không có MPS)', vramGb: null, tight: true };
    // Bộ nhớ hợp nhất: RAM cũng là VRAM, nên máy 8 GB là chật chứ không rộng.
    const tight = totalMemGb !== null && totalMemGb < TIGHT_VRAM_GB + 8;
    return { id: 'mps', label: totalMemGb ? `Apple Silicon · ${totalMemGb} GB bộ nhớ hợp nhất` : 'Apple Silicon (MPS)', vramGb: totalMemGb, tight };
  }
  const line = String(nvidia).trim().split('\n')[0] || '';
  if (line) {
    const [rawName, rawVram] = line.split(',').map((s) => s.trim());
    // nvidia-smi đã trả về tên có sẵn chữ "NVIDIA", đừng ghép thêm lần nữa
    const name = /^nvidia/i.test(rawName) ? rawName : `NVIDIA ${rawName}`;
    const vramGb = Number(rawVram) > 0 ? Math.round((Number(rawVram) / 1024) * 10) / 10 : null;
    return { id: 'cuda', label: vramGb ? `${name} · ${vramGb} GB VRAM` : name, vramGb, tight: vramGb !== null && vramGb < TIGHT_VRAM_GB };
  }
  // Không NVIDIA: AMD/ROCm và Intel Arc cũng rơi vào đây. torch bản CPU chạy được ở mọi nơi, chỉ chậm.
  return { id: 'cpu', label: 'CPU (không thấy GPU NVIDIA)', vramGb: null, tight: true };
}

export function detectDevice() {
  const nvidia = spawnSync('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'], { encoding: 'utf8' });
  return deviceFrom({
    platform: process.platform,
    arch: process.arch,
    nvidia: nvidia.status === 0 ? nvidia.stdout : '',
    totalMemGb: Math.round(os.totalmem() / 1024 ** 3),
  });
}

/**
 * File mẫu của một giọng, tải sẵn về máy để OmniVoice dùng làm `ref_audio`.
 *
 * Mẫu nằm trên kho media (R2) và Studio vẫn phát thẳng từ URL, nhưng OmniVoice chạy dưới máy nên cần
 * một đường dẫn thật. Tải một lần rồi dùng lại; `ref_text` là câu mà mọi mẫu đều đọc, khai trong
 * voices.json — không có nó thì nhân bản giọng kém hẳn.
 */
export async function refAudioFor(voice, log = () => {}) {
  if (!voice?.sample) return null;
  const manifestFile = path.join(ROOT, 'media/manifest.json');
  if (!fs.existsSync(manifestFile)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const base = (process.env.MEDIA_BASE || manifest.base || '').replace(/\/+$/, '');
  if (!base || !manifest.assets?.[voice.sample]) return null;

  const cacheDir = path.join(ROOT, 'voice/cache/refs');
  const file = path.join(cacheDir, path.basename(voice.sample));
  const { sampleText } = JSON.parse(fs.readFileSync(path.join(ROOT, 'voices.json'), 'utf8'));
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return { file, text: sampleText || '' };

  fs.mkdirSync(cacheDir, { recursive: true });
  const url = `${base}/${voice.sample.split('/').map(encodeURIComponent).join('/')}`;
  try {
    log(`Tải mẫu giọng ${voice.name} về ${path.relative(ROOT, file)}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Ghi ra .part rồi mới đổi tên: bị giết giữa lúc ghi mà để nguyên tên thì lần sau thấy "có file,
    // size > 0" và nhân bản giọng từ một file cụt — mãi mãi, vì không có gì phát hiện ra.
    const part = `${file}.part`;
    fs.writeFileSync(part, Buffer.from(await res.arrayBuffer()));
    fs.renameSync(part, file);
    return { file, text: sampleText || '' };
  } catch (error) {
    log(`Không tải được mẫu giọng: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/** Các đối số pip cho torch theo phần cứng. */
export function torchArgs(device) {
  if (device === 'cuda') {
    return ['torch==2.8.0+cu128', 'torchaudio==2.8.0+cu128', '--extra-index-url', 'https://download.pytorch.org/whl/cu128'];
  }
  return ['torch==2.8.0', 'torchaudio==2.8.0'];
}

/** Đã cài xong chưa, và bằng phần cứng gì — Studio hỏi cái này để vẽ nút. */
export function omnivoiceStatus() {
  const bin = inferBatchBin();
  return {
    installed: Boolean(bin),
    bin: bin ? path.relative(ROOT, bin) : null,
    venv: path.relative(ROOT, VENV),
    device: detectDevice(),
    modelId: MODEL_ID,
    modelGb: MODEL_GB,
  };
}

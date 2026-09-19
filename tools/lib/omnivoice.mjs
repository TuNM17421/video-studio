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
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAlign, venvPython as alignPython } from './voice-align.mjs';
import { AUDIO_EXT, isAudioFile } from './voice-files.mjs';
import { mediaUrl } from './media.mjs';
import { castSpeaker, readVoices, resolveVoice, speedFor } from './voices.mjs';

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

/**
 * Số câu sinh cùng một lượt.
 *
 * Mặc định của omnivoice-infer-batch là gom theo `--batch_duration` 1000 giây, mà mỗi mẫu tính cả
 * ref_audio (~14 giây) nên một video 39 câu rơi gọn vào MỘT batch. Đo thật trên RTX 3060 6 GB: VRAM
 * đứng ở 97 %, GPU 100 %, và hơn 30 phút không ra nổi một file — không phải chậm, mà là nghẹn.
 *
 * Nên tự chia theo sức máy. Chia nhỏ chỉ chậm hơn chút ít (model đã nằm sẵn trong VRAM giữa các batch),
 * còn chia to thì hỏng hẳn, nên khi phân vân hãy chọn nhỏ.
 */
export function batchSizeFor(device) {
  if (!device || device.id === 'cpu') return 1; // CPU đã chậm sẵn, gom nhiều chỉ tốn RAM
  if (device.tight) return 2; // dưới 8 GB VRAM
  if (device.vramGb === null) return 4; // không đo được thì đừng liều
  if (device.vramGb >= 24) return 16;
  if (device.vramGb >= 12) return 8;
  return 4;
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

// ── ai đọc câu nào ───────────────────────────────────────────────────────────

const norm = (s) => String(s ?? '').trim().toLowerCase();

/**
 * Studio lưu giá trị này cho một vai khi người dùng đã chọn "giọng từ file trên máy" nhưng chưa chọn
 * file nào. Nó phải là một lỗi chặn lượt sinh — không được lặng lẽ rơi về giọng danh mục vừa bỏ.
 * Giữ khớp với FROM_FILE trong studio/src/components/local-cast.tsx.
 */
export const FILE_PENDING = '__file__';

/**
 * Giá trị người dùng đưa vào là ĐƯỜNG DẪN tới một file mẫu, hay TÊN một giọng trong danh mục?
 * Tên giọng không bao giờ mang dấu gạch chéo hay đuôi audio, nên hai thứ không lẫn vào nhau được.
 */
export function looksLikeFile(value) {
  const v = String(value || '').trim();
  return Boolean(v) && (/[\\/]/.test(v) || isAudioFile(path.basename(v)));
}

/** Nhân vật mang tên/bí danh này, để `--speaker toi=…` và `--speaker Lucas=…` cùng trúng một vai. */
function characterFor(speaker) {
  const lower = norm(speaker);
  return readVoices().characters.find(
    (c) => norm(c.id) === lower || norm(c.name) === lower || (c.aliases || []).some((a) => norm(a) === lower),
  ) || null;
}

/**
 * Phân vai cho một lượt sinh giọng dưới máy.
 *
 * Mỗi người nói trong cues.js thành một **vai**, và mỗi vai mang MỘT mẫu giọng riêng. Đó là tất cả những
 * gì cần để hai nhân vật đọc bằng hai giọng khác nhau: `omnivoice-infer-batch` nhận `ref_audio` theo từng
 * dòng JSONL chứ không phải theo cả lượt chạy, nên Tú và Lucas đi chung một lượt vẫn ra hai giọng.
 *
 *   voice     giọng cho video một người dẫn — tên/id trong danh mục, hoặc đường dẫn tới một file mẫu
 *   speakers  { "<tên nhân vật>": "<tên giọng|id|đường dẫn>" } — đổi giọng cho riêng một vai
 *
 * Nhân vật thì vẫn phải có sẵn trong voices.json: `speaker` quyết định avatar, phía và màu của thẻ hội
 * thoại, nên một cái tên lạ là lỗi kịch bản — không phải thứ bù được bằng một file mẫu.
 */
export function castLocal(cues, { voice = '', speakers = {} } = {}) {
  const spoken = (cues || []).filter((c) => !c.silent && String(c.text || '').trim());
  const { voices } = readVoices();
  const fallback = String(voice || '').trim();
  const roles = [];
  const byKey = new Map();
  const rows = [];

  /** Người dùng gọi vai bằng tên trong kịch bản, tên nhân vật, id, hay tên giọng nó đang mượn — nhận hết. */
  const override = (names) => {
    for (const [who, value] of Object.entries(speakers || {})) {
      const wanted = String(value ?? '').trim();
      if (!wanted) continue;
      if (names.some((n) => n && norm(n) === norm(who))) return wanted;
    }
    return '';
  };

  const build = (speaker) => {
    const role = {
      index: roles.length,
      speaker: speaker || null,
      name: speaker || 'Người dẫn',
      character: null,
      avatar: null,
      side: 'left',
      tone: 'accent',
      speed: 1,
      source: 'catalog',
      voiceId: null,
      voiceName: null,
      file: null,
      picked: false,
      error: null,
      cues: [],
    };
    let who = null;
    let character = null;
    if (speaker) {
      character = characterFor(speaker);
      try {
        who = castSpeaker(speaker);
      } catch (error) {
        // A character listed without a voice yet (voices.json `"voice": null`) can still be read here when
        // the member hands it one (--speaker "Tú=<giọng|file>"); without that it stays an error below.
        if (!character || character.voice) {
          role.error = error instanceof Error ? error.message : String(error);
          return role;
        }
        const alias = (character.aliases || []).find((a) => norm(a) === norm(speaker));
        who = { name: alias || character.name, voice: null, avatar: mediaUrl(character.avatar), side: character.side || 'left', tone: character.tone || 'accent', speed: character.speed ?? 1 };
      }
      Object.assign(role, {
        name: who.name,
        character: character?.id || null,
        avatar: who.avatar,
        side: who.side,
        tone: who.tone,
        speed: who.speed ?? 1,
      });
    }
    // Kịch bản gọi "Lucas", danh mục ghi "Tới", id là "toi" — gọi bằng cái nào cũng phải trúng đúng vai.
    const wanted = override([speaker, role.name, role.character, character?.name, who?.voice?.name]) || (speaker ? '' : fallback);
    role.picked = Boolean(wanted);
    // Đã rẽ sang "giọng từ file" nhưng chưa trỏ tới file nào: vai này chưa sẵn sàng, và tuyệt đối không
    // dùng tạm giọng danh mục người dùng vừa bỏ — đó là lỗi đã ăn thật trên panel.
    if (wanted === FILE_PENDING) {
      role.source = 'file';
      role.error = 'chưa chọn file giọng mẫu.';
      return role;
    }
    // Một file trên máy là đường ngắn nhất cho giọng chưa có trong danh mục: không phải đẩy lên đâu cả,
    // cũng không phải thêm vào voices.json chỉ để thử một lượt.
    if (wanted && looksLikeFile(wanted)) {
      role.source = 'file';
      role.file = path.resolve(wanted);
      role.voiceName = path.basename(role.file);
      return role;
    }
    if (!wanted && character && !character.voice) {
      role.error = `nhân vật "${character.name}" chưa được gán giọng trong voices.json — chọn một giọng hoặc một file mẫu cho vai này.`;
      return role;
    }
    const picked = wanted ? resolveVoice(wanted) : who?.voice || voices.find((v) => v.default) || null;
    if (!picked || picked.unknown) {
      role.error = wanted
        ? `không có giọng "${wanted}" trong voices.json. Model local nhân bản từ một đoạn mẫu, nên chỉ nhận giọng trong danh mục hoặc một file audio trên máy.`
        : 'voices.json chưa khai giọng nào mặc định.';
      return role;
    }
    Object.assign(role, { voiceId: picked.id, voiceName: picked.name, voice: picked });
    if (!picked.sample) role.error = `giọng "${picked.name}" chưa có file mẫu trên kho media, không nhân bản được.`;
    return role;
  };

  for (const c of spoken) {
    const speaker = String(c.speaker || '').trim();
    let role = byKey.get(norm(speaker));
    if (!role) {
      role = build(speaker);
      byKey.set(norm(speaker), role);
      roles.push(role);
    }
    role.cues.push(c.n);
    const row = { n: c.n, text: String(c.text).trim(), role: role.index, speed: 1, error: null };
    // Kiểu đọc đổi tốc độ, và OmniVoice nhận `speed` theo từng dòng đúng như ElevenLabs nhận theo từng
    // câu. Câu không khai `delivery` thì speed vẫn là 1 và dòng JSONL không mang trường đó.
    try {
      row.speed = speedFor({ speed: role.speed }, c.delivery).speed;
    } catch (error) {
      row.error = `câu ${c.n}: ${error instanceof Error ? error.message : String(error)}`;
    }
    rows.push(row);
  }

  const problems = [
    ...roles.filter((r) => r.error).map((r) => `${r.speaker ? `nhân vật ${r.name}` : 'giọng người dẫn'}: ${r.error}`),
    ...rows.filter((r) => r.error).map((r) => r.error),
  ];
  return { dialogue: roles.some((r) => r.speaker), roles, rows, problems, ok: problems.length === 0 };
}

// ── mẫu giọng để nhân bản ────────────────────────────────────────────────────

const REFS = path.join(ROOT, 'voice/cache/refs');

/**
 * File mẫu của một giọng trong danh mục, tải sẵn về máy để OmniVoice dùng làm `ref_audio`.
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

  const file = path.join(REFS, path.basename(voice.sample));
  const { sampleText } = JSON.parse(fs.readFileSync(path.join(ROOT, 'voices.json'), 'utf8'));
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return { file, text: sampleText || '' };

  fs.mkdirSync(REFS, { recursive: true });
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

/** Lời của đoạn mẫu do người dùng ghi sẵn: `mau.wav` → `mau.txt`, hoặc `mau.wav.txt`. */
export function refSidecar(file) {
  const stem = file.slice(0, file.length - path.extname(file).length);
  for (const p of [`${stem}.txt`, `${file}.txt`]) {
    try {
      const text = fs.readFileSync(p, 'utf8').trim();
      if (text) return { path: p, text };
    } catch { /* không có thì thôi */ }
  }
  return null;
}

/** Khoá cache của một file mẫu, theo nội dung file — thay file là nhớ lại từ đầu. */
const refKey = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
/** Lời đã nghe được của một file mẫu. */
const refTextCache = (file) => path.join(REFS, `${refKey(file)}.txt`);
/**
 * Lần nghe đã THẤT BẠI của một file mẫu (không có tiếng nói…). Nhớ cả kết quả xấu, vì nếu không thì bước
 * kiểm dàn vai vẫn khen "lần đầu sẽ nghe bằng Whisper" cho một file đã biết là hỏng, và lượt sinh lại
 * chết ở đúng chỗ cũ. Một file .txt cùng tên đặt cạnh xoá được nó — lời người ghi luôn thắng.
 */
export const refFailCache = (file) => path.join(REFS, `${refKey(file)}.fail`);
const refFailure = (file) => {
  try { return fs.readFileSync(refFailCache(file), 'utf8').trim() || null; } catch { return null; }
};

/**
 * Mẫu giọng là một file trên máy — "giọng khác" mà người dùng tự đưa vào.
 *
 * OmniVoice cần cả tiếng lẫn LỜI của đoạn mẫu, mà người đưa file thường chỉ có tiếng. Ưu tiên file `.txt`
 * đặt cạnh (chính xác nhất, không phụ thuộc máy móc); không có thì nghe lại bằng đúng Whisper của bước
 * nhập giọng (`voice/.venv`) rồi nhớ luôn kết quả — cùng một mẫu còn dùng cho nhiều video sau.
 */
export async function refFromFile(file, log = () => {}) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return { error: `không thấy file mẫu giọng: ${abs}` };
  if (!isAudioFile(path.basename(abs))) return { error: `${path.basename(abs)} không phải file audio (${AUDIO_EXT.join(' ')})` };

  const sidecar = refSidecar(abs);
  if (sidecar) return { file: abs, text: sidecar.text, from: 'sidecar' };
  const cache = refTextCache(abs);
  if (fs.existsSync(cache)) return { file: abs, text: fs.readFileSync(cache, 'utf8').trim(), from: 'cache' };
  // Đã nghe rồi và không ra lời: trả lại đúng câu đó, không đốt thêm một lượt Whisper.
  const failed = refFailure(abs);
  if (failed) return { error: failed };
  if (!alignPython()) {
    return { error: `chưa biết lời đọc trong ${path.basename(abs)}. Đặt một file .txt cùng tên chứa đúng lời đó, hoặc cài môi trường nhận diện giọng (npm run setup:voice) để tự nghe.` };
  }

  log(`Nghe lời của mẫu giọng ${path.basename(abs)} bằng Whisper…`);
  const res = await runAlign({ model: process.env.VOICE_ALIGN_MODEL || 'small', items: [{ n: 0, wav: abs }] }, {});
  if (!res.ok) return { error: `không nhận diện được lời trong ${path.basename(abs)}: ${res.error}` };
  const item = res.result?.items?.[0];
  const text = String(item?.text || '').trim();
  fs.mkdirSync(REFS, { recursive: true });
  if (!text) {
    // Không nhắc tên file: với file Studio chép về thì tên là một chuỗi hash, còn vai thì đã đứng trước câu này.
    const error = 'mẫu giọng không có tiếng nói — Whisper không nghe ra lời nào. Chọn một đoạn 10–20 giây có người đó nói.';
    fs.writeFileSync(refFailCache(abs), `${error}\n`);
    return { error };
  }
  fs.writeFileSync(cache, `${text}\n`);
  fs.rmSync(refFailCache(abs), { force: true });
  const words = item.words || [];
  return { file: abs, text, from: 'whisper', seconds: words.length ? words[words.length - 1][2] : null };
}

/**
 * Mẫu càng dài thì mỗi câu sinh ra càng phải gánh thêm chừng ấy giây trong VRAM. Mẫu của danh mục dài
 * khoảng 15 giây; trên mức này là lý do thường gặp nhất khiến card chật sinh được nửa video rồi tắc.
 */
export const REF_LONG_SECONDS = 40;

/** Tải/đọc mẫu cho từng vai. Hai vai dùng chung một mẫu thì chỉ làm một lần. */
export async function resolveRefs(roles, log = () => {}) {
  const done = new Map();
  for (const role of roles) {
    if (role.error) continue;
    const key = role.source === 'file' ? `f:${role.file}` : `v:${role.voiceId}`;
    if (!done.has(key)) {
      done.set(
        key,
        role.source === 'file'
          ? await refFromFile(role.file, log)
          : (await refAudioFor(role.voice, log)) || { error: `giọng "${role.voiceName}" chưa tải được mẫu từ kho media.` },
      );
    }
    const ref = done.get(key);
    if (ref.error) { role.error = ref.error; continue; }
    if (ref.seconds && ref.seconds > REF_LONG_SECONDS) {
      log(`! mẫu giọng ${role.voiceName} dài ${Math.round(ref.seconds)}s — nên cắt còn 10–20 giây, mẫu dài làm mỗi câu nặng thêm trong VRAM`);
    }
    role.ref = { file: ref.file, text: ref.text, from: ref.from || 'catalog' };
  }
  return roles;
}

/**
 * Sinh được ngay chưa, hay còn phải tải mẫu về / nghe lời mẫu trước. Không đụng mạng, không chạy Whisper,
 * để Studio nói trước được điều đó mà vẫn mở tab tức thì.
 */
export function refStatus(role) {
  if (role.error) return { ready: false, note: role.error };
  if (role.source === 'file') {
    if (!fs.existsSync(role.file)) return { ready: false, note: `không thấy file ${role.file}` };
    if (!isAudioFile(path.basename(role.file))) return { ready: false, note: `${path.basename(role.file)} không phải file audio` };
    const sidecar = refSidecar(role.file);
    if (sidecar) return { ready: true, note: `lời mẫu lấy từ ${path.basename(sidecar.path)}` };
    if (fs.existsSync(refTextCache(role.file))) return { ready: true, note: 'đã biết lời của mẫu này' };
    // Đã nghe rồi và hỏng: nói thẳng ở đây, đừng khen "lần đầu sẽ nghe" rồi để lượt sinh chết ở chỗ cũ.
    const failed = refFailure(role.file);
    if (failed) return { ready: false, note: failed };
    return alignPython()
      ? { ready: true, note: 'lần đầu sẽ nghe lời của mẫu bằng Whisper' }
      : { ready: false, note: 'chưa biết lời của mẫu: đặt file .txt cùng tên, hoặc cài Whisper (npm run setup:voice)' };
  }
  let assets = {};
  let base = '';
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'media/manifest.json'), 'utf8'));
    assets = raw.assets || {};
    base = (process.env.MEDIA_BASE || raw.base || '').replace(/\/+$/, '');
  } catch { /* không có manifest thì coi như chưa có mẫu nào */ }
  const sample = role.voice?.sample;
  if (!sample || !assets[sample] || !base) return { ready: false, note: `giọng ${role.voiceName} chưa có mẫu trên kho media` };
  return fs.existsSync(path.join(REFS, path.basename(sample)))
    ? { ready: true, note: null }
    : { ready: true, note: 'lần đầu sẽ tải mẫu giọng về máy' };
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

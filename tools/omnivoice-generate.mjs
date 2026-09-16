#!/usr/bin/env node
/**
 * Sinh giọng cho cả video bằng model local — một lệnh, ra sẵn thư mục nhập được.
 *
 *   node tools/omnivoice-generate.mjs --cues <video dir>/cues.js --voice <id|tên> --out <thư mục>
 *
 *   --cues    cues.js của video (lời đọc lấy nguyên văn từ đây)
 *   --voice   giọng cho video một người dẫn: tên/id trong voices.json, hoặc đường dẫn một file mẫu
 *   --speaker "Tú=<giọng|đường dẫn>"  đổi giọng cho riêng một nhân vật (khai được nhiều lần)
 *   --cast    chỉ in ra ai đọc bằng giọng nào rồi dừng — miễn phí, không đụng tới GPU
 *   --out     nơi đổ 01.wav, 02.wav… (mặc định projects/<id>/voice-script/omnivoice)
 *   --json    in một dòng JSON kết quả (Video Studio đọc cái này)
 *   --batch-size  số câu mỗi lượt (mặc định: tự chọn theo VRAM)
 *   --ref <file>  chỉ kiểm một file mẫu giọng rồi dừng: Whisper có nghe ra lời không, mẫu có quá dài không
 *             — Studio gọi ngay lúc người dùng chọn file, để lỗi lộ ra ở đó chứ không phải giữa lượt sinh
 *
 * Vì sao không bảo người dùng tự gõ từng câu vào giao diện web: một video là 40+ câu, và tên file phải
 * khớp đúng số câu thì bước nhập mới ghép được. `omnivoice-infer-batch` nhận một file JSONL rồi tự đặt
 * tên theo `id`, nên cả hai việc đó biến mất.
 *
 * **Video hội thoại**: mỗi dòng JSONL mang `ref_audio` riêng, nên Tú và Lucas đọc bằng hai giọng khác
 * nhau trong cùng MỘT lượt chạy — không phải sinh từng nhân vật rồi ghép tay. Mặc định mỗi nhân vật
 * mượn đúng giọng mà voices.json đã gán cho nó, tức là giống hệt bản ElevenLabs; `--speaker` chỉ dùng khi
 * muốn khác đi, và nhận cả một file audio trên máy cho giọng chưa có trong danh mục.
 *
 * Câu `silent` (khoảng lặng) bị bỏ qua: bước nhập tự dựng khoảng lặng, không cần audio.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { batchSizeFor, castLocal, detectDevice, inferBatchBin, MODEL_ID, REF_LONG_SECONDS, refFromFile, refStatus, resolveRefs, ROOT, SETUP_HINT } from './lib/omnivoice.mjs';
import { cueKey } from './lib/voice-files.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 || !argv[i + 1] || argv[i + 1].startsWith('--') ? fallback : argv[i + 1];
};
/** `--speaker` khai được nhiều lần — mỗi nhân vật một dòng, không phải nhồi hết vào một chuỗi. */
const values = (name) => argv.flatMap((a, i) => (a === `--${name}` && argv[i + 1] && !argv[i + 1].startsWith('--') ? [argv[i + 1]] : []));
const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const note = (m) => console.error(`  ${m}`); // stderr = tiến trình, stdout để dành cho --json

// `--ref` kiểm một file mẫu ngay lúc người dùng chọn, trước khi nó kịp làm hỏng cả lượt sinh: Whisper có
// nghe ra lời không (kết quả được nhớ lại, lượt sinh không phải nghe lần nữa), và mẫu có quá dài không.
// Đã thấy thật: một file MP3 tám mươi giây không có tiếng nói làm lượt sinh chết mà panel không nói gì.
if (flag('ref')) {
  const file = value('ref', null);
  if (!file) fail('usage: node tools/omnivoice-generate.mjs --ref <file audio> --json');
  const abs = path.resolve(file);
  const r = await refFromFile(abs, note);
  const payload = r.error
    ? { file: abs, ok: false, error: r.error }
    : { file: r.file, ok: true, text: r.text, from: r.from, seconds: r.seconds ?? null, long: Boolean(r.seconds && r.seconds > REF_LONG_SECONDS) };
  if (flag('json')) console.log(JSON.stringify(payload));
  else console.log(payload.ok ? `Nghe được (${payload.from}): ${payload.text}` : `✗ ${payload.error}`);
  process.exit(payload.ok ? 0 : 1);
}

const cuesPath = value('cues', null);
if (!cuesPath) fail('usage: node tools/omnivoice-generate.mjs --cues <video dir>/cues.js --voice <id> --out <dir>');
if (!fs.existsSync(cuesPath)) fail(`Không thấy ${cuesPath}.`);

const { CUES = [] } = await import(`${pathToFileURL(path.resolve(cuesPath)).href}?t=${Date.now()}`);
const spoken = CUES.filter((c) => !c.silent && String(c.text || '').trim());
if (!spoken.length) fail('cues.js không có câu nào cần đọc.');

// Ai đọc câu nào. Tên nhân vật gõ sai, giọng không có trong danh mục, file mẫu không tồn tại — tất cả
// phải lộ ra ở đây, trước khi GPU chạy hàng chục phút rồi mới thấy cả video đọc bằng nhầm người.
const speakerMap = Object.fromEntries(values('speaker').map((pair) => {
  const at = pair.indexOf('=');
  if (at < 1) fail(`--speaker phải viết dạng "Tên nhân vật=giọng" (nhận được "${pair}").`);
  return [pair.slice(0, at).trim(), pair.slice(at + 1).trim()];
}));
const cast = castLocal(CUES, { voice: value('voice', '').trim(), speakers: speakerMap });
const roleLabel = (r) => (r.speaker ? r.name : 'Người dẫn');

// `--cast` trả lời được cả khi chưa cài model: Studio vẽ bộ chọn giọng cho từng nhân vật bằng chính nó.
if (flag('cast')) {
  const roles = cast.roles.map((r) => {
    const { ready, note: hint } = refStatus(r);
    return {
      speaker: r.speaker, name: r.name, character: r.character, avatar: r.avatar, side: r.side, tone: r.tone,
      source: r.source, voiceId: r.voiceId, voiceName: r.voiceName, file: r.file, picked: r.picked,
      cues: r.cues.length, ready, note: hint, error: r.error,
    };
  });
  // Mẫu chưa sẵn sàng (file không có thật, chưa biết lời mẫu) cũng là một vấn đề chặn đường, không phải
  // một lời nhắc: gộp vào cùng danh sách để Studio nói đúng lý do thay vì "chọn một giọng đi".
  const problems = [
    ...cast.problems,
    ...roles.filter((r) => !r.ready && !r.error).map((r) => `${roleLabel(r)}: ${r.note}`),
  ];
  const payload = { dialogue: cast.dialogue, cues: CUES.length, spoken: spoken.length, ok: cast.ok && roles.every((r) => r.ready), roles, problems };
  if (flag('json')) console.log(JSON.stringify(payload));
  else for (const r of roles) console.log(`${roleLabel(r)} → ${r.voiceName || '—'}${r.source === 'file' ? ' (file trên máy)' : ''} · ${r.cues} câu${r.error ? `\n  ✗ ${r.error}` : r.note ? `\n  · ${r.note}` : ''}`);
  process.exit(payload.ok ? 0 : 1);
}

const bin = inferBatchBin();
if (!bin) fail(SETUP_HINT);
if (!cast.ok) fail(`Chưa sinh được:\n  ${cast.problems.join('\n  ')}`);

// Mẫu của giọng trong danh mục là chính file đã dùng để nghe thử trong Studio, nên giọng local khớp bản
// ElevenLabs; mẫu do người dùng đưa vào thì cần thêm lời đọc của nó, lấy từ .txt cạnh file hoặc từ Whisper.
await resolveRefs(cast.roles, note);
const broken = cast.roles.filter((r) => r.error);
if (broken.length) fail(`Chưa lấy được mẫu giọng:\n  ${broken.map((r) => `${roleLabel(r)}: ${r.error}`).join('\n  ')}`);
for (const r of cast.roles) {
  note(`${roleLabel(r)} → ${r.voiceName}${r.source === 'file' ? ' (file trên máy)' : ''} · ${r.cues.length} câu`);
}

// Tên file phải do cueKey đặt, không tự tính: nó đo trên TOÀN BỘ cue, nên video có cue cuối là khoảng
// lặng vẫn ra cùng độ rộng số với lúc nhập. Tự tính theo câu có lời là lệch — bước nhập sẽ không thấy file.
const key = cueKey(CUES);
const outDir = path.resolve(value('out', path.join(ROOT, 'projects', path.basename(path.dirname(cuesPath)), 'voice-script/omnivoice')));
// Dọn wav cũ trước: đổi giọng rồi sinh lại mà giữ file cũ là trộn hai giọng trong một video, và cue
// bị xoá khỏi kịch bản vẫn để lại file trùng tên cho bước nhập ăn vào.
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// JSONL đúng đặc tả của omnivoice-infer-batch: id thành tên file, ref_audio + ref_text để clone giọng.
// ref_audio nằm ở TỪNG DÒNG, nên mỗi câu đi theo giọng của người nói câu đó dù cả video chạy một lượt.
const listFile = path.join(outDir, 'test_list.jsonl');
fs.writeFileSync(listFile, `${cast.rows.map((row) => {
  const role = cast.roles[row.role];
  return JSON.stringify({
    id: key(row.n),
    text: row.text,
    ref_audio: role.ref.file,
    ref_text: role.ref.text,
    language_id: 'vi',
    // Chỉ gửi speed khi câu thật sự đổi nhịp (`delivery`), để video một giọng không đổi kết quả.
    // OmniVoice hiểu speed là ngân sách độ dài (số token đích), không phải kéo giãn tín hiệu: đo thử
    // cùng một câu có và không có speed 0,86 ra cùng một cao độ, nên kiểu đọc không làm méo giọng. Đổi
    // lại, câu quá ngắn gần như không nhanh chậm được — ngưỡng sàn 2 giây của bộ ước lượng nuốt mất.
    ...(row.speed !== 1 ? { speed: row.speed } : {}),
  });
}).join('\n')}\n`);
note(`${spoken.length} câu · ${cast.roles.length} giọng → ${path.relative(ROOT, listFile)}`);
note('Lần chạy đầu phải tải trọng số model (~3,3 GB) từ Hugging Face.');

// pydub (OmniVoice dùng để đọc/ghi audio) tìm ffmpeg trên PATH và kêu khi không thấy. Repo đã có sẵn
// ffmpeg-static, nên chỉ đường cho nó thay vì bắt người dùng tự cài ffmpeg hệ thống.
function ffmpegPath() {
  if (process.env.FFMPEG && fs.existsSync(process.env.FFMPEG)) return path.dirname(process.env.FFMPEG);
  try {
    const bin = createRequire(import.meta.url)('ffmpeg-static');
    return bin && fs.existsSync(bin) ? path.dirname(bin) : null;
  } catch { return null; }
}
const ffDir = ffmpegPath();
// PYTHONUTF8: JSONL chứa tiếng Việt thô, mà Python trên Windows mở file theo codepage hệ thống
// (cp1252) khi không được bảo khác — lời đọc thành mojibake hoặc UnicodeDecodeError giữa chừng.
const env = {
  ...process.env,
  PYTHONUTF8: '1',
  PYTHONIOENCODING: 'utf-8',
  ...(ffDir ? { PATH: `${ffDir}${path.delimiter}${process.env.PATH || ''}` } : {}),
};

// Không để nó tự gom batch: mặc định `--batch_duration` 1000 giây nuốt gọn cả video vào một lượt, và
// trên card chật thì đó là treo máy chứ không phải chậm (đo thật: 6 GB, VRAM 97 %, 30 phút không ra file).
const device = detectDevice();
const batchSize = Number(value('batch-size', batchSizeFor(device)));
if (!Number.isInteger(batchSize) || batchSize < 1) fail(`--batch-size phải là số nguyên ≥ 1 (nhận được "${value('batch-size', '')}").`);
note(`${device.label} → mỗi lượt ${batchSize} câu`);

let spawnError = null;
const code = await new Promise((resolve) => {
  const child = spawn(bin, ['--model', MODEL_ID, '--test_list', listFile, '--res_dir', outDir, '--batch_size', String(batchSize)], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  // Studio dừng job bằng cách giết cả cây tiến trình, nhưng chạy tay thì Ctrl-C chỉ tới node — python
  // giữ vài GB VRAM sẽ sống tiếp. Chuyển tín hiệu xuống rồi mới thoát.
  const forward = (sig) => { try { child.kill(sig); } catch {} };
  process.once('SIGINT', () => forward('SIGINT'));
  process.once('SIGTERM', () => forward('SIGTERM'));
  const pipe = (stream) => {
    let buf = '';
    stream.setEncoding('utf8');
    const flush = (text) => {
      // thanh tiến trình vẽ bằng \r: chỉ lấy đoạn cuối, không thì log phình ra hàng nghìn dòng
      const line = text.split('\r').pop().trim();
      if (line) note(line);
    };
    stream.on('data', (d) => {
      buf += d;
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) flush(line);
    });
    // traceback cuối cùng của python hay không kết thúc bằng \n — không có nhánh này là mất đúng nó
    stream.on('end', () => flush(buf));
  };
  pipe(child.stdout);
  pipe(child.stderr);
  child.on('error', (err) => { spawnError = err; resolve(1); });
  child.on('close', (c) => resolve(c ?? 1));
});
if (spawnError) fail(`Không chạy được ${path.basename(bin)}: ${spawnError.message}`);
if (code !== 0) fail(`omnivoice-infer-batch kết thúc với mã ${code}.`);

// omnivoice-infer-batch bắt lỗi của từng câu, ghi log rồi chạy tiếp — thiếu file vẫn thoát mã 0. Nên
// không đếm mã thoát mà đối chiếu từng câu: thiếu một câu là thiếu, báo ngay thay vì để bước nhập mới
// phát hiện sau hàng chục phút GPU.
const missing = spoken.filter((c) => !fs.existsSync(path.join(outDir, `${key(c.n)}.wav`)));
const made = spoken.length - missing.length;
if (missing.length) {
  const list = missing.slice(0, 8).map((c) => c.n).join(', ');
  fail(`Chỉ sinh được ${made}/${spoken.length} câu. Thiếu câu ${list}${missing.length > 8 ? `… (${missing.length} câu)` : ''}.\n  Xem nhật ký phía trên: câu quá dài thường tràn VRAM. Sinh lại sau khi tắt các ứng dụng ăn GPU.`);
}
const result = {
  dir: path.relative(ROOT, outDir),
  files: made,
  cues: spoken.length,
  // Một video hội thoại không có "giọng của video" — nói rõ ai đọc bằng gì, đó mới là thứ cần kiểm lại.
  voice: cast.roles.map((r) => `${roleLabel(r)}: ${r.voiceName}`).join(' · '),
  roles: cast.roles.map((r) => ({ name: roleLabel(r), voice: r.voiceName, source: r.source, cues: r.cues.length })),
};
if (flag('json')) console.log(JSON.stringify(result));
else console.log(`✓ ${made}/${spoken.length} câu → ${result.dir}\n  Nhập lại ở bước "Giọng đọc" → tab "Nhập audio có sẵn", chọn thư mục này.`);

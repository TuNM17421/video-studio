#!/usr/bin/env node
/**
 * Bật/tắt server OmniVoice chạy dưới máy (`omnivoice-demo`, một app Gradio).
 *
 *   node tools/omnivoice-server.mjs start|stop|status [--port 7860] [--json]
 *
 * Server này là TUỲ CHỌN, không nằm trên đường sinh giọng: `omnivoice-generate.mjs` gọi thẳng
 * `omnivoice-infer-batch` và không hề biết tới cổng nào. Nó ở đây cho ai muốn thử từng câu bằng giao
 * diện Gradio — bật nó lúc đang sinh giọng là nạp model hai lần, card chật sẽ tràn VRAM.
 *
 * Là tiến trình sống lâu nên phải tách hẳn khỏi Studio: `detached` + ghi PID ra file, để tắt Studio hay
 * sập tab đều không giết mất server. Nhật ký đổ vào voice/.omnivoice/server.log — lần nạp model đầu
 * tiên tải vài GB từ Hugging Face và im lặng rất lâu, không có log thì không biết nó treo hay đang tải.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { inferBatchBin, MODEL_ID, ROOT, SETUP_HINT, venvBin } from './lib/omnivoice.mjs';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 || !argv[i + 1] || argv[i + 1].startsWith('--') ? fallback : argv[i + 1];
};
// Giá trị của cờ không phải là lệnh: `--port 7860 start` từng lấy command = '7860' rồi chạy status.
const VALUE_FLAGS = new Set(['port']);
const positional = [];
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i].startsWith('--')) { if (VALUE_FLAGS.has(argv[i].slice(2))) i += 1; continue; }
  positional.push(argv[i]);
}
const command = positional[0] ?? 'status';

const STATE_DIR = path.join(ROOT, 'voice/.omnivoice');
const PID_FILE = path.join(STATE_DIR, 'server.json');
const LOG_FILE = path.join(STATE_DIR, 'server.log');
const DEFAULT_PORT = 7860;

const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function wantedPort() {
  const raw = String(value('port', DEFAULT_PORT));
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) fail(`--port không hợp lệ: ${raw}`);
  return n;
}

const readPid = () => {
  try { return JSON.parse(fs.readFileSync(PID_FILE, 'utf8')); } catch { return null; }
};

/** Tiến trình còn sống không — signal 0 không giết gì, chỉ hỏi. */
function alive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

/**
 * PID ghi từ trước lần khởi động máy gần nhất là rác: hệ điều hành đã cấp lại số đó cho tiến trình
 * khác. Không chặn thì "Tắt server" chạy taskkill /T /F lên một ứng dụng bất kỳ của người dùng.
 */
function stale(saved) {
  const bootedAt = Date.now() - os.uptime() * 1000;
  return !saved?.startedAt || saved.startedAt < bootedAt;
}

function status() {
  const saved = readPid();
  const running = Boolean(saved) && !stale(saved) && alive(saved.pid);
  if (saved && !running) fs.rmSync(PID_FILE, { force: true }); // tiến trình chết rồi, đừng báo còn sống
  return {
    installed: Boolean(inferBatchBin()),
    running,
    pid: running ? saved.pid : null,
    port: running ? saved.port : wantedPort(),
    url: running ? `http://127.0.0.1:${saved.port}` : null,
    log: path.relative(ROOT, LOG_FILE),
    modelId: MODEL_ID,
  };
}

/**
 * Cổng còn trống không. Phải hỏi TRƯỚC khi spawn: Gradio nạp trọng số model vài phút rồi mới bind, nên
 * cổng bị chiếm không lộ ra ở giây thứ hai — nó chạy ngon lành một lúc lâu rồi mới ném OSError vào log,
 * lúc đó tiến trình đã báo "đã bật" và người dùng đã đi chỗ khác.
 */
function portFree(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, '127.0.0.1');
  });
}

/** Mấy dòng cuối của log — thứ duy nhất nói được vì sao server vừa chết. */
function logTail(lines = 6) {
  try {
    return fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter((l) => l.trim()).slice(-lines).join('\n  ');
  } catch { return ''; }
}

async function start() {
  const current = status();
  if (current.running) return current;
  const bin = venvBin('omnivoice-demo');
  if (!bin) fail(SETUP_HINT);
  const port = wantedPort();
  if (!(await portFree(port))) fail(`Cổng ${port} đang bị chương trình khác dùng. Tắt nó, hoặc chạy lại với --port <số khác>.`);
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const out = fs.openSync(LOG_FILE, 'a');
  fs.writeSync(out, `\n=== ${new Date().toISOString()} · khởi động cổng ${port} ===\n`);
  const child = spawn(bin, [
    '--model', MODEL_ID,
    '--ip', '127.0.0.1', // chỉ nghe trên máy này; 0.0.0.0 (mặc định của nó) là phơi ra cả mạng LAN
    '--port', String(port),
    '--no-asr', // không cần Whisper của nó: lời đọc đã có sẵn trong cues.js
  ], { cwd: ROOT, detached: true, stdio: ['ignore', out, out] });
  let spawnError = null;
  child.on('error', (err) => { spawnError = err; });
  child.unref();

  // Không được báo "đã bật" rồi mới biết là chưa: cổng bị chiếm hay thiếu thư viện thì Gradio chết
  // trong một hai giây, và lần trạng thái kế tiếp lại hiện "chưa chạy" mà không có dòng lỗi nào.
  await sleep(1500);
  if (spawnError) fail(`Không chạy được ${path.basename(bin)}: ${spawnError.message}`);
  if (!child.pid || !alive(child.pid)) {
    const tail = logTail();
    fail(`Server tắt ngay sau khi bật. Xem ${path.relative(ROOT, LOG_FILE)}${tail ? `:\n  ${tail}` : '.'}`);
  }
  fs.writeFileSync(PID_FILE, `${JSON.stringify({ pid: child.pid, port, startedAt: Date.now() })}\n`);
  return { ...status(), running: true, pid: child.pid, port, url: `http://127.0.0.1:${port}` };
}

async function stop() {
  const saved = readPid();
  if (!saved || stale(saved) || !alive(saved.pid)) {
    fs.rmSync(PID_FILE, { force: true });
    return { ...status(), running: false, pid: null, url: null };
  }
  // Gradio sinh tiến trình con; trên Windows phải nhờ taskkill mới dọn sạch cây tiến trình.
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(saved.pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { process.kill(-saved.pid, 'SIGTERM'); } catch { try { process.kill(saved.pid, 'SIGTERM'); } catch {} } }

  // Chỉ xoá file PID khi tiến trình chết thật. Xoá sớm là mất luôn đường chạm tới nó: cổng và vài GB
  // VRAM bị giữ mãi mà `status` lại báo "chưa chạy".
  for (let i = 0; i < 20 && alive(saved.pid); i += 1) {
    if (i === 10 && process.platform !== 'win32') {
      try { process.kill(-saved.pid, 'SIGKILL'); } catch { try { process.kill(saved.pid, 'SIGKILL'); } catch {} }
    }
    await sleep(250);
  }
  if (alive(saved.pid)) fail(`Server (pid ${saved.pid}) không chịu tắt. Tắt tay rồi thử lại.`);
  fs.rmSync(PID_FILE, { force: true });
  return { ...status(), running: false, pid: null, url: null };
}

const result = command === 'start' ? await start() : command === 'stop' ? await stop() : status();
if (flag('json')) console.log(JSON.stringify(result));
else if (command === 'status') console.log(result.running ? `✓ đang chạy · ${result.url} · pid ${result.pid}` : '· server chưa chạy');
else if (command === 'start') console.log(`✓ đã bật · ${result.url}\n  Lần đầu phải tải trọng số model, xem tiến độ ở ${result.log}`);
else console.log('✓ đã tắt');
process.exit(command === 'status' && !result.running ? 1 : 0);

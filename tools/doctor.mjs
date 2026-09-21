#!/usr/bin/env node
/**
 * Kiểm tra máy này có dựng được video / chạy Video Studio không, trước khi bắt tay vào việc thay vì
 * giữa chừng mới phát hiện thiếu Chromium hay chưa đăng nhập CLI nào. Không sửa gì trên máy — chỉ đọc
 * và báo cáo. Chạy: `npm run doctor` (hoặc `node tools/doctor.mjs --json`).
 *
 * Không thay được cho `npm run build && npm run verify` (đúng đắn của một video cụ thể) hay
 * `npm run check --prefix studio` (đúng đắn của mã Studio) — đây chỉ là điều kiện cần của môi trường.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = process.argv.includes('--json');

const checks = [];
/** level: "required" chặn dựng video/chạy Studio; "recommended" chỉ làm giảm chất lượng so sánh giữa máy. */
function check(level, name, fn) {
  let ok = false;
  let detail = '';
  try {
    const result = fn();
    ok = result !== false;
    detail = typeof result === 'string' ? result : '';
  } catch (error) {
    detail = error instanceof Error ? error.message : String(error);
  }
  checks.push({ level, name, ok, detail });
}

function which(bin) {
  try {
    execFileSync(process.platform === 'win32' ? 'where' : 'which', [bin], { stdio: ['ignore', 'pipe', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}

function versionOf(bin, args = ['--version']) {
  try {
    return execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n')[0];
  } catch {
    return null;
  }
}

check('required', 'Node.js ≥ 20', () => {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 20) throw new Error(`đang chạy Node ${process.versions.node}, cần ≥ 20`);
  return `Node ${process.versions.node}`;
});

check('required', 'python3 (server xem trước)', () => {
  const v = versionOf('python3');
  if (!v) throw new Error('không thấy python3 trên PATH — cần cho `npm run serve`');
  return v;
});

check('required', 'git', () => {
  const v = versionOf('git');
  if (!v) throw new Error('không thấy git trên PATH');
  return v;
});

check('required', 'git identity (user.name/user.email)', () => {
  const name = versionOf('git', ['config', 'user.name']);
  const email = versionOf('git', ['config', 'user.email']);
  if (!name || !email) throw new Error('chưa cấu hình `git config user.name` / `user.email` — commit và log sẽ không quy được về đúng người');
  return `${name} <${email}>`;
});

check('required', 'Design system đã build (vk.js)', () => {
  const vk = path.join(REPO, 'vinuni-lesson-video-ds/dist/vk.js');
  if (!fs.existsSync(vk)) throw new Error('thiếu vinuni-lesson-video-ds/dist/vk.js — chạy `npm install` (postinstall tự build) hoặc `npm run build`');
  return path.relative(REPO, vk);
});

check('required', 'Chromium (chụp QA / render)', () => {
  if (process.env.CHROME) return `\$CHROME=${process.env.CHROME}`;
  try {
    const { chromium } = require('playwright');
    const bin = chromium.executablePath();
    if (bin && fs.existsSync(bin)) return bin;
  } catch {}
  const system = [
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ];
  const found = system.find((p) => fs.existsSync(p));
  if (found) return found;
  throw new Error('không thấy Chromium — chạy `npm run setup` (tải Chromium cho Playwright), hoặc đặt $CHROME');
});

check('required', 'ffmpeg (render MP4)', () => {
  if (process.env.FFMPEG) return `\$FFMPEG=${process.env.FFMPEG}`;
  try {
    const bin = require('ffmpeg-static');
    if (bin && fs.existsSync(bin)) return bin;
  } catch {}
  if (which('ffmpeg')) return versionOf('ffmpeg') || 'ffmpeg trên PATH';
  throw new Error('không thấy ffmpeg — `npm install` kéo theo ffmpeg-static, hoặc cài ffmpeg hệ thống');
});

check('required', 'Ít nhất một agent CLI (Claude, Codex hoặc Antigravity)', () => {
  const claude = which(process.env.CLAUDE_BIN || 'claude');
  const codex = which(process.env.CODEX_BIN || 'codex');
  const antigravity = which(process.env.ANTIGRAVITY_BIN || 'agy');
  if (!claude && !codex && !antigravity) throw new Error('không thấy `claude`, `codex` hoặc `agy` trên PATH — Video Studio cần ít nhất một CLI đã cài và đăng nhập');
  return [claude && 'claude', codex && 'codex', antigravity && 'agy'].filter(Boolean).join(', ');
});

check('recommended', 'Claude CLI', () => {
  if (!which(process.env.CLAUDE_BIN || 'claude')) return false;
  return versionOf(process.env.CLAUDE_BIN || 'claude') || 'đã cài, chưa xác nhận đăng nhập — thử `claude /login`';
});

check('recommended', 'Codex CLI', () => {
  if (!which(process.env.CODEX_BIN || 'codex')) return false;
  return versionOf(process.env.CODEX_BIN || 'codex') || 'đã cài, chưa xác nhận đăng nhập';
});

check('recommended', 'Antigravity CLI', () => {
  if (!which(process.env.ANTIGRAVITY_BIN || 'agy')) return false;
  return versionOf(process.env.ANTIGRAVITY_BIN || 'agy') || 'đã cài, chưa xác nhận đăng nhập';
});

check('recommended', 'Kaggle CLI (chỉ cần cho giọng OmniVoice)', () => {
  if (!which('kaggle')) return false;
  return versionOf('kaggle') || 'đã cài';
});

check('recommended', 'studio/.env: STUDIO_MACHINE_LABEL', () => {
  const env = readStudioEnv();
  const v = env.STUDIO_MACHINE_LABEL?.trim();
  if (v) return v;
  throw new Error(`chưa đặt — log sẽ dùng hostname "${os.hostname()}" (có thể trùng máy khác)`);
});

check('recommended', 'studio/.env: agent model pins', () => {
  const env = readStudioEnv();
  const c = env.STUDIO_CLAUDE_MODEL?.trim();
  const x = env.STUDIO_CODEX_MODEL?.trim();
  const a = env.STUDIO_ANTIGRAVITY_MODEL?.trim();
  if (c || x || a) return [c && `claude=${c}`, x && `codex=${x}`, a && `antigravity=${a}`].filter(Boolean).join(', ');
  throw new Error('chưa đặt — mỗi máy chạy model mặc định của CLI, khó so sánh chất lượng giữa các máy (Codex thậm chí không tự báo model đang chạy)');
});

function readStudioEnv() {
  const file = path.join(REPO, 'studio/.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const requiredFailed = checks.filter((c) => c.level === 'required' && !c.ok);
const recommendedMissing = checks.filter((c) => c.level === 'recommended' && !c.ok);

if (json) {
  console.log(JSON.stringify({ ok: requiredFailed.length === 0, checks }, null, 2));
} else {
  for (const c of checks) {
    const mark = c.ok ? '✓' : c.level === 'required' ? '✗' : '!';
    console.log(`${mark} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
  }
  console.log('');
  if (requiredFailed.length) {
    console.log(`✗ Thiếu ${requiredFailed.length} điều kiện bắt buộc — sửa các dòng ✗ ở trên trước khi dựng video.`);
  } else {
    console.log('✓ Đủ điều kiện bắt buộc để dựng video / chạy Video Studio.');
  }
  if (recommendedMissing.length) {
    console.log(`! ${recommendedMissing.length} khuyến nghị chưa đáp ứng — không chặn việc chạy, nhưng log sẽ thiếu thông tin để so sánh chất lượng giữa các máy/model.`);
  }
}
process.exit(requiredFailed.length ? 1 : 0);

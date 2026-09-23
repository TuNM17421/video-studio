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

check('required', 'Ít nhất một agent CLI (Claude hoặc Codex)', () => {
  const claude = which(process.env.CLAUDE_BIN || 'claude');
  const codex = which(process.env.CODEX_BIN || 'codex');
  if (!claude && !codex) throw new Error('không thấy `claude` lẫn `codex` trên PATH — Video Studio cần ít nhất một CLI đã cài và đăng nhập');
  return [claude && 'claude', codex && 'codex'].filter(Boolean).join(', ');
});

check('recommended', 'Claude CLI', () => {
  if (!which(process.env.CLAUDE_BIN || 'claude')) return false;
  return versionOf(process.env.CLAUDE_BIN || 'claude') || 'đã cài, chưa xác nhận đăng nhập — thử `claude /login`';
});

check('recommended', 'Codex CLI', () => {
  if (!which(process.env.CODEX_BIN || 'codex')) return false;
  return versionOf(process.env.CODEX_BIN || 'codex') || 'đã cài, chưa xác nhận đăng nhập';
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

check('recommended', 'studio/.env: STUDIO_CLAUDE_MODEL / STUDIO_CODEX_MODEL', () => {
  const env = readStudioEnv();
  const c = env.STUDIO_CLAUDE_MODEL?.trim();
  const x = env.STUDIO_CODEX_MODEL?.trim();
  if (c || x) return [c && `claude=${c}`, x && `codex=${x}`].filter(Boolean).join(', ');
  throw new Error('chưa đặt — mỗi máy chạy model mặc định của CLI, khó so sánh chất lượng giữa các máy (Codex thậm chí không tự báo model đang chạy)');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
 * PHẦN 2 · "Máy này dựng được video dòng poster chưa?"
 *
 * Phần 1 ở trên chỉ hỏi môi trường (Node/Chromium/ffmpeg/CLI). Từ 21/09/2026 bộ harness có thêm
 * ~30 tool (giọng · hình · tiếng động · ảnh minh hoạ · QA · quy trình) mà một lane CHƯA
 * TỪNG THẤY REPO sẽ gọi theo tài liệu. Nếu một trong số đó thiếu, hoặc `sfx.json` khai một id
 * không có file, hoặc tài liệu trỏ tới một file đã đổi tên, thì lane phát hiện ở GIỮA việc — lúc
 * đã tiêu credit. Các check dưới đây kéo mọi phát hiện đó về phút thứ nhất.
 *
 * Nguyên tắc: chỉ ĐỌC. Không gọi mạng, không render, không đọc nội dung `.env` (chỉ hỏi có/không).
 * ══════════════════════════════════════════════════════════════════════════════════════════════ */

/** Mọi tool một lane có thể phải gọi khi dựng một video dòng poster, kèm npm script tương ứng. */
const PIPELINE_TOOLS = [
  // script
  { tool: 'text-gate.mjs', script: 'text-gate' },
  { tool: 'cues-json.mjs', script: null },
  { tool: 'storyboard-gate.mjs', script: 'gate:storyboard' },
  // giọng
  { tool: 'voice-risk.mjs', script: 'voice-risk' },
  { tool: 'voice-export.mjs', script: 'voice-export' },
  { tool: 'voice-kaggle.mjs', script: 'voice-kaggle' },
  { tool: 'voice-zerotts.mjs', script: 'voice-zerotts' },
  { tool: 'voice-import.mjs', script: 'voice-import' },
  { tool: 'voice-pace.mjs', script: 'voice-pace' },
  { tool: 'voice-timing.mjs', script: null },
  { tool: 'audio-qa.mjs', script: 'audio-qa' },
  { tool: 'align-health.mjs', script: 'align-health' },
  // hình
  { tool: 'scene-gate.mjs', script: 'scene:gate' },
  { tool: 'scene-pace.mjs', script: 'scene:pace' },
  // tiếng động
  { tool: 'sfx-fetch.mjs', script: 'sfx:fetch' },
  { tool: 'sfx-mix.mjs', script: 'sfx:mix' },
  // Ảnh tư liệu đi đường image-suggest của remote (`image-search|check|apply.mjs`). KHÔNG khai ở đây:
  // chúng theo quy ước CLI của remote (không có `--help` exit 0) và không thuộc kho harness poster.
  // QA
  { tool: 'qa-layout.mjs', script: 'qa:layout' },
  { tool: 'qa.mjs', script: 'qa' },
  { tool: 'verify.mjs', script: 'verify' },
  // quy trình
  { tool: 'new-video.mjs', script: 'new-video' },
  { tool: 'rename-video.mjs', script: 'rename-video' },
  { tool: 'stage.mjs', script: 'stage:build' },
  { tool: 'video-workflow.mjs', script: 'workflow' },
  { tool: 'trace-report.mjs', script: 'trace-report' },
  { tool: 'script-lock.mjs', script: 'script-lock' },
  { tool: 'handoff.mjs', script: 'handoff' },
  { tool: 'dead-frames.mjs', script: 'dead-frames' },
  { tool: 'vach-boundary.mjs', script: 'vach-boundary' },
  { tool: 'verify-baseline.mjs', script: 'verify:baseline' },
  { tool: 'voice-subclip.mjs', script: 'voice-subclip' },
  { tool: 'shoot.mjs', script: null },
  { tool: 'render.mjs', script: null },
];

/** Namespace `lib/index.js` phải export cho dòng poster — thiếu một cái là scene mẫu vỡ ngay. */
const POSTER_EXPORTS = ['poster', 'posterTheme', 'createPosterStage', 'posterMarks', 'posterFigures', 'posterBridge', 'posterMascot', 'posterPhone'];

/**
 * Trần byte MỖI VAI được phép đọc trước khi gõ dòng đầu (lõi + file bắt buộc của vai đó, theo bảng
 * "Đọc gì theo vai" ở đầu SKILL.md). File "tra khi cần" (failure-modes, visual-assets, appendix,
 * styles/<id>.md) KHÔNG tính — chúng chỉ mở theo triệu chứng.
 *
 * ── Vì sao 32.000 chứ không còn 25.600 (22/09/2026) ───────────────────────────────────────────
 * 25 KiB = 25.600 là ngưỡng W4 đặt ra khi tách 251 KB tài liệu cũ, và nó được hiệu chỉnh theo bản
 * `SKILL.md` của harness poster: **7.544 byte**. Lượt gộp lên `origin/main` lấy SKILL lõi của remote
 * (quyết định 7), và bản đó nặng **12.847 byte** — hơn 5.303 byte, tức mọi vai cùng bị đội lên đúng
 * chừng ấy mà không ai thêm một luật nào. Đo thật ngay sau khi gộp: `script` 29.988 (7.544 + 17.714
 * trước gộp = 25.258, vừa khít dưới trần cũ). Thái chốt NỚI trần thay vì cắt `script-craft.md`:
 * nội dung vẫn phải đủ, chỉ có lõi chung nặng hơn. 32.000 = 25.600 + 5.303 làm tròn lên, tức giữ
 * nguyên đúng phần dư mà luật W4 vốn cho mỗi vai.
 */
const ROLE_BUDGET = 32000;
const SKILL_DIR = path.join(REPO, '.claude/skills/make-video');
const ROLE_READS = {
  'owner': ['templates/briefs/owner-checklist.md'],
  'script': ['.claude/skills/make-video/script-craft.md'],
  'voice': ['.claude/skills/make-video/voice-kaggle.md'],
  // `styles/poster.md` là HƯỚNG DẪN CỦA STYLE — vào từ bảng style ở đầu SKILL.md, tra theo mục, nên
  // nó nằm cùng nhóm "tra khi cần" với failure-modes/visual-assets và KHÔNG tính vào trần đọc trước.
  'scene (poster)': ['.claude/skills/make-video/video-anatomy.md'],
  'scene (slide)': ['.claude/skills/make-video/video-anatomy.md'],
  'QA': ['.claude/skills/make-video/role-qa.md'],
};

/** Hai link chết đã biết, Thái chưa chốt cách sửa (backlog 21/09 §W4 "còn nợ"). Không tính là lỗi. */
/** Tool LẤY CỦA REMOTE (quyết định 5) — chúng không theo quy ước `--help` exit 0 của kho harness. */
const HELP_EXEMPT = new Set(['video-workflow.mjs']);

const KNOWN_DEAD_LINKS = ['CLAUDE.md', 'vinuni-lesson-video-ds/README.md'];

const bytesOf = (rel) => { try { return fs.statSync(path.join(REPO, rel)).size; } catch { return 0; } };
const exists = (rel) => fs.existsSync(path.join(REPO, rel));

check('required', 'Tool dòng poster có mặt', () => {
  const missing = PIPELINE_TOOLS.filter((t) => !exists(path.join('tools', t.tool)));
  if (missing.length) {
    throw new Error(`thiếu ${missing.length} tool: ${missing.map((t) => `tools/${t.tool}`).join(', ')} — kéo lại từ git (\`git checkout -- tools/\`) hoặc cập nhật PIPELINE_TOOLS ở tools/harness-doctor.mjs nếu tool đã đổi tên`);
  }
  return `${PIPELINE_TOOLS.length}/${PIPELINE_TOOLS.length} tool`;
});

check('required', 'Tool dòng poster trả lời `--help` (exit 0)', () => {
  if (process.argv.includes('--fast')) return 'bỏ qua (--fast)';
  const bad = [];
  for (const t of PIPELINE_TOOLS) {
    if (HELP_EXEMPT.has(t.tool)) continue;
    const file = path.join(REPO, 'tools', t.tool);
    if (!fs.existsSync(file)) continue;
    try {
      execFileSync(process.execPath, [file, '--help'], { stdio: 'ignore', timeout: 30000 });
    } catch (error) {
      bad.push(`tools/${t.tool} (exit ${error?.status ?? '?'})`);
    }
  }
  if (bad.length) throw new Error(`${bad.length} tool không chạy được \`--help\`: ${bad.join(', ')} — chạy tay \`node <file> --help\` để xem lỗi; tool phải in usage ra stdout và exit 0`);
  return `${PIPELINE_TOOLS.length} tool`;
});

check('required', 'Mỗi tool có npm script trong package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const missing = PIPELINE_TOOLS.filter((t) => t.script && !pkg.scripts?.[t.script]);
  if (missing.length) {
    throw new Error(`thiếu ${missing.length} script: ${missing.map((t) => `"${t.script}": "node tools/${t.tool}"`).join(' · ')} — thêm vào "scripts" của package.json`);
  }
  const named = PIPELINE_TOOLS.filter((t) => t.script).length;
  return `${named} script (${PIPELINE_TOOLS.length - named} tool chỉ gọi bằng \`node tools/…\`)`;
});

check('required', 'File âm thanh cho mọi id trong sfx.json', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(REPO, 'sfx.json'), 'utf8'));
  const entries = Array.isArray(catalog.sfx) ? catalog.sfx : Object.values(catalog.sfx ?? {});
  const missing = entries.filter((e) => e && e.file && !exists(path.join('assets/sfx', e.file)));
  if (missing.length) {
    throw new Error(`thiếu ${missing.length}/${entries.length} file: ${missing.map((e) => e.id).join(', ')} — chạy \`npm run sfx:fetch\` (tải lại từ Pixabay; *.wav không vào git)`);
  }
  const layers = [...new Set(entries.map((e) => e.layer))].sort();
  return `${entries.length} id · ${layers.length} lớp (${layers.join('/')})`;
});

check('required', 'Font Be Vietnam Pro', () => {
  const dir = 'vinuni-lesson-video-ds/fonts';
  const want = ['BeVietnamPro-Medium.ttf', 'BeVietnamPro-SemiBold.ttf', 'BeVietnamPro-Bold.ttf', 'BeVietnamPro-ExtraBold.ttf'];
  const missing = want.filter((f) => !exists(path.join(dir, f)));
  if (missing.length) throw new Error(`thiếu ${missing.join(', ')} trong ${dir}/ — khôi phục bằng \`git checkout -- ${dir}\`; thiếu font thì shoot/render ra chữ sai bề ngang`);
  return `${want.length} weight ở ${dir}/`;
});

check('required', 'lib/index.js export đủ namespace poster', () => {
  const file = path.join(REPO, 'vinuni-lesson-video-ds/lib/index.js');
  if (!fs.existsSync(file)) throw new Error('thiếu vinuni-lesson-video-ds/lib/index.js');
  const src = fs.readFileSync(file, 'utf8');
  const missing = POSTER_EXPORTS.filter((n) => !new RegExp(`export\\s+(\\*\\s+as\\s+${n}\\b|\\{[^}]*\\b${n}\\b)`).test(src));
  if (missing.length) throw new Error(`không thấy export: ${missing.join(', ')} — scene mẫu của \`new-video --style poster\` import đúng các tên này; khai lại ở lib/index.js`);
  return POSTER_EXPORTS.join(', ');
});

check('recommended', 'voice/.venv (Whisper — mốc từ khi import giọng)', () => {
  const venv = 'voice/.venv';
  if (!exists(venv)) throw new Error('chưa có voice/.venv — chạy `npm run setup:voice`; không có thì phải `voice-import --no-align` (mất mốc từ, `spokenAt` hết neo được)');
  const py = ['voice/.venv/bin/python3', 'voice/.venv/Scripts/python.exe'].find(exists);
  if (!py) throw new Error('voice/.venv có nhưng không thấy python trong đó — xoá thư mục rồi chạy lại `npm run setup:voice`');
  return py;
});

check('recommended', 'media/.env (đẩy media lên R2 — chỉ hỏi CÓ/KHÔNG)', () => {
  // Cố ý KHÔNG đọc nội dung: doctor không bao giờ chạm vào secret.
  if (!exists('media/.env')) throw new Error('chưa có media/.env — `npm run media` (media-push) sẽ không chạy được; xem media/.env.example. Không chặn dựng video.');
  return 'có (nội dung không đọc)';
});

check('required', 'Tài liệu skill không trỏ vào file đã mất', () => {
  const docs = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name));
      else if (e.name.endsWith('.md')) docs.push(path.join(dir, e.name));
    }
  };
  walk(SKILL_DIR);
  walk(path.join(REPO, 'templates'));
  const dead = [];
  for (const doc of docs) {
    for (const target of docLinks(fs.readFileSync(doc, 'utf8'))) {
      // Tài liệu viết đường dẫn theo ba gốc: gốc repo, thư mục chính tài liệu, và gốc design system
      // (`lib/tokens.js` trong doc scene = `vinuni-lesson-video-ds/lib/tokens.js`).
      const resolved = [
        path.resolve(REPO, target),
        path.resolve(path.dirname(doc), target),
        path.resolve(REPO, 'vinuni-lesson-video-ds', target),
      ];
      if (resolved.some((p) => fs.existsSync(p))) continue;
      dead.push(`${path.relative(REPO, doc)} → ${target}`);
    }
  }
  if (dead.length) throw new Error(`${dead.length} link chết:\n    ${dead.join('\n    ')}\n    → sửa đường dẫn trong tài liệu (tool là nguồn sự thật), hoặc tạo lại file bị mất`);
  return `${docs.length} file .md, mọi đường dẫn còn sống`;
});

check('recommended', 'Link chết đã biết (chờ Thái chốt)', () => {
  const still = KNOWN_DEAD_LINKS.filter(exists);
  if (still.length === KNOWN_DEAD_LINKS.length) {
    throw new Error(`2 link chết có sẵn ở ${KNOWN_DEAD_LINKS.join(' và ')} — backlog 21/09 §W4 "còn nợ": đã biết, chờ Thái. Không chặn.`);
  }
  return 'không còn';
});

check('required', `Ngân sách byte theo vai ≤ ${ROLE_BUDGET.toLocaleString('vi-VN')}`, () => {
  const core = bytesOf('.claude/skills/make-video/SKILL.md');
  const rows = Object.entries(ROLE_READS).map(([role, files]) => ({
    role,
    bytes: core + files.reduce((s, f) => s + bytesOf(f), 0),
  }));
  const over = rows.filter((r) => r.bytes > ROLE_BUDGET);
  // In luôn CÒN DƯ bao nhiêu: trần này là ngân sách zero-sum, mỗi luật mới phải đánh đổi một mục
  // cũ xuống file tra. Biết trước khi viết thì rẻ hơn nhiều so với biết sau khi vượt.
  const table = rows.map((r) => `${r.role} ${r.bytes.toLocaleString('vi-VN')} (dư ${(ROLE_BUDGET - r.bytes).toLocaleString('vi-VN')})`).join(' · ');
  if (over.length) {
    throw new Error(`vượt trần: ${over.map((r) => `${r.role} ${r.bytes.toLocaleString('vi-VN')} (+${(r.bytes - ROLE_BUDGET).toLocaleString('vi-VN')})`).join(', ')} — chuyển phần TRA CỨU xuống file phụ (visual-assets.md / styles/poster.md / styles/poster.md) rồi trỏ tới, đừng xoá luật.\n    Bảng đầy đủ: ${table}`);
  }
  return table;
});

/**
 * Rút đường dẫn file mà một tài liệu trỏ tới. Chỉ nhận thứ CHẮC CHẮN là đường dẫn để không báo giả:
 * link markdown `[x](y)` không phải http/anchor, và token trong backtick có phần mở rộng đã biết
 * hoặc nằm dưới một thư mục đã biết. Mọi thứ khác (lệnh, tên cờ, ví dụ code) bị bỏ qua.
 */
function docLinks(src) {
  const EXT = /\.(mjs|js|jsx|ts|tsx|json|md|py|wav|mp4|txt|html|jsonl)$/;
  const ROOTS = /^(tools|templates|styles|media|assets|studio|docs|lib|components|ui_kits|vinuni-lesson-video-ds|tts-elevenlabs|reports|\.claude)\//;
  // Thư mục SINH RA lúc chạy (gitignore hoặc phụ thuộc video/máy) — tài liệu trỏ tới là đúng, nhưng
  // sự tồn tại của chúng không nói gì về sức khoẻ tài liệu.
  const GENERATED = /^(projects|transcripts|chapters|render|qa|voice\/out|results|node_modules|\.studio|\.git)\b|\/(render|qa|out|dist)\//;
  const out = new Set();
  const keep = (raw) => {
    let t = raw.trim().replace(/^\.\//, '').split('#')[0].split(/\s+/)[0];
    if (!t || /^(https?|mailto):/.test(t)) return;
    if (/[<>*$|]/.test(t)) return;                    // placeholder kiểu <id>, glob, pipe
    if (/(^|\/)\./.test(t.slice(1)) || /(^|\/)\.env/.test(t)) return; // dotfile/dotdir sinh lúc chạy (.cc-writes, .studio, .env)
    if (GENERATED.test(t)) return;
    // Phải bắt đầu bằng một gốc ĐÃ BIẾT của repo. Nhờ vậy `remotion-dev/remotion/LICENSE.md` (đường
    // dẫn trong repo NGƯỜI KHÁC) hay `node --test` không bị hiểu nhầm thành file của mình.
    if (!ROOTS.test(t)) return;
    out.add(t.replace(/\/$/, ''));
  };
  for (const m of src.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) keep(m[1]);
  for (const m of src.matchAll(/`([^`\n]+)`/g)) keep(m[1]);
  return [...out];
}

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

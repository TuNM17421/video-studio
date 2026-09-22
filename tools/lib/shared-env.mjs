/**
 * Môi trường Python và model nặng dùng chung giữa mọi checkout/worktree trên cùng một máy.
 *
 * Trước đây mỗi checkout tự cài `voice/.venv` (faster-whisper, ~400 MB) cộng model Whisper (~460 MB) vào
 * chính nó, và `voice/.venv-omnivoice` (1–4 GB). Mở thêm một worktree để review một nhánh là bị đòi cài lại
 * từ đầu, dù máy đã có sẵn bản y hệt ở worktree bên cạnh — đo thật: model `faster-whisper-small` nằm ba
 * chỗ trên một máy. Nên tìm theo thứ tự, và chỉ cài khi không thấy ở đâu cả:
 *
 *   1. biến môi trường (chỉ định rõ, luôn thắng)
 *   2. trong chính checkout này — bản cài theo kiểu cũ vẫn chạy như trước
 *   3. thư mục dùng chung của máy (`sharedHome()`) — nơi bản cài mới rơi vào
 *   4. checkout khác của cùng repo (`git worktree list`) — dùng lại bản cài kiểu cũ ở đó, không chép
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Thư mục dùng chung của máy: $VIDEO_STUDIO_HOME, không có thì thư mục cache chuẩn của hệ điều hành. */
export function sharedHome(env = process.env, platform = process.platform, home = os.homedir()) {
  if (env.VIDEO_STUDIO_HOME) return path.resolve(env.VIDEO_STUDIO_HOME);
  if (platform === 'win32') return path.join(env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'video-studio');
  if (platform === 'darwin') return path.join(home, 'Library', 'Caches', 'video-studio');
  return path.join(env.XDG_CACHE_HOME || path.join(home, '.cache'), 'video-studio');
}

let worktreeCache = null;
/** Gốc của các checkout khác cùng repo (không gồm checkout này). Không có git thì là danh sách rỗng. */
export function worktreeRoots() {
  if (worktreeCache) return worktreeCache;
  const res = spawnSync('git', ['worktree', 'list', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  const self = path.resolve(ROOT);
  worktreeCache = res.status !== 0 ? [] : res.stdout.split('\n')
    .filter((l) => l.startsWith('worktree '))
    .map((l) => path.resolve(l.slice('worktree '.length).trim()))
    .filter((p) => p !== self && fs.existsSync(p));
  return worktreeCache;
}

const exe = (name) => (process.platform === 'win32' ? `${name}.exe` : name);

/** Một lệnh trong venv `dir` (bin/ trên Linux/macOS, Scripts/ trên Windows), hoặc null. */
export function venvBin(dir, name) {
  if (!dir) return null;
  for (const sub of ['bin', 'Scripts']) {
    const p = path.join(dir, sub, exe(name));
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Các chỗ có thể chứa một venv, theo đúng thứ tự ưu tiên.
 *   spec.repo    đường dẫn trong checkout, ví dụ 'voice/.venv'
 *   spec.shared  tên thư mục trong sharedHome(), ví dụ 'voice-align-venv'
 *   spec.env     biến môi trường chỉ định thẳng, ví dụ 'VOICE_ALIGN_VENV'
 */
export function venvCandidates(spec, { env = process.env, root = ROOT, shared = sharedHome(env), worktrees = worktreeRoots() } = {}) {
  return [
    ...(env[spec.env] ? [{ dir: path.resolve(env[spec.env]), from: 'env' }] : []),
    { dir: path.join(root, spec.repo), from: 'repo' },
    { dir: path.join(shared, spec.shared), from: 'shared' },
    ...worktrees.map((w) => ({ dir: path.join(w, spec.repo), from: 'worktree' })),
  ];
}

/** Venv đầu tiên có lệnh `probe` (mặc định python), hoặc null. */
export function findVenv(spec, { probe = 'python', ...opts } = {}) {
  for (const c of venvCandidates(spec, opts)) {
    const bin = venvBin(c.dir, probe);
    // Một worktree có thể chỉ link sang venv của worktree khác: báo đường dẫn thật, đó mới là thứ đang dùng.
    if (bin) return { ...c, dir: fs.realpathSync(c.dir), bin };
  }
  return null;
}

/**
 * Nơi cài khi chưa có ở đâu cả: biến môi trường nếu có, không thì thư mục dùng chung — để checkout sau
 * dùng lại được. `--local` của các lệnh setup thì cài vào checkout như trước.
 */
export function installDir(spec, { local = false, env = process.env, root = ROOT } = {}) {
  if (env[spec.env]) return path.resolve(env[spec.env]);
  if (local) return path.join(root, spec.repo);
  return path.join(sharedHome(env), spec.shared);
}

/** Đường dẫn để in ra cho người đọc: tương đối nếu nằm trong checkout, `~/…` nếu nằm trong thư mục nhà. */
export function displayPath(p, root = ROOT, home = os.homedir()) {
  if (!p) return p;
  const rel = path.relative(root, p);
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) return rel.replace(/\\/g, '/');
  if (home && p.startsWith(home + path.sep)) return `~/${path.relative(home, p).replace(/\\/g, '/')}`;
  return p.replace(/\\/g, '/');
}

export const WHISPER_VENV = { repo: 'voice/.venv', shared: 'voice-align-venv', env: 'VOICE_ALIGN_VENV' };
export const OMNIVOICE_VENV = { repo: 'voice/.venv-omnivoice', shared: 'omnivoice-venv', env: 'OMNIVOICE_VENV' };
export const KAGGLE_VENV = { repo: 'voice/.venv-kaggle', shared: 'kaggle-venv', env: 'KAGGLE_CLI_VENV' };

/** Tên thư mục một model faster-whisper nằm trong cache kiểu Hugging Face. */
export const whisperRepoDir = (model) => `models--Systran--faster-whisper-${model}`;

/** Cache đã có model này chưa (có ít nhất một snapshot, không chỉ là file khoá của lần tải dở). */
function hasModel(cacheDir, model) {
  const snaps = path.join(cacheDir, whisperRepoDir(model), 'snapshots');
  try { return fs.readdirSync(snaps).some((s) => fs.existsSync(path.join(snaps, s, 'model.bin'))); } catch { return false; }
}

/**
 * Thư mục cache chứa model Whisper cho faster-whisper (`download_root`). Model đã có ở đâu thì dùng ở đó —
 * kể cả cache Hugging Face chung của máy, vì faster-whisper tải về đúng bố cục đó. Không có thì tải về
 * thư mục dùng chung.
 */
export function whisperModelCache(model = 'small', { env = process.env, root = ROOT, shared = sharedHome(env), worktrees = worktreeRoots(), home = os.homedir() } = {}) {
  if (env.VOICE_ALIGN_CACHE) return path.resolve(env.VOICE_ALIGN_CACHE);
  const hub = env.HF_HUB_CACHE || path.join(env.HF_HOME || path.join(home, '.cache', 'huggingface'), 'hub');
  const candidates = [
    path.join(root, 'voice/cache/whisper'),
    path.join(shared, 'whisper'),
    ...worktrees.map((w) => path.join(w, 'voice/cache/whisper')),
    hub,
    path.join(home, '.cache', 'faster-whisper'),
  ];
  const found = candidates.find((c) => hasModel(c, model));
  return found ? fs.realpathSync(found) : path.join(shared, 'whisper');
}

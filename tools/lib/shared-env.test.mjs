/**
 * npm run test:tools — tìm venv/model dùng chung giữa các checkout (tools/lib/shared-env.mjs).
 * Mọi đường dẫn đều truyền vào tường minh, nên test không đụng tới venv thật của máy.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { displayPath, findVenv, installDir, sharedHome, WHISPER_VENV, whisperModelCache, whisperRepoDir } from './shared-env.mjs';

const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'shared-env-')));
const bin = process.platform === 'win32' ? ['Scripts', 'python.exe'] : ['bin', 'python'];
function makeVenv(dir) {
  fs.mkdirSync(path.join(dir, bin[0]), { recursive: true });
  fs.writeFileSync(path.join(dir, ...bin), '');
  return dir;
}
function makeModel(cache, model = 'small') {
  const snap = path.join(cache, whisperRepoDir(model), 'snapshots', 'abc');
  fs.mkdirSync(snap, { recursive: true });
  fs.writeFileSync(path.join(snap, 'model.bin'), '');
  return cache;
}

test('thư mục dùng chung theo chuẩn từng hệ điều hành, và biến môi trường thắng', () => {
  assert.equal(sharedHome({}, 'linux', '/home/a'), '/home/a/.cache/video-studio');
  assert.equal(sharedHome({ XDG_CACHE_HOME: '/x' }, 'linux', '/home/a'), '/x/video-studio');
  assert.equal(sharedHome({}, 'darwin', '/Users/a'), '/Users/a/Library/Caches/video-studio');
  assert.equal(sharedHome({ VIDEO_STUDIO_HOME: '/opt/vs' }, 'linux', '/home/a'), '/opt/vs');
});

test('không cài lại khi một worktree khác đã có venv', () => {
  // Đúng tình huống thật: mở worktree mới để review, bản cài nằm ở worktree bên cạnh.
  const root = tmp(); const shared = tmp(); const other = tmp();
  makeVenv(path.join(other, 'voice/.venv'));
  const found = findVenv(WHISPER_VENV, { env: {}, root, shared, worktrees: [other] });
  assert.equal(found.from, 'worktree');
  assert.equal(found.dir, path.join(other, 'voice/.venv'));
});

test('thứ tự: biến môi trường → checkout này → dùng chung → worktree khác', () => {
  const root = tmp(); const shared = tmp(); const other = tmp(); const pinned = tmp();
  makeVenv(path.join(other, 'voice/.venv'));
  makeVenv(path.join(shared, 'voice-align-venv'));
  assert.equal(findVenv(WHISPER_VENV, { env: {}, root, shared, worktrees: [other] }).from, 'shared');
  makeVenv(path.join(root, 'voice/.venv'));
  assert.equal(findVenv(WHISPER_VENV, { env: {}, root, shared, worktrees: [other] }).from, 'repo');
  makeVenv(pinned);
  assert.equal(findVenv(WHISPER_VENV, { env: { VOICE_ALIGN_VENV: pinned }, root, shared, worktrees: [other] }).from, 'env');
});

test('venv chỉ là symlink sang chỗ khác thì báo đường dẫn thật', (t) => {
  const root = tmp(); const shared = tmp(); const real = makeVenv(path.join(tmp(), 'venv'));
  fs.mkdirSync(path.join(root, 'voice'));
  try { fs.symlinkSync(real, path.join(root, 'voice/.venv'), 'dir'); } catch { return t.skip('không tạo được symlink'); }
  assert.equal(findVenv(WHISPER_VENV, { env: {}, root, shared, worktrees: [] }).dir, real);
});

test('chưa có ở đâu thì cài vào thư mục dùng chung, --local thì vào checkout', () => {
  const root = tmp();
  assert.equal(findVenv(WHISPER_VENV, { env: {}, root, shared: tmp(), worktrees: [] }), null);
  assert.equal(installDir(WHISPER_VENV, { env: { VIDEO_STUDIO_HOME: '/opt/vs' }, root }), path.join('/opt/vs', 'voice-align-venv'));
  assert.equal(installDir(WHISPER_VENV, { env: {}, root, local: true }), path.join(root, 'voice/.venv'));
});

test('model Whisper đã có trong cache Hugging Face chung thì dùng luôn, không tải lại', () => {
  const root = tmp(); const shared = tmp(); const home = tmp();
  const hub = makeModel(path.join(home, '.cache/huggingface/hub'));
  assert.equal(whisperModelCache('small', { env: {}, root, shared, worktrees: [], home }), hub);
  // Chưa có ở đâu → tải về thư mục dùng chung; model khác cỡ không lấy nhầm.
  assert.equal(whisperModelCache('medium', { env: {}, root, shared, worktrees: [], home }), path.join(shared, 'whisper'));
});

test('lượt tải dở (chưa có model.bin) không được tính là đã có model', () => {
  const root = tmp(); const shared = tmp(); const home = tmp();
  fs.mkdirSync(path.join(root, 'voice/cache/whisper', whisperRepoDir('small'), 'snapshots', 'abc'), { recursive: true });
  assert.equal(whisperModelCache('small', { env: {}, root, shared, worktrees: [], home }), path.join(shared, 'whisper'));
});

test('đường dẫn in ra: tương đối trong checkout, ~/ trong thư mục nhà', () => {
  assert.equal(displayPath('/r/voice/.venv', '/r', '/home/a'), 'voice/.venv');
  assert.equal(displayPath('/home/a/.cache/video-studio/x', '/r', '/home/a'), '~/.cache/video-studio/x');
});

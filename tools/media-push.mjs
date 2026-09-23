#!/usr/bin/env node
/**
 * Push the heavy media of `media/files/` to a public Cloudflare R2 bucket and record what is up there in
 * media/manifest.json.
 *
 *   node tools/media-push.mjs [--dry-run] [--force] [--prune] [--list] [--only <prefix>]
 *
 *   --list      only report what is local, what is on R2 and what changed; upload nothing
 *   --dry-run   same report, plus exactly what a real run would upload or delete
 *   --force     re-upload every local file even when its hash already matches the manifest
 *   --prune     delete objects the manifest knows but `media/files/` no longer has. Refused when this
 *               machine plainly does not hold the library (see pruneGuard in lib/media.mjs) — a fresh
 *               clone has an empty media/files/, and there it would wipe the whole bucket.
 *   --prune     delete objects the manifest knows but `media/files/` no longer has
 *   --only <prefix>  restrict EVERYTHING (report, upload, prune) to keys under <prefix>; repeatable
 *
 * `--only` tồn tại vì mặc định lệnh này đẩy **cả cây** `media/files/`. Ca thật 21/09/2026: được
 * duyệt đẩy ĐÚNG HAI asset, nhưng một lần chạy trần có thể đẩy cả cây cùng nhiều ảnh evidence chưa
 * từng được duyệt. Đẩy thừa lên
 * một bucket CÔNG KHAI thì không rút lại được bằng cách quên nó đi. `--only` là cách khai phạm vi
 * ra thành chữ, để `--dry-run` in đúng danh sách sẽ lên và người duyệt đọc được.
 *
 * `media/files/<key>` maps one-to-one to the object `<key>` in the bucket, so the sample video of a style
 * lives at `media/files/styles/<style id>/sample.mp4` and is read back from `<R2_PUBLIC_BASE>/styles/…`.
 * Credentials come from media/.env (see media/.env.example) and stay on this machine; the manifest — key,
 * type, size, hash, public base — is the only thing committed, and it is what lets a teammate who just
 * clones the repo and runs the studio see the videos without any R2 access of their own.
 *
 * Uploads are signed with AWS SigV4 against R2's S3 API and streamed, so a 500 MB master never has to be
 * held in memory. A file whose hash is unchanged is skipped, so re-running this is cheap and safe.
 */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { encodeSegment, EMPTY_SHA, objectUrl, signRequest } from './lib/r2.mjs';
import { pruneGuard } from './lib/media.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = path.join(ROOT, 'media');
const FILES = path.join(MEDIA, 'files');
const MANIFEST = path.join(MEDIA, 'manifest.json');

const argv = process.argv.slice(2);
const only = [];
const flags = new Set();
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--only') {
    const v = argv[++i];
    if (!v || v.startsWith('--')) fail('--only cần một prefix key, ví dụ: --only images/hero.png');
    only.push(v.replace(/^\/+/, ''));
    continue;
  }
  flags.add(argv[i]);
}
for (const f of flags) if (!['--dry-run', '--force', '--prune', '--list'].includes(f)) fail(`Không hiểu tuỳ chọn ${f}. Xem phần chú thích đầu tools/media-push.mjs.`);
const listOnly = flags.has('--list');
const dryRun = listOnly || flags.has('--dry-run');
/** Không khai `--only` ⇒ phạm vi là cả cây, y như trước. */
const inScope = (key) => !only.length || only.some((p) => key === p || key.startsWith(p.endsWith('/') ? p : `${p}/`));

// ── config ────────────────────────────────────────────────────────────────────
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}
loadEnv(path.join(MEDIA, '.env'));

const cfg = {
  account: process.env.R2_ACCOUNT_ID || '',
  bucket: process.env.R2_BUCKET || '',
  keyId: process.env.R2_ACCESS_KEY_ID || '',
  secret: process.env.R2_SECRET_ACCESS_KEY || '',
  base: (process.env.R2_PUBLIC_BASE || '').replace(/\/+$/, ''),
};

/** Content types the studio can actually play or show; anything else is refused rather than guessed. */
const TYPES = {
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.vtt': 'text/vtt', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

// ── local files ───────────────────────────────────────────────────────────────
function walk(dir, prefix = '') {
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (d.name.startsWith('.')) continue;
    const key = prefix ? `${prefix}/${d.name}` : d.name;
    if (d.isDirectory()) out.push(...walk(path.join(dir, d.name), key));
    else out.push(key);
  }
  return out;
}

// ── requests ──────────────────────────────────────────────────────────────────
const sha256File = (file) => new Promise((resolve, reject) => {
  const hash = crypto.createHash('sha256');
  fs.createReadStream(file).on('error', reject).on('data', (c) => hash.update(c)).on('end', () => resolve(hash.digest('hex')));
});

/** One signed request; `file` streams as the body so large masters never sit in memory. */
function send({ method, key, headers = {}, payloadHash, file, onProgress }) {
  const { host, uri } = objectUrl(cfg.account, cfg.bucket, key);
  const signedHeaders = signRequest({
    method, host, uri, payloadHash, accessKey: cfg.keyId, secret: cfg.secret,
    headers: { ...headers, 'x-amz-content-sha256': payloadHash },
  });
  return new Promise((resolve, reject) => {
    const req = https.request(`https://${host}${uri}`, { method, headers: signedHeaders }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (e) => reject(new Error(`không gọi được R2 (${e.code || e.message}) — kiểm tra mạng và R2_ACCOUNT_ID`)));
    if (!file) return req.end();
    let sent = 0;
    fs.createReadStream(file)
      .on('error', reject)
      .on('data', (c) => { sent += c.length; onProgress?.(sent); })
      .pipe(req);
  });
}

/** R2 answers with an XML error document; show the message, not the whole envelope. */
const r2Error = (res) => (res.body.match(/<Message>([^<]+)<\/Message>/) || [null, res.body.slice(0, 200)])[1];

/** Keep what already made it up there: a run that dies halfway must not re-upload those files next time. */
function saveManifest() {
  manifest.base = cfg.base;
  manifest.assets = Object.fromEntries(Object.entries(manifest.assets).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
}

const human = (bytes) => (bytes >= 1 << 20 ? `${(bytes / (1 << 20)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// ── run ───────────────────────────────────────────────────────────────────────
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
manifest.assets ||= {};

if (!fs.existsSync(FILES)) fail(`Chưa có thư mục ${path.relative(ROOT, FILES)}. Tạo nó rồi bỏ video/audio vào theo đúng key muốn dùng.`);
const local = walk(FILES).filter(inScope);
if (only.length) console.log(`\nPhạm vi --only: ${only.join(' · ')} → ${local.length} file local lọt phạm vi`);
const unknown = local.filter((k) => !TYPES[path.extname(k).toLowerCase()]);
if (unknown.length) fail(`Không nhận ra định dạng: ${unknown.join(', ')}.\n  Định dạng hỗ trợ: ${Object.keys(TYPES).join(' ')}`);

const entries = [];
for (const key of local) {
  const file = path.join(FILES, key);
  const { size } = fs.statSync(file);
  const hash = await sha256File(file);
  const known = manifest.assets[key];
  const changed = !known || known.sha256 !== hash;
  entries.push({ key, file, size, hash, changed, type: TYPES[path.extname(key).toLowerCase()] });
}
const orphans = Object.keys(manifest.assets).filter((k) => inScope(k) && !local.includes(k));
const todo = entries.filter((e) => e.changed || flags.has('--force'));

console.log(`\nKho media  ${path.relative(ROOT, FILES)}/  →  ${cfg.bucket ? `R2 «${cfg.bucket}»` : 'R2 (chưa cấu hình)'}`);
console.log(`Base công khai  ${cfg.base || manifest.base || '(chưa đặt R2_PUBLIC_BASE)'}\n`);
for (const e of entries) {
  const mark = e.changed ? (manifest.assets[e.key] ? 'đã đổi ' : 'mới    ') : 'giữ    ';
  console.log(`  ${mark} ${e.key.padEnd(46)} ${human(e.size).padStart(9)}`);
}
for (const key of orphans) console.log(`  thừa    ${key.padEnd(46)} ${flags.has('--prune') ? 'sẽ xoá trên R2' : '(thêm --prune để xoá trên R2)'}`);
if (!entries.length && !orphans.length) console.log('  (trống — bỏ file vào media/files/ rồi chạy lại)');

if (listOnly) process.exit(0);

// Chặn trước cả --dry-run: biết mình đang ở nhầm máy lúc xem thử vẫn hơn lúc vừa bấm Enter. Danh sách
// "thừa" ở trên đã in ra rồi nên không giấu gì; chỉ là không cho đi tiếp.
const refusal = flags.has('--prune') ? pruneGuard({ local: local.length, orphans: orphans.length }) : null;
if (refusal) {
  fail(`Không chạy --prune: ${refusal}.
  media/files/ là bản gốc của kho media, mà file nặng không nằm trong git — máy vừa clone về luôn rỗng.
  Xoá trên R2 là mất hẳn, cả nhóm mất theo.
  Nếu đúng là muốn xoá: đồng bộ đủ media/files/ trước, hoặc xoá thẳng object trong bảng điều khiển Cloudflare R2.
  Bỏ --prune thì lệnh vẫn đẩy file mới lên bình thường.`);
}

const missing = Object.entries({ R2_ACCOUNT_ID: cfg.account, R2_BUCKET: cfg.bucket, R2_ACCESS_KEY_ID: cfg.keyId, R2_SECRET_ACCESS_KEY: cfg.secret, R2_PUBLIC_BASE: cfg.base })
  .filter(([, v]) => !v).map(([n]) => n);
if (missing.length && (todo.length || (flags.has('--prune') && orphans.length))) {
  fail(`Thiếu ${missing.join(', ')} trong media/.env.\n  Chép media/.env.example → media/.env rồi điền (xem media/README.md).`);
}

if (dryRun) {
  console.log(`\n(dry-run) sẽ đẩy ${todo.length} file${flags.has('--prune') ? `, xoá ${orphans.length} object` : ''}. Bỏ --dry-run để chạy thật.\n`);
  process.exit(0);
}

let pushed = 0;
let pruned = 0;
try {
  for (const e of todo) {
    process.stdout.write(`\n↑ ${e.key} (${human(e.size)}) `);
    let lastPercent = -1;
    const res = await send({
      method: 'PUT',
      key: e.key,
      payloadHash: e.hash,
      file: e.file,
      headers: {
        'content-type': e.type,
        'content-length': String(e.size),
        // Cached by key for a day: a changed sample served under the same name only reaches a teammate's
        // browser after the TTL, so give a new cut a new file name instead of waiting it out.
        'cache-control': 'public, max-age=86400',
      },
      onProgress: (sent) => {
        const percent = Math.floor((sent / e.size) * 10) * 10;
        if (percent > lastPercent) { lastPercent = percent; process.stdout.write('.'); }
      },
    });
    if (res.status !== 200) throw new Error(`đẩy ${e.key} thất bại (HTTP ${res.status}): ${r2Error(res)}`);
    manifest.assets[e.key] = { type: e.type, bytes: e.size, sha256: e.hash, updated: new Date().toISOString().slice(0, 10) };
    pushed++;
    process.stdout.write(' xong');
  }

  if (flags.has('--prune')) {
    for (const key of orphans) {
      const res = await send({ method: 'DELETE', key, payloadHash: EMPTY_SHA });
      if (res.status !== 204 && res.status !== 200) throw new Error(`xoá ${key} thất bại (HTTP ${res.status}): ${r2Error(res)}`);
      delete manifest.assets[key];
      pruned++;
      console.log(`\n✗ ${key} đã xoá trên R2`);
    }
  }
} catch (e) {
  saveManifest();
  fail(`${e.message}\n  ${pushed} file đã đẩy xong trước đó vẫn được ghi vào manifest — chạy lại để tiếp tục.`);
}

saveManifest();

// The bucket must be publicly readable, otherwise a teammate's studio gets 401 and shows the offline card.
if (entries.length) {
  const probe = `${cfg.base}/${entries[0].key.split('/').map(encodeSegment).join('/')}`;
  const ok = await fetch(probe, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
  if (!ok) console.log(`\n⚠ ${probe}\n  không đọc được công khai. Bật Public Development URL (hoặc custom domain) cho bucket,\n  và kiểm tra R2_PUBLIC_BASE trong media/.env.`);
}

console.log(`\n\n✓ ${pushed} file đã đẩy${pruned ? `, ${pruned} object đã xoá` : ''}. media/manifest.json đã cập nhật — commit nó để cả nhóm thấy media.\n`);

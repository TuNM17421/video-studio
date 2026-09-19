/**
 * Public URL of a file in the media bucket, read from the committed media/manifest.json.
 *
 * Mirrors studio/src/lib/server/media.ts for the command-line side of the pipeline: tts.mjs needs it to
 * write a character's avatar URL into voice.cues.json, so scenes get a ready URL and the design system
 * never has to know where this repo keeps its media.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MANIFEST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../media/manifest.json');

export function readManifest() {
  try {
    const raw = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    return { base: (process.env.MEDIA_BASE || raw.base || '').replace(/\/+$/, ''), assets: raw.assets || {} };
  } catch {
    return { base: '', assets: {} };
  }
}

/**
 * null when the key was never pushed — an absent file, not a broken URL.
 * `?v=` is a fingerprint of the content: media is served with a day-long cache-control, so a file replaced
 * under the same name would keep playing out of browsers that had already seen it.
 */
export function mediaUrl(key) {
  const { base, assets } = readManifest();
  const entry = key ? assets[key] : null;
  if (!entry || !base) return null;
  const version = entry.sha256 ? `?v=${entry.sha256.slice(0, 12)}` : '';
  return `${base}/${key.split('/').map(encodeURIComponent).join('/')}${version}`;
}

/**
 * `--prune` của tools/media-push.mjs xoá trên R2 mọi object không còn trong `media/files/`. Phép trừ đó
 * chỉ đúng khi máy đang chạy giữ **bản gốc** của kho media — mà file nặng không nằm trong git
 * (`.gitignore` chặn `/media/files/*`), nên máy vừa clone về luôn có thư mục rỗng, và ở đó "xoá những gì
 * không còn" nghĩa là xoá sạch kho của cả nhóm. Không hoàn tác được, và chỉ cần phạm một lần.
 *
 * Hai dáng của cùng một sai lầm, đều là "thư mục dưới máy không phải bản gốc":
 *   rỗng hẳn        — máy vừa clone, chưa bao giờ có file nặng nào
 *   có vài file     — vừa bỏ một mẫu giọng mới vào để đẩy lên, không phải toàn bộ kho
 *
 * Trả về lý do từ chối, hoặc null khi lượt prune này hợp lý (xoá ít hơn số file đang giữ = đúng dáng
 * "vừa bỏ đi vài file khỏi bản gốc").
 */
export function pruneGuard({ local, orphans }) {
  if (!orphans) return null;
  if (!local) return `media/files/ đang rỗng, nên "xoá những gì không còn trong đó" là xoá sạch ${orphans} object trên R2`;
  if (orphans > local) return `sẽ xoá ${orphans} object trên R2 trong khi máy này chỉ giữ ${local} file`;
  return null;
}

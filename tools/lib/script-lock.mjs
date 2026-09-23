/**
 * Phần LOGIC THUẦN của cổng khoá wording: đọc file delta của owner, áp vào `cues.js`, và so lời
 * hiện tại với hash đã khoá. Tách khỏi `tools/script-lock.mjs` để test được mà không cần một video.
 *
 * ── Vì sao có cổng này (retro d05-v06, F2 — friction đắt thứ nhì) ─────────────────────────────
 * Owner sửa lời ở bước "khoá wording" rồi KHÔNG chạy lại gate. Hậu quả dây chuyền: cue 80 vượt 9 s
 * → lane VOICE phải tách cue → 132 ≠ 133 cue → mọi tham chiếu `cues: [n]` trong `storyboard.json`
 * lệch số → hai lane cùng đi sửa tay. Một lệnh `text-gate` ở đúng chỗ đó thì chặn được cả chuỗi.
 *
 * Từ nay khoá wording KHÔNG phải một thao tác sửa file, mà là một LỆNH có gate: sửa → chấm →
 * (đỏ thì TỪ CHỐI) → ghi `script.lock.json`. `voice-export` đọc file lock đó và cảnh báo nếu lời
 * đã trôi khỏi bản được khoá, trước khi tiêu một lượt GPU.
 */
import crypto from 'node:crypto';

/** Hash rút gọn của một chuỗi lời — cùng công thức `voice-export.mjs` dùng cho `gen-manifest.json`. */
export const hashText = (text) => crypto.createHash('sha256').update(String(text ?? ''), 'utf8').digest('hex').slice(0, 16);

/**
 * Bóc delta từ markdown của owner. Khuôn mỗi mục — ĐỌC ĐƯỢC BẰNG MẮT, và cố ý không phải JSON:
 * owner viết tay file này giữa lúc đang đọc to bản script.
 *
 *     ## cue 80
 *     > lời mới ở đây, nguyên văn
 *     lý do: câu cũ dài quá một hơi
 *
 * Hoặc neo theo CỤM TỪ thay vì số (bền hơn khi cue bị tách/gộp — chính ca F2):
 *
 *     ## anchor: phần khó nhất có giả bằng tay
 *     > lời mới
 *
 * Trả `[{ where: {cue|anchor}, text, why }]`. Mục không có dòng `>` nào bị bỏ qua có chủ đích —
 * owner hay để lại ghi chú trống khi đang soạn dở.
 */
export function parseDelta(md) {
  const out = [];
  if (!md) return out;
  for (const block of String(md).split(/^##\s+/m).slice(1)) {
    const head = block.split('\n', 1)[0].trim();
    const body = block.slice(head.length);
    const text = body.split('\n').filter((l) => /^\s*>/.test(l)).map((l) => l.replace(/^\s*>\s?/, '')).join(' ').trim();
    if (!text) continue;
    const why = body.match(/^\s*(?:lý do|ly do|vì|reason)\s*:\s*(.+)$/im)?.[1]?.trim() || '';
    const n = head.match(/^cue\s+(\d+)/i);
    const a = head.match(/^anchor\s*:\s*(.+)$/i);
    if (n) out.push({ where: { cue: Number(n[1]) }, text, why });
    else if (a) out.push({ where: { anchor: a[1].trim() }, text, why });
    else out.push({ where: { unknown: head }, text, why });
  }
  return out;
}

/**
 * Áp delta lên nguồn `cues.js` bằng phép thay chuỗi CÓ NEO, không parse-rồi-in-lại: in lại sẽ xoá
 * hết comment và định dạng mà lane script đã đặt, và `cues.js` là file người đọc.
 *
 * `cues` = mảng đã import (`CUES`/`RAW`), dùng để giải anchor → số cue và để kiểm tồn tại.
 * Trả `{ src, applied, problems }`. KHÔNG ghi file — người gọi quyết định.
 */
export function applyDelta(src, cues, delta) {
  const problems = [];
  const applied = [];
  let out = String(src);
  for (const d of delta) {
    let n = d.where.cue;
    if (d.where.anchor) {
      const hits = cues.filter((c) => String(c.text || '').includes(d.where.anchor));
      if (hits.length === 0) { problems.push(`anchor "${d.where.anchor}": không cue nào chứa cụm này`); continue; }
      if (hits.length > 1) { problems.push(`anchor "${d.where.anchor}": khớp ${hits.length} cue (${hits.map((c) => c.n).join(', ')}) — neo phải là duy nhất`); continue; }
      n = hits[0].n;
    }
    if (d.where.unknown !== undefined) { problems.push(`mục "## ${d.where.unknown}": phải là \`## cue <n>\` hoặc \`## anchor: <cụm từ>\``); continue; }
    const cue = cues.find((c) => c.n === n);
    if (!cue) { problems.push(`cue ${n}: không có trong cues.js`); continue; }
    const old = String(cue.text ?? '');
    if (old === d.text) { applied.push({ n, text: d.text, why: d.why, noop: true }); continue; }

    // Neo phép thay vào ĐÚNG entry của cue n: tìm khối `{ … n: <n>, … }` rồi đổi `text:` trong đó.
    const block = blockOfCue(out, n);
    if (!block) { problems.push(`cue ${n}: không định vị được entry trong nguồn cues.js`); continue; }
    const replaced = block.slice.replace(/(\btext:\s*)(['"])((?:[^\\]|\\.)*?)\2/, (_m, k, q) => `${k}${q}${escapeFor(q, d.text)}${q}`);
    if (replaced === block.slice) { problems.push(`cue ${n}: không thấy trường \`text:\` để thay`); continue; }
    out = out.slice(0, block.start) + replaced + out.slice(block.end);
    applied.push({ n, from: old, text: d.text, why: d.why });
  }
  return { src: out, applied, problems };
}

/** Khối nguồn của một cue: từ `{` mở entry tới `}` đóng nó, định vị bằng `n: <số>,`. */
function blockOfCue(src, n) {
  const m = new RegExp(String.raw`\n\s*\{[^{}]*?\bn:\s*${n}\s*,[\s\S]*?\n\s*\},`).exec(src);
  if (!m) return null;
  return { start: m.index, end: m.index + m[0].length, slice: m[0] };
}

const escapeFor = (quote, text) => String(text).replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), `\\${quote}`);

/** Bản khoá: hash lời từng cue + số cue. `at` do người gọi truyền vào (lấy bằng `date`, không bịa). */
export function makeLock(cues, { video, at, note } = {}) {
  return {
    $doc: 'Bản lời ĐÃ KHOÁ. Sinh bởi tools/script-lock.mjs sau khi mọi gate chữ xanh. Đừng sửa tay — sửa lời thì chạy lại lệnh đó với một file delta.',
    video: video ?? null,
    at: at ?? null,
    note: note ?? null,
    cues: cues.length,
    hash: Object.fromEntries(cues.map((c) => [String(c.n), hashText(c.text)])),
  };
}

/**
 * So lời hiện tại với bản đã khoá. Trả `{ locked, changed, added, removed }`.
 * `voice-export` gọi hàm này để cảnh báo TRƯỚC khi tiêu một lượt GPU cho lời chưa được duyệt.
 */
export function compareLock(lock, cues) {
  if (!lock || !lock.hash) return { locked: false, changed: [], added: [], removed: [] };
  const now = new Map(cues.map((c) => [String(c.n), hashText(c.text)]));
  const changed = [];
  const removed = [];
  for (const [n, h] of Object.entries(lock.hash)) {
    if (!now.has(n)) removed.push(Number(n));
    else if (now.get(n) !== h) changed.push(Number(n));
  }
  const added = [...now.keys()].filter((n) => !(n in lock.hash)).map(Number);
  return { locked: true, changed, added, removed };
}

#!/usr/bin/env node
/**
 * Trộn SFX vào track lời rồi xuất một file mới, để `render.mjs --audio <file>` dùng như thường.
 *
 *   node tools/sfx-mix.mjs --video demo-ai-history-three-turns --out voice-sfx.wav [--db -6] [--dry]
 *
 * Vì sao là bước riêng chứ không nhét vào render.mjs: SFX là quyết định về MỘT video (chỗ nào đáng
 * nhấn), còn nhạc nền là thuộc tính của cả bản render. Tách ra thì nghe thử và sửa vị trí không phải
 * render lại 5 phút.
 *
 * ── HAI CHẾ ĐỘ ────────────────────────────────────────────────────────────────────────────────
 * `cổ điển`  — video KHÔNG khai `sfx`/`ambience` nào trong `projects/<id>/storyboard.json`.
 *              Chạy đúng luật cũ, đúng chuỗi filter cũ: một mức gain chung, `LEAD_FRAMES = 6` cho
 *              mọi tiếng, không duck, không pan, không limiter. 10 video đã render không được đổi
 *              một tiếng nào vì file này bị sửa — `--dry` của chúng phải giống hệt trước/sau.
 * `phân lớp` — storyboard có khai. Mở khoá toàn bộ phần dưới đây.
 *
 * ── BỐN LỚP (`sfx.json._layers`) ──────────────────────────────────────────────────────────────
 * Luật cũ "tối đa 4 tiếng nhấn mỗi video" của Thái là ĐÚNG, nhưng nó nhốt chung hai thứ khác hẳn
 * nhau: tiếng để KÉO SỰ CHÚ Ý và tiếng của CHÍNH chuyển động trên hình. Video demo 4:46 với 21 cảnh
 * animation dày chỉ được 9 tiếng — hình diễn nhiều mà tai gần như không nghe thấy gì.
 *
 *   accent      ding · pop · ting · flash — kéo sự chú ý. Trần CỨNG 4/video, giữ nguyên.
 *   transition  whoosh · riser — ranh giới chương/section.
 *   foley       tiếng của chính chuyển động (dấu đóng, giấy, tách, khớp, khắc). Nhỏ, khô, DƯỚI lời.
 *               Không tính vào trần accent, nhưng có ngân sách mật độ (`maxPerMinute`).
 *   ambience    bed rất nhỏ theo CẢNH, có fade. Đặt không khí, không phải một sự kiện.
 *
 * ── VỊ TRÍ LẤY TỪ ĐÂU ─────────────────────────────────────────────────────────────────────────
 *   1. `whoosh-long` frame 0 — mở màn, luôn có.
 *   2. `whoosh` ở cue đầu của MỖI section (bỏ section đầu, đã có whoosh-long).
 *   3. `cues.js` cue nào khai `sfx: { id, word }` — cách cũ, vẫn chạy.
 *   4. `storyboard.json` beat nào khai `sfx: { id, gainDb?, pan?, burst? }` — cách MỚI, và là chỗ
 *      đúng: beat ở đó đã khai `anchor` (cụm từ) + `cue`, tức là cùng một mốc mà HÌNH đang neo vào.
 *   5. `storyboard.json` cảnh nào khai `ambience: { id, gainDb?, fadeSec? }` — bed của cả cảnh.
 *
 * Frame của một beat = `cue.startFrame + spokenAt(cue, anchor)` — ĐÚNG phép tính mà `beatT()` của
 * `lib/poster/stage.jsx` làm lúc render (nó cộng thêm một bước đổi sang giây authored, nhưng mốc
 * frame toàn cục thì chung). `tools/sfx-mix.test.mjs` so `voice.cues.json[i].startFrame` với
 * `TIMELINE[i].start` để phép nhân bản đó không âm thầm phân kỳ.
 *
 * ── CĂN ĐỈNH, KHÔNG CĂN ĐẦU FILE ──────────────────────────────────────────────────────────────
 * Chế độ cổ điển phát sớm `LEAD_FRAMES = 6` frame cho MỌI tiếng. Nhưng đỉnh của `whoosh-long` nằm ở
 * 798ms còn đỉnh của `tick` ở 5ms — cùng một lead thì một trong hai lệch nửa giây. Chế độ phân lớp
 * đặt file sao cho `peakAtMs` (đo sẵn trong catalog) rơi đúng vào mốc hình.
 *
 * ── TRỘN ──────────────────────────────────────────────────────────────────────────────────────
 * Mọi tiếng quy về ĐÍCH của lớp nó (`peakTargetDb` cho one-shot, `rmsTargetDb` cho bed) trước khi
 * cộng `--db` — nếu không, một bản thu to sẽ hét lên giữa các tiếng khác dù khai cùng lớp. Chuẩn
 * theo ĐỈNH chứ không theo RMS: `snap` có RMS −46 dB chỉ vì 0,7 s phần lớn là lặng, chuẩn theo RMS
 * thì nó bị khuếch lên +26 dB. Tiếng rơi vào lúc ĐANG CÓ LỜI tự hạ thêm `duckDb` của lớp (tính tất
 * định từ `speechFrames` trong `voice.cues.json`, không cần sidechain thật). Pan tối đa ±0,3. Cả bus
 * SFX đi qua một limiter TRƯỚC khi gặp lời, và mix cuối qua một limiter chống clipping.
 *
 * LỜI KHÔNG BỊ ĐỘNG VÀO: track lời vào `amix` ở đúng unity gain, `normalize=0`. Đo trên 24 cue lời
 * không có tiếng nào ±2 s: LUFS trước/sau đều −16,2 (21/09/2026). `--stem` xuất riêng bus SFX để đo.
 *
 * Xuất kèm `<out>.cuesheet.md` (hoặc `--cuesheet <file>`): timecode · cảnh · beat · tiếng · lớp ·
 * gain thực · có đè lời không — để đọc nhanh mà không phải nghe hết.
 *
 * Exit: 0 xanh · 1 vi phạm luật (trần accent, mật độ foley) hoặc ffmpeg lỗi · 2 sai cách gọi.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FPS = 30;
/** Chế độ cổ điển: phát sớm 6 frame (0,2 s) cho mọi tiếng. Chế độ phân lớp dùng `peakAtMs` thay. */
const LEAD_FRAMES = 6;
const MAX_ACCENTS = 4;
/** Mức đích của từng lớp nằm ở `sfx.json._layers`, không hằng số hoá ở đây. */
/** Trần pan — quá ±0,3 thì một tiếng nhỏ nhảy hẳn sang một tai, nghe thành lỗi chứ không thành không gian. */
const PAN_CAP = 0.3;

const args = {};
for (let i = 2; i < process.argv.length; i += 1) {
  const a = process.argv[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const next = process.argv[i + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else { args[key] = next; i += 1; }
  }
}

const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const usage = `Trộn SFX vào track lời theo LỚP (accent · transition · foley · ambience).

  node tools/sfx-mix.mjs --video <id> --out <file.wav> [--db -6] [--dry] [--json]
                         [--cuesheet <file.md>] [--stem <file.wav>] [--no-duck] [--legacy]

  --dry       chỉ in danh sách tiếng + gain, không gọi ffmpeg
  --db        mức nền chung, mặc định -6 (âm = nhỏ hơn)
  --legacy    ép chạy luật cũ kể cả khi storyboard có khai lớp
  --no-duck   bỏ phần tự hạ tiếng khi đang có lời (để so A/B)
  --cuesheet  nơi ghi cuesheet; mặc định <out>.cuesheet.md
  --stem      xuất RIÊNG bus SFX (không lời) để đo độ nổi so với lời

exit 0 xanh · 1 vi phạm luật hoặc ffmpeg lỗi · 2 sai cách gọi`;
if (args.help || args.h) { console.log(usage); process.exit(0); }
if (!args.video || args.video === true) { console.error(usage); process.exit(2); }

const videoId = String(args.video);
const voiceDir = path.join(REPO, 'voice/out', videoId);
const cuesJson = path.join(voiceDir, 'voice.cues.json');
const voiceWav = args.audio ? path.resolve(String(args.audio)) : path.join(voiceDir, 'voice.wav');
const sceneCues = path.join(REPO, 'vinuni-lesson-video-ds/ui_kits/lesson-video/videos', videoId, 'cues.js');
for (const f of [cuesJson, voiceWav, sceneCues]) if (!fs.existsSync(f)) fail(`không thấy ${path.relative(REPO, f)}`);

const catalogRaw = JSON.parse(fs.readFileSync(path.join(REPO, 'sfx.json'), 'utf8'));
const catalog = catalogRaw.sfx;
const LAYERS = catalogRaw._layers || {};
const byId = new Map(catalog.map((s) => [s.id, s]));
const entryOf = (id) => {
  const s = byId.get(id);
  if (!s) fail(`sfx.json không có id "${id}"`);
  return s;
};
const fileOf = (id) => {
  const s = entryOf(id);
  const f = path.join(REPO, 'assets/sfx', s.file);
  if (!fs.existsSync(f)) fail(`thiếu ${path.relative(REPO, f)} — chạy \`node tools/sfx-fetch.mjs --only ${id}\``);
  return f;
};

const timing = JSON.parse(fs.readFileSync(cuesJson, 'utf8')).cues;
const timingByN = new Map(timing.map((t) => [t.n, t]));
const mod = await import(pathToFileURL(sceneCues).href);
const sceneCueList = mod.CUES ?? mod.default;
const sceneById = new Map(sceneCueList.map((c) => [c.n, c]));
const spokenAt = mod.spokenAt;

const sbFile = path.join(REPO, 'projects', videoId, 'storyboard.json');
const storyboard = fs.existsSync(sbFile) ? JSON.parse(fs.readFileSync(sbFile, 'utf8')) : null;
const declaresLayers = Boolean(storyboard?.scenes?.some((s) => s.ambience || (s.beats || []).some((b) => b.sfx)));
const layered = declaresLayers && !args.legacy;

// ── chọn vị trí ───────────────────────────────────────────────────────────────
// Ba nguồn đầu giống hệt chế độ cổ điển, để một video đang chạy luật cũ không đổi một tiếng nào khi
// nó bắt đầu khai thêm beat trong storyboard.
/**
 * Một beat trong `storyboard.json` ĐÈ lên khai báo `sfx:` của chính cue+cụm từ đó trong `cues.js`.
 * Nhờ vậy migration sang chế độ phân lớp không phải sửa `cues.js` — file đó đang bị `cuesSha256`
 * trong `voice.cues.json` canh, và wording của nó đã khoá.
 */
const overridden = new Set();
if (declaresLayers) {
  for (const sc of storyboard.scenes) {
    for (const b of sc.beats || []) if (b.sfx) overridden.add(`${b.cue}\u0000${b.anchor}`);
  }
}

const hits = [{ frame: 0, id: 'whoosh-long', why: 'mở màn' }];
let lastSection = null;
for (const t of timing) {
  const c = sceneById.get(t.n) || {};
  const frame = Math.max(0, t.startFrame - LEAD_FRAMES);
  if (layered && c.sfx && typeof c.sfx === 'object' && overridden.has(`${t.n}\u0000${c.sfx.word}`)) {
    // storyboard đã khai cho đúng mốc này — bỏ bản cũ, không để hai tiếng chồng lên nhau.
  } else if (c.sfx) {
    // Dạng { id, word }: căn theo lúc ĐỌC TỚI chữ đó, không phải đầu cue — hiệu ứng trên hình cũng
    // bám spokenAt nên tiếng và hình mới rơi cùng chỗ.
    const id = typeof c.sfx === 'string' ? c.sfx : c.sfx.id;
    const at = typeof c.sfx === 'string' || !c.sfx.word
      ? frame
      : Math.max(0, t.startFrame + spokenAt(t.n, c.sfx.word) - LEAD_FRAMES);
    hits.push({ frame: at, id, why: `cue ${t.n}${c.sfx.word ? ` · "${c.sfx.word}"` : ''}` });
  } else if (c.section && c.section !== lastSection && lastSection !== null) {
    hits.push({ frame, id: 'whoosh', why: `vào section "${c.section}"` });
  }
  if (c.section) lastSection = c.section;
}

/** Bed của một cảnh: từ frame đầu cue đầu tới hết cue cuối của cảnh đó. */
const beds = [];
if (layered) {
  for (const sc of storyboard.scenes) {
    for (const b of sc.beats || []) {
      if (!b.sfx) continue;
      const decl = typeof b.sfx === 'string' ? { id: b.sfx } : b.sfx;
      /*
       * Beat có thể KHÔNG khai `cue`: storyboard của video mới tham chiếu theo ANCHOR, vì số cue
       * chạy mỗi lần kịch bản chèn/bỏ một câu (vòng 2 chèn 26 cue vào giữa phim). Tìm đúng cách
       * `beatT()` tìm lúc render: cue ĐẦU TIÊN của chính cảnh đó chứa cụm từ.
       */
      let t = b.cue != null ? timingByN.get(Number(b.cue)) : null;
      if (b.cue == null) {
        t = [...timingByN.values()].find((x) => x.scene === sc.id && String(x.text || '').includes(String(b.anchor)))
          || sceneCueList.filter((c) => c.scene === sc.id && String(c.text || '').includes(String(b.anchor)))
            .map((c) => timingByN.get(c.n)).find(Boolean);
        if (!t) fail(`cảnh "${sc.id}" · beat "${b.anchor}": không cue nào của cảnh chứa cụm từ này`);
      }
      if (!t) fail(`cảnh "${sc.id}" · beat "${b.anchor}" khai cue ${b.cue} — voice.cues.json không có cue đó`);
      let at;
      try { at = t.startFrame + spokenAt(t.n, String(b.anchor)); } catch (e) { fail(`cảnh "${sc.id}": ${e.message}`); }
      // `offsetMs`: dịch so với mốc lời. Âm = trước. Dùng cho riser (phải căng dần TỚI cú nhấn) và
      // cho tiếng đi kèm một chuyển động bắt đầu sau khi câu đã đọc xong.
      at += Math.round(((Number(decl.offsetMs) || 0) / 1000) * FPS);
      const n = Math.max(1, Number(decl.burst?.count ?? 1));
      const spacing = Number(decl.burst?.spacingMs ?? 0);
      // `burst.ramp`: hệ số nhân khoảng cách giữa hai tiếng liên tiếp. <1 là dồn nhanh dần (chuỗi
      // "tách" của cảnh bùng nổ tổ hợp), >1 là thưa dần.
      const ramp = Number(decl.burst?.ramp ?? 1);
      let offMs = 0;
      let gap = spacing;
      for (let k = 0; k < n; k += 1) {
        hits.push({
          frame: Math.max(0, at + Math.round((offMs / 1000) * FPS)),
          id: decl.id,
          why: `${sc.id} · "${b.anchor}"${n > 1 ? ` (${k + 1}/${n})` : ''}`,
          scene: sc.id,
          anchor: b.anchor,
          gainDb: decl.gainDb,
          pan: decl.pan,
          burst: n > 1,
          burstIndex: n > 1 ? k : null,
        });
        offMs += gap;
        gap *= ramp;
      }
    }
    if (sc.ambience) {
      const decl = typeof sc.ambience === 'string' ? { id: sc.ambience } : sc.ambience;
      // `cues` có thể vắng: storyboard mới khai phạm vi cảnh bằng cụm từ, không bằng số. Lấy
      // thẳng từ `cues.js` theo id cảnh — nguồn đó mới là chỗ nói cue nào thuộc cảnh nào.
      const cueNums = (sc.cues && sc.cues.length)
        ? sc.cues.map(Number)
        : sceneCueList.filter((c) => c.scene === sc.id).map((c) => c.n);
      const cues = cueNums.map((n) => timingByN.get(Number(n))).filter(Boolean);
      if (!cues.length) fail(`cảnh "${sc.id}" khai ambience nhưng không có cue nào đo được`);
      const from = cues[0].startFrame;
      const to = cues[cues.length - 1].endFrame;
      beds.push({
        id: decl.id, scene: sc.id, frame: from, frames: to - from,
        gainDb: decl.gainDb, fadeSec: Number(decl.fadeSec ?? 1.2),
      });
    }
  }
}

// ── luật giữ nhịp ─────────────────────────────────────────────────────────────
const layerOf = (h) => entryOf(h.id).layer || (h.id === 'ding' || h.id === 'pop' ? 'accent' : 'transition');
const accents = hits.filter((h) => layerOf(h) === 'accent').length;
if (accents > MAX_ACCENTS) fail(`${accents} tiếng nhấn (lớp accent) — trần là ${MAX_ACCENTS}. Bỏ bớt \`sfx\` accent trong storyboard.json/cues.js.`);

const lastFrame = timing.length ? timing[timing.length - 1].endFrame : 0;
const minutes = Math.max(1 / 60, lastFrame / FPS / 60);
const foley = hits.filter((h) => layerOf(h) === 'foley');
/**
 * Ngân sách mật độ đếm một CHUỖI CÓ CHỦ ĐÍCH là MỘT sự kiện. Chuỗi "tách" dồn nhịp của cảnh bùng nổ
 * tổ hợp là 14 tiếng trong 3 giây, nhưng tai nghe ra đúng một thứ đang xảy ra; đếm nó thành 14 thì
 * ngân sách chặn mất chính hiệu ứng mà sếp thiết kế. Cái ngân sách này canh là "rải bừa tiếng lẻ".
 */
const foleyEvents = foley.filter((h) => !h.burst || h.burstIndex === 0).length;
const foleyPerMin = foleyEvents / minutes;
const foleyCap = LAYERS.foley?.maxPerMinute ?? Infinity;
if (foleyPerMin > foleyCap) fail(`foley ${foleyPerMin.toFixed(1)} sự kiện/phút — ngân sách là ${foleyCap}. Bỏ bớt beat có \`sfx\` lớp foley.`);

// ── gain từng tiếng ───────────────────────────────────────────────────────────
const baseDb = Number(args.db ?? -6);
/** Khoảng lời thật của từng cue — dùng để biết một tiếng có rơi đè lên lời không. */
const speech = timing.filter((t) => !t.silent && t.speechFrames > 0)
  .map((t) => [t.startFrame, t.startFrame + t.speechFrames]);
const overSpeech = (f) => speech.some(([a, b]) => f >= a && f < b);

/**
 * Độ lợi đưa một tiếng về ĐÍCH của lớp nó. One-shot chuẩn theo đỉnh, bed chuẩn theo RMS —
 * xem `sfx.json._layers._doc` cho lý do.
 */
const toTarget = (e, L) => {
  if (Number.isFinite(L.peakTargetDb) && Number.isFinite(e.peak)) return L.peakTargetDb - e.peak;
  if (Number.isFinite(L.rmsTargetDb) && Number.isFinite(e.rmsDb)) return L.rmsTargetDb - e.rmsDb;
  return 0;
};
/**
 * Duck của cả một chuỗi burst lấy theo tiếng ĐẦU chuỗi. Tính riêng từng tiếng thì một chuỗi
 * "tạch tạch" vắt qua chỗ lời dứt sẽ nhảy 7 dB giữa chừng — nghe ra ngay là lỗi.
 */
const burstHead = new Map();
for (const h of hits) if (h.burst && h.burstIndex === 0) burstHead.set(`${h.scene}\u0000${h.anchor}\u0000${h.id}`, h.frame);

for (const h of hits) {
  const e = entryOf(h.id);
  h.layer = layerOf(h);
  const L = LAYERS[h.layer] || {};
  h.norm = toTarget(e, L);
  const duckFrame = h.burst ? (burstHead.get(`${h.scene}\u0000${h.anchor}\u0000${h.id}`) ?? h.frame) : h.frame;
  h.duck = !layered || args['no-duck'] ? 0 : (overSpeech(duckFrame) ? (L.duckDb ?? 0) : 0);
  h.onSpeech = overSpeech(duckFrame);
  h.db = layered
    ? baseDb + (e.gainDb ?? 0) + (Number(h.gainDb) || 0) + h.norm + h.duck
    : baseDb;
  // Chế độ phân lớp căn ĐỈNH tiếng vào mốc hình; chế độ cổ điển đã trừ LEAD_FRAMES ở trên rồi.
  h.startFrame = layered
    ? Math.max(0, h.frame - Math.round(((e.peakAtMs ?? 0) / 1000) * FPS))
    : h.frame;
  h.panPos = Math.max(-PAN_CAP, Math.min(PAN_CAP, Number(h.pan) || 0));
}
for (const b of beds) {
  const e = entryOf(b.id);
  const L = LAYERS.ambience || {};
  b.layer = 'ambience';
  b.norm = toTarget(e, L);
  b.onSpeech = false;
  b.db = baseDb + (e.gainDb ?? 0) + (Number(b.gainDb) || 0) + b.norm;
}

const all = [...hits, ...beds].sort((a, b) => a.frame - b.frame);
const tc = (f) => `${String(Math.floor(f / FPS / 60)).padStart(2, '0')}:${String(Math.floor((f / FPS) % 60)).padStart(2, '0')}.${String(Math.round((f % FPS) * (100 / FPS))).padStart(2, '0')}`;

if (args.json) {
  console.log(JSON.stringify({ video: videoId, mode: layered ? 'phân lớp' : 'cổ điển', baseDb, accents, foleyPerMin, hits, beds }, null, 2));
} else {
  console.log(`${videoId} · chế độ ${layered ? 'PHÂN LỚP' : 'cổ điển'} · ${hits.length} tiếng${beds.length ? ` + ${beds.length} bed` : ''} · gain nền ${baseDb} dB`);
  if (layered) console.log(`  accent ${accents}/${MAX_ACCENTS} · foley ${foley.length} tiếng / ${foleyEvents} sự kiện (${foleyPerMin.toFixed(1)}/phút, trần ${foleyCap}) · transition ${hits.filter((h) => h.layer === 'transition').length} · ambience ${beds.length}`);
  for (const h of all) {
    const dur = h.frames ? ` ${(h.frames / FPS).toFixed(1)}s` : '';
    console.log(`  f${String(h.frame).padStart(5)} · ${tc(h.frame)} · ${String(h.layer).padEnd(10)} ${h.id.padEnd(12)}${(h.db).toFixed(1).padStart(6)} dB${h.onSpeech ? ' ·đè lời' : '        '}${dur}  ${h.why || h.scene}`);
  }
}
if (args.dry) process.exit(0);
if (!args.out) fail('thiếu --out');

// ── trộn ──────────────────────────────────────────────────────────────────────
const require = createRequire(import.meta.url);
let ffmpeg = process.env.FFMPEG;
if (!ffmpeg) { try { ffmpeg = require('ffmpeg-static'); } catch { ffmpeg = 'ffmpeg'; } }

const gainOf = (db) => (10 ** (db / 20)).toFixed(4);
/** `asplit` chỉ được tách khi có người lấy nhánh thứ hai — ffmpeg từ chối một output không ai nối. */
const wantStem = Boolean(args.stem && args.stem !== true);
const inputs = ['-i', voiceWav];
const chains = [];
const labels = ['[0:a]'];

if (!layered) {
  // Chuỗi filter cổ điển, giữ NGUYÊN VĂN: ba video cũ phải cho ra đúng file như trước khi sửa.
  const gain = gainOf(baseDb);
  hits.forEach((h, i) => {
    inputs.push('-i', fileOf(h.id));
    const ms = Math.round((h.startFrame / FPS) * 1000);
    chains.push(`[${i + 1}:a]adelay=${ms}|${ms},volume=${gain}[s${i}]`);
    labels.push(`[s${i}]`);
  });
  chains.push(`${labels.join('')}amix=inputs=${labels.length}:duration=first:dropout_transition=0:normalize=0[aout]`);
} else {
  const sfxLabels = [];
  let idx = 0;
  for (const h of hits) {
    idx += 1;
    inputs.push('-i', fileOf(h.id));
    const ms = Math.round((h.startFrame / FPS) * 1000);
    const steps = [`volume=${gainOf(h.db)}`];
    if (h.panPos) {
      // Pan công suất không đổi: lệch sang một bên không làm tiếng to/nhỏ đi.
      const a = ((h.panPos + 1) * Math.PI) / 4;
      steps.push(`pan=stereo|c0=${Math.cos(a).toFixed(4)}*c0|c1=${Math.sin(a).toFixed(4)}*c1`);
    }
    steps.push(`adelay=${ms}|${ms}`);
    chains.push(`[${idx}:a]${steps.join(',')}[s${idx}]`);
    sfxLabels.push(`[s${idx}]`);
  }
  for (const b of beds) {
    idx += 1;
    // `-stream_loop -1` để một bed 20–30 giây phủ được một cảnh dài hơn nó; `atrim` cắt về đúng cảnh.
    inputs.push('-stream_loop', '-1', '-i', fileOf(b.id));
    const ms = Math.round((b.frame / FPS) * 1000);
    const sec = b.frames / FPS;
    const fade = Math.min(b.fadeSec, sec / 3);
    chains.push(`[${idx}:a]atrim=0:${sec.toFixed(3)},asetpts=PTS-STARTPTS,volume=${gainOf(b.db)},afade=t=in:st=0:d=${fade.toFixed(2)},afade=t=out:st=${(sec - fade).toFixed(2)}:d=${fade.toFixed(2)},adelay=${ms}|${ms}[s${idx}]`);
    sfxLabels.push(`[s${idx}]`);
  }
  // Cả bus SFX gặp limiter TRƯỚC khi gặp lời: một chuỗi burst chồng nhau không được cộng dồn thành
  // một cú đập. Lời không đi qua limiter này nên mức lời không đổi một chút nào.
  chains.push(`${sfxLabels.join('')}amix=inputs=${sfxLabels.length}:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.35:attack=3:release=60:level=disabled${wantStem ? ',asplit=2[sfxbus][sfxstem]' : '[sfxbus]'}`);
  // Limiter cuối chỉ để chống clipping (lời đã chạm 0 dBFS sẵn). `--check-speech` đo lại LUFS của
  // các đoạn lời KHÔNG có tiếng nào để chứng minh nó không dịch mức lời.
  chains.push(`[0:a][sfxbus]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.966:attack=2:release=40:level=disabled[aout]`);
}

const out = path.resolve(String(args.out));
fs.mkdirSync(path.dirname(out), { recursive: true });
// `--stem`: xuất RIÊNG bus SFX (không có lời). Đây là cách duy nhất đo được "tiếng này có nổi lên
// khỏi lời không" bằng số — đo trên bản đã trộn thì mọi cửa sổ đều bị lời chiếm hết.
const stem = args.stem && args.stem !== true ? ['-map', '[sfxstem]', '-ar', '48000', '-ac', '2', path.resolve(String(args.stem))] : [];
if (stem.length && !layered) fail('--stem chỉ có ở chế độ phân lớp (chế độ cổ điển không tách bus SFX)');
const r = spawnSync(ffmpeg, ['-y', '-v', 'error', ...inputs, '-filter_complex', chains.join(';'), '-map', '[aout]', '-ar', '48000', '-ac', '2', out, ...stem], { stdio: 'inherit' });
if (r.status !== 0) fail('ffmpeg lỗi');
console.log(`→ ${path.relative(REPO, out)}`);
if (stem.length) console.log(`→ ${path.relative(REPO, path.resolve(String(args.stem)))} (chỉ bus SFX)`);

// ── cuesheet ──────────────────────────────────────────────────────────────────
if (layered || args.cuesheet) {
  const sheet = args.cuesheet && args.cuesheet !== true ? path.resolve(String(args.cuesheet)) : `${out.replace(/\.wav$/, '')}.cuesheet.md`;
  const rows = all.map((h) => `| ${tc(h.frame)} | ${h.scene || '—'} | ${h.anchor || h.why || '—'} | ${h.id} | ${h.layer} | ${h.db.toFixed(1)} | ${h.onSpeech ? 'có' : '—'} | ${h.frames ? `${(h.frames / FPS).toFixed(1)}s` : '—'} |`);
  const perLayer = {};
  for (const h of all) perLayer[h.layer] = (perLayer[h.layer] || 0) + 1;
  fs.writeFileSync(sheet, `# Cuesheet SFX — ${videoId}

Sinh bởi \`node tools/sfx-mix.mjs --video ${videoId}\` · chế độ **${layered ? 'phân lớp' : 'cổ điển'}** · gain nền ${baseDb} dB.
Thời lượng ${(lastFrame / FPS / 60).toFixed(2)} phút · ${hits.length} tiếng + ${beds.length} bed.

| lớp | số sự kiện | mật độ (/phút) |
|---|---|---|
${Object.entries(perLayer).map(([k, v]) => `| ${k} | ${v} | ${(v / minutes).toFixed(1)} |`).join('\n')}

\`gain thực\` đã gồm: gain nền (${baseDb} dB) + bù về đích của lớp + gain riêng của tiếng + duck khi đè lời.
Mật độ foley tính theo SỰ KIỆN (một chuỗi \`burst\` là một sự kiện): **${foleyEvents} sự kiện · ${foleyPerMin.toFixed(1)}/phút** (ngân sách ${foleyCap}).

| timecode | cảnh | mốc | tiếng | lớp | gain thực (dB) | đè lời | dài |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}
`);
  console.log(`→ ${path.relative(REPO, sheet)}`);
}

#!/usr/bin/env node
/**
 * Soát BỐ CỤC CHỮ và KHUNG CHẾT bằng máy — thay cho các vòng QA bằng mắt.
 *
 *   node tools/qa-layout.mjs --video <id>
 *   node tools/qa-layout.mjs --video <id> --frames 120,240,900
 *   node tools/qa-layout.mjs --video <id> --per-cue 5      (mặc định 3 mốc mỗi cue)
 *   node tools/qa-layout.mjs --video <id> --no-dead        (bỏ phần khung chết)
 *   node tools/qa-layout.mjs --video <id> --json
 *
 * VÌ SAO CÓ FILE NÀY (retro 21/09/2026, E2 + E3). Hai lỗi chồng chữ lọt qua BA vòng QA bằng mắt:
 * brief đòi contact sheet — 47 frame gom vào một ảnh 2800px, mỗi frame còn ~460px, chữ 20px thành
 * 5px. Không mắt nào thấy được. Owner trích một frame 1920×1080 từ MP4 là thấy ngay. Contact sheet
 * chỉ để nhìn BỐ CỤC TỔNG; soát chữ là việc của máy.
 *
 * ── Năm phép đo ───────────────────────────────────────────────────────────────────────────────
 *  1. CHỮ ĐÈ CHỮ       — hai hộp chữ giao nhau > 6px cả hai chiều.
 *  2. CHE              — `elementFromPoint` ở 5 điểm trên đường giữa mỗi dòng chữ trả về một phần
 *                        tử khác đang THỰC SỰ vẽ ra pixel ở đó.
 *  3. MÉP              — chữ cách mép khung < 64px (bị mép cắt thì xem `MÉP KÉO DÀI` bên dưới).
 *  4. NHỎ              — cỡ hiển thị < 22px trên khung 1920×1080.
 *  5. TRÀN HỘP         — chữ VẮT QUA MÉP một mảng đặc: nửa dòng nằm trong một panel, nửa kia
 *                        nằm ngoài. `CHE` không bắt được ca này vì chữ nằm TRÊN mảng, nên
 *                        `elementFromPoint` trả về chính chữ và vòng lặp bỏ qua (`top === el`).
 *                        Ca thật: `c3-sai-kieu-nao`, dòng chú thích vắt qua mép hai bình hứng —
 *                        ba vòng QA xanh, mắt owner thấy ngay (22/09/2026).
 *  6. CHỮ RỘNG HƠN HỘP — dòng chữ rộng hơn CHÍNH cái hộp nền chứa nó (thẻ, panel, pill). `TRÀN
 *                        HỘP` không bắt được ca này: chữ căn giữa tràn ĐỀU hai bên nên ngay dưới
 *                        hai đầu dòng vẫn là NỀN, hai đầu giống nhau. Ở đây tìm hộp nền gần nhất
 *                        bao quanh TÂM dòng chữ rồi so bề ngang. Ca thật: `QUYỀN KIỂM SOÁT` ở
 *                        3:15 rộng hơn thẻ trụ của chính nó (22/09/2026).
 *  7. KHUNG CHẾT       — đoạn > 1s mà tỉ lệ pixel khác nền dưới ngưỡng (đo trên ẢNH, xem bên dưới).
 *
 * ── Đo bề ngang chữ bằng Range, không bằng hộp phần tử ────────────────────────────────────────
 * Một khối căn giữa (`left:0;right:0;text-align:center`) có hộp PHẦN TỬ trải hết khung dù chữ chỉ
 * nằm ở giữa. Đo bằng nó thì phép (3) báo giả MỌI dòng căn giữa. `Range.selectNodeContents` cho
 * đúng bề ngang glyph.
 *
 * ── Bốn bộ lọc báo giả (đều là ca thật đã gặp) ────────────────────────────────────────────────
 *  · `<svg>` bao cả khung là hộp TRONG SUỐT — occlusion thật sẽ báo `path`/`rect`/`circle` con.
 *  · Lớp phủ đang ở opacity ~0 (fade chưa chạy) không che gì cả.
 *  · Phần tử nền trong suốt hoàn toàn và không viền cũng không che.
 *  · Chữ đang phóng to dở (`M.pop` → `transform: scale(p)`) tạm nhỏ hơn cỡ thật, không phải lỗi cỡ.
 *    NHƯNG bộ lọc này từng là một LỖ: nó chỉ hỏi "lúc này có đang nhỏ không", không hỏi "nhỏ trong
 *    bao lâu". Ở `outro`, cả nhóm mũi tên "hôm nay" nằm trong một `transform: scale()` chạy 1 → 0,42
 *    suốt 2,7 giây; hai nhãn bên trong rơi xuống ~10px và ~16px mà gate im lặng vì `settling` đúng ở
 *    MỌI frame. Một nhịp `pop` dài 0,4–0,7s nên chỉ trúng tối đa MỘT frame mẫu (3 mẫu/cue); một cú
 *    thu khung dài mấy giây thì trúng nhiều mẫu. Vì vậy: chữ nhỏ + `settling` không báo ngay, nhưng
 *    nếu CÙNG một chuỗi ở CÙNG một cảnh nhỏ ở ≥2 frame mẫu thì đó không còn là nhịp pop — báo
 *    `NHỎ KÉO DÀI`. Đo bằng cỡ hiển thị THẬT (`font-size` × tích mọi `scale` của tổ tiên).
 *    LỖ THỨ HAI của cùng bộ lọc này (21/09/2026): nó so `scale` TỔNG với 0,95, mà khung dựng poster
 *    bọc cả cảnh trong một `scale(1.2)` cố định (1600×900 → 1920×1080). Nhãn `Pill` cỡ 22px đang
 *    `pop` ở p = 0,80 ra scale tổng 0,96 — lọt lưới `settling`, và gate báo "NHỎ 21,2px" cho đúng
 *    một frame giữa nhịp pop. Vì vậy tách: `scale` tổng để đổi ra px, `own = scale / scale của tổ
 *    tiên ngoài cùng` để hỏi "có đang phóng dở không".
 *  · Hộp chữ bị CHÍNH MÉP KHUNG cắt (x ≤ 0 hoặc phải ≥ 1920) là phần tử đang trượt vào/ra khung, ví
 *    dụ bìa báo cáo Lighthill trượt từ −520px vào 190px trong 1,5s. Ở một frame nó trông y hệt chữ
 *    đặt sát lề. Xử như `NHỎ`: hoãn lại, chỉ báo `MÉP KÉO DÀI` khi còn bị cắt ở ≥2 frame mẫu cùng
 *    cảnh — lúc đó là tràn khung thật.
 *  · Hai text node cha/con của cùng một dòng (`<div>…<span>…</span></div>`) không phải "đè nhau".
 *
 * ── Ngưỡng khung chết: chọn từ số đo thật của video này ────────────────────────────────────────
 * Đo `demo-ai-history-three-turns` (v1, 5.639 frame) bằng chính phép đo dưới đây, vùng nội dung
 * y 0–984 (BỎ thanh phụ đề, vì nó luôn có mặt và luôn đóng góp ~9% pixel khác nền — để nguyên thì
 * không frame nào "chết" cả):
 *     trung vị 9,5% · phân vị 10 = 2,9% · phân vị 5 = 1,3%
 * Chọn ngưỡng **1,2%** — ngay dưới phân vị 5, tức chỉ bắt phần đuôi thật sự trống. Cửa sổ tối thiểu
 * 1,0s (30 frame liên tiếp) để một nhịp lặng cố ý không bị báo.
 * Kiểm lại bằng chính hai chỗ owner đã chỉ đích danh trong retro E3: chạy trên MP4 v1 ra đúng
 * `01:12–01:13` (cuối `bridge-1` sang đầu `CachCu`) và `02:04–02:07` (gần cuối `bridge-2`) —
 * không thêm chỗ nào khác. Ngưỡng bắt đúng thứ nó phải bắt, không hơn.
 * Đổi ngưỡng bằng `--dead-threshold` / `--dead-window`, nhưng đổi thì phải đo lại và ghi lý do.
 *
 * ── OPT-IN theo từng video, và allowlist ──────────────────────────────────────────────────────
 * `<video dir>/qa-layout.json`:
 *     { "enabled": true, "note": "vì sao video này bật",
 *       "allow": [{ "match": "chuỗi con", "reason": "vì sao cố ý" }] }
 *
 * Không có file này thì lệnh KHÔNG chấm (exit 2) — cố ý. Đã chạy thử trên
 * `n5-05-prototype-pilot-mvp-poc`: **656 phát hiện**, gần như toàn bộ là chrome của design system
 * kiểu cũ (watermark 21px sát lề phải 56px, nhãn trục 17–20px). Đó là THIẾT KẾ của DS, không phải
 * lỗi của video. Hai cách xử: nới ngưỡng cho vừa video cũ, hoặc giới hạn phạm vi. Nới ngưỡng thì
 * check mất tác dụng với đúng loại video nó sinh ra để canh (chữ 18–21px chính là chỗ hai lỗi vòng 1
 * nằm). Nên: giữ ngưỡng chặt, bật theo từng video. `--force` để xem thử một video chưa bật.
 *
 * Thiếu `reason` trong `allow` là lỗi cấu hình — một dòng bỏ qua mà không nói lý do thì lần sau
 * không ai dám xoá.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, sleep, waitReady } from './cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DS = path.resolve(ROOT, process.env.VK_DS || 'vinuni-lesson-video-ds');
const FPS = 30;
const SAFE_MARGIN = 64;
const MIN_TEXT_PX = 22;
/**
 * Ngưỡng "coi như không có mặt". Một lớp phủ đang ở opacity ~0 (fade chưa chạy) không che gì cả.
 */
const VISIBLE_MIN = 0.35;
/**
 * Ngưỡng "còn ĐỌC ĐƯỢC" — thấp hơn `VISIBLE_MIN`, và chỉ dùng cho phép CHỮ ĐÈ CHỮ.
 *
 * LỖ ĐÃ CẮN (21/09/2026, owner bắt trên frame trích từ preview, f6943 của video demo). Nhãn `BERT`
 * đang ở `dim = 0.32` — DƯỚI 0,35 nên bị loại khỏi danh sách chữ ngay từ trong trang, và dòng
 * "hồng · xanh lá · xanh dương…" (opacity 0,59) đè lên nó 48×14 px mà gate im lặng. Nhưng chữ kem
 * ở 32% trên nền đêm vẫn đọc được: hai chữ đọc được chồng lên nhau LÀ lỗi, dù một bên đang mờ.
 *
 * 0,25 chọn ngay dưới ca thật 0,32 và trên dải "đang fade vào, chưa thành hình". Một cặp mà CẢ HAI
 * đều ≥ `VISIBLE_MIN` vẫn báo ngay như trước; cặp có một bên mờ thì HOÃN lại và chỉ báo khi thấy ở
 * ≥2 frame mẫu cùng cảnh — cùng lý lẽ với `NHỎ KÉO DÀI`: một frame giữa nhịp fade không kết luận
 * được, một va chạm ở lại mấy giây thì kết luận được.
 */
const FAINT_MIN = 0.25;
const CAPTION_TOP = 984;

const args = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = args.indexOf(`--${n}`);
  return i < 0 ? d : args[i + 1] && !String(args[i + 1]).startsWith('--') ? args[i + 1] : true;
};
const USAGE = `usage: node tools/qa-layout.mjs --video <id> [--scenes <glob,glob>] [--frames a,b,c] [--per-cue 3] [--no-dead] [--json]
  --scenes <glob>  chỉ soát cue thuộc cảnh khớp glob (vd \`c4-*,quiz-*\`). Cả phim mất 2–2,5 phút
                   và từng vượt timeout của lane; một chương thì vài chục giây, và hai lane song
                   song không phải grep xem đỏ nào của ai.`;
if (args.includes('--help') || args.includes('-h')) { console.log(USAGE); process.exit(0); }
const videoId = flag('video');
if (!videoId || videoId === true) {
  console.error(USAGE);
  process.exit(2);
}
const videoDir = path.join(DS, 'ui_kits/lesson-video/videos', String(videoId));
if (!fs.existsSync(videoDir)) {
  console.error(`✗ không thấy ${path.relative(ROOT, videoDir)}`);
  process.exit(2);
}
const base = String(flag('base', 'http://127.0.0.1:8765'));
let deadThreshold = Number(flag('dead-threshold', 0.012));
const deadWindow = Number(flag('dead-window', 30));

// ── opt-in + allowlist ────────────────────────────────────────────────────────────────────────
const cfgFile = path.join(videoDir, 'qa-layout.json');
let cfg = {};
if (fs.existsSync(cfgFile)) cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
if (!cfg.enabled && !args.includes('--force')) {
  console.error(`qa-layout chưa bật cho "${videoId}".`);
  console.error(`  Tạo ${path.relative(ROOT, cfgFile)} với { "enabled": true, "note": "…" } để bật,`);
  console.error('  hoặc --force để xem thử. Video dựng bằng design system kiểu cũ sẽ ra rất nhiều');
  console.error('  phát hiện về cỡ chữ/lề vốn là THIẾT KẾ của DS, không phải lỗi — xem đầu file.');
  process.exit(2);
}
const allow = cfg.allow || [];
const badAllow = allow.filter((a) => !a.match || !a.reason);
if (badAllow.length) {
  console.error(`✗ ${path.relative(ROOT, cfgFile)}: ${badAllow.length} mục allow thiếu "match" hoặc "reason"`);
  process.exit(2);
}
if (cfg.deadThreshold) console.error(`  (ngưỡng khung chết lấy từ qa-layout.json: ${cfg.deadThreshold})`);
const allowed = (msg) => allow.find((a) => msg.includes(a.match));

// ── frame cần soát ────────────────────────────────────────────────────────────────────────────
if (cfg.deadThreshold && !flag('dead-threshold')) deadThreshold = Number(cfg.deadThreshold);

const { TIMELINE } = await import(`${pathToFileURL(path.join(videoDir, 'timeline.js')).href}?t=${Date.now()}`);
const label = new Map();
let frames;
if (flag('frames')) {
  frames = String(flag('frames')).split(',').map(Number).filter(Number.isFinite);
  for (const f of frames) label.set(f, 'chỉ định');
} else {
  const per = Number(flag('per-cue', 3));
  /*
   * `--scenes` lọc theo TRƯỜNG `scene` của cue. Lọc ở đây (chọn frame) chứ không lọc kết quả: phần
   * đắt của lệnh này là mở trình duyệt và seek từng frame, nên lọc sau thì không nhanh hơn tí nào.
   */
  const raw = flag('scenes');
  const match = raw && raw !== true
    ? (id) => String(raw).split(',').map((g) => new RegExp(`^${g.trim().replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)).some((re) => re.test(String(id)))
    : null;
  const pick = match ? TIMELINE.filter((t) => match(t.scene)) : TIMELINE;
  if (match && !pick.length) {
    console.error(`✗ --scenes "${raw}" không khớp cue nào (cảnh có: ${[...new Set(TIMELINE.map((t) => t.scene))].join(', ')})`);
    process.exit(2);
  }
  if (match) console.error(`ℹ --scenes "${raw}": soát ${pick.length}/${TIMELINE.length} cue.`);
  frames = [];
  for (const t of pick) {
    const len = t.end - t.start;
    for (let k = 0; k < per; k++) {
      const f = Math.round(t.start + (len * (k + 0.5)) / per);
      frames.push(f);
      label.set(f, `${t.scene || 'cue'}/c${t.n}`);
    }
  }
}
frames = [...new Set(frames)].sort((a, b) => a - b);

// ── phép đo trong trang ───────────────────────────────────────────────────────────────────────
const PROBE = `(() => {
  const CAP_TOP = ${CAPTION_TOP};
  const out = { texts: [], covered: [], straddle: [], overflow: [] };
  /*
   * KHUNG RONG - "khong co gi de do" phai la LOI, khong phai im lang xanh (ho FM-31).
   * Ca that 22/09/2026: mot canh nem exception giua luc render, #root con nguyen nhung rong,
   * va phep CHU RONG HON HOP bao "0 loi" - xanh gia, vi canh do khong ve ra chu nao ca.
   */
  const host = document.getElementById('root') || document.body;
  out.nodes = host ? host.querySelectorAll('svg, canvas, img, video, path, rect, circle, text, div, span').length : 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let n;
  while ((n = walker.nextNode())) {
    const t = (n.nodeValue || '').trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    let op = 1, p = el;
    while (p && p !== document.body) { op *= parseFloat(getComputedStyle(p).opacity || '1'); p = p.parentElement; }
    // KHONG loai o day nua: chu mo van duoc ghi lai de phep CHU DE CHU xet (xem FAINT_MIN).
    // Moi phep do khac van chi nhin chu co op >= VISIBLE_MIN, loc o phia Node.
    if (op < ${FAINT_MIN}) continue;
    const rng = document.createRange();
    rng.selectNodeContents(el);
    const rr = rng.getBoundingClientRect();
    let r = rr.width > 0 ? rr : el.getBoundingClientRect();
    // Cha co overflow:hidden thi phan chu tran ra ngoai KHONG hien - cat hop do theo cha do,
    // neu khong hieu ung go chu (nowrap + width chay 0-100%) se bao gia 'sat mep' o moi frame.
    for (let c = el; c && c !== document.body; c = c.parentElement) {
      const cs2 = getComputedStyle(c);
      if (cs2.overflow === 'hidden' || cs2.overflowX === 'hidden') {
        const cr = c.getBoundingClientRect();
        const x0 = Math.max(r.left, cr.left), x1 = Math.min(r.right, cr.right);
        const y0 = Math.max(r.top, cr.top), y1 = Math.min(r.bottom, cr.bottom);
        if (x1 <= x0 || y1 <= y0) { r = null; break; }
        r = { left: x0, top: y0, right: x1, bottom: y1, width: x1 - x0, height: y1 - y0 };
      }
    }
    if (!r || r.width < 1 || r.height < 1) continue;
    // scale TONG dung de doi ra px hien thi. Nhung "dang phong to do" phai hoi rieng phan scale CUA
    // ANIMATION: khung dung poster boc ca canh trong mot scale(1.2) co dinh (1600x900 -> 1920x1080),
    // nen scale tong cua mot nhan dang pop la 1.2*p -- voi p = 0,80 van ra 0,96 > 0,95 va bo loc
    // 'settling' KHONG bao gio bat. Lay to tien co scale NGOAI CUNG lam khung dung, phan con lai la
    // animation.
    let scale = 1, base = 1, q = el;
    while (q && q !== document.body) {
      const mm = new DOMMatrixReadOnly(getComputedStyle(q).transform);
      const s = mm.a || 1;
      scale *= s;
      if (q !== el && s !== 1) base = s;
      q = q.parentElement;
    }
    const own = base ? scale / base : scale;
    el.dataset.vkQa = String(out.texts.length);
    let anc = null;
    for (let q2 = el.parentElement; q2 && q2 !== document.body; q2 = q2.parentElement) {
      if (q2.dataset && q2.dataset.vkQa !== undefined) { anc = Number(q2.dataset.vkQa); break; }
    }
    out.texts.push({ id: out.texts.length, anc, settling: own < 0.95, op: Math.round(op * 100) / 100, t: t.slice(0, 48),
      x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      size: Math.round(parseFloat(cs.fontSize) * scale * 10) / 10, cap: r.top >= CAP_TOP });
    if (r.top >= CAP_TOP) continue;
    if (op < ${VISIBLE_MIN}) continue; // phep CHE giu nguyen nguong cu
    for (let k = 1; k <= 5; k++) {
      const px = r.left + (r.width * k) / 6, py = r.top + r.height / 2;
      if (px < 0 || px > 1919 || py < 0 || py > 1079) continue;
      const top = document.elementFromPoint(px, py);
      if (!top || top === el || el.contains(top) || top.contains(el)) continue;
      if (top.tagName.toLowerCase() === 'svg') continue;
      let cop = 1, pp = top;
      while (pp && pp !== document.body) { cop *= parseFloat(getComputedStyle(pp).opacity || '1'); pp = pp.parentElement; }
      if (cop < 0.35) continue;
      const ts = getComputedStyle(top);
      const bg = ts.backgroundColor || '';
      const bgA = bg.startsWith('rgba') ? parseFloat(bg.split(',')[3]) : (bg === 'transparent' || bg === '' ? 0 : 1);
      const border = parseFloat(ts.borderTopWidth) > 0 || parseFloat(ts.borderLeftWidth) > 0;
      const shape = ['path','rect','circle','ellipse','line','image'].includes(top.tagName.toLowerCase());
      if (!shape && bgA < 0.15 && !border) continue;
      const tr = top.getBoundingClientRect();
      out.covered.push({ t: t.slice(0, 40), by: top.tagName + ' ' + Math.round(tr.width) + 'x' + Math.round(tr.height) + ' bg=' + bg, at: Math.round(px) + ',' + Math.round(py) });
      break;
    }

    /*
     * TRAN HOP — chu nam TREN mot mang dac nhung chi che duoc mot nua no.
     *
     * Phep CHE o tren chi thay chu bi vat khac de LEN. Khi chu duoc ve SAU (nam tren), diem hit
     * test tra ve chinh no va vong lap bo qua — nen mot dong vat ngang qua mep panel di lot.
     * O day hoi thang: ngay DUOI hai dau dong chu la cai gi? Hai dau ra hai mang khac nhau (hoac
     * mot dau co mang, mot dau trong) nghia la dong chu dang cuoi len mot cai mep.
     */
    const under = (px) => {
      const py = r.top + r.height / 2;
      if (px < 0 || px > 1919 || py < 0 || py > 1079) return null;
      const stack = document.elementsFromPoint(px, py);
      // CHI xet cac mang nam DUOI dong chu trong thu tu ve. elementsFromPoint tra ve tu tren
      // xuong, nen mot mang ve SAU chu (nam tren no) se dung truoc chu trong mang nay — lay nham
      // no lam "hop chua" thi bao gia (ca that: nhan benh dan de len trang nhat ky, 22/09/2026).
      const self = stack.indexOf(el);
      const below = self >= 0 ? stack.slice(self + 1) : stack;
      for (const node of below) {
        if (node === el || el.contains(node) || node.contains(el)) continue;
        const tag = node.tagName.toLowerCase();
        if (!['path', 'rect', 'circle', 'ellipse'].includes(tag)) continue;
        const f = getComputedStyle(node).fill || '';
        const fa = f.startsWith('rgba') ? parseFloat(f.split(',')[3]) : (f === 'none' || f === '' ? 0 : 1);
        if (fa < 0.25) continue;
        return node;
      }
      return null;
    };
    /*
     * CHU RONG HON HOP — tim hop nen gan nhat bao quanh TAM dong chu, roi so be ngang.
     * Khac TRAN HOP: o day khong hoi hai dau dong chu, ma hoi cai hop dang chua no co du rong
     * khong. Chu can giua tran deu hai ben thi hai dau van la NEN, nen phep kia khong thay.
     */
    const host = under(r.left + r.width / 2);
    if (host && r.width > 40) {
      const hr = host.getBoundingClientRect();
      const over = Math.max(hr.left - r.left, r.right - hr.right);
      if (hr.width > 40 && hr.width < 1800 && over > 6) {
        out.overflow.push({ t: t.slice(0, 40), by: host.tagName + ' ' + Math.round(hr.width) + 'x' + Math.round(hr.height),
          over: Math.round(over), tw: Math.round(r.width), hw: Math.round(hr.width) });
      }
    }

    const uL = under(r.left + 4);
    const uR = under(r.right - 4);
    if (r.width > 60 && uL !== uR) {
      const which = uL || uR;
      const wr = which.getBoundingClientRect();
      // Chu NAM GON trong mang (nhan dat tren mot panel) la binh thuong, khong phai tran hop.
      // Chi do khi mot phan dong chu that su THOI RA ngoai mep ngang cua mang do.
      const outside = r.left < wr.left - 2 || r.right > wr.right + 2;
      if (outside) {
        out.straddle.push({ t: t.slice(0, 40), by: which.tagName + ' ' + Math.round(wr.width) + 'x' + Math.round(wr.height),
          at: Math.round(r.left) + '..' + Math.round(r.right) });
      }
    }
  }
  return JSON.stringify(out);
})()`;

const findings = [];
const add = (frame, kind, msg) => findings.push({ frame, kind, msg: `f${frame} ${label.get(frame) || ''} · ${kind}: ${msg}`.replace(/\s+/g, ' ') });
/** Chữ nhỏ nhưng đang nằm trong một `scale` — chỉ kết luận được sau khi xem cả loạt frame mẫu. */
const smallWhileScaled = [];
const edgeClipped = [];
/** Cặp CHỮ ĐÈ CHỮ có một bên đang mờ — xem `FAINT_MIN`. Kết luận sau vòng lặp, không ở một frame. */
const faintOverlap = [];

/*
 * PREFLIGHT — lệnh này cần `npm run serve` (tĩnh, cổng 8765) đang chạy, và trước đây KHÔNG hề kiểm.
 *
 * Ca thật (21/09/2026): server không bật, Chrome nạp trang lỗi của chính nó, và lệnh này đo trang
 * lỗi đó rồi báo rất tự tin 18 "lỗi bố cục":
 *     NHỎ: "ERR_CONNECTION_REFUSED" 12px · CHỮ ĐÈ CHỮ: "127.0.0.1" × "refused to connect."
 * Không một dòng nào nói rằng nó chưa từng nhìn thấy video. Một gate báo sai mà nghe như thật thì
 * nguy hơn hẳn một gate không chạy — nên chỗ này phải NỔ TO, không được đoán.
 */
const probeUrl = `${base}/ui_kits/lesson-video/index.html`;
try {
  const res = await fetch(probeUrl, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
} catch (e) {
  console.error(`✗ không với tới ${probeUrl} (${e.message})`);
  console.error('  Lệnh này cần server tĩnh đang chạy. Mở một terminal khác và chạy:  npm run serve');
  console.error('  (đổi địa chỉ bằng --base nếu bạn phục vụ ở cổng khác)');
  process.exit(2);
}

const browser = await launch();
const page = await browser.page();
await page('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
let firstFrame = true;
for (const f of frames) {
  await page('Page.navigate', { url: `${base}/ui_kits/lesson-video/index.html?scene=${videoId}&frame=${f}` });
  await waitReady(page, 'true', 100);
  await sleep(80);
  if (firstFrame) {
    firstFrame = false;
    // Trang nạp được ≠ video dựng được: bundle thiếu thì `#root` rỗng và mọi phép đo bên dưới sẽ
    // đo một trang trắng rồi kết luận "sạch".
    const sane = await page('Runtime.evaluate', {
      expression: '(() => { const r = document.querySelector("#root"); return JSON.stringify({ has: !!r, kids: r ? r.children.length : 0, title: document.title }); })()',
      returnByValue: true,
    });
    const { has, kids, title } = JSON.parse(sane.result.value);
    if (!has || kids === 0) {
      console.error(`✗ trang nạp được nhưng KHÔNG dựng ra video (#root ${has ? 'rỗng' : 'không có'}, title "${title}").`);
      console.error('  Thường là chưa `npm run build`, hoặc sai --base / sai id video.');
      /*
 * XÁC NHẬN LẠI cặp mờ chỉ trúng MỘT frame mẫu.
 *
 * LỖ THỨ HAI của cùng ca f6943 (21/09/2026): nới ngưỡng opacity xong thì phép đo bắt được, nhưng
 * mật độ mẫu mặc định (3 frame/cue) chỉ trúng ĐÚNG MỘT frame trong cửa sổ va chạm, và luật "≥2
 * frame mẫu" (dựng để bỏ qua nhịp fade) lại nuốt mất nó. Nâng mật độ cho cả video thì tốn 80s → vài
 * phút cho mọi lần chạy. Nên: chỉ với cặp mờ đã trúng một lần, hỏi thêm ĐÚNG hai frame quanh nó.
 * Va chạm thật (ở lại mấy giây) sẽ còn; nhịp fade một frame thì không.
 */
if (faintOverlap.length) {
  const byKey = new Map();
  for (const it of faintOverlap) {
    if (!byKey.has(it.key)) byKey.set(it.key, []);
    byKey.get(it.key).push(it);
  }
  const overlaps = (texts, at, bt) => {
    const a = texts.find((t) => t.t === at);
    const b = texts.find((t) => t.t === bt);
    if (!a || !b) return false;
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return ox > 6 && oy > 6;
  };
  for (const hits of byKey.values()) {
    if (hits.length >= 2) continue;
    const h = hits[0];
    for (const d of [-12, 12]) {
      const f2 = h.frame + d;
      if (f2 < 0) continue;
      await page('Page.navigate', { url: `${base}/ui_kits/lesson-video/index.html?scene=${videoId}&frame=${f2}` });
      await waitReady(page, 'true', 100);
      await sleep(80);
      const r2 = await page('Runtime.evaluate', { expression: PROBE, returnByValue: true });
      const t2 = JSON.parse(r2.result.value).texts.filter((t) => !t.cap && t.op >= FAINT_MIN);
      if (overlaps(t2, h.at, h.bt)) { faintOverlap.push({ ...h, frame: f2, msg: `${h.msg} · còn ở f${f2}` }); break; }
    }
  }
}
await browser.close();
      process.exit(2);
    }
  }
  const res = await page('Runtime.evaluate', { expression: PROBE, returnByValue: true });
  const data = JSON.parse(res.result.value);
  // Khung rỗng: báo LỖI rồi bỏ qua mọi phép đo khác của frame này — đo một khung trắng là vô nghĩa.
  if (!data.nodes) {
    add(f, 'KHUNG RỖNG', 'cảnh không vẽ ra phần tử nào (crash khi render?) — mọi phép đo khác ở frame này vô nghĩa');
    continue;
  }
  for (const c of data.covered) add(f, 'CHE', `"${c.t}" bị ${c.by} che tại ${c.at}`);
  for (const c of data.straddle || []) add(f, 'TRÀN HỘP', `"${c.t}" vắt qua mép ${c.by} (x ${c.at})`);
  for (const c of data.overflow || []) add(f, 'CHỮ RỘNG HƠN HỘP', `"${c.t}" rộng ${c.tw}px trong hộp ${c.by} — thò ra ${c.over}px`);
  // `vis` = chữ ĐỦ RÕ theo ngưỡng cũ — mọi phép đo ngoài CHỮ ĐÈ CHỮ giữ nguyên hành vi.
  const vis = data.texts.filter((t) => !t.cap && t.op >= VISIBLE_MIN);
  // `readable` nới xuống `FAINT_MIN`, CHỈ cho phép CHỮ ĐÈ CHỮ (xem chú thích ở đầu file).
  const readable = data.texts.filter((t) => !t.cap && t.op >= FAINT_MIN);
  for (const t of vis) {
    if (t.x < SAFE_MARGIN || t.x + t.w > 1920 - SAFE_MARGIN) {
      // Hop bi chinh MEP KHUNG cat (x<=0 hoac phai>=1920) la phan tu DANG TRUOT VAO/RA khoi khung,
      // khong phai chu dat sat le. Cung mot lo hong nhu `settling` cua NHO: mot frame khong ket luan
      // duoc. Gom lai, chi bao khi con o >=2 frame mau cua CUNG mot canh.
      if (t.x <= 0 || t.x + t.w >= 1920) {
        edgeClipped.push({ frame: f, key: `${(label.get(f) || '').split('/')[0]}\u0000${t.t}`, t: t.t, box: `${t.x}..${t.x + t.w}` });
      } else add(f, 'MÉP', `"${t.t}" x ${t.x}..${t.x + t.w}`);
    }
    if (t.y + t.h > CAPTION_TOP) add(f, 'ĐÈ PHỤ ĐỀ', `"${t.t}" đáy ${t.y + t.h}`);
    if (t.size < MIN_TEXT_PX) {
      if (!t.settling) add(f, 'NHỎ', `"${t.t}" ${t.size}px`);
      // Nhỏ VÌ đang scale: chưa kết luận ở một frame. Gom lại, xử sau vòng lặp.
      else smallWhileScaled.push({ frame: f, key: `${(label.get(f) || '').split('/')[0]}\u0000${t.t}`, t: t.t, size: t.size });
    }
  }
  for (let i = 0; i < readable.length; i++) {
    for (let j = i + 1; j < readable.length; j++) {
      const a = readable[i];
      const b = readable[j];
      if (a.anc === b.id || b.anc === a.id) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox <= 6 || oy <= 6) continue;
      const msg = `"${a.t}" × "${b.t}" chồng ${ox}x${oy}px`;
      if (a.op >= VISIBLE_MIN && b.op >= VISIBLE_MIN) { add(f, 'CHỮ ĐÈ CHỮ', msg); continue; }
      // Một bên đang mờ (0,25–0,35): hoãn, chỉ kết luận khi va chạm còn ở ≥2 frame mẫu cùng cảnh.
      faintOverlap.push({
        frame: f,
        key: `${(label.get(f) || '').split('/')[0]}\u0000${a.t}\u0000${b.t}`,
        at: a.t,
        bt: b.t,
        msg: `${msg} (mờ: ${Math.min(a.op, b.op)})`,
      });
    }
  }
}
/*
 * XÁC NHẬN LẠI cặp mờ chỉ trúng MỘT frame mẫu.
 *
 * LỖ THỨ HAI của cùng ca f6943 (21/09/2026): nới ngưỡng opacity xong thì phép đo bắt được, nhưng
 * mật độ mẫu mặc định (3 frame/cue) chỉ trúng ĐÚNG MỘT frame trong cửa sổ va chạm, và luật "≥2
 * frame mẫu" (dựng để bỏ qua nhịp fade) lại nuốt mất nó. Nâng mật độ cho cả video thì tốn 80s → vài
 * phút cho mọi lần chạy. Nên: chỉ với cặp mờ đã trúng một lần, hỏi thêm ĐÚNG hai frame quanh nó.
 * Va chạm thật (ở lại mấy giây) sẽ còn; nhịp fade một frame thì không.
 */
if (faintOverlap.length) {
  const byKey = new Map();
  for (const it of faintOverlap) {
    if (!byKey.has(it.key)) byKey.set(it.key, []);
    byKey.get(it.key).push(it);
  }
  const overlaps = (texts, at, bt) => {
    const a = texts.find((t) => t.t === at);
    const b = texts.find((t) => t.t === bt);
    if (!a || !b) return false;
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return ox > 6 && oy > 6;
  };
  for (const hits of byKey.values()) {
    if (hits.length >= 2) continue;
    const h = hits[0];
    for (const d of [-12, 12]) {
      const f2 = h.frame + d;
      if (f2 < 0) continue;
      await page('Page.navigate', { url: `${base}/ui_kits/lesson-video/index.html?scene=${videoId}&frame=${f2}` });
      await waitReady(page, 'true', 100);
      await sleep(80);
      const r2 = await page('Runtime.evaluate', { expression: PROBE, returnByValue: true });
      const t2 = JSON.parse(r2.result.value).texts.filter((t) => !t.cap && t.op >= FAINT_MIN);
      if (overlaps(t2, h.at, h.bt)) { faintOverlap.push({ ...h, frame: f2, msg: `${h.msg} · còn ở f${f2}` }); break; }
    }
  }
}
await browser.close();

/*
 * `NHỎ KÉO DÀI` — xem bộ lọc `settling` ở đầu file.
 *
 * Một chuỗi chữ nhỏ ở ≥2 frame mẫu CỦA CÙNG MỘT CẢNH không còn là nhịp `pop` đang lớn dần: nó là
 * một cú thu khung kéo dài, và người xem có mấy giây để KHÔNG đọc được nó. Báo ở frame mẫu đầu.
 */
{
  const byKey = new Map();
  for (const it of smallWhileScaled) {
    if (!byKey.has(it.key)) byKey.set(it.key, []);
    byKey.get(it.key).push(it);
  }
  for (const hits of byKey.values()) {
    if (hits.length < 2) continue;
    const first = hits[0];
    const smallest = hits.reduce((a, b) => (b.size < a.size ? b : a));
    add(first.frame, 'NHỎ KÉO DÀI', `"${first.t}" ${smallest.size}px ở ${hits.length} frame mẫu — thu khung kéo dài, không phải nhịp pop`);
  }
}

/*
 * `CHỮ ĐÈ CHỮ MỜ` — một bên của cặp đang ở 0,25–0,35. Một frame giữa nhịp fade không kết luận được;
 * va chạm còn ở ≥2 frame mẫu CỦA CÙNG MỘT CẢNH thì nó ở lại đủ lâu để người xem nhìn thấy.
 */
{
  const byKey = new Map();
  for (const it of faintOverlap) {
    if (!byKey.has(it.key)) byKey.set(it.key, []);
    byKey.get(it.key).push(it);
  }
  for (const hits of byKey.values()) {
    if (hits.length < 2) continue;
    add(hits[0].frame, 'CHỮ ĐÈ CHỮ MỜ', `${hits[0].msg} — ở ${hits.length} frame mẫu`);
  }
}

/* `MÉP KÉO DÀI` — cùng lý lẽ: trượt vào khung là nhịp ~1s, tràn khỏi khung thì ở lại cả cảnh. */
{
  const byKey = new Map();
  for (const it of edgeClipped) {
    if (!byKey.has(it.key)) byKey.set(it.key, []);
    byKey.get(it.key).push(it);
  }
  for (const hits of byKey.values()) {
    if (hits.length < 2) continue;
    add(hits[0].frame, 'MÉP KÉO DÀI', `"${hits[0].t}" x ${hits[0].box} — bị mép khung cắt ở ${hits.length} frame mẫu, không phải nhịp trượt vào`);
  }
}

// ── khung chết: đo trên ẢNH ───────────────────────────────────────────────────────────────────
/**
 * Đo trên MP4 đã render khi có (mọi frame, rẻ, và đúng thứ người xem sẽ thấy). Chưa render thì bỏ
 * qua và nói rõ — KHÔNG im lặng coi như đạt.
 */
const mp4 = path.join(ROOT, 'projects', String(videoId), 'render', `${videoId}.mp4`);
let deadReport = 'khung chết: BỎ QUA (--no-dead)';
if (!flag('no-dead')) {
  if (!fs.existsSync(mp4)) {
    deadReport = `khung chết: CHƯA ĐO ĐƯỢC — không thấy ${path.relative(ROOT, mp4)}; render xong chạy lại`;
  } else {
    const require = createRequire(import.meta.url);
    let ffmpeg = process.env.FFMPEG;
    if (!ffmpeg) { try { ffmpeg = require('ffmpeg-static'); } catch { ffmpeg = 'ffmpeg'; } }
    const W = 240;
    const H = 123; // 1920×984 thu về 240×123, giữ tỉ lệ vùng nội dung
    const ratios = await new Promise((resolve, reject) => {
      const p = spawn(ffmpeg, ['-v', 'error', '-i', mp4, '-vf', `crop=1920:${CAPTION_TOP}:0:0,scale=${W}:${H}`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
      const size = W * H;
      let buf = Buffer.alloc(0);
      const out = [];
      p.stdout.on('data', (chunk) => {
        buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
        while (buf.length >= size) {
          const frame = buf.subarray(0, size);
          buf = buf.subarray(size);
          // nền = mức xám phổ biến nhất của chính frame đó; "khác nền" = lệch > 6 mức
          const hist = new Uint32Array(256);
          for (let i = 0; i < size; i++) hist[frame[i]] += 1;
          let mode = 0;
          for (let v = 1; v < 256; v++) if (hist[v] > hist[mode]) mode = v;
          let diff = 0;
          for (let v = 0; v < 256; v++) if (Math.abs(v - mode) > 6) diff += hist[v];
          out.push(diff / size);
        }
      });
      p.on('error', reject);
      p.on('close', () => resolve(out));
    });
    const sorted = [...ratios].sort((a, b) => a - b);
    const pct = (q) => sorted[Math.floor(sorted.length * q)] ?? 0;
    let run = 0;
    const runs = [];
    for (let i = 0; i < ratios.length; i++) {
      if (ratios[i] < deadThreshold) run += 1;
      else { if (run >= deadWindow) runs.push([i - run, i - 1]); run = 0; }
    }
    if (run >= deadWindow) runs.push([ratios.length - run, ratios.length - 1]);
    for (const [a, b] of runs) {
      const sec = (x) => `${String(Math.floor(x / FPS / 60)).padStart(2, '0')}:${String(Math.floor((x / FPS) % 60)).padStart(2, '0')}`;
      add(a, 'KHUNG CHẾT', `${sec(a)}–${sec(b)} (${((b - a + 1) / FPS).toFixed(1)}s) tỉ lệ pixel khác nền < ${(deadThreshold * 100).toFixed(1)}%`);
    }
    deadReport = `khung chết: ${ratios.length} frame · trung vị ${(pct(0.5) * 100).toFixed(1)}% · p10 ${(pct(0.1) * 100).toFixed(1)}% · p05 ${(pct(0.05) * 100).toFixed(1)}% · ngưỡng ${(deadThreshold * 100).toFixed(1)}% / ${(deadWindow / FPS).toFixed(1)}s`;
  }
}

// ── báo cáo ───────────────────────────────────────────────────────────────────────────────────
const real = [];
const waived = [];
for (const f of findings) (allowed(f.msg) ? waived : real).push(f);

if (flag('json')) {
  console.log(JSON.stringify({ video: videoId, frames: frames.length, problems: real, waived }, null, 1));
} else {
  console.log(`qa-layout · ${videoId} · ${frames.length} frame đã soát`);
  console.log(`  ${deadReport}`);
  const seen = new Set();
  for (const f of real) {
    if (seen.has(f.msg)) continue;
    seen.add(f.msg);
    console.log(`  ✗ ${f.msg}`);
  }
  for (const f of waived) {
    const a = allowed(f.msg);
    if (seen.has(f.msg)) continue;
    seen.add(f.msg);
    console.log(`  – (bỏ qua) ${f.msg}  ← ${a.reason}`);
  }
  console.log(real.length ? `\n✗ ${new Set(real.map((f) => f.msg)).size} lỗi bố cục` : `\n✓ không lỗi bố cục${waived.length ? ` (${new Set(waived.map((f) => f.msg)).size} mục trong allowlist)` : ''}`);
}
process.exit(real.length ? 1 : 0);

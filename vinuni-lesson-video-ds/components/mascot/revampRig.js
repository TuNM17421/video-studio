/*
 * Rig cắt mảnh (cutout puppet) cho vector LEXCE revamp.
 *
 * VÌ SAO PHẢI CÓ FILE NÀY
 * `revampArtwork.js` là bản trace của MỘT tấm hình: 417 path, trong đó ba path đầu là bóng dáng
 * toàn thân (đầu, tay, thân dính liền trong cùng một hình). Vì thế trước ngày 14/09/2026, mọi
 * "pose" của MascotRevamp chỉ xoay được đúng hai bàn tay vàng vài độ — 11 cảm xúc render ra gần
 * như y hệt nhau, và `wave` chỉ vẽ thêm hai vạch tốc độ ở x=66, tức là ở NGOÀI bàn tay.
 *
 * Rig này chia artwork thành sáu vùng bằng clip-path. Mỗi vùng là một `<g>` riêng nên xoay được
 * quanh khớp của nó. Artwork KHÔNG bị chép lại lần nào: vẫn đúng 417 path nguồn, chỉ khác ở chỗ
 * path nào rơi vào nhóm nào.
 *
 * LUẬT KHI SỬA
 * - Path lớn (bbox ≥ SHARED_MIN_AREA) vẽ lại ở MỌI vùng, mỗi lần cắt theo clip của vùng đó. Không
 *   phân vùng theo tâm bbox cho chúng — path 0/1/2 phủ cả nhân vật, gán tâm là sai chắc chắn.
 * - Path nhỏ gán theo tâm bbox, và clip của vùng cắt luôn phần thừa. Polygon phải rộng hơn mảnh
 *   nó chứa, nếu không sẽ cụt im lặng — soi bằng `node tools/shoot.mjs` trên card, đừng tin mắt code.
 * - Vùng vẽ sau đè vùng vẽ trước (REGION_ORDER). Tay vẽ sau đầu vì trong bản gốc bàn tay phải che
 *   má phải; đảo thứ tự là bàn tay chui sau mặt.
 * - Xoay tay quá ±26° thì hở khe ở vai. Đó là lý do có SHOULDER_PATCH.
 */

/** Path bbox từ diện tích này trở lên được coi là "dùng chung": vẽ ở mọi vùng, cắt theo clip. */
export const SHARED_MIN_AREA = 60000;

/**
 * Năm vùng, toạ độ trong viewBox gốc 1122×1402. `body` không có polygon: nó là phần còn lại.
 *
 * LUẬT SỐNG CÒN: các polygon phải CHỒNG nhau, tuyệt đối không được hở.
 *
 * Hở một khe giữa hai polygon thì mảnh artwork trong khe đó rơi xuống `body` và ĐỨNG YÊN khi tay
 * xoay — đúng những vệt xanh lơ lửng quanh đầu mà bản 14/09/2026 bị báo "mascot bị vỡ".
 * Chồng lấn thì ngược lại: vùng vẽ sau (tay) đè lên vùng vẽ trước (đầu), mà ở chỗ chồng lấn nét vẽ
 * gốc VỐN LÀ của tay (tay nằm trước đầu trong tranh), nên giao cho tay là đúng; phần đầu nằm dưới
 * vẫn còn nguyên mảng kem của chính nó. Vì thế: thà chồng 60 px còn hơn hở 1 px.
 */
export const RIG_POLYS = Object.freeze({
  head: [
    [368, 68], [330, 148], [298, 232], [272, 326], [260, 424], [264, 528], [288, 610],
    [334, 672], [400, 712], [500, 734], [602, 740], [704, 726], [794, 704], [862, 652],
    [902, 578], [920, 486], [926, 388], [936, 294], [932, 190], [890, 140], [820, 150],
    [770, 152], [740, 146], [646, 120], [546, 96], [450, 72], [406, 46],
  ],
  face: [
    [326, 272], [448, 208], [602, 202], [750, 242], [846, 326], [880, 444], [866, 566],
    [770, 660], [622, 690], [486, 676], [386, 606], [330, 492], [314, 378],
  ],
  armL: [
    [312, 236], [298, 330], [292, 442], [302, 542], [326, 612], [368, 674], [414, 728],
    [438, 786], [350, 806], [268, 782], [180, 730], [108, 690], [52, 632], [6, 520],
    [2, 360], [26, 280], [106, 242], [198, 226],
  ],
  armR: [
    [682, 756], [692, 686], [744, 656], [806, 618], [858, 572], [906, 528], [956, 476],
    [1042, 482], [1112, 516], [1134, 600], [1126, 714], [1060, 816], [964, 890],
    [874, 922], [792, 912], [740, 872], [712, 804],
  ],
});

/** Khớp xoay của từng vùng. Tay xoay quanh vai, đầu quanh cổ, đuôi quanh gốc đuôi. */
export const RIG_JOINTS = Object.freeze({
  head: [566, 700],
  face: [576, 442],
  armL: [392, 716],
  armR: [694, 760],
  body: [561, 1150],
});

/**
 * Thứ tự vẽ: vùng sau đè vùng trước.
 *
 * KHÔNG tách đuôi thành vùng riêng. Đã thử và bỏ ngày 14/09/2026: polygon đuôi cắt luôn vào hông,
 * để lại một mép cắt thẳng ở sườn trái mà vùng đuôi không vẽ bù được — nhìn ra ngay là "vỡ".
 * Cái được (vẫy đuôi vài độ) không đáng cái mất.
 */
export const REGION_ORDER = Object.freeze(['body', 'head', 'face', 'armL', 'armR']);

/**
 * Miếng vá khớp: cắt một vùng ra khỏi thân thì chỗ cắt hở ra nền trắng ngay khi vùng đó xoay.
 * Miếng vá là một ĐĨA vẽ lại chính các path lớn của artwork, không xoay, đặt giữa thân và vùng
 * xoay. Vá bằng artwork gốc nên màu và nét viền luôn khớp — bản vá bằng ellipse tô màu tay áo
 * 14/09/2026 đắp một mảng xanh lên ngực kem, nhìn thấy ngay ở size 860.
 */
export const JOINT_PATCHES = Object.freeze([
  { name: 'head', cx: 566, cy: 700, r: 250 },
  { name: 'armL', cx: 372, cy: 706, r: 168 },
  { name: 'armR', cx: 706, cy: 750, r: 158 },
]);

/**
 * Đường NỐI của từng vùng — chỗ nó dính vào phần còn lại của nhân vật (cổ với đầu, vai/hông với
 * tay). Chỉ dùng để SINH nét viền: viền phải chạy hết bóng dáng của vùng NHƯNG dừng lại ở đây,
 * vì kẻ viền ngang chỗ nối là kẻ một vết sẹo ngang cổ.
 *
 * Phải khai tay. Bản 14/09/2026 thử đoán tự động hai lần đều sai: đo khoảng cách tới polygon thì
 * polygon `head` ôm sát đầu nên loại nhầm gần hết đường bao (đầu vẫn cụt viền hai bên má); so mask
 * đã-clip với mask chưa-clip thì các path lớn phủ cả nhân vật nên chỗ nào giáp cánh cũng bị coi là
 * mép cắt. Chỗ nối là một sự thật về giải phẫu, khai thẳng ra rẻ hơn mọi mẹo suy luận.
 */
export const RIG_SEAMS = Object.freeze({
  head: [[330, 664], [402, 710], [500, 732], [602, 740], [704, 726], [796, 700]],
  armL: [[368, 674], [414, 728], [438, 786], [396, 806], [344, 806]],
  armR: [[704, 698], [690, 760], [714, 788], [742, 844], [782, 876]],
});

const NUM = /-?\d*\.?\d+/g;

/** bbox xấp xỉ: path chỉ có M/C/Q/L/Z nên mọi số là một cặp toạ độ. */
function bboxOf(d, tx, ty) {
  const n = d.match(NUM);
  if (!n || n.length < 2) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < n.length; i += 2) {
    const x = +n[i], y = +n[i + 1];
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0 + tx, y0 + ty, x1 + tx, y1 + ty];
}

function inPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function polyToPath(poly) {
  return poly.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') + 'Z';
}

/**
 * Lỗ khoét trên thân co vào SEAM_BLEED px so với polygon của vùng, nên thân thò ra dưới mép vùng
 * vài pixel. Không có phần thò này thì hai nhóm chạm nhau đúng một đường và anti-alias để lộ một
 * vệt sáng chạy dọc mép — thấy rõ nhất ở gốc đuôi và dọc cằm.
 */
const SEAM_BLEED = 5;

function shrinkPoly(poly, px) {
  const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length;
  const cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
  return poly.map(([x, y]) => {
    const dx = x - cx, dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [x - (dx / len) * px, y - (dy / len) * px];
  });
}

/**
 * Thân KHÔNG dùng clip-path mà dùng MASK. Lý do đo được ngày 14/09/2026:
 *
 * `clip-path` với một path gộp chỉ có hai fill-rule, và cả hai đều sai ở đây.
 * `evenodd`: điểm nằm trong HAI lỗ chồng nhau bị đếm số lẻ lần cắt nên được CỘNG LẠI — dải kem dọc
 * mép trái đầu hiện nguyên trong thân và đứng yên khi tay xoay. `nonzero` với lỗ quấn ngược cũng
 * hỏng y hệt ở chỗ giao (−1 vẫn khác 0).
 * `mask` thì đen chồng đen vẫn là đen, nên "hình chữ nhật trừ HỢP của các lỗ" mới đúng — và đó là
 * điều kiện để polygon được phép chồng nhau, tức để không bao giờ hở.
 */
export const BODY_MASK_HOLES = Object.freeze(
  ['head', 'armL', 'armR'].map((k) => polyToPath(shrinkPoly(RIG_POLYS[k], SEAM_BLEED))),
);

/**
 * Chia REVAMP_PATHS thành sáu danh sách. Path lớn vào mọi vùng; path nhỏ vào vùng chứa tâm bbox
 * (thứ tự ưu tiên face → armL → armR → head → body — TAY THẮNG ĐẦU ở chỗ chồng lấn, vì ở đó
 * nét vẽ gốc là của tay; mảng kem của đầu nằm dưới vẫn đầy đủ). Thứ tự index gốc được giữ nguyên
 * trong từng vùng, nên lớp trong một vùng không đảo.
 */
export function buildRegions(paths) {
  const out = { body: [], head: [], face: [], armL: [], armR: [], shared: [] };
  const probe = ['face', 'armL', 'armR', 'head'];
  paths.forEach((entry, index) => {
    const [d, , transform] = entry;
    const m = /translate\((-?[\d.]+),(-?[\d.]+)\)/.exec(transform || '');
    const b = bboxOf(d, m ? +m[1] : 0, m ? +m[2] : 0);
    if (!b) { out.body.push(index); return; }
    const area = (b[2] - b[0]) * (b[3] - b[1]);
    if (area >= SHARED_MIN_AREA) { for (const k of REGION_ORDER) out[k].push(index); out.shared.push(index); return; }
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    out[probe.find((k) => inPoly(cx, cy, RIG_POLYS[k])) ?? 'body'].push(index);
  });
  return out;
}

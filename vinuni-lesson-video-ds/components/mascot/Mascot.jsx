import React from 'react';
import { C, FONT, MASCOT as M } from '../../lib/tokens.js';
import { CLAMP, interpolate, spring } from '../../lib/motion.js';

/*
 * LEXCE — mascot chính thức của VinUniversity, người dẫn chuyện trong video bài giảng.
 * Hình lấy từ bản plush chính thức (Thái duyệt 14/09/2026). LEXCE thay hẳn con chim xanh cũ.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * VÌ SAO FILE NÀY KHÔNG CHÉP ARTWORK RA TÁM LẦN
 *
 * Bản chim xanh khai mỗi pose là một khối SVG riêng, chép qua chép lại. Hậu quả đã đo được:
 * pose 'sad' trôi mất mỏ, thân nhỏ đi 2px, mắt tụt 4px — thành ra một nhân vật khác; còn pose
 * 'formal' trôi xa tới mức phải xoá hẳn. Ở đây phần thân là MỘT bộ mảnh dùng chung, mỗi pose chỉ
 * khai phần KHÁC (góc cánh, góc tay, tai, lông mày, mắt, mỏ, phụ kiện). Muốn đổi cái mỏ thì sửa
 * đúng một chỗ và cả tám pose đổi theo — không pose nào tụt lại được.
 *
 * Thêm pose = thêm một dòng vào POSE_SPEC. Nếu một pose cần hình mới hẳn (không diễn được bằng
 * các tham số có sẵn), hãy thêm THAM SỐ mới ở đây chứ đừng chép một khối artwork riêng cho nó.
 * ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * Về nét viền: bản plush không có viền. Video thì cần — ở chỗ đứng `corner` nhân vật chỉ cao 190px
 * trên nền trắng, không viền là nó tan vào nền. Viền dùng MASCOT.outline, dày 3–4 trong viewBox.
 */

/* ── mảnh dùng chung ─────────────────────────────────────────────────────────────────────── */

/** Lật một mảnh sang nửa bên kia. viewBox rộng 200 nên tâm lật là x = 100. */
const Mirror = ({ children }) => <g transform="translate(200 0) scale(-1 1)">{children}</g>;

/**
 * Cánh trái: ba lông kem xếp lớp, mọc từ lưng.
 * `lift` > 0 xoè lên (vui, phấn khích), < 0 rủ xuống (buồn, nghiêm). Lông xoay theo luôn, nếu không
 * thì cánh chỉ tịnh tiến lên xuống và trông như miếng dán trượt chứ không như cánh đang mở.
 * Giữ `lift` trong khoảng −13…+12: cánh đã to, xoè quá là lông trên cùng trùm lên má.
 */
const FEATHERS = [
  { cx: 46, cy: 117, rx: 40, ry: 13, rot: 9 },
  { cx: 48, cy: 131, rx: 35, ry: 12, rot: 18 },
  { cx: 52, cy: 144, rx: 29, ry: 11, rot: 27 },
];
function Wing({ lift = 0 }) {
  return (
    <g fill={M.wing} stroke={M.outline} strokeWidth="3">
      {FEATHERS.map((w, i) => {
        const cy = w.cy - lift;
        return (
          <ellipse key={i} cx={w.cx} cy={cy} rx={w.rx} ry={w.ry}
            transform={`rotate(${w.rot - lift * 0.9} ${w.cx} ${cy})`} />
        );
      })}
    </g>
  );
}

/**
 * Tay trái: ống tay áo xanh + bàn tay vàng, xoay quanh khớp vai (58, 126).
 * `angle` DƯƠNG là giơ lên/ra ngoài, ÂM là hạ xuống và khép vào thân. Trục y của SVG hướng xuống
 * nên dấu ngược với trực giác — bản đầu đặt sai dấu và cả tám pose đều thọc tay vào giữa bụng.
 */
function Arm({ angle = 0 }) {
  return (
    <g transform={`rotate(${angle} 58 126)`}>
      <path d="M56 124 q-18 8 -18 22 q12 8 24 -2z" fill={M.suit} stroke={M.outline} strokeWidth="3.5" strokeLinejoin="round" />
      <ellipse cx="34" cy="152" rx="14" ry="12" fill={M.hand} stroke={M.outline} strokeWidth="3.5" transform="rotate(-25 34 152)" />
    </g>
  );
}

/** Tai trái: vỏ xanh royal + lòng tai xanh nhạt. `droop` > 0 là cụp ra ngoài. */
function Ear({ droop = 0 }) {
  return (
    <g transform={`rotate(${-droop} 70 40)`}>
      <path d="M46 48 Q37 16 52 0 Q73 10 85 43z" fill={M.ear} stroke={M.outline} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M51 43 Q45 18 54 9 Q69 17 78 39z" fill={M.earInner} />
    </g>
  );
}

/** Lông mày trái. Đầu trong (phía mũi) ở x≈84, đuôi ngoài ở x≈60. */
const BROWS = {
  normal: 'M56 46 q12 -9 24 -3',
  raised: 'M56 40 q12 -9 24 -3',
  flat: 'M57 44 h23',
  // buồn = đầu TRONG cao, đuôi NGOÀI thấp. Ngược lại (đầu trong thấp) là cau có, và cau có thì
  // đọc ra là giận — đúng cái bẫy đã làm pose 'sad' của bản chim xanh trông như đang cáu.
  sad: 'M56 54 q12 -8 24 -15',
};

/** Mắt. `happy` là cung cong lên nên không cần mí chớp; xem CLOSED_EYE_POSES. */
function Eyes({ kind = 'open' }) {
  if (kind === 'happy') {
    return (
      <g stroke={M.eye} strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M60 70 q12 -14 24 0" />
        <path d="M116 70 q12 -14 24 0" />
      </g>
    );
  }
  const r = kind === 'big' ? 17 : 15;
  const hr = kind === 'big' ? 6.5 : 5.5;
  return (
    <>
      <circle cx="72" cy="66" r={r} fill={M.eye} />
      <circle cx="128" cy="66" r={r} fill={M.eye} />
      <circle cx={72 - r * 0.36} cy={66 - r * 0.36} r={hr} fill={C.bg} />
      <circle cx={128 - r * 0.36} cy={66 - r * 0.36} r={hr} fill={C.bg} />
      <circle cx={72 + r * 0.36} cy={66 + r * 0.43} r="2.4" fill={C.bg} opacity="0.85" />
      <circle cx={128 + r * 0.36} cy={66 + r * 0.43} r="2.4" fill={C.bg} opacity="0.85" />
    </>
  );
}

/** Mỏ cam hình tim. `open` há ra, để lộ khoang miệng đỏ — dùng cho câu đang nói to, đang reo. */
function Beak({ open = false }) {
  if (!open) {
    return <path d="M100 80 q-15 -7 -16 7 q-1 12 16 18 q17 -6 16 -18 q-1 -14 -16 -7z"
      fill={M.beak} stroke={M.outline} strokeWidth="3" strokeLinejoin="round" />;
  }
  return (
    <>
      {/* khoang miệng chỉ ló khoảng 6px dưới mỏ — thò dài hơn là đọc ra cái lưỡi, không phải miệng */}
      <path d="M100 93 q-9 0 -9 6 q0 7 9 7 q9 0 9 -7 q0 -6 -9 -6z"
        fill={M.mouth} stroke={M.outline} strokeWidth="3" strokeLinejoin="round" />
      <path d="M100 78 q-15 -7 -16 7 q-1 10 16 15 q17 -5 16 -15 q-1 -14 -16 -7z"
        fill={M.beak} stroke={M.outline} strokeWidth="3" strokeLinejoin="round" />
    </>
  );
}

/** Giọt nước mắt dưới mắt trái. */
const TEAR = <path d="M62 80 q-5 11 0 15 q6 4 8 -3 q1 -8 -8 -12z" fill={M.tear} stroke={M.outline} strokeWidth="2" />;

/** Vạch tốc độ hai bên, cho pose 'excited'. */
const SPEED = (
  <g stroke={M.motion} strokeWidth="4" strokeLinecap="round" fill="none">
    <path d="M8 54 l11 5 M4 72 l12 0 M8 90 l11 -5" />
    <path d="M192 54 l-11 5 M196 72 l-12 0 M192 90 l-11 -5" />
  </g>
);

/* ── bảng khai pose ──────────────────────────────────────────────────────────────────────── */

/**
 * Mỗi pose chỉ khai phần KHÁC so với tư thế đứng yên. Trống = lấy mặc định của `idle`.
 *
 * `armL`/`armR` là góc xoay vai, DƯƠNG là giơ lên. `wing` là độ xoè cánh. `ear` > 0 là tai cụp.
 * Đừng đặt biên độ lớn hơn mức ở đây: mascot là vai phụ, tay chân vung rộng là kéo mắt người xem
 * khỏi nội dung bài học.
 */
const POSE_SPEC = {
  idle:    {},
  // chỉ: tay phải duỗi NGANG về phía nội dung, tay trái khép lại. Bất đối xứng là thứ làm
  // người xem đọc ra "đang chỉ"; hai tay cùng nhấc lên chỉ ra "đang giơ tay".
  point:   { armL: -18, armR: 52, wing: 2 },
  wave:    { armL: 78, wing: 4, eyes: 'happy', beak: 'open' },
  // giảng: tay phải giơ CAO chỉ lên (khác 'point' ở độ cao — cùng góc thì hai pose trùng nhau)
  teach:   { armL: -14, armR: 92, wing: 2, brows: 'raised', beak: 'open' },
  happy:   { armL: 32, armR: 32, wing: 7, eyes: 'happy', beak: 'open' },
  // buồn: tai cụp + lông mày xuôi + cánh rủ + tay rũ xuống. KHÔNG dùng lông mày cau vào.
  sad:     { armL: -20, armR: -20, wing: -13, ear: 46, brows: 'sad', tear: true },
  excited: { armL: 74, armR: 74, wing: 12, ear: -8, brows: 'raised', eyes: 'big', beak: 'open', speed: true },
  // nghiêm: lông mày NGANG (không dốc — dốc là giận, và giận thì lẫn với 'sad'), tay buông thẳng
  // sát hông, cánh khép. Ở cỡ `corner` thì chính đôi tay buông mới là thứ tách nó khỏi 'idle',
  // vì ở cỡ đó cặp lông mày chỉ còn là một vệt.
  serious: { armL: -32, armR: -32, wing: -8, brows: 'flat' },
};

const DEFAULTS = { armL: 0, armR: 0, wing: 0, ear: 0, brows: 'normal', eyes: 'open', beak: 'closed' };

/** Tên mọi pose, theo đúng thứ tự muốn bày trong gallery. `card.html` đọc từ đây, không chép tay. */
export const MASCOT_POSES = Object.freeze(Object.keys(POSE_SPEC));

/** Toàn bộ nhân vật ở một pose. */
function Figure({ pose }) {
  const s = { ...DEFAULTS, ...(POSE_SPEC[pose] ?? {}) };
  return (
    <>
      <ellipse cx="100" cy="212" rx="52" ry="7" fill={M.shadow} opacity="0.10" />

      {/* đuôi lửa, sau thân, lệch trái */}
      <path d="M58 170 Q40 160 26 166 Q36 171 39 176 Q24 180 20 190 Q34 185 42 187 Q38 195 40 202 Q50 190 60 186z"
        fill={M.tail} stroke={M.outline} strokeWidth="3" strokeLinejoin="round" />

      <Wing lift={s.wing} />
      <Mirror><Wing lift={s.wing} /></Mirror>

      {/* bộ liền thân */}
      <path d="M100 110 C59 109 43 128 42 153 C40 176 48 191 64 196 Q100 207 136 196 C152 191 160 176 158 153 C157 128 141 109 100 110z"
        fill={M.suit} stroke={M.outline} strokeWidth="4" />
      <ellipse cx="72" cy="199" rx="18" ry="11" fill={M.foot} stroke={M.outline} strokeWidth="3.5" />
      <ellipse cx="128" cy="199" rx="18" ry="11" fill={M.foot} stroke={M.outline} strokeWidth="3.5" />

      {/* yếm + logo V của VinUniversity */}
      <ellipse cx="100" cy="157" rx="28" ry="30" fill={M.patch} />
      {/*
       * Logo VinUniversity, dựng lại theo đúng hình học file gốc (mọi cạnh chéo đều 45°, cạnh phải
       * của chevron thẳng đứng, tam giác đỏ TÁCH khỏi chữ V bằng một khe chéo). Đừng thay bằng một
       * chữ V vẽ bằng stroke — nhánh trái mảnh và nhánh phải dày là đặc điểm nhận diện của nó.
       */}
      <polygon points="83.7,141.1 91.7,148.7 83.7,156.2" fill={M.logoRed} />
      <polygon points="92.2,149.6 100.2,157.2 116.3,141.1 116.3,157.2 100.2,172.9 84.7,157.2" fill={M.logoNavy} />

      <Arm angle={s.armL} />
      <Mirror><Arm angle={s.armR} /></Mirror>

      {/* khăn lông cổ */}
      <path d="M100 102 q-36 0 -42 13 q-4 9 7 12 q13 4 35 4 q22 0 35 -4 q11 -3 7 -12 q-6 -13 -42 -13z"
        fill={M.fur} stroke={M.outline} strokeWidth="3.5" strokeLinejoin="round" />

      <Ear droop={s.ear} />
      <Mirror><Ear droop={s.ear} /></Mirror>

      {/* đầu bầu ngang (~1,3:1), giữ silhouette cú LEXCE ở cỡ nhỏ */}
      <ellipse cx="100" cy="68" rx="67" ry="51" fill={M.fur} stroke={M.outline} strokeWidth="4" />

      {/* lọn tóc xanh trên trán */}
      <path d="M82 36 Q90 18 110 24 Q95 27 88 39z" fill={M.earInner} stroke={M.outline} strokeWidth="2.5" strokeLinejoin="round" />

      <g stroke={M.earInner} strokeWidth="6" strokeLinecap="round" fill="none">
        <path d={BROWS[s.brows]} />
      </g>
      <Mirror>
        <g stroke={M.earInner} strokeWidth="6" strokeLinecap="round" fill="none">
          <path d={BROWS[s.brows]} />
        </g>
      </Mirror>

      <ellipse cx="54" cy="84" rx="14" ry="13" fill={M.cheek} opacity="0.85" />
      <ellipse cx="146" cy="84" rx="14" ry="13" fill={M.cheek} opacity="0.85" />

      <Eyes kind={s.eyes} />
      <Beak open={s.beak === 'open'} />

      {s.tear ? TEAR : null}
      {s.speed ? SPEED : null}
    </>
  );
}

/*
 * Idle motion — MUST be a pure function of `frame` (see lib/motion.js). No CSS animation or
 * transition, no wall-clock, no randomness: rendering captures discrete frames, so frame N has to
 * produce the same picture every time or the video freezes or judders.
 *
 * Amplitudes are deliberately small. The mascot is a sidekick in the corner; a big sway pulls the
 * viewer's eye off the actual content.
 */
const FPS = 30;
const SWAY_PERIOD = 3.1 * FPS;   // sway cycle, ~3.1s
const BOB_PERIOD = 2.3 * FPS;    // bob is out of phase with sway so it does not read as a metronome
const BLINK_PERIOD = 4.2 * FPS;  // blink about every 4.2s
const BLINK_FRAMES = 4;          // eyes shut for 4 frames

/** Sway angle (degrees) and bob offset (viewBox px) at a frame. */
export function mascotIdle(frame) {
  const f = Math.max(0, frame);
  return {
    sway: 2.4 * Math.sin((2 * Math.PI * f) / SWAY_PERIOD),
    bob: 3.2 * Math.sin((2 * Math.PI * f) / BOB_PERIOD + Math.PI / 3),
    blinking: f % BLINK_PERIOD < BLINK_FRAMES,
  };
}

/** Chớp mắt: che hai mắt bằng màu lông rồi vẽ mí, nên mọi pose dùng chung một mí. */
const EYELIDS = (
  <>
    <circle cx="72" cy="66" r="18" fill={M.fur} />
    <circle cx="128" cy="66" r="18" fill={M.fur} />
    <path d="M60 66 q12 9 24 0" stroke={M.eye} strokeWidth="4.5" strokeLinecap="round" fill="none" />
    <path d="M116 66 q12 9 24 0" stroke={M.eye} strokeWidth="4.5" strokeLinecap="round" fill="none" />
  </>
);

/** Poses whose eyes are already drawn as happy arcs — do not stack lids on those. */
const CLOSED_EYE_POSES = new Set(['wave', 'happy']);

/*
 * Vị trí đặt mascot — có Ý ĐỒ, không phải dán cố định một góc.
 *
 * Rút từ cách kênh "Vui Vẻ" dựng: mascot KHÔNG phải vật trang trí ở góc, nó là bạn diễn đứng
 * cạnh nội dung và chỉ trỏ vào đó. Nửa khung là ảnh/nội dung, nửa kia là nhân vật đang phản ứng.
 * Đó là thứ tạo cảm giác tương tác.
 *
 * Toạ độ theo canvas 1920×1080. `facing` lật nhân vật để luôn QUAY VỀ PHÍA nội dung.
 */
export const MASCOT_SPOTS = Object.freeze({
  // nhỏ, nép góc — dùng cho cue nặng chữ, mascot chỉ giữ nhịp
  corner:      { x: 1590, y: 700, size: 190, facing: 'left' },
  cornerLeft:  { x: 140,  y: 700, size: 190, facing: 'right' },
  // bạn diễn nửa khung — dùng khi cue có một hình/ảnh làm trung tâm
  costarRight: { x: 1320, y: 380, size: 460, facing: 'left' },
  costarLeft:  { x: 240,  y: 380, size: 460, facing: 'right' },
  /*
   * Ló ra từ mép dưới — dùng cho câu chêm, câu cà khịa.
   *
   * y phải đủ cao để CẢ KHUÔN MẶT nằm trên thanh phụ đề (thanh chiếm y 984–1080). Mắt nằm ở khoảng
   * 29% chiều cao artwork, nên y=740 + 300 px đặt mắt ở y≈827, chừa 157 px trước mép thanh.
   */
  peekBottom:  { x: 1480, y: 740, size: 300, facing: 'left' },
  // đứng giữa, to — chỉ dùng cho câu chào và câu chốt
  center:      { x: 860,  y: 430, size: 420, facing: 'right' },
});

/** Hiệu ứng cảm xúc nổi bên đầu mascot. Nảy ra rồi đứng, không nhấp nháy. */
function Emote({ kind, frame, from }) {
  const local = frame - from;
  if (local < 0) return null;
  const t = spring({ frame: local, fps: FPS, config: { damping: 10, stiffness: 240 } });
  const scale = interpolate(t, [0, 1], [0.1, 1]);
  const lift = interpolate(t, [0, 1], [16, 0]);
  const ink = M.outline;
  const glyph = {
    surprise: <text x="0" y="14" textAnchor="middle" fontSize="58" fontWeight="800" fill={C.red} fontFamily={FONT}>!</text>,
    question: <text x="0" y="14" textAnchor="middle" fontSize="54" fontWeight="800" fill={C.accent} fontFamily={FONT}>?</text>,
    idea: (
      <g>
        <circle cx="0" cy="-6" r="18" fill={M.motion} stroke={ink} strokeWidth="3" />
        <rect x="-7" y="12" width="14" height="9" rx="3" fill={ink} />
        <path d="M-30 -30 l8 8 M30 -30 l-8 8 M0 -38 v10" stroke={M.motion} strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
    ),
    sweat: <path d="M0 -18 q10 14 0 24 q-10-10 0-24z" fill={M.tear} stroke={ink} strokeWidth="2" />,
  }[kind];
  if (!glyph) return null;
  // x=176: ngoài mép tai, không đè lên đầu. Emote nằm ngoài group lật nên luôn ở nửa phải khung.
  return (
    <g transform={`translate(176 ${18 + lift}) scale(${scale})`} opacity={interpolate(t, [0, 0.3], [0, 1], CLAMP)}>
      {glyph}
    </g>
  );
}

/**
 * Inline artwork in scene SVG coordinates.
 *
 * `at`      — tên chỗ đứng trong MASCOT_SPOTS. Đặt cái này thay vì tự gõ x/y/size.
 * `facing`  — 'left' | 'right'. Mascot phải quay MẶT về phía nội dung đang nói tới.
 * `emote`   — 'surprise' | 'question' | 'idea' | 'sweat', nổi bên đầu.
 * `frame`   — frame hiện tại; bỏ trống thì mascot đứng yên (an toàn cho card tĩnh).
 * `enter`   — trượt vào + nảy nhẹ ở đầu scene rồi vào nhịp idle.
 *
 * x/y/size truyền tay vẫn được và sẽ ĐÈ LÊN `at`, để tinh chỉnh từng cảnh.
 */
export function Mascot({
  pose = 'idle',
  at = null,
  size = null,
  x = null,
  y = null,
  facing = null,
  emote = null,
  emoteFrom = 0,
  opacity = 1,
  frame = null,
  enter = false,
}) {
  const spot = (at && MASCOT_SPOTS[at]) || null;
  const px = x ?? spot?.x ?? 0;
  const py = y ?? spot?.y ?? 0;
  const psize = size ?? spot?.size ?? 220;
  const dir = facing ?? spot?.facing ?? 'right';

  const known = POSE_SPEC[pose] ? pose : 'idle';
  const animated = frame !== null && Number.isFinite(frame);

  let sway = 0;
  let bob = 0;
  let blinking = false;
  let enterY = 0;
  let enterOpacity = 1;

  if (animated) {
    ({ sway, bob, blinking } = mascotIdle(frame));
    if (enter) {
      const t = spring({ frame, fps: FPS, config: { damping: 14, stiffness: 170 } });
      enterY = interpolate(t, [0, 1], [46, 0]);
      enterOpacity = interpolate(frame, [0, 6], [0, 1], CLAMP);
    }
  }

  const showLids = animated && blinking && !CLOSED_EYE_POSES.has(known);
  // lật ngang quanh tâm hình (viewBox rộng 200) để mascot quay về phía nội dung
  const flip = dir === 'left' ? 'translate(200 0) scale(-1 1)' : '';

  /*
   * `data-vk-occupies` khai vùng nhân vật che, bằng toạ độ scene: "x,y,rộng,cao".
   * `tools/verify.mjs` đọc nó và báo mọi <text> rơi vào trong — đó là cách bắt lỗi "mascot đè chữ"
   * bằng máy, thay vì đợi ai đó xem lại bản render xong mới thấy.
   *
   * LEXCE xoè cánh nên rộng hơn con chim xanh cũ: thân + cánh chiếm x 12→188 trong viewBox 200,
   * mà bề rộng vẽ ra là size*200/220. Đổi cánh hay chỗ đứng thì tính lại hai hệ số này.
   */
  const occupies = `${Math.round(px + psize * 0.03)},${Math.round(py)},${Math.round(psize * 0.86)},${Math.round(psize)}`;

  return (
    <g
      transform={`translate(${px} ${py}) scale(${psize / 220})`}
      opacity={opacity * enterOpacity}
      data-pose={known}
      data-spot={at ?? 'custom'}
      data-vk-occupies={occupies}
    >
      <g transform={`translate(0 ${bob + enterY}) rotate(${sway} 100 199)`}>
        <g transform={flip}>
          <Figure pose={known} />
          {showLids ? EYELIDS : null}
        </g>
        {animated && emote ? <Emote kind={emote} frame={frame} from={emoteFrom} /> : null}
      </g>
    </g>
  );
}

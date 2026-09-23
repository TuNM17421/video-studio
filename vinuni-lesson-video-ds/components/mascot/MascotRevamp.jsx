import React from 'react';
import { MASCOT_SPOTS } from './Mascot.jsx';
import { MASCOT as M } from '../../lib/tokens.js';
import { REVAMP_PATHS } from './revampArtwork.js';
import { buildRegions, RIG_JOINTS, RIG_POLYS, REGION_ORDER, JOINT_PATCHES, BODY_MASK_HOLES, polyToPath, BADGE_PATHS } from './revampRig.js';

/*
 * Cutout-puppet rig — verified 2026-09-17, opt-in only.
 *
 * `revampRig.js` was built 14/09/2026, measured working within ±26° per its own comments, then
 * abandoned wholesale and never wired into this component (see MascotRevamp.prompt.md, "Đã kiểm
 * chứng bằng ảnh thật 2026-09-16"). Re-measured here with `node tools/shoot.mjs` screenshots at
 * 300/700/1000px before touching any pose:
 * - `head`/`face` rotated TOGETHER around RIG_JOINTS.head: clean up to -26° (no seam at the
 *   neck/collar at any size tested). Safe for a real head-tilt pose.
 * - `armL`/`armR` rotated around their shoulder joint: a real seam (a stray cream sliver from the
 *   JOINT_PATCH disc peeking past the collar) is visible starting ~8-10° and grows continuously
 *   with angle — there is no clean cutoff at 26°, the old comment's threshold was already at the
 *   edge of visible breakage, not a safe zone. At slide size (300px, real production size) the
 *   sliver is imperceptible through ~15°, faint at 20°, clearly visible by 26°+. At QA card size
 *   (700-860px) it is visible on close inspection from ~12-15° on.
 * Conclusion: arm rig rotation is capped at 14° here — enough to read as "tay hạ nhẹ hơn" / a
 * clearer wave or point, not enough to expose the shoulder seam at any QA size. Head tilt is not
 * capped as tightly (18°) since it measured clean well past that.
 *
 * Regions are computed once from the same 417 approved paths (`REVAMP_PATHS`) — no artwork is
 * duplicated or hand-edited. Existing poses never call this path; only the four `rig:` poses
 * below do, so nothing already rendered in a shipped video changes.
 */
const RIG_REGIONS = buildRegions(REVAMP_PATHS);
const RIG_SHARED_SET = new Set(RIG_REGIONS.shared);
const RIG_ARM_CAP = 14; // degrees — see measurement note above; do not raise without re-shooting QA.
const RIG_HEAD_CAP = 22; // degrees — head/face measured clean to -26°; kept a margin below that.
// Positive head tilt cap — MEASURED SEPARATELY 2026-09-17 with a dedicated probe page shot at
// 300/700/1000px (`mascot-rig-probe.html`, deleted after use), not assumed to mirror RIG_HEAD_CAP
// just because the artwork isn't symmetric left/right. At +22° the neck/collar and both ear tips
// are clean at all three sizes — same result as the -22° `headTiltReal` pose, so this direction
// gets the same cap. Do not raise past 22° without re-shooting.
const RIG_HEAD_CAP_POS = 22;

/*
 * LEXCE revamp — emotion changes facial features, pose adds readable action cues.
 * All current poses render the approved full-body vector on one upright axis;
 * only leanFoot keeps the original tilted stance.
 */

export const LEXCE_EMOTIONS = Object.freeze([
  'idle', 'wave', 'happy', 'excited', 'sad', 'surprised', 'thinking', 'serious', 'sleepy', 'love', 'talking',
]);

/**
 * Pose metadata and public names. The upright artwork uses bodyTilt only for
 * leanFoot and look for facial gaze; the remaining fields (liftL, liftR, tilt,
 * nod, swing) are retained for API compatibility with older lesson scripts but
 * are NOT read anywhere in the render path below — verified by screenshot diff
 * on 2026-09-16 (see MascotRevamp.prompt.md).
 *
 * Concretely: `stand`/`idle`/`handsDown`/`nod` render 100% pixel-identical —
 * same raised arms, same horizontal wings. `lookLeft`/`lookRight`/`profileLeft`/
 * `profileRight`/`think`/`curious`/`lookUp`/`lookDown`/`peek`/`shrug`/`leanIn`
 * differ only by a `look`-driven pupil shift of at most ~13 units in the
 * 1122×1402 viewBox (a few px at slide size ~300px, invisible in practice) —
 * the body/arms/wings never move. Only `leanFoot` (tilted stance) and `hop`
 * (jump) change the actual silhouette; `wave`/`waveRight`/`bigWave`/`point*`/
 * `teach`/`present`/`read`/`sketch`/`cheer`/`clap` add an ActionAccent overlay
 * (motion lines, prop) on top of the same identical base pose. Do not add new
 * "distinct pose" entries by tweaking liftL/liftR/tilt/nod/swing — they will
 * silently do nothing. A real new pose needs new source artwork; see prompt.md.
 */
export const POSE_SPEC = Object.freeze({
  // ── đứng yên ───────────────────────────────────────────────────────────────────────────
  // `stand` deliberately has no leg lift or body lean: safe default for dense lesson slides.
  stand: { liftL: -2, liftR: -3, bodyTilt: 0 },
  idle: { liftL: -2, liftR: -3, bodyTilt: 0 },
  // Original reference stance, kept for an occasional playful beat.
  leanFoot: { liftL: -2, liftR: -3, bodyTilt: -3, raisedFoot: true },
  handsDown: { liftL: -10, liftR: -18 },

  // ── chào ───────────────────────────────────────────────────────────────────────────────
  wave: { liftL: 2, look: -0.18, tilt: -3, bodyTilt: -1.5, swing: { part: 'armL', amp: 7, period: 18 } },
  waveRight: { liftR: 3, look: 0.18, tilt: 3, bodyTilt: 1.5, swing: { part: 'armR', amp: 7, period: 18 } },
  bigWave: { liftL: 4, look: -0.25, tilt: -5, bodyTilt: -3, lift: 10, swing: { part: 'armL', amp: 8, period: 15 } },

  // ── chỉ trỏ ─────────────────────────────────────────────────────────────────────────────
  point: { liftR: -8, liftL: -10, look: 0.55, tilt: 4, swing: { part: 'armR', amp: 2, period: 46 } },
  pointLeft: { liftL: -8, liftR: -12, look: -0.55, tilt: -4, swing: { part: 'armL', amp: 2, period: 46 } },
  pointUp: { liftR: 7, liftL: -10, look: 0.28, nod: -0.5, tilt: 4, swing: { part: 'armR', amp: 2.5, period: 40 } },
  pointDown: { liftR: -18, liftL: -10, look: 0.34, nod: 0.4, tilt: 5, swing: { part: 'armR', amp: 2, period: 44 } },

  // ── giảng / giới thiệu ─────────────────────────────────────────────────────────────────
  teach: { liftL: -10, liftR: -4, look: -0.14, swing: { part: 'armR', amp: 5, period: 52 } },
  read: { liftL: -8, liftR: -12, nod: 0.4, tilt: 1 },
  sketch: { liftL: -10, liftR: -5, look: 0.45, tilt: 3 },
  present: { liftR: -17, liftL: -10, look: 0.26, tilt: 2, swing: { part: 'armR', amp: 3, period: 58 } },
  leanIn: { bodyTilt: -5, look: -0.3, liftL: -6, liftR: -8, tilt: -3 },

  // ── cảm thán ───────────────────────────────────────────────────────────────────────────
  cheer: { liftL: 5, liftR: 6, lift: 8, bodyTilt: -1, swing: { part: 'both', amp: 4, period: 17 } },
  clap: { liftL: 5, liftR: 6, swing: { part: 'both', amp: 4.5, period: 9 } },
  hop: { liftL: 4, liftR: 5, lift: 100, bodyTilt: -2, swing: { part: 'both', amp: 3.5, period: 14 } },
  shrug: { liftL: -10, liftR: -15, tilt: 4, nod: -0.2, look: 0.2 },

  // ── đầu: ngoảnh, cúi, ngẩng, nghiêng ───────────────────────────────────────────────────
  think: { liftR: 7, liftL: -10, look: -0.34, tilt: -7, swing: { part: 'head', amp: 1.6, period: 88 } },
  curious: { tilt: -11, look: -0.3, nod: -0.15, liftL: -6 },
  nod: { nod: 0.5, tilt: 1, liftL: -8, liftR: -10, swing: { part: 'head', amp: 2.4, period: 26 } },
  lookUp: { nod: -0.55, tilt: -3, look: 0.15, liftR: -8 },
  lookDown: { nod: 0.6, tilt: 3, look: 0.2, liftL: -8, liftR: -10 },
  lookLeft: { look: -0.85, tilt: -5, liftL: -6 },
  lookRight: { look: 0.85, tilt: 5, liftR: -6 },
  profileLeft: { look: -1, tilt: 0, nod: 0.05, liftL: -8, liftR: -10, bodyTilt: 0 },
  profileRight: { look: 1, tilt: 0, nod: 0.05, liftL: -10, liftR: -8, bodyTilt: 0 },
  peek: { look: 0.95, tilt: 8, bodyTilt: 4, nod: 0.15, liftR: -10 },

  // ── rig thật: xoay riêng tay/đầu quanh khớp (revampRig.js), biên độ đã đo bằng ảnh ──────
  // Đây là pose MỚI, dùng field `rig` mà MascotRevamp THỰC SỰ đọc (không như liftL/liftR ở
  // trên). Không đổi hành vi của pose cũ nào. Biên độ giữ trong vùng đã đo sạch — xem chú
  // thích RIG_ARM_CAP/RIG_HEAD_CAP phía trên import.
  armsSlightDown: { rig: { armR: RIG_ARM_CAP, armL: -RIG_ARM_CAP } },
  waveReal: { rig: { armLWave: true }, look: -0.18 },
  pointRealR: { rig: { armR: RIG_ARM_CAP }, look: 0.5, tilt: 3 },
  headTiltReal: { rig: { head: -RIG_HEAD_CAP }, look: -0.2 },

  // ── rig thật, lô mở rộng 2026-09-17: xem chú thích "Lô mở rộng" phía dưới POSE_SPEC ─────
  shrugRealR: { rig: { armR: RIG_ARM_CAP } },
  explainTiltReal: { rig: { head: RIG_HEAD_CAP / 2, armR: RIG_ARM_CAP }, look: 0.35 },
  headTiltRealR: { rig: { head: RIG_HEAD_CAP_POS }, look: 0.2 },
  armsEaseReal: { rig: { armL: 9, armR: 9 } },

  // ── rig thật, lô mở rộng lần 3 2026-09-17: xem chú thích "Lô mở rộng lần 3" phía dưới POSE_SPEC
  pointRealL: { rig: { armL: RIG_ARM_CAP }, look: -0.5, tilt: -3 },
  shrugRealL: { rig: { armL: RIG_ARM_CAP } },
  waveRealR: { rig: { armRWave: true }, look: 0.18 },
  explainBothReal: { rig: { armL: RIG_ARM_CAP, armR: RIG_ARM_CAP }, look: 0.1 },
  calmGestureReal: { rig: { armR: 6, head: 5 }, look: 0.15 },
});

/*
 * Lô mở rộng 2026-09-17 — bốn pose rig mới, TRONG đúng biên độ đã đo phía trên (RIG_ARM_CAP=14,
 * RIG_HEAD_CAP=22), trừ `headTiltRealR` dùng RIG_HEAD_CAP_POS riêng — xem hằng số và ghi chú ngay
 * trên import của file này về vì sao chiều dương KHÔNG đối xứng với chiều âm.
 * - `shrugRealR`: chỉ armR hạ tới cap, armL giữ nguyên — dáng "nhún vai" bất đối xứng.
 * - `explainTiltReal`: đầu nghiêng NỬA cap (11°, không dùng hết biên) + armR ra tới cap — dáng
 *   giải thích/point nhẹ.
 * - `headTiltRealR`: đầu nghiêng chiều DƯƠNG — đã tự shoot kiểm tra riêng, KHÔNG đối xứng với
 *   headTiltReal (chiều âm); xem RIG_HEAD_CAP_POS.
 * - `armsEaseReal`: hai tay cùng dấu (không phải gương nhau như armsSlightDown), biên độ 9° —
 *   nhẹ hơn các pose full-cap khác.
 *
 * Lô mở rộng lần 3 2026-09-17 — năm pose rig mới. `armL` DƯƠNG tĩnh (pointRealL, shrugRealL,
 * explainBothReal) và `armR` ÂM tới -6° khi wave (waveRealR ở đáy sóng) chưa từng xuất hiện trong
 * hai lô trước; tự dựng `mascot-rig-probe3.html` (xoá sau khi dùng), shoot ở size=300/700/1000
 * cho cả bốn tổ hợp mới, soi từng ảnh:
 * - `pointRealL`: armL:+14° tĩnh, gương `pointRealR`. Vai trái sạch ở cả ba size — cùng kết quả
 *   như armR:+14° vì JOINT_PATCH là đĩa tròn, xoay chiều nào cũng đối xứng về mặt hình học.
 * - `shrugRealL`: armL:+14° tĩnh, armR:0 — gương `shrugRealR`, cùng ảnh vai với pointRealL (chỉ
 *   khác look/tilt), sạch.
 * - `waveRealR`: animated armR quét -6°..+14° (gương công thức `armLWave` của `waveReal`, thêm
 *   nhánh `armRWave` trong `rigAngle`). Đáy sóng (armR:-6°, frame≈16) là lần đầu armR ÂM xuất
 *   hiện — sạch ở cả ba size, khớp lý luận đối xứng đĩa tròn ở trên.
 * - `explainBothReal`: armL:+14° VÀ armR:+14° CÙNG lúc — tổ hợp rủi ro nhất vì hai vùng xoay cùng
 *   lúc có thể hở khác khi xoay riêng lẻ. Soi kỹ cả hai vai cùng một khung ở 300/700/1000px: vai
 *   trái và vai phải đều sạch, không hở khe cổ áo, không đè lệch — không phát hiện tương tác xấu
 *   giữa hai vùng xoay đồng thời.
 * - `calmGestureReal`: armR:6°, head:5° — trong biên độ đã đo rộng rãi (nửa cap), rủi ro thấp;
 *   vẫn lên probe cho chắc, sạch ở mọi size.
 * Kết luận: cả năm pose giữ nguyên số đo đề xuất, không phải hạ biên độ.
 */

export const LEXCE_POSES = Object.freeze(Object.keys(POSE_SPEC));

const SHADOW_PATH = REVAMP_PATHS.findIndex(([, fill]) => fill === M.revampGround);

const TAU = Math.PI * 2;
const wave = (frame, period, offset = 0) => Math.sin((frame + offset) * TAU / period);
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const around = (cx, cy, rotate = 0, sx = 1, sy = 1, dx = 0, dy = 0) =>
  `translate(${cx + dx} ${cy + dy}) rotate(${rotate}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`;

function Sparkle({ x, y, size = 22, color = M.motion }) {
  return <path d={`M${x} ${y - size} Q${x + size * .24} ${y - size * .24} ${x + size} ${y} Q${x + size * .24} ${y + size * .24} ${x} ${y + size} Q${x - size * .24} ${y + size * .24} ${x - size} ${y} Q${x - size * .24} ${y - size * .24} ${x} ${y - size}Z`} fill={color} />;
}
function Heart({ x, y, size = 34 }) {
  return <path d={`M${x} ${y + size * .7} C${x - size * 1.5} ${y - size * .2} ${x - size * .7} ${y - size} ${x} ${y - size * .25} C${x + size * .7} ${y - size} ${x + size * 1.5} ${y - size * .2} ${x} ${y + size * .7}Z`} fill={M.tail} />;
}

function ExpressionMarks({ emotion, frame, animated }) {
  const float = animated ? wave(frame, 75) * 9 : 0;
  if (emotion === 'sad') return <path d="M721 445 Q742 461 725 485 Q707 468 721 445Z" fill={M.foot} stroke={M.suit} strokeWidth="4" />;
  if (emotion === 'surprised') return <Sparkle x={826} y={345 + float} size={17} color={M.motion} />;
  if (emotion === 'thinking') return <text x="818" y={320 + float} fontFamily="Arial, sans-serif" fontWeight="800" fontSize="95" fill={M.suit}>?</text>;
  if (emotion === 'sleepy') return <>
    <text x="819" y={323 + float} fontFamily="Arial, sans-serif" fontWeight="800" fontSize="76" fill={M.earInner}>Z</text>
    <text x="876" y={271 + float * .7} fontFamily="Arial, sans-serif" fontWeight="800" fontSize="51" fill={M.foot}>z</text>
  </>;
  if (emotion === 'love') return <>
    <Heart x={300} y={315 + float} size={30} />
    <Heart x={824} y={398 - float * .7} size={43} />
    <Heart x={887} y={315 + float * .5} size={21} />
  </>;
  if (emotion === 'happy' || emotion === 'excited') return <>
    <Sparkle x={319} y={333 + float} size={emotion === 'excited' ? 32 : 19} />
    <Sparkle x={829} y={376 - float} size={emotion === 'excited' ? 28 : 17} color={M.foot} />
    {emotion === 'excited' && <Sparkle x={893} y={449 + float * .6} size={15} />}
  </>;
  return null;
}

/** Small motion cues reinforce the action without replacing the approved character drawing. */
function ActionAccent({ pose, frame, animated }) {
  const pulse = animated ? wave(frame, 18) * 14 : 0;
  const line = { fill: 'none', stroke: M.revampSuit, strokeWidth: 20, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (pose === 'wave' || pose === 'bigWave') return <g data-lexce-action={pose} {...line}>
    <path d={`M134 ${312 + pulse} Q86 ${279 + pulse} 98 ${222 + pulse}`} />
    <path d={`M84 ${400 + pulse} Q34 ${371 + pulse} 47 ${311 + pulse}`} />
    <path d={`M105 ${479 + pulse} Q46 ${469 + pulse} 27 ${426 + pulse}`} />
  </g>;
  if (pose === 'waveRight') return <g data-lexce-action={pose} {...line}>
    <path d={`M991 ${413 + pulse} Q1068 ${388 + pulse} 1063 ${329 + pulse}`} />
    <path d={`M1031 ${509 + pulse} Q1111 ${488 + pulse} 1100 ${424 + pulse}`} />
    <path d={`M1010 ${594 + pulse} Q1090 ${590 + pulse} 1117 ${543 + pulse}`} />
  </g>;
  if (pose === 'point' || pose === 'pointLeft' || pose === 'pointUp' || pose === 'pointDown') {
    const left = pose === 'pointLeft';
    const end = pose === 'pointUp' ? [1082, 160] : pose === 'pointDown' ? [1090, 998]
      : left ? [34, 429] : [1112, 435];
    const start = left ? [224, 473] : [883, 619];
    return <g data-lexce-action={pose}>
      <path d={`M${start[0]} ${start[1]} L${end[0]} ${end[1]}`} fill="none" stroke={M.revampPointer} strokeWidth="32" strokeLinecap="round" />
      <circle cx={end[0]} cy={end[1]} r="29" fill={M.motion} stroke={M.revampSuit} strokeWidth="9" />
    </g>;
  }
  if (pose === 'teach' || pose === 'present') return <g data-lexce-action={pose} transform="translate(1134 675) scale(1.45) translate(-1134 -675) translate(25 255)">
    <path d="M791 460 Q791 426 825 426 H1075 Q1110 426 1110 460 V626 Q1110 660 1075 660 H916 L867 710 V660 H825 Q791 660 791 626 Z"
      fill="#fff" stroke={M.revampSuit} strokeWidth="16" />
    <path d="M835 495 H1063 M835 545 H1025 M835 595 H985" {...line} strokeWidth="16" />
  </g>;
  if (pose === 'read') return <g data-lexce-action={pose}>
    <path d="M291 636 Q421 600 558 662 Q692 598 825 636 L825 879 Q686 851 558 925 Q419 853 291 879 Z"
      fill="#fff" stroke={M.revampSuit} strokeWidth="19" strokeLinejoin="round" />
    <path d="M558 665 V920 M332 706 Q428 682 521 725 M332 765 Q428 742 521 783 M332 821 Q428 799 521 836 M597 724 Q689 680 786 706 M597 783 Q689 743 786 765 M597 838 Q689 799 786 823"
      fill="none" stroke={M.revampSuit} strokeWidth="10" strokeLinecap="round" />
  </g>;
  if (pose === 'sketch') return <g data-lexce-action={pose} transform="translate(1134 675) scale(1.45) translate(-1134 -675) translate(25 255)">
    <rect x="811" y="420" width="298" height="316" rx="24" fill="#fff" stroke={M.revampSuit} strokeWidth="18" />
    <circle cx="876" cy="501" r="23" fill={M.revampSuit} />
    <circle cx="1032" cy="518" r="23" fill={M.motion} />
    <circle cx="955" cy="658" r="23" fill={M.revampSuit} />
    <path d="M902 504 L1008 518 L966 635 L883 525" fill="none" stroke={M.revampSuit} strokeWidth="14" strokeLinecap="round" />
    <path d="M856 740 L955 658" fill="none" stroke={M.revampPointer} strokeWidth="27" strokeLinecap="round" />
    <circle cx="955" cy="658" r="17" fill={M.motion} />
  </g>;
  if (pose === 'cheer') return <g data-lexce-action={pose}>
    <Sparkle x={143} y={228 + pulse} size={50} color={M.motion} />
    <Sparkle x={1005} y={279 - pulse} size={50} color={M.motion} />
  </g>;
  if (pose === 'clap') return <g data-lexce-action={pose}>
    <Sparkle x={562} y={777 + pulse} size={48} color={M.motion} />
    <Sparkle x={432} y={748 - pulse} size={27} color={M.motion} />
    <Sparkle x={697} y={753 + pulse} size={27} color={M.motion} />
  </g>;
  if (pose === 'hop') return <g data-lexce-action={pose} {...line}>
    <path d="M281 1145 L257 1241 M340 1159 L338 1271 M778 1150 L815 1250" />
  </g>;
  return null;
}

/** All feature coordinates stay in the approved source artwork's coordinate system. */
function FaceOverlay({ emotion, blink = 1, mouthScale = 1, gaze = 0 }) {
  if (emotion === 'idle') return null;
  const eye = M.revampEye;
  const brow = M.revampBrow;
  const mouth = M.revampMouth;
  const is = (name) => emotion === name;
  const Eye = ({ cx, cy, wide = false, glance = 0, droop = false }) => <g transform={around(cx, cy, 0, 1, blink)}>
    <ellipse cx={cx} cy={cy} rx={wide ? 35 : 30} ry={wide ? 55 : droop ? 36 : 48} fill={eye} />
    <ellipse cx={cx + glance} cy={cy + 14} rx={wide ? 24 : 21} ry={wide ? 36 : 31} fill={M.revampSuit} />
    <circle cx={cx - 10 + glance} cy={cy - 18} r={wide ? 14 : 12} fill="#fff" />
    <circle cx={cx + 11 + glance} cy={cy + 23} r="6" fill="#fff" />
  </g>;
  const ArcEye = ({ cx, cy, sleepy = false }) => <path
    d={sleepy ? `M${cx - 34} ${cy} Q${cx} ${cy + 25} ${cx + 34} ${cy}` : `M${cx - 34} ${cy + 14} Q${cx} ${cy - 22} ${cx + 34} ${cy + 14}`}
    fill="none" stroke={eye} strokeWidth="12" strokeLinecap="round" />;
  const brows = is('talking') ? null : <g fill="none" stroke={brow} strokeWidth="17" strokeLinecap="round">
    {is('sad') ? <>
      <path d="M453 286 Q485 268 530 235" /><path d="M677 298 Q718 323 761 340" />
    </> : is('serious') ? <>
      <path d="M454 244 Q490 254 535 280" /><path d="M674 347 Q718 321 761 307" />
    </> : is('thinking') ? <>
      <path d="M451 241 Q488 209 531 235" /><path d="M680 318 Q720 305 760 332" />
    </> : is('sleepy') ? <>
      <path d="M453 271 Q491 262 529 275" /><path d="M680 329 Q721 322 760 340" />
    </> : <>
      <path d={is('surprised') || is('excited') ? 'M450 226 Q489 191 532 229' : 'M451 260 Q489 231 531 260'} />
      <path d={is('surprised') || is('excited') ? 'M680 289 Q720 260 762 298' : 'M680 320 Q721 293 761 326'} />
    </>}
  </g>;
  const eyes = is('happy') || is('excited') ? <>
    <ArcEye cx={482} cy={365} /><ArcEye cx={711} cy={423} />
  </> : is('sleepy') ? <>
    <ArcEye cx={482} cy={365} sleepy /><ArcEye cx={711} cy={423} sleepy />
  </> : is('wave') ? <>
    <ArcEye cx={482} cy={365} /><Eye cx={711} cy={423} />
  </> : is('serious') ? <>
    <g transform={around(482, 365, 0, 1, .58)}><Eye cx={482} cy={365} /></g>
    <g transform={around(711, 423, 0, 1, .58)}><Eye cx={711} cy={423} /></g>
  </> : is('love') ? <>
    <Heart x={482} y={372} size={34} /><Heart x={711} y={430} size={34} />
  </> : is('talking') ? null : <>
    <Eye cx={482} cy={365} wide={is('surprised')} droop={is('sad')} glance={(is('thinking') ? 11 : 0) + gaze * 13} />
    <Eye cx={711} cy={423} wide={is('surprised')} droop={is('sad')} glance={(is('thinking') ? 11 : 0) + gaze * 13} />
  </>;
  const grin = (large = false) => <>
    <path d={large ? 'M501 565 Q560 641 620 568 Q614 649 561 658 Q514 651 501 565Z' : 'M516 571 Q560 618 606 573 Q601 631 560 637 Q524 632 516 571Z'} fill={mouth} />
    <path d={large ? 'M518 591 Q559 609 602 592' : 'M531 589 Q560 603 591 589'} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
  </>;
  const lips = is('happy') || is('excited') ? grin(is('excited'))
    : is('love') || is('wave') ? grin(false)
    : is('sad') ? <path d="M517 618 Q559 567 606 615" fill="none" stroke={mouth} strokeWidth="12" strokeLinecap="round" />
    : is('surprised') ? <ellipse cx="558" cy="603" rx="31" ry="43" fill={mouth} />
    : is('thinking') ? <path d="M543 604 Q558 598 575 604" fill="none" stroke={mouth} strokeWidth="11" strokeLinecap="round" />
    : is('serious') ? <path d="M519 607 Q558 611 604 605" fill="none" stroke={mouth} strokeWidth="11" strokeLinecap="round" />
    : is('sleepy') ? <ellipse cx="558" cy="605" rx="23" ry="30" fill={mouth} />
    : is('talking') ? <g transform={around(558, 602, 0, 1, mouthScale)}><ellipse cx="558" cy="602" rx="34" ry="42" fill={mouth} /><ellipse cx="558" cy="582" rx="19" ry="11" fill="#fff" /></g>
    : null;
  return <g data-lexce-expression={emotion}>{brows}{eyes}{lips}</g>;
}

/**
 * Vector LEXCE 1122×1402 đã duyệt, dùng nguyên artwork cho mọi pose.
 * `size` là chiều cao artwork tính bằng pixel scene; x/y là góc trên-trái.
 * `frame=null` giữ một khung tĩnh, nhờ vậy card gallery luôn ra đúng một hình.
 */
export function MascotRevamp({
  emotion = 'idle', pose = null, at = null, size = null, x = null, y = null, facing = null,
  frame = null, talking = false, gesture = null, look = null, enter = false, opacity = 1,
}) {
  const spot = at && MASCOT_SPOTS[at];
  const px = x ?? spot?.x ?? 0;
  const py = y ?? spot?.y ?? 0;
  const height = size ?? spot?.size ?? 300;
  const dir = facing ?? spot?.facing ?? 'right';
  const mood = LEXCE_EMOTIONS.includes(emotion) ? emotion : 'idle';
  const poseName = (pose && POSE_SPEC[pose] && pose)
    || (gesture && POSE_SPEC[gesture] && gesture)
    || 'stand';
  const P = POSE_SPEC[poseName];
  const grounded = !P.raisedFoot && poseName !== 'hop';
  const flatUpright = poseName !== 'leanFoot';
  const animated = Number.isFinite(frame);
  const f = animated ? frame : 0;
  const activeTalk = talking || mood === 'talking';
  const energy = mood === 'excited' ? 1.9 : mood === 'happy' || mood === 'wave' ? 1.35 : mood === 'sad' || mood === 'sleepy' ? .45 : 1;

  /* ── nhịp toàn thân ─────────────────────────────────────────────────────────────────── */
  const bob = poseName === 'hop' ? -100 + (animated ? wave(f, 14) * 8 : 0)
    : poseName === 'leanFoot' && animated ? wave(f, 76) * 3 : 0;
  const tilt = poseName === 'leanFoot' ? (P.bodyTilt ?? 0) : 0;
  const breath = animated ? 1 + wave(f, 84) * .004 * energy : 1;
  const enterProgress = enter && animated ? clamp(f / 13, 0, 1) : 1;
  const enterLift = enter && animated ? (1 - enterProgress) ** 2 * 85 : 0;

  /* ── mặt ────────────────────────────────────────────────────────────────────────────── */
  const blinkCycle = ((f % 143) + 143) % 143;
  const blink = animated && blinkCycle > 132 && blinkCycle < 139
    ? Math.max(.08, Math.abs(blinkCycle - 135.5) / 3.5) : 1;
  const eyeY = (mood === 'sleepy' ? .18 : mood === 'happy' || mood === 'love' ? .73 : mood === 'sad' ? .82 : mood === 'surprised' ? 1.13 : 1) * blink;
  const eyeX = mood === 'surprised' ? 1.05 : 1;
  const browL = mood === 'sad' ? -13 : mood === 'serious' ? 8 : mood === 'thinking' ? -8 : 0;
  const browR = mood === 'sad' ? 13 : mood === 'serious' ? -8 : mood === 'thinking' ? -14 : 0;
  const browDy = mood === 'surprised' ? -20 : mood === 'serious' ? 12 : mood === 'sad' ? 10 : 0;
  const mouthScale = activeTalk && animated ? .8 + .28 * (1 + wave(f, 13)) : mood === 'excited' ? 1.13 : mood === 'happy' ? 1.06 : 1;

  /* ── nét mặt và chuyển động bàn tay ────────────────────────────────────────────── */
  const gaze = clamp(look ?? P.look ?? 0, -1, 1);
  const handJitter = {
    leftHand: animated && gesture === 'teach' ? wave(f, 45) * 3 : 0,
    rightHand: animated && gesture === 'point' ? -5 + wave(f, 37) * 2 : animated && gesture === 'teach' ? wave(f, 45, 13) * 3 : 0,
  };
  const partTransform = {
    leftEye: around(482, 365, 0, eyeX, eyeY, gaze * 36),
    rightEye: around(711, 423, 0, eyeX, eyeY, gaze * 36),
    leftBrow: around(504, 248, browL, 1, 1, 0, browDy),
    rightBrow: around(745, 311, browR, 1, 1, 0, browDy),
    mouth: around(558, 550, 0, 1, mouthScale),
    leftHand: around(255, 500, handJitter.leftHand),
    rightHand: around(852, 680, handJitter.rightHand),
  };

  const drawPath = (index) => {
    const [d, fill, transform, part] = REVAMP_PATHS[index];
    if (index === SHADOW_PATH && poseName === 'hop') return null;
    if (part === 'mouth' && mood !== 'idle') return null;
    if (mood !== 'idle' && mood !== 'talking' && ['leftEye', 'rightEye', 'leftBrow', 'rightBrow'].includes(part)) return null;
    const path = <path key={index} d={d} fill={fill} transform={transform} />;
    return part === 'base' ? path : <g key={index} transform={partTransform[part]}>{path}</g>;
  };

  /*
   * Rig path — only entered for the four `rig:` poses above. Splits REVAMP_PATHS into the
   * cutout-puppet regions (revampRig.js), rotates armR/armL/head by the measured-safe angle,
   * and redraws the shared base paths clipped to each region's own polygon (that clip step is
   * what `revampRig.js`'s own comment calls out and the abandoned prototype skipped — leaving it
   * out is exactly what produced the shoulder-seam artifact re-measured here on 2026-09-17).
   */
  const rigSpec = P.rig;
  // Shared wave curve for either arm: sweeps -6°..+RIG_ARM_CAP, static hold at RIG_ARM_CAP*0.4.
  // armRWave (lô mở rộng lần 3) mirrors the armLWave formula used by waveReal — same joint
  // physics (circular JOINT_PATCH, rotation-direction-invariant), re-verified for armR via
  // mascot-rig-probe3.html before shipping (see the "Lô mở rộng lần 3" note above POSE_SPEC).
  const armWave = animated ? clamp(-6 + (wave(f, 20) + 1) / 2 * (RIG_ARM_CAP + 6), -6, RIG_ARM_CAP) : RIG_ARM_CAP * 0.4;
  const rigAngle = {
    armR: rigSpec?.armRWave ? armWave : (rigSpec?.armR ?? 0),
    armL: rigSpec?.armLWave ? armWave : (rigSpec?.armL ?? 0),
    head: rigSpec?.head ?? 0,
    face: rigSpec?.head ?? 0, // head and face tilt together — see safety note above the imports.
  };
  const wrappedPath = (index) => {
    if (flatUpright && (index === 0 || index === 2)) {
      return <g key={`w${index}`} clipPath="url(#lexce-flat-bottom-cut)">{drawPath(index)}</g>;
    }
    return drawPath(index);
  };
  const renderRigBody = () => {
    const maskId = 'lexce-rig-body-mask';
    return <>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1122" height="1402">
          <rect x="0" y="0" width="1122" height="1402" fill="#fff" />
          {BODY_MASK_HOLES.map((d, i) => <path key={i} d={d} fill="#000" />)}
        </mask>
      </defs>
      {REGION_ORDER.map((key) => {
        if (key === 'body') {
          // Mask chỉ nên áp cho path nền dùng chung (shared) — path riêng của body (ví dụ logo
          // VinUni trên ngực) không nằm dưới đầu/tay nên không cần cắt lỗ; mask cả nhóm che mất
          // luôn những path nhỏ này nếu bbox của chúng chồng lên vùng lỗ head/armL/armR.
          const bodyShared = RIG_REGIONS.body.filter((i) => RIG_SHARED_SET.has(i));
          const bodyOwn = RIG_REGIONS.body.filter((i) => !RIG_SHARED_SET.has(i));
          return <g key="body">
            <g mask={`url(#${maskId})`}>{bodyShared.map(wrappedPath)}</g>
            {bodyOwn.map(wrappedPath)}
          </g>;
        }
        const angle = rigAngle[key] ?? 0;
        const patch = JOINT_PATCHES.find((p) => p.name === key);
        const shared = RIG_REGIONS[key].filter((i) => RIG_SHARED_SET.has(i));
        const own = RIG_REGIONS[key].filter((i) => !RIG_SHARED_SET.has(i));
        const [jx, jy] = RIG_JOINTS[key];
        const clipId = `lexce-rig-clip-${key}`;
        return <g key={key}>
          {patch && <g clipPath={`url(#lexce-rig-patch-${key})`}>
            <clipPath id={`lexce-rig-patch-${key}`} clipPathUnits="userSpaceOnUse">
              <circle cx={patch.cx} cy={patch.cy} r={patch.r} />
            </clipPath>
            {RIG_REGIONS.shared.map(wrappedPath)}
          </g>}
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse"><path d={polyToPath(RIG_POLYS[key])} /></clipPath>
          <g transform={angle ? `rotate(${angle} ${jx} ${jy})` : undefined}>
            <g clipPath={`url(#${clipId})`}>{shared.map(wrappedPath)}</g>
            {own.map(wrappedPath)}
          </g>
        </g>;
      })}
      {/*
       * Huy hiệu ngực (BADGE_PATHS) đã được ép về vùng `body` trong buildRegions(), nhưng thứ tự vẽ
       * theo REGION_ORDER (body trước, armR sau cùng) vẫn để tay đè lên nó ở tư thế nghỉ — đúng chỗ
       * mà bản flat (không rig) không gặp vì giữ nguyên thứ tự index gốc. Vẽ lại một lần nữa, không
       * mask/không clip, ở lớp trên cùng để huy hiệu luôn hiện đúng như bản không rig — đo bằng ảnh
       * thật 17/09/2026 (reports/mascot-qa/actions-f16.png trước/sau).
       */}
      {BADGE_PATHS.map(wrappedPath)}
    </>;
  };

  const occupies = `${Math.round(px)},${Math.round(py)},${Math.round(height * 1122 / 1402)},${Math.round(height)}`;
  return <g transform={`translate(${px} ${py}) scale(${height / 1402})`}
    opacity={opacity * enterProgress} data-vk-occupies={occupies}
    data-emotion={mood} data-pose={poseName} data-spot={at ?? 'custom'}>
    <g transform={dir === 'left' ? 'translate(1122 0) scale(-1 1)' : undefined}>
      {poseName === 'hop' && <ellipse cx="561" cy="1270" rx="305" ry="19" fill={M.revampGround} />}
      <g transform={`translate(0 ${bob + enterLift}) ${around(561, 950, tilt, breath, 1 / breath)}`}>
        {grounded && <ellipse cx="561" cy="1260" rx="350" ry="20" fill={M.revampGround} />}
        <g transform={poseName === 'leanFoot' ? undefined : 'translate(60 100) scale(.93) rotate(-12 566 700)'}>
            {flatUpright && <defs>
              <clipPath id="lexce-flat-bottom-cut" clipPathUnits="userSpaceOnUse">
                <rect x="-100" y="-100" width="1400" height="1280" />
              </clipPath>
            </defs>}
            {rigSpec ? renderRigBody() : REVAMP_PATHS.map((_, index) => {
              if (flatUpright && index === SHADOW_PATH) return null;
              // The source's cream underpaint and outer outline extend below the feet.
              // Clip only those two paths; the suit and feet keep their full silhouettes.
              if (flatUpright && (index === 0 || index === 2)) return <g key={index} clipPath="url(#lexce-flat-bottom-cut)">{drawPath(index)}</g>;
              return drawPath(index);
            })}
            <g transform={rigAngle.head ? `rotate(${rigAngle.head} ${RIG_JOINTS.head[0]} ${RIG_JOINTS.head[1]})` : undefined}>
              <FaceOverlay emotion={mood} blink={blink} mouthScale={mouthScale} gaze={gaze} />
              <ExpressionMarks emotion={mood} frame={f} animated={animated} />
            </g>
            <ActionAccent pose={poseName} frame={f} animated={animated} />
        </g>
      </g>
    </g>
  </g>;
}

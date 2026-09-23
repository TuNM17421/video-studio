/**
 * CÁI CÂN — carrier xuyên suốt `d05-v01-hypothesis-to-mvp` (~12 phút, 31 cảnh).
 *
 * Một ẩn dụ duy nhất đi hết phim: **một cái cân hai đĩa**. Đĩa TRÁI = CÔNG SỨC bỏ ra (lạnh,
 * `accentA`), đĩa PHẢI = TÍN HIỆU học được về người dùng (ấm, `accentB`). Mọi chương chỉ đổi
 * THAM SỐ của chính cái cân đó, không ai vẽ lại một cái cân mới:
 *
 *   cold open  `p` 0→1 (dựng ra) · `left` chất đầy · `right` rỗng bật lên cao
 *   C1         `right` nhận ba dấu hỏi · `left` nhẹ đi (xây rẻ)
 *   C2         hai đĩa nhận hai khối lệch nhau mười ba ngày
 *   C3         (cân lùi thành đường chân trời — nội dung chiếm khung)
 *   C4         `lift` nhấc hẳn khối AI ra khỏi đĩa trái · `right` nặng nhất phim
 *   C5         (cân lùi) · outro `hooks` bốn cái móc nhấc bớt đĩa trái
 *   outro-next `scale` thu nhỏ còn một biểu tượng trong trang tài liệu
 *
 * Bốn luật của `styles/poster.md` được giữ: nhận `T`/`at` chứ không nhận `frame`; không
 * `Math.random`/`Date`/`window`; `style` của người gọi trải ra TRƯỚC khoá riêng; mọi hình KHỐI vẽ
 * bằng `<path>` chứ không `<rect>` (gate `data-vk-occupies` của `verify` đếm mọi `<rect>`, kể cả
 * rect trong `<clipPath>`, là "hộp nằm dưới mascot").
 *
 * MÀU đọc qua `usePosterTheme()` — file này không chứa một hex nào.
 */
import React from 'react';
import { POSTER_FONT as FONT, alpha } from '../tokens.js';
import { clamp, Easing } from './engine.jsx';
import { usePosterTheme } from './theme.jsx';
import { SceneFitContext, boxPath } from './vach.jsx';

export const W = 1600;
export const H = 900;
export { boxPath };

/**
 * Hình học ĐÓNG BĂNG. Quy về lưới của `kit.jsx`:
 *
 *   y 183      mép dưới chrome VinUni (220 px thật ÷ 1,2)
 *   y 372      TRỤC cân (`pivot.y`) — beam quay quanh đây
 *   y 482      mặt đĩa ở thế thăng bằng (`pivot.y + cord`)
 *   y 770      chân đế (`baseY`)
 *   y > 812    CẤM — thanh phụ đề bắt đầu ở 984 ÷ 1,2 = 820
 *
 * `arm` 470 + `tiltMax` 13° ⇒ đầu đòn lệch tối đa ±106 px: đĩa dưới cùng chạm 588, nhãn dưới đĩa
 * chạm 672, vẫn trên chân đế. Khối chất lên đĩa mọc LÊN nên đĩa nào bay cao thì chồng khối của nó
 * mỏng — đúng nghĩa.
 */
export const CAN = Object.freeze({
  pivot: { x: 800, y: 372 },
  arm: 470,
  beam: 13,
  cord: 150,
  panW: 300,
  panLip: 30,
  baseY: 770,
  tiltMax: 13,
  labelDy: 84,
  blockH: 34,
  leftLabel: 'CÔNG SỨC',
  rightLabel: 'TÍN HIỆU',
  /* DẢI CARRIER khi cân LÙI LẠI: chỉ còn ĐÒN CÂN nằm ở đáy khung, y 776 ± 36 (tilt trần 8°).
     Nội dung cảnh dừng ở y 720, thanh phụ đề bắt đầu ở 820 — đòn nằm gọn giữa hai mốc đó. */
  horizon: { y: 776, half: 300, tiltCap: 8, plate: 122 },
});

/** Độ nghiêng (độ, DƯƠNG = đĩa TRÁI chìm) từ hai mức tải 0…1. */
export const tiltFor = (left = 0, right = 0, max = CAN.tiltMax) =>
  clamp((left - right) * max * 1.35, -max, max);

/** Tâm đĩa ở độ nghiêng `tilt` — dùng ở cảnh để đặt vật thể rơi đúng chỗ. */
export function panAt(side, tilt = 0, { shift = 0 } = {}) {
  const th = (-tilt * Math.PI) / 180;
  const ax = side === 'left' ? -CAN.arm : CAN.arm;
  return {
    x: CAN.pivot.x + shift + ax * Math.cos(th),
    y: CAN.pivot.y + ax * Math.sin(th) + CAN.cord,
  };
}

/** Lớp SVG 1600×900 cho cái cân và mọi thứ vẽ chung hệ toạ độ với nó. */
export function CanLayer({ children, zIndex = 5, style }) {
  const fit = React.useContext(SceneFitContext);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      style={{ ...style, position: 'absolute', left: 0, top: 0, zIndex }}
    >
      {fit ? <g transform={fit}>{children}</g> : children}
    </svg>
  );
}

/** Chữ SVG trong cùng lớp với cân — `verify` đọc `<text>`, không đọc `<div>`. */
export function CanText({
  x, y, size = 22, weight = 700, color, anchor = 'middle', opacity = 1, letterSpacing, children,
}) {
  const th = usePosterTheme();
  return (
    <text
      x={x}
      y={y}
      fontFamily={FONT}
      fontSize={size}
      fontWeight={weight}
      fill={color || th.inkMuted}
      textAnchor={anchor}
      letterSpacing={letterSpacing}
      opacity={opacity}
      dominantBaseline="middle"
    >
      {children}
    </text>
  );
}

/** Một khối CÔNG SỨC: hộp bo góc có mặt trên sáng hơn, nên nó đọc ra là VẬT chứ không phải ô màu. */
export function Block({ x, y, w = 96, h = CAN.blockH, ink, opacity = 1, label, labelSize = 19 }) {
  const th = usePosterTheme();
  const c = ink || th.accentA;
  return (
    <g opacity={opacity}>
      <path d={boxPath(x - w / 2, y - h, w, h, 6)} fill={alpha(c, 0.22)} />
      <path d={boxPath(x - w / 2, y - h, w, h, 6)} fill="none" stroke={c} strokeWidth={3} />
      {label ? (
        <text
          x={x} y={y - h / 2} fontFamily={FONT} fontSize={labelSize} fontWeight={800}
          fill={th.ink} textAnchor="middle" dominantBaseline="middle"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

/** Dấu hỏi — thứ chất lên đĩa TÍN HIỆU. Vẽ bằng `<text>` để nó là chữ thật, `verify` đọc được. */
export function QMark({ x, y, size = 44, ink, opacity = 1 }) {
  const th = usePosterTheme();
  return (
    <text
      x={x} y={y} fontFamily={FONT} fontSize={size} fontWeight={800}
      fill={ink || th.accentB} textAnchor="middle" dominantBaseline="middle" opacity={opacity}
    >
      ?
    </text>
  );
}

/** Một xấp tiền — tín hiệu NẶNG NHẤT của phim (C4). */
export function Cash({ x, y, w = 128, h = 30, ink, opacity = 1, count = 3 }) {
  const th = usePosterTheme();
  const c = ink || th.positive;
  return (
    <g opacity={opacity}>
      {Array.from({ length: count }, (_, i) => (
        <path
          key={`bill${i}`}
          d={boxPath(x - w / 2 + i * 4, y - h - i * (h * 0.52), w, h, 5)}
          fill={alpha(c, 0.2)} stroke={c} strokeWidth={3}
        />
      ))}
    </g>
  );
}

/** Một đĩa cân: dây treo + lòng đĩa + (tuỳ chọn) nhãn dưới đĩa. */
function Pan({ side, tilt, shift, ink, p, label, labelOn, dim }) {
  const th = usePosterTheme();
  const end = panAt(side, tilt, { shift });
  const topY = end.y - CAN.cord;
  const half = (CAN.panW / 2) * p;
  if (p <= 0.02) return null;
  return (
    <g>
      <line x1={end.x} y1={topY} x2={end.x - half * 0.74} y2={end.y} stroke={ink} strokeWidth={2.4} opacity={0.75} />
      <line x1={end.x} y1={topY} x2={end.x + half * 0.74} y2={end.y} stroke={ink} strokeWidth={2.4} opacity={0.75} />
      {th.halo === 'shadow' ? (
        <path d={boxPath(end.x - half, end.y + 5, half * 2, CAN.panLip, 9)} fill={alpha(th.ink, 0.08)} />
      ) : null}
      <path d={boxPath(end.x - half, end.y - 3, half * 2, CAN.panLip, 9)} fill={alpha(ink, 0.16)} stroke={ink} strokeWidth={4} />
      {label && labelOn > 0.02 ? (
        <text
          x={end.x} y={end.y + CAN.labelDy} fontFamily={FONT} fontSize={30} fontWeight={800}
          fill={ink} textAnchor="middle" dominantBaseline="middle" letterSpacing={2.4} opacity={labelOn}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

/** Một cái móc nhấc bớt đĩa trái (outro). */
function Hook({ x, y, ink, opacity }) {
  return (
    <g opacity={opacity}>
      <path d={`M${x} ${y}V${y - 42}`} stroke={ink} strokeWidth={5} strokeLinecap="round" fill="none" />
      <path
        d={`M${x - 15} ${y}a15 15 0 0 0 30 0a15 15 0 0 0 -30 0`}
        fill="none" stroke={ink} strokeWidth={5}
      />
      <path d={`M${x - 11} ${y - 48}L${x} ${y - 64}L${x + 11} ${y - 48}`} fill="none" stroke={ink} strokeWidth={5} strokeLinecap="round" />
    </g>
  );
}


/**
 * ĐƯỜNG CHÂN TRỜI — cái cân khi nó LÙI LẠI nhường khung cho nội dung.
 *
 * Không phải "cân mờ đi": nó rút về còn ĐÒN CÂN + hai mâm con, nằm trong dải carrier y 740…812 mà
 * cả phim chừa sẵn. Độ nghiêng giữ nguyên câu chuyện (đĩa nào đang nặng) nên người xem vẫn đọc
 * được trạng thái ở mọi cảnh, còn nội dung thì có trọn y 200…720.
 */
function Horizon({ tilt, left, right, ink, inkR, inkBase, shadow, opacity }) {
  const HZ = CAN.horizon;
  const t = clamp(tilt, -HZ.tiltCap, HZ.tiltCap);
  const a = (-t * Math.PI) / 180;
  const ex = HZ.half * Math.cos(a);
  const ey = HZ.half * Math.sin(a);
  const pip = (load, cx, cy, c) => {
    const n = Math.min(3, Math.round(clamp(load, 0, 1) * 3 + 0.001));
    return Array.from({ length: n }, (_, i) => (
      <path key={`p${i}`} d={boxPath(cx - 33 + i * 24, cy - 22, 18, 16, 3)} fill={alpha(c, 0.35)} stroke={c} strokeWidth={2} />
    ));
  };
  return (
    <g opacity={opacity}>
      {shadow ? (
        <line x1={800 - ex} y1={HZ.y - ey + 9} x2={800 + ex} y2={HZ.y + ey + 9} stroke={alpha(inkBase, 0.14)} strokeWidth={9} strokeLinecap="round" />
      ) : null}
      <line x1={800 - ex} y1={HZ.y - ey} x2={800 + ex} y2={HZ.y + ey} stroke={inkBase} strokeWidth={9} strokeLinecap="round" />
      <path d={`M${800 - 22} ${HZ.y + 40}L800 ${HZ.y - 2}L${800 + 22} ${HZ.y + 40}Z`} fill={alpha(inkBase, 0.2)} stroke={inkBase} strokeWidth={3} />
      <line x1={800 - ex - HZ.plate / 2} y1={HZ.y - ey + 6} x2={800 - ex + HZ.plate / 2} y2={HZ.y - ey + 6} stroke={ink} strokeWidth={9} strokeLinecap="round" />
      <line x1={800 + ex - HZ.plate / 2} y1={HZ.y + ey + 6} x2={800 + ex + HZ.plate / 2} y2={HZ.y + ey + 6} stroke={inkR} strokeWidth={9} strokeLinecap="round" />
      {pip(left, 800 - ex, HZ.y - ey + 4, ink)}
      {pip(right, 800 + ex, HZ.y + ey + 4, inkR)}
    </g>
  );
}

/**
 * `Can` — CARRIER. Mọi tham số là hàm thuần của cảnh; không có state, không RAF.
 *
 * @param p        0…1 tiến độ DỰNG RA của cả cái cân (chân đế → cột → đòn → hai đĩa)
 * @param tilt     độ, **DƯƠNG = đĩa TRÁI chìm**. Bỏ trống thì suy từ `left`/`right`
 * @param left     0…1 tải đĩa trái — chỉ để suy `tilt`; khối vẽ qua `leftItems`
 * @param right    0…1 tải đĩa phải
 * @param leftItems  / `rightItems` — `[{ kind, label, tone, on }]` xếp chồng LÊN từ mặt đĩa
 * @param shift    cả cái cân trượt ngang (px)
 * @param lift     0…1 khối "AI" bị nhấc khỏi đĩa trái bay lên khỏi khung (C4)
 * @param hooks    0…4 số móc đã gắn vào đĩa trái (outro)
 * @param scale    thu/phóng quanh trục (outro-next thu còn một biểu tượng)
 * @param dim      cân lùi thành ĐƯỜNG CHÂN TRỜI mờ — vẫn có mặt, không biến mất giữa phim
 */
export function Can({
  T = 0,
  p = 1,
  tilt,
  left = 0,
  right = 0,
  leftItems,
  rightItems,
  shift = 0,
  lift = 0,
  hooks = 0,
  scale = 1,
  labels = true,
  labelsOn,
  leftLabel = CAN.leftLabel,
  rightLabel = CAN.rightLabel,
  dim = false,
  opacity = 1,
  style,
}) {
  const th = usePosterTheme();
  const live = clamp(p, 0, 1);
  const t = typeof tilt === 'number' ? tilt : tiltFor(left, right);
  const d = clamp(typeof dim === 'number' ? dim : (dim ? 1 : 0), 0, 1);
  // `dim` KHÔNG đổi màu, chỉ hạ độ hiện + bỏ nhãn: đổi sang `line` (#e0edf8) thì trên nền trắng
  // carrier biến mất hẳn, đúng thứ `vach-boundary` không bắt được vì nó đọc state chứ không đọc mắt.
  const inkL = th.accentA;
  const inkR = th.accentB;
  const inkBase = th.lineStrong;
  const labOn = labels ? clamp((labelsOn ?? live * 1.4 - 0.4) * (1 - d), 0, 1) : 0;

  const pv = { x: CAN.pivot.x + shift, y: CAN.pivot.y };
  const th_ = (-t * Math.PI) / 180;
  const ex = CAN.arm * Math.cos(th_) * live;
  const ey = CAN.arm * Math.sin(th_) * live;

  // Thứ tự DỰNG: chân đế (đứng vững trước) → cột → đòn → hai đĩa. Mỗi chặng một phần ba của `p`.
  const pBase = clamp(live / 0.34, 0, 1);
  const pCol = clamp((live - 0.22) / 0.34, 0, 1);
  const pBeam = clamp((live - 0.46) / 0.34, 0, 1);
  const pPan = clamp((live - 0.66) / 0.34, 0, 1);

  const r3 = (v) => Math.round(v * 1000) / 1000;
  const state = {
    p: r3(live), shift: r3(shift), tilt: r3(t), left: r3(left), right: r3(right),
    hooks: r3(hooks), lift: r3(lift), scale: r3(scale),
  };
  if (d > 0.001) state.dim = r3(d);

  const stack = (side, items) => {
    if (!items || !items.length) return null;
    const c = panAt(side, t, { shift });
    let y = c.y - 2;
    const out = [];
    items.forEach((it, i) => {
      const on = clamp(it.on ?? 1, 0, 1);
      if (on <= 0.01) return;
      const h = it.h ?? CAN.blockH;
      const rise = (1 - on) * 46;
      if (it.kind === 'q') {
        out.push(<QMark key={`it${i}`} x={c.x + (it.dx ?? 0)} y={y - 26 - rise} size={it.size ?? 46} ink={it.ink || inkR} opacity={on} />);
        y -= 52;
      } else if (it.kind === 'cash') {
        out.push(<Cash key={`it${i}`} x={c.x + (it.dx ?? 0)} y={y - rise} ink={it.ink || th.positive} opacity={on} count={it.count ?? 3} />);
        y -= h * 2.1;
      } else {
        out.push(
          <Block
            key={`it${i}`} x={c.x + (it.dx ?? 0)} y={y - rise} w={it.w ?? 104} h={h}
            ink={it.ink || (side === 'left' ? inkL : inkR)} opacity={on} label={it.label}
          />,
        );
        y -= h + 6;
      }
    });
    return out;
  };

  return (
    <g
      style={style}
      opacity={opacity}
      data-vk-carrier={JSON.stringify(state)}
      transform={scale === 1 ? undefined : `translate(${CAN.pivot.x * (1 - scale)} ${CAN.baseY * (1 - scale)}) scale(${scale})`}
    >
      {d < 0.999 && (
      <g opacity={1 - d}>
      {/* chân đế — cái cân phải ĐỨNG trên một mặt, nếu không nó là hình lơ lửng */}
      {pBase > 0.02 && (
        <g opacity={pBase}>
          <path d={boxPath(pv.x - 150 * pBase, CAN.baseY, 300 * pBase, 16, 8)} fill={alpha(inkBase, 0.2)} stroke={inkBase} strokeWidth={4} />
          <path d={`M${pv.x - 62} ${CAN.baseY}L${pv.x - 26} ${CAN.baseY - 54}H${pv.x + 26}L${pv.x + 62} ${CAN.baseY}Z`} fill={alpha(inkBase, 0.12)} />
        </g>
      )}

      {/* cột đứng + khớp trục */}
      {pCol > 0.02 && (
        <g opacity={pCol}>
          <line
            x1={pv.x} y1={CAN.baseY - 50} x2={pv.x} y2={CAN.baseY - 50 - (CAN.baseY - 50 - pv.y) * pCol}
            stroke={inkBase} strokeWidth={13} strokeLinecap="round"
          />
          <path d={`M${pv.x - 30} ${pv.y + 34}L${pv.x} ${pv.y - 4}L${pv.x + 30} ${pv.y + 34}Z`} fill={alpha(inkBase, 0.22)} stroke={inkBase} strokeWidth={4} />
        </g>
      )}

      {/* đòn cân — quay quanh trục; `pBeam` cắt theo BỀ NGANG nên nó MỌC RA từ trục ra hai đầu */}
      {pBeam > 0.02 && (
        <g opacity={pBeam}>
          {th.halo === 'shadow' ? (
            <line
              x1={pv.x - ex * pBeam} y1={pv.y - ey * pBeam + CAN.beam} x2={pv.x + ex * pBeam} y2={pv.y + ey * pBeam + CAN.beam}
              stroke={alpha(th.ink, 0.1)} strokeWidth={CAN.beam} strokeLinecap="round"
            />
          ) : null}
          <line
            x1={pv.x - ex * pBeam} y1={pv.y - ey * pBeam} x2={pv.x + ex * pBeam} y2={pv.y + ey * pBeam}
            stroke={inkBase} strokeWidth={CAN.beam} strokeLinecap="round"
          />
          <circle cx={pv.x} cy={pv.y} r={13} fill={th.bg} stroke={inkBase} strokeWidth={5} />
        </g>
      )}

      {pPan > 0.02 && (
        <React.Fragment>
          <Pan side="left" tilt={t} shift={shift} ink={inkL} p={pPan} label={leftLabel} labelOn={labOn} dim={dim} />
          <Pan side="right" tilt={t} shift={shift} ink={inkR} p={pPan} label={rightLabel} labelOn={labOn} dim={dim} />
          {stack('left', leftItems)}
          {stack('right', rightItems)}
        </React.Fragment>
      )}

      {/* khối AI bị NHẤC RA khỏi đĩa trái — bay lên và tan trước khi chạm mép chrome */}
      {lift > 0.01 && (() => {
        const c = panAt('left', t, { shift });
        const up = Easing.easeInOutQuad(clamp(lift, 0, 1));
        return (
          <Block
            x={c.x} y={c.y - 4 - up * 300} w={128} h={54} ink={th.negative}
            opacity={clamp(1.35 - up * 1.35, 0, 1)} label="AI" labelSize={28}
          />
        );
      })()}

      {/* móc nhấc đĩa trái */}
      {hooks > 0.01 && (() => {
        const c = panAt('left', t, { shift });
        const n = 4;
        return Array.from({ length: n }, (_, i) => {
          const on = clamp(hooks - i, 0, 1);
          if (on <= 0.02) return null;
          return <Hook key={`hk${i}`} x={c.x - 111 + i * 74} y={c.y - 2} ink={th.positive} opacity={on} />;
        });
      })()}
      </g>
      )}

      {d > 0.001 && (
        <Horizon
          tilt={t} left={left} right={right}
          ink={inkL} inkR={inkR} inkBase={inkBase}
          shadow={th.halo === 'shadow'} opacity={d}
        />
      )}
    </g>
  );
}

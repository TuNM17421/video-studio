import React from 'react';
import { evolvePath, getPointAtLength, getTangentAtLength, getLength, interpolatePath } from '@remotion/paths';
import { makeArrow, makeCallout, makePie, makeSpark } from '@remotion/shapes';
import { C, FONT } from '../../lib/tokens.js';
import { CLAMP, interpolate, spring } from '../../lib/motion.js';
import { readableInk } from '../../lib/paths.js';

/*
 * Hình học dựng bằng @remotion/shapes và @remotion/paths.
 *
 * Vì sao dùng: hai gói này chỉ trả về path data thuần (chuỗi `d` của SVG), KHÔNG kéo theo runtime
 * Remotion. Nên repo mượn được phần hình học chuẩn mà pipeline render frame-by-frame không đổi gì.
 *
 * Mọi chuyển động vẫn là hàm thuần của `frame` (xem lib/motion.js): cấm CSS animation, cấm giờ hệ
 * thống, cấm giá trị bất định.
 */

const FPS = 30;

/**
 * DrawPath — nét tự vẽ ra theo frame.
 *
 * Đây là thứ giá trị nhất trong nhóm: `evolvePath(progress, d)` trả về cặp
 * `strokeDasharray`/`strokeDashoffset` để nét hiện dần đúng tỉ lệ, không cần tự đo chiều dài.
 * Dùng cho mũi tên nối, viền khoanh, đường dẫn mắt người xem đi theo.
 */
export function DrawPath({
  frame = 0,
  d,
  from = 0,
  duration = 24,
  stroke = C.accent,
  strokeWidth = 5,
  fill = 'none',
  strokeLinecap = 'round',
  opacity = 1,
}) {
  const p = interpolate(frame, [from, from + duration], [0, 1], CLAMP);
  const { strokeDasharray, strokeDashoffset } = evolvePath(p, d);
  if (p <= 0) return null;
  return (
    <path
      d={d}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap={strokeLinecap}
      strokeDasharray={strokeDasharray}
      strokeDashoffset={strokeDashoffset}
      opacity={opacity}
    />
  );
}

/**
 * Callout — bong bóng chú thích có đuôi trỏ xuống một điểm.
 * `x,y` là ĐỈNH ĐUÔI (chỗ cần trỏ tới), không phải góc hộp, để đặt theo thứ muốn chú thích.
 */
export function Callout({
  frame = 0,
  x,
  y,
  width = 320,
  height = 92,
  text,
  from = 0,
  fill = C.bgAlt,
  stroke = C.accent,
  ink = C.text,
  fontSize = 26,
  pointerLeftOffset = null,
}) {
  const t = spring({ frame: Math.max(0, frame - from), fps: FPS, config: { damping: 15, stiffness: 180 } });
  if (frame < from) return null;
  const pointerHeight = 22;
  const pointerWidth = 26;
  const leftOffset = pointerLeftOffset ?? width / 2 - pointerWidth / 2;
  const { path } = makeCallout({ width, height, pointerHeight, pointerWidth, pointerLeftOffset: leftOffset, pointerOnRightSide: false });

  // Đặt sao cho đỉnh đuôi rơi đúng vào (x, y).
  const boxX = x - (leftOffset + pointerWidth / 2);
  const boxY = y - (height + pointerHeight);
  const rise = interpolate(t, [0, 1], [14, 0]);

  return (
    <g transform={`translate(${boxX} ${boxY + rise})`} opacity={interpolate(t, [0, 0.4], [0, 1], CLAMP)}>
      <path d={path} fill={fill} stroke={stroke} strokeWidth="3" />
      <text x={width / 2} y={height / 2 + fontSize * 0.35} textAnchor="middle" fontFamily={FONT} fontSize={fontSize} fontWeight="700" fill={ink}>
        {text}
      </text>
    </g>
  );
}

/** Pie — vòng tròn tỉ lệ, quét dần theo frame. Dùng khi câu đọc nêu một phần trăm. */
export function Pie({
  frame = 0,
  x,
  y,
  radius = 90,
  value = 0.5,
  from = 0,
  duration = 30,
  fill = C.accent,
  track = C.dotInactive,
  label = null,
  ink,
}) {
  // Nhãn nằm GIỮA hình, tức đè lên lát đã tô: mực navy trên nền accent xanh thì chìm hẳn.
  // Mặc định chọn mực theo độ sáng của `fill`; truyền `ink` để tự quyết.
  const labelInk = ink ?? readableInk(fill);
  const p = interpolate(frame, [from, from + duration], [0, value], CLAMP);
  const { path } = makePie({ radius, progress: Math.max(0.0001, p) });
  return (
    <g transform={`translate(${x - radius} ${y - radius})`}>
      <circle cx={radius} cy={radius} r={radius} fill={track} />
      <path d={path} fill={fill} />
      {label ? (
        <text x={radius} y={radius + 12} textAnchor="middle" fontFamily={FONT} fontSize={34} fontWeight="800" fill={labelInk}>
          {label}
        </text>
      ) : null}
    </g>
  );
}

/**
 * Spark — tia nhấn cho khoảnh khắc "à ra thế". Nảy lên rồi đứng, không nhấp nháy liên tục.
 *
 * `makeSpark` nhận `width`/`height` (hộp bao), KHÔNG nhận số cánh hay bán kính trong/ngoài —
 * truyền sai tên thì nó trả path toàn NaN và bỏ trống width/height, và NaN đó chui thẳng vào
 * attribute `transform`. Đây chính là lỗi `verify` bắt được; xem failure-modes FM-13.
 */
export function Spark({ frame = 0, x, y, radius = 54, from = 0, fill = C.red, edgeRoundness = 1 }) {
  const t = spring({ frame: Math.max(0, frame - from), fps: FPS, config: { damping: 11, stiffness: 220 } });
  if (frame < from) return null;
  const { path, width, height } = makeSpark({ width: radius * 2, height: radius * 2, edgeRoundness });
  const scale = interpolate(t, [0, 1], [0.2, 1]);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale}) translate(${-width / 2} ${-height / 2})`} opacity={interpolate(t, [0, 0.3], [0, 1], CLAMP)}>
      <path d={path} fill={fill} />
    </g>
  );
}

/**
 * Morph — một hình biến dần thành hình khác.
 *
 * `interpolatePath` của @remotion/paths tự chuẩn hoá hai path về cùng số lệnh rồi nội suy từng điểm,
 * nên hai hình khác hẳn nhau vẫn biến được. Đây là thứ tự viết tay rất khó và cũng là lý do đáng
 * mượn Remotion nhất trong cả nhóm.
 *
 * Dùng khi câu đọc nói "cái này TRỞ THÀNH cái kia" — ví dụ một khối vuông (yêu cầu thô) thành một
 * mũi tên (quyết định). Đừng dùng chỉ để cho đẹp: mắt người bám theo biến hình rất mạnh, nên nó
 * phải mang đúng một ý.
 */
export function Morph({ frame = 0, from: at = 0, duration = 24, a, b, x = 0, y = 0, fill = C.accent, stroke = 'none', strokeWidth = 0, opacity = 1 }) {
  const p = interpolate(frame, [at, at + duration], [0, 1], CLAMP);
  const d = interpolatePath(p, a, b);
  return <path d={d} transform={`translate(${x} ${y})`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />;
}

/**
 * Tracer — một chấm chạy dọc theo path, đầu chấm quay đúng hướng đang đi.
 *
 * `getPointAtLength` cho toạ độ, `getTangentAtLength` cho hướng. Dùng để DẪN MẮT người xem đi theo
 * một luồng (dữ liệu chạy qua pipeline, yêu cầu đi từ user tới hệ thống) — mạnh hơn vẽ mũi tên
 * đứng yên, vì mắt bám vật đang chuyển động.
 *
 * Một Tracer mỗi cảnh. Hai cái chạy cùng lúc thì không biết nhìn cái nào.
 */
export function Tracer({ frame = 0, d, from: at = 0, duration = 30, radius = 11, fill = C.red, trail = 0, opacity = 1 }) {
  if (frame < at) return null;
  const total = getLength(d);
  const p = interpolate(frame, [at, at + duration], [0, 1], CLAMP);
  const len = total * p;
  const { x, y } = getPointAtLength(d, len);
  const tan = getTangentAtLength(d, len);
  const angle = (Math.atan2(tan.y, tan.x) * 180) / Math.PI;
  return (
    <g opacity={opacity}>
      {trail > 0 ? (
        <path d={d} fill="none" stroke={fill} strokeWidth={2} strokeLinecap="round" opacity={0.28} strokeDasharray={`${len} ${total}`} />
      ) : null}
      <g transform={`translate(${x} ${y}) rotate(${angle})`}>
        <circle r={radius} fill={fill} />
        <circle cx={radius * 0.8} r={radius * 0.35} fill={C.bg} opacity={0.9} />
      </g>
    </g>
  );
}

/**
 * Arrow — mũi tên dựng bằng `makeArrow`, thay cho mũi tên vẽ tay bằng <path> trong từng scene.
 *
 * `x,y` là ĐUÔI mũi tên, `angle` là hướng nó chỉ (0 = sang phải). Mũi tên tự mọc dài ra theo frame,
 * nên nó đọc là "đi từ đây tới kia" chứ không phải một hình có sẵn.
 */
export function Arrow({ frame = 0, x, y, length = 160, angle = 0, from: at = 0, duration = 14, thickness = 12, fill = C.accent, opacity = 1 }) {
  const p = interpolate(frame, [at, at + duration], [0, 1], CLAMP);
  if (p <= 0) return null;
  const head = Math.min(length * 0.42, thickness * 3.2);
  const { path, width, height } = makeArrow({ triangleWidth: head, strokeWidth: thickness, height: head * 0.9 });
  const scale = (length * p) / width;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale}) translate(0 ${-height / 2})`} opacity={opacity}>
      <path d={path} fill={fill} />
    </g>
  );
}

import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { getLength, getPointAtLength } from '../../lib/paths.js';

/**
 * Một chấm chạy theo đường và ĐỂ LẠI VỆT — `MoveAlongPath` + `TracedPath` của Manim.
 *
 * Đây là hình của gradient descent: viên bi lăn xuống dốc, vệt phía sau là lịch sử các bước đã đi. Vệt
 * mới là phần quan trọng — không có nó thì chỉ là một chấm di chuyển, có nó thì người xem đọc được
 * "đường đi", tức là thuật toán.
 *
 *   <PathTrace d={curveD} t={linearProgress(frame, T.lan, T.het)} steps={8} label="mỗi bước một lần cập nhật" />
 *
 * `steps` > 0 thì chấm nhảy từng nấc thay vì trượt đều — đúng hơn cho thuật toán lặp, vì mỗi nấc là
 * một vòng lặp. `t` là tiến độ 0→1 dọc đường.
 */
export function PathTrace({
  d, t = 0, steps = 0, color = C.accent, traceColor, width = 5, dot = 11, showDots = true, opacity = 1,
}) {
  if (opacity <= 0.001 || !d) return null;
  const k = steps > 0 ? Math.round(clamp01(t) * steps) / steps : clamp01(t);
  const len = getLength(d) || 1;
  const head = getPointAtLength(d, len * k);
  const marks = [];
  if (showDots && steps > 0) {
    const done = Math.round(k * steps);
    for (let i = 1; i <= done; i += 1) marks.push(getPointAtLength(d, (len * i) / steps));
  }
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {/* đường đầy đủ ở mức khung: người xem biết có một con dốc, chưa biết sẽ đi tới đâu */}
      <path d={d} fill="none" stroke={C.text} strokeWidth={width * 0.6} opacity={0.15} strokeLinecap="round" />
      {/* vệt đã đi */}
      <path d={d} fill="none" stroke={traceColor ?? color} strokeWidth={width} strokeLinecap="round"
        strokeDasharray={`${len * k} ${len}`} />
      {marks.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={dot * 0.52} fill={C.bg} stroke={traceColor ?? color} strokeWidth={3} />)}
      {k > 0 ? <circle cx={head.x} cy={head.y} r={dot} fill={C.red} /> : null}
    </g>
  );
}

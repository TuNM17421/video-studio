import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';

/**
 * Nhấn TẠM THỜI vào một vật — ba kiểu của Manim, gói trong một component.
 *
 *   indicate    phình to rồi thu lại, đổi màu trong một nhịp
 *   flash       toả tia ra từ một điểm rồi tắt
 *   circumscribe  vẽ một đường bao quanh rồi biến mất
 *
 * Nhấn tạm thời khác nhấn vĩnh viễn: sau nhịp đó vật trở lại như cũ, nên dùng được nhiều lần trong một
 * video mà không làm màn hình đầy màu đỏ. Style này đang nhấn bằng cách đổi màu hẳn — nặng tay hơn.
 *
 *   <Emphasis kind="indicate" box={{ x, y, w, h }} t={linearProgress(frame, T.nhan, T.nhan + 46)} />
 *
 * `t` là một DỐC 0→1 chạy suốt nhịp nhấn — component tự dựng hình chuông (mạnh nhất ở giữa) và tự quét
 * đường bao. Đừng truyền `pulse()` vào: pulse đã là 0→1→0 rồi, chồng thêm chuông thì đúng đỉnh nhịp lại
 * thành 0 và không thấy gì cả.
 */
const bell = (t) => Math.sin(clamp01(t) * Math.PI);

export function Emphasis({ kind = 'indicate', box, t = 0, color = C.red, rays = 12, opacity = 1, children }) {
  const k = bell(t);
  if (opacity <= 0.001) return children ?? null;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;

  if (kind === 'indicate') {
    // phình nhẹ quanh tâm — 8 % là đủ thấy, hơn nữa thành nhảy
    const s = 1 + 0.08 * k;
    return (
      <g opacity={opacity < 1 ? opacity : undefined} transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`}>
        {children}
        {k > 0.02 ? <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={10} fill={color} opacity={k * 0.16} /> : null}
      </g>
    );
  }

  if (kind === 'flash') {
    const r0 = Math.max(box.w, box.h) * 0.5;
    return (
      <g opacity={opacity < 1 ? opacity : undefined}>
        {children}
        {k > 0.02 ? (
          <g stroke={color} strokeWidth={4} strokeLinecap="round" opacity={1 - clamp01(t)}>
            {Array.from({ length: rays }, (_, i) => {
              const a = (i / rays) * Math.PI * 2;
              const a0 = r0 + 18 + 40 * clamp01(t);
              const a1 = a0 + 34;
              return <path key={i} d={`M ${cx + Math.cos(a) * a0} ${cy + Math.sin(a) * a0} L ${cx + Math.cos(a) * a1} ${cy + Math.sin(a) * a1}`} />;
            })}
          </g>
        ) : null}
      </g>
    );
  }

  // circumscribe — đường bao chạy quanh rồi biến mất
  const pad = 12;
  const w = box.w + pad * 2;
  const h = box.h + pad * 2;
  const per = 2 * (w + h);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {children}
      {k > 0.02 ? (
        <rect
          x={box.x - pad} y={box.y - pad} width={w} height={h} rx={12}
          fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${per * 0.35} ${per}`}
          strokeDashoffset={per * (1 - clamp01(t)) * 1.35}
          opacity={k}
        />
      ) : null}
    </g>
  );
}

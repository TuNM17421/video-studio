import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { mixColor, morphPath } from '../../lib/paths.js';

/**
 * Một vật đang biến hình giữa HAI trạng thái.
 *
 * Không chỉ đổi hình: màu tô, độ đặc, màu viền và bề dày viền cũng nội suy cùng một `t`, vì đó mới là
 * thứ làm mắt tin "vẫn là cùng một vật". Đổi hình mà màu nhảy một phát thì người xem đọc thành hai vật.
 *
 *   <Morph from={shapes.strip({…})} to={shapes.arrow({…})} t={t}
 *          fill={[C.accent, C.accent]} fillOpacity={[0.1, 0.92]} strokeWidth={[3, 0]} />
 *
 * Mỗi prop nhận một giá trị (giữ nguyên suốt) hoặc cặp `[đầu, cuối]`.
 */
const pick = (v, t, mix) => (Array.isArray(v) ? mix(v[0], v[1], t) : v);
const num = (a, b, t) => a + (b - a) * t;

export function Morph({
  from, to, t = 0, fill = C.accent, fillOpacity = 1, stroke = 'none', strokeWidth = 0, opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const k = clamp01(t);
  const d = k <= 0 ? from : k >= 1 ? to : morphPath(from, to, k);
  return (
    <path
      d={d}
      fill={pick(fill, k, mixColor)}
      fillOpacity={pick(fillOpacity, k, num)}
      stroke={pick(stroke, k, mixColor)}
      strokeWidth={pick(strokeWidth, k, num)}
      strokeLinejoin="round"
      opacity={opacity < 1 ? opacity : undefined}
    />
  );
}

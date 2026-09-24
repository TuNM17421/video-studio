import React from 'react';
import { C } from '../../lib/tokens.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Một CON SỐ gắn với hình, chạy mượt khi hình đổi — `ValueTracker` + `DecimalNumber` của Manim.
 *
 * Đây là thứ biến hình ảnh thành **đo được**: hai mũi tên khép lại thì số cosine chạy từ 0,42 lên 0,97
 * ngay cạnh cung góc. Người xem thấy quan hệ giữa "gần nhau" và "số lớn" mà không cần ai nói ra.
 *
 *   <ValueReadout x={1200} y={620} value={cos(a1, a2)} label="cos" decimals={2} />
 *
 * Số hiển thị được làm tròn khi vẽ, còn `value` truyền vào là số liên tục — cứ nối nó thẳng vào hình
 * học đang chạy (góc, độ dài, khoảng cách), đừng tự nội suy một dãy số rời.
 * Dấu thập phân là **dấu phẩy** theo cách viết tiếng Việt.
 */
export function ValueReadout({
  x, y, value, label, decimals = 2, size = 40, labelSize, color = C.text, labelColor = C.textMuted,
  anchor = 'start', suffix = '', opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const text = Number(value).toFixed(decimals).replace('.', ',') + suffix;
  const ls = labelSize ?? size * 0.66;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {label ? (
        <SvgText x={x} y={y - size * 0.82} size={ls} weight={700} anchor={anchor} color={labelColor} letterSpacing={0.8}>
          {label}
        </SvgText>
      ) : null}
      {/* chữ số bằng bề rộng nhau: số chạy mà chữ không giật sang trái phải */}
      <SvgText x={x} y={y} size={size} weight={700} anchor={anchor} color={color} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {text}
      </SvgText>
    </g>
  );
}

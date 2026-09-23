/**
 * Hình MANG NGHĨA của dòng poster: nét vẽ ra (draw-on) và băng chuyền.
 *
 * Cùng luật với `marks.jsx`: hàm thuần của `T`, không nguồn ngẫu nhiên, và thứ tự thuộc tính SVG
 * giữ đúng như code cảnh đang viết tay — nhờ vậy đổi sang primitive KHÔNG làm đổi một byte nào của
 * chuỗi HTML mà `tools/verify.mjs` smoke-render.
 */
import React from 'react';
import { frac } from './engine.jsx';

/**
 * `DrawPath` — một đường cong tự vẽ ra: `pathLength=1` + `strokeDashoffset` chạy 1→0.
 * `p` là tiến độ 0→1 (người gọi lấy từ `draw()`). Dùng ở: nhánh cây, nhánh nhập trục, thân/rẽ đôi
 * của cầu nối 2.
 */
export function DrawPath({ d, stroke, width, cap = 'round', p, opacity }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap={cap}
      pathLength="1"
      strokeDasharray="1"
      strokeDashoffset={1 - p}
      opacity={opacity}
    />
  );
}

/**
 * `DrawLine` — đoạn thẳng tự vẽ ra. Sáu chỗ dùng: ba lớp cây khả năng (1973), trục thời gian và
 * năm mũi tên hướng (Cây), dây nối hai mốc (cold-open), đường chân trời (bridge-1), lưới "nếu…thì"
 * (2006).
 */
export function DrawLine({ x1, y1, x2, y2, stroke, width, cap, p, opacity }) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap={cap}
      pathLength="1"
      strokeDasharray="1"
      strokeDashoffset={1 - p}
      opacity={opacity}
    />
  );
}

/**
 * `lane` — băng chuyền / thác: `count` phần tử chạy vòng theo phần thập phân của thời gian, lệch
 * pha đều. `since` = số giây kể từ lúc băng chuyền mở; âm thì trả `[]`. Không `Math.random`: vị trí
 * là hàm thuần của `T`.
 *
 * `arrive` (tuỳ chọn) = tiến độ mà phần tử coi như ĐÃ VÀO HẲN đích. Nó không đổi quỹ đạo, chỉ nói
 * cho người gọi biết mốc để tắt — luật F8: một dòng chữ có mũi tên chỉ hướng phải có vật thể thật
 * đi HẾT quãng đường đó, nên phần tử chỉ được tan khi tâm đã nằm trong hộp đích.
 */
export function lane(since, { cycle, count, stagger, on = since >= 0 }) {
  if (!on) return [];
  const out = [];
  for (let i = 0; i < count; i++) out.push({ i, p: frac(since / cycle + i * stagger) });
  return out;
}

/**
 * `reachFade` — độ hiện của một phần tử băng chuyền sao cho nó **biến mất bên trong hộp đích**.
 *
 * `p` là tiến độ trên quãng đường, `enter` là tiến độ lúc phần tử vào hẳn khung, `arrive` là tiến
 * độ lúc tâm phần tử đã nằm trong hộp đích. Trước `arrive` thì hiện đủ; sau đó tắt nhanh trong
 * `sink` — tức là tắt Ở TRONG máy, không tắt giữa đường.
 */
export function reachFade(p, { enter = 0, arrive, sink = 0.08 }) {
  const inFade = enter > 0 ? (p - enter) / Math.max(sink, 1e-6) : p * 8;
  const outFade = (arrive + sink - p) / Math.max(sink, 1e-6);
  return Math.max(0, Math.min(1, inFade, outFade));
}

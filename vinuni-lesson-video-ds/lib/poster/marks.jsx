/**
 * Hình KHẮC / ĐÓNG của dòng video "poster vector" — con dấu, bia đá, pill nhãn, dấu ✕, thẻ, linh vật.
 *
 * Mọi thứ ở đây từng nằm trong thư mục MỘT video (`chapter-dl.jsx`, `chapter-tree.jsx`,
 * `chapter-lighthill.jsx`). Chúng là thư viện, không phải nội dung: mỗi primitive dưới đây có ÍT
 * NHẤT hai chỗ dùng thật trong video demo. Thứ chỉ dùng một lần (mạng neuron, tuyết, confetti, bộ
 * đếm log10, so sánh hai cột) CỐ Ý ở lại thư mục video — trừu tượng hoá một chỗ dùng chỉ làm cả hai
 * nơi khó đọc hơn.
 *
 * Luật chung (giống `figures.jsx`):
 *  · nhận `T` (giây authored) + `at`, KHÔNG nhận `frame`;
 *  · không `Math.random`, `Date`, `window` — `tools/verify.mjs` gate `non-deterministic call`;
 *  · `style` của người gọi luôn trải RA TRƯỚC các khoá riêng, để thứ tự khoá inline-style (và vì
 *    vậy chuỗi HTML mà smoke-render so sánh) không đổi khi một cảnh chuyển sang dùng primitive.
 */
import React from 'react';
import { POSTER as P, POSTER_FONT as FONT } from '../tokens.js';
import { M } from './engine.jsx';

/** Bo góc + bóng viền của mọi thẻ giấy trong dòng poster (gốc: `chapter-dl.jsx` THEMES.poster). */
export const CARD_RADIUS = 10;
export const CARD_SHADOW = '0 0 0 2px rgba(255,217,138,.22)';

/**
 * `Stamp` — con dấu: viền đôi, chữ đậm, thường đi kèm `M.pop` + `rotate` do người gọi đặt vào
 * `style`. Dùng ở: `chapter-lighthill.jsx` (dấu `1973` trên bìa báo cáo) và `chapter-dl.jsx`
 * (dấu `≈ 2006`).
 */
export function Stamp({ text, color, size = 46, weight = 800, radius = 12, padding = '6px 20px', border = 6, style }) {
  return (
    <div
      style={{
        ...style,
        border: `${border}px double ${color}`,
        borderRadius: radius,
        padding,
        fontFamily: FONT,
        fontWeight: weight,
        fontSize: size,
        color,
      }}
    >
      {text}
    </div>
  );
}

/**
 * `Plaque` — bia đá khắc chữ: khối `night2` viền `steel`, mỗi dòng chạy `width` 0→100% như đang
 * được khắc ra. Dùng ở: bài học chương 1973, bài học chương Cây, và cầu nối `bridge-1` (cầu nối
 * KHÔNG vẽ lại bia — nó dựng chính component này với chính nội dung của cảnh trước; xem
 * `BAI_HOC_1973` export từ `chapter-lighthill.jsx`).
 *
 * `lines[]` = `{ node, size, color, reveal }` · `sub` = dòng phụ nhỏ dưới dòng đầu · `rule` = độ
 * hiện của vạch ngăn. `reveal == null` nghĩa là dòng đã khắc xong (không có `overflow/width`) —
 * đúng trạng thái mà cầu nối cần đi tiếp.
 */
export function Plaque({ box, lines, sub, rule = 1, style }) {
  const [first, second] = lines;
  const lineStyle = (l) =>
    l.reveal == null
      ? { fontFamily: FONT, fontWeight: 800, fontSize: l.size, color: l.color }
      : {
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          width: `${l.reveal * 100}%`,
          margin: '0 auto',
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: l.size,
          color: l.color,
        };
  return (
    <div
      style={{
        position: 'absolute',
        left: box.left,
        right: box.right,
        top: box.top,
        background: P.night2,
        border: `3px solid ${P.steel}`,
        borderRadius: 14,
        padding: box.padding,
        textAlign: 'center',
        ...style,
      }}
    >
      <div style={lineStyle(first)}>{first.node}</div>
      {sub ? (
        <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: sub.size, color: sub.color, marginTop: 6, opacity: sub.opacity }}>{sub.node}</div>
      ) : null}
      <div style={{ height: 3, background: P.steel, margin: '26px 18%', ...(rule == null ? null : { opacity: rule }) }} />
      <div style={lineStyle(second)}>{second.node}</div>
    </div>
  );
}

/** `Pill` — nhãn viên thuốc bám vào một vật thể. Dùng ở chương Cây (mốc model) và chương 2006. */
export function Pill({ x, y, text, T, at, color }) {
  const st = M.pop(T, at, 0.45);
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: st.opacity, transform: st.transform, background: P.night2, color: color || P.cream, border: `2px solid ${P.steel}`, borderRadius: 999, padding: '6px 18px', fontFamily: FONT, fontWeight: 700, fontSize: 22, whiteSpace: 'nowrap' }}>{text}</div>
  );
}

/** `XMark` — dấu ✕ đóng sập lên một ý vừa nêu. Hai chỗ dùng trong chương 2006. */
export function XMark({ x, y, size, color, T, at, ease }) {
  const st = M.pop(T, at, 0.45, ease);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: size, height: size, opacity: st.opacity, transform: st.transform }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, width: size * 0.11, height: '100%', background: color, borderRadius: 8, transform: 'translateX(-50%) rotate(45deg)' }} />
      <div style={{ position: 'absolute', left: '50%', top: 0, width: size * 0.11, height: '100%', background: color, borderRadius: 8, transform: 'translateX(-50%) rotate(-45deg)' }} />
    </div>
  );
}

/** `Card` — thẻ giấy nền đêm, nhãn tròn treo dưới đáy. Ba chỗ dùng trong chương 2006. */
export function Card({ x, y, r, w, h, children, label, labelBg, style }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w || 110, height: h || 88, transform: `rotate(${r || 0}deg)`, background: P.night2, borderRadius: CARD_RADIUS, boxShadow: CARD_SHADOW, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {children}
      {label ? (
        <div style={{ position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)', background: labelBg || P.cream, borderRadius: 999, padding: '1px 10px', color: P.deep, fontFamily: FONT, fontWeight: 700, fontSize: 22, whiteSpace: 'nowrap' }}>{label}</div>
      ) : null}
    </div>
  );
}

/** `Critter` — con vật vẽ bằng khối (chó · mèo · cá · chim). Ba chỗ dùng trong chương 2006. */
export function Critter({ kind, size, ink }) {
  const s = size || 44;
  const e = s * 0.3;
  const ear = (side, tri) =>
    tri ? (
      <div style={{ position: 'absolute', top: -s * 0.16, [side]: s * 0.06, width: 0, height: 0, borderLeft: `${s * 0.15}px solid transparent`, borderRight: `${s * 0.15}px solid transparent`, borderBottom: `${s * 0.3}px solid ${ink}` }} />
    ) : (
      <div style={{ position: 'absolute', top: -s * 0.1, [side]: -s * 0.05, width: s * 0.24, height: s * 0.4, background: ink, borderRadius: '50% 50% 45% 45%', transform: side === 'left' ? 'rotate(-24deg)' : 'rotate(24deg)' }} />
    );
  const eye = (l) => <div style={{ position: 'absolute', top: s * 0.32, left: l, width: s * 0.09, height: s * 0.09, borderRadius: '50%', background: P.night }} />;
  if (kind === 'fish') {
    return (
      <div style={{ position: 'relative', width: s * 1.2, height: s * 0.7 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: s * 0.9, height: s * 0.62, borderRadius: '50%', background: P.cream }} />
        <div style={{ position: 'absolute', right: 0, top: s * 0.12, width: 0, height: 0, borderTop: `${s * 0.18}px solid transparent`, borderBottom: `${s * 0.18}px solid transparent`, borderRight: `${s * 0.3}px solid ${ink}` }} />
        <div style={{ position: 'absolute', left: s * 0.18, top: s * 0.2, width: s * 0.09, height: s * 0.09, borderRadius: '50%', background: P.night }} />
      </div>
    );
  }
  if (kind === 'bird') {
    return (
      <div style={{ position: 'relative', width: s, height: s * 0.8 }}>
        <div style={{ position: 'absolute', left: s * 0.1, top: 0, width: s * 0.7, height: s * 0.7, borderRadius: '50%', background: P.cream }} />
        <div style={{ position: 'absolute', left: s * 0.72, top: s * 0.28, width: 0, height: 0, borderTop: `${s * 0.09}px solid transparent`, borderBottom: `${s * 0.09}px solid transparent`, borderLeft: `${s * 0.24}px solid ${ink}` }} />
        <div style={{ position: 'absolute', left: s * 0.32, top: s * 0.22, width: s * 0.09, height: s * 0.09, borderRadius: '50%', background: P.night }} />
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', width: s, height: s }}>
      {ear('left', kind === 'cat')}
      {ear('right', kind === 'cat')}
      <div style={{ position: 'absolute', inset: 0, borderRadius: kind === 'cat' ? '50%' : '42% 42% 46% 46%', background: P.cream }} />
      {eye(e)}
      {eye(s - e - s * 0.09)}
      <div style={{ position: 'absolute', top: s * 0.52, left: '50%', transform: 'translateX(-50%)', width: s * 0.11, height: s * 0.09, borderRadius: '50%', background: ink }} />
    </div>
  );
}

/**
 * Adapter mỏng cho engine animation của sếp (`animations-v3.jsx`, bản 28/08/2026).
 *
 * CHỈ chép các hàm THUẦN. Bỏ hẳn `Stage`, `CompositionStage`, `PlaybackBar`, `TweaksPanel`,
 * `useTweaks`, `WatercolorReveal` và mọi thứ chạm `window` / `localStorage` / `ResizeObserver` /
 * `requestAnimationFrame` — `tools/verify.mjs` smoke-render từng frame bằng `renderToStaticMarkup`
 * trên Node, nơi không có các global đó; và RAF chính là nguồn non-determinism mà `lib/motion.js`
 * cấm. Ở đây mọi thứ là hàm thuần của `T` (giây authored), và `T` là hàm thuần của `useFrame()`.
 *
 * Nguồn từng hàm (số dòng trong `animations-v3.jsx`):
 *   Easing            169–225
 *   clamp             230
 *   interpolate       235
 *   animate           254
 *   CompositionContext / useComposition   948–953
 *   Shot              1038–1047
 *
 * KHÔNG chép `Captions` (1050–1082): nó chạy theo mốc giây cứng của bản demo cũ, không khớp giọng
 * đọc thật. Phụ đề dùng hệ caption của harness theo cue — xem `shared.jsx`.
 */
import React from 'react';

// ── Easing (chép nguyên từ animations-v3.jsx:169-225) ─────────────────────────────────────────
export const Easing = {
  linear: (t) => t,

  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },

  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeInOutBack: (t) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function interpolate(input, output, ease = Easing.linear) {
  return (t) => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? ease[i] || Easing.linear : ease;
        return output[i] + (output[i + 1] - output[i]) * easeFn(local);
      }
    }
    return output[output.length - 1];
  };
}

export function animate({ from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic }) {
  return (t) => {
    if (t <= start) return from;
    if (t >= end) return to;
    return from + (to - from) * ease((t - start) / (end - start));
  };
}

// ── Composition context ───────────────────────────────────────────────────────────────────────
export const CompositionContext = React.createContext(null);

export function useComposition() {
  const ctx = React.useContext(CompositionContext);
  if (!ctx) throw new Error('useComposition() phải nằm trong <Composition>');
  return ctx;
}

/**
 * `Shot` — cắt cứng theo `T`.
 *
 * LỆCH KHỎI BẢN GỐC, CÓ CHỦ ĐÍCH: bản của sếp giữ con trong DOM và chỉ đổi `visibility`. Về mặt
 * NHÌN thì hai cách giống hệt nhau (cửa sổ [from, to) đã chừa sẵn 0,9s chồng lấn để hai cảnh liền
 * kề fade chéo, nên không cảnh nào bị cắt sớm). Nhưng giữ DOM khiến mọi cảnh của một chương cùng
 * tồn tại trong chuỗi HTML mà `tools/verify.mjs` smoke-render — và check FM-20 ("một bố cục hình
 * khối đứng yên ≥6 cue liên tiếp") đọc chuỗi đó, nên nó thấy đúng một tập hình khối bất biến suốt
 * cả chương và cảnh báo nhầm. Unmount khi tắt vừa đúng ý nghĩa, vừa cắt hẳn diện lỗi đó.
 */
export function Shot({ from, to, children }) {
  const c = useComposition();
  const a = +from;
  const b = to == null ? Infinity : +to;
  if (!(isFinite(a) && c.T >= a && c.T < b)) return null;
  return <div style={{ position: 'absolute', inset: 0 }}>{children}</div>;
}

/** `kf` — keyframe helper dùng chung trong cả ba file scene của sếp (chép y nguyên). */
export function kf(T, pairs, ease) {
  const E = ease || Easing.easeInOutCubic;
  if (T <= pairs[0][0]) return pairs[0][1];
  for (let i = 1; i < pairs.length; i++) {
    if (T < pairs[i][0]) {
      const t0 = pairs[i - 1][0];
      const v0 = pairs[i - 1][1];
      const t1 = pairs[i][0];
      const v1 = pairs[i][1];
      return v0 + (v1 - v0) * E((T - t0) / (t1 - t0));
    }
  }
  return pairs[pairs.length - 1][1];
}

/**
 * `M.enter` / `M.pop` / `draw` nhận `ease` làm THAM SỐ CUỐI, mặc định giữ nguyên đường cong cũ nên
 * không video nào đang chạy bị đổi hành vi. Lý do có tham số: audit F7 đo 39/73 (53%) mọi chuyển
 * động của video demo dùng đúng `easeInOutQuad`, và ba helper này khoá cứng đường cong — tức là mọi
 * lần hiện chữ trong cả video đều đúng một nhịp. Quy ước phân vai theo NGHĨA nằm ở
 * `styles/poster.md`.
 */
export const M = {
  kf,
  enter: (T, s, d, e) => {
    const p = kf(T, [[s, 0], [s + (d || 0.7), 1]], e || Easing.easeOutCubic);
    return { opacity: p, transform: `translateY(${(1 - p) * 26}px)` };
  },
  pop: (T, s, d, e) => {
    const p = kf(T, [[s, 0], [s + (d || 0.5), 1]], e || Easing.easeOutBack);
    return { opacity: clamp(p * 2, 0, 1), transform: `scale(${p})` };
  },
};

export const draw = (T, s, d, e) => kf(T, [[s, 0], [s + d, 1]], e || Easing.easeInOutQuad);

/**
 * `breathe` — vòng lặp `sin` CÓ CHẶN DƯỚI.
 *
 * Viết tay `0.45 + 0.55*Math.sin(T*3.4)` cho min = −0,10: phần tử TẮT HẲN mấy lần mỗi chu kỳ. Ở
 * video demo đó đúng là dấu `?` cuối video — mốc nhấn đắt nhất — và không vòng QA bằng mắt nào bắt
 * được vì nó phụ thuộc frame chụp (audit F6). `breathe` kẹp biên độ vào `[min, max]` và mặc định
 * chậm hơn hẳn: 0,5 Hz là hơi thở, 0,54 Hz (3,4 rad/s) là đèn báo động.
 */
export function breathe(T, { min = 0.55, max = 1, hz = 0.5, phase = 0 } = {}) {
  const mid = (min + max) / 2;
  return mid + ((max - min) / 2) * Math.sin(T * hz * 2 * Math.PI + phase);
}

/** Phần thập phân — dùng cho tuyết rơi, băng chuyền, hạt chạy (hàm thuần của T). */
export const frac = (v) => v - Math.floor(v);

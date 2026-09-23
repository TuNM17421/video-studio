import React from 'react';
import { FrameContext } from './player.jsx';
import { slide, push, zoom, zoomOpacity, transitionProgress } from './transitions.js';

/**
 * Hard-cut sequence of scenes — the equivalent of Remotion <Series>.
 * sequences: [{ component, duration, authoredDuration?, name?, transition? }] in frames.
 * The active scene reads a scene-local frame through useFrame(). `authoredDuration` rescales that
 * frame linearly (like the repo's AuthoredFrameScale), so a scene authored for N frames can play inside
 * a measured narration cue of M frames without touching its beat constants.
 *
 * ── Chuyển cảnh ──────────────────────────────────────────────────────────────────────────────────
 * Mặc định vẫn là CẮT THẲNG, y như trước: không khai `transition` thì không có gì đổi, và mọi video
 * đang có giữ nguyên từng frame. Khai `transition` trên một sequence thì cảnh ĐÓ đi vào bằng hiệu
 * ứng, và trong cửa sổ chuyển cảnh hai cảnh cùng được vẽ chồng lên nhau.
 *
 *   { component: S12, duration: 150, transition: { kind: 'slide', frames: 9, direction: 'left' } }
 *
 * `kind`: 'slide' (ý kế tiếp) · 'push' (ý mạnh hơn) · 'zoom' (đi sâu vào chi tiết). Bảng chọn theo Ý
 * nằm ở `TRANSITION_INTENT` trong transitions.js — đừng đổi kiểu cho đỡ chán, một video chỉ nên
 * dùng 2-3 kiểu.
 *
 * Cảnh cũ bị GIỮ ĐỨNG ở frame cuối của nó trong lúc trượt ra. Cho nó chạy tiếp thì nó vượt quá
 * `duration` mà chính nó được dựng, và các beat tính theo `authoredDuration` sẽ nhảy lung tung.
 *
 * Vẫn là hàm thuần của `frame`: frame N luôn ra đúng một hình (xem motion.js).
 */

const MAX_TRANSITION_FRAMES = 12;

/**
 * `transitions.js` sinh transform theo cú pháp SVG — `translate(-1075 0)`, không dấu phẩy, không đơn
 * vị. Dán thẳng chuỗi đó vào `style.transform` của một <div> thì CSS coi là sai cú pháp và **bỏ qua
 * im lặng**: cảnh vẫn đứng yên, không lỗi, không cảnh báo. Đây đúng là cách bản đầu của chuyển cảnh
 * này "chạy" mà không hề nhúc nhích.
 */
function svgTransformToCss(t) {
  return t
    .replace(/translate\((-?[\d.]+)\s+(-?[\d.]+)\)/g, (_, x, y) => `translate(${x}px, ${y}px)`)
    .replace(/translate\((-?[\d.]+)\)/g, (_, x) => `translate(${x}px)`);
}

function Layer({ seq, frame, transform, opacity }) {
  const f = seq.authoredDuration ? (frame * seq.authoredDuration) / seq.duration : frame;
  const Scene = seq.component;
  const inner = (
    <FrameContext.Provider value={f}>
      <Scene />
    </FrameContext.Provider>
  );
  if (!transform && opacity === undefined) return inner;
  return (
    <div style={{ position: 'absolute', inset: 0, transform, opacity, willChange: 'transform' }}>
      {inner}
    </div>
  );
}

export function Series({ sequences, frame }) {
  let start = 0;
  for (let i = 0; i < sequences.length; i++) {
    const s = sequences[i];
    if (frame < start + s.duration) {
      const local = frame - start;
      const t = s.transition;
      // Cửa sổ chuyển cảnh nằm ở ĐẦU cảnh mới; cảnh đầu tiên không có gì để chuyển từ đó.
      const frames = t ? Math.min(t.frames ?? 9, MAX_TRANSITION_FRAMES, s.duration) : 0;
      if (t && i > 0 && local < frames) {
        const prev = sequences[i - 1];
        const p = transitionProgress(local, { at: 0, duration: frames });
        const dir = t.direction ?? 'left';
        const kind = t.kind ?? 'slide';
        const fn = kind === 'push' ? push : kind === 'zoom' ? zoom : slide;
        const exitT = kind === 'zoom' ? fn(p, 'exit') : fn(p, 'exit', dir);
        const enterT = kind === 'zoom' ? fn(p, 'enter') : fn(p, 'enter', dir);
        return (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <Layer seq={prev} frame={prev.duration - 1} transform={svgTransformToCss(exitT)} opacity={kind === 'zoom' ? zoomOpacity(p, 'exit') : 1} />
            <Layer seq={s} frame={local} transform={svgTransformToCss(enterT)} opacity={kind === 'zoom' ? zoomOpacity(p, 'enter') : 1} />
          </div>
        );
      }
      return <Layer seq={s} frame={local} />;
    }
    start += s.duration;
  }
  return null;
}

export const seriesDuration = (sequences) => sequences.reduce((sum, s) => sum + s.duration, 0);

export function seriesStarts(sequences) {
  const out = [];
  let t = 0;
  for (const s of sequences) {
    out.push(t);
    t += s.duration;
  }
  return out;
}

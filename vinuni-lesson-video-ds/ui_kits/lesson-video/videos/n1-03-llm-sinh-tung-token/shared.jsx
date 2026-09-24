import React from 'react';
import { SceneFrame, SvgText, TokenRow, tokenLayout } from '../../../../components/index.js';
import { C, cueCaptions, sliceCaptions } from '../../../../lib/index.js';
import { CUES } from './cues.js';
import { TIMELINE } from './timeline.js';

export const EYEBROW = 'NGÀY 01 · CÁCH MÔ HÌNH TẠO VĂN BẢN';
export const VIDEO_LABEL = 'N1-03 · Tạo văn bản từng mảnh';

/*
 * MỘT vật liệu sống suốt cả video (styles/illustrated.md).
 * Câu "Tôi mang ô vì trời…" cắt bằng bộ tách GPT-5 — sáu token, mã số thật. Hàng token này xuất hiện ở
 * câu 05 và còn tới câu 25: cảnh sau chỉ biến đổi nó (đánh dấu, mọc mã số, mọc dãy số, nối thêm viên),
 * không cảnh nào xoá đi vẽ lại. Vì thế toạ độ gốc khai ĐÚNG MỘT LẦN ở đây và mọi cảnh dùng ROW.
 */
export const TOKENS = [
  { text: 'T', id: 51 },
  { text: 'ôi', id: 23865 },
  { text: '␣mang', id: 18033 },
  { text: '␣ô', id: 27598 },
  { text: '␣vì', id: 60010 },
  { text: '␣trời', id: 177808 },
];
/** Phần nối tiếp — "mưa" tốn HAI mảnh (dùng từ câu 16). */
export const MUA = [{ text: '␣m', id: 284 }, { text: 'ưa', id: 43653 }];
export const TOKENIZER = 'Bộ tách: GPT-5';
/** Cách đếm sai của câu 08: mỗi tiếng một ô. */
export const TIENG = ['Tôi', 'mang', 'ô', 'vì', 'trời'];

export const TEXTS = TOKENS.map((t) => t.text);
/** Toạ độ gốc của hàng token — đừng cảnh nào tự đặt lại. */
export const ROW = { x: 250, y: 400, tokens: TEXTS, size: 52, padX: 28, gap: 20, maxW: 1450 };
export const rowAt = (over = {}) => ({ ...ROW, ...over });
export const cells = (over = {}) => tokenLayout(rowAt(over));

/** Mã số dưới từng viên, hiện lần lượt (`upto` viên đã xong, `enter` viên đang hiện). */
export function TokenIds({ row = ROW, upto = TOKENS.length, enter = 1, list = TOKENS, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const cs = tokenLayout(row);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {cs.map((c, i) => {
        const on = i < upto ? 1 : i === upto ? enter : 0;
        if (on <= 0.01 || !list[i]) return null;
        return (
          <SvgText key={i} x={c.cx} y={c.y + c.h + 44} size={28} weight={700} color={C.accentStrong} opacity={on}>
            {String(list[i].id)}
          </SvgText>
        );
      })}
    </g>
  );
}

/** Nhãn tên bộ tách — câu 07 nói cách chia là do bộ tách quyết định, nên phải ghi ra. */
export function TokenizerTag({ x = 1670, y = 336, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  return (
    <SvgText x={x} y={y} size={22} weight={700} anchor="end" color={C.textMuted} opacity={opacity} letterSpacing={0.6}>
      {TOKENIZER}
    </SvgText>
  );
}

/** Chú thích một dòng dưới vùng nội dung — chữ cần THẤY, khác lời đọc. */
export function Note({ x = 960, y = 880, children, color = C.text, size = 36, opacity = 1, anchor = 'middle' }) {
  if (opacity <= 0.001) return null;
  return (
    <SvgText x={x} y={y} size={size} weight={700} anchor={anchor} color={color} opacity={opacity}>
      {children}
    </SvgText>
  );
}

/** Hàng token chuẩn của video — mọi cảnh gọi cái này thay vì tự dựng TokenRow. */
export function Row({ over = {}, ...rest }) {
  return <TokenRow {...rowAt(over)} {...rest} />;
}

const CAPTIONS = cueCaptions(TIMELINE.map((t) => ({ start: t.start, end: t.end, text: t.text, pause: t.pause })));

export const cue = (n) => CUES[n - 1];
export const captionsFor = (n) => {
  const t = TIMELINE[n - 1];
  if (!t.text) return [];
  const k = t.authored / t.duration;
  return sliceCaptions(CAPTIONS, t.start, t.duration).map((c) => ({
    start: Math.round(c.start * k),
    end: c.end === t.duration ? t.authored : Math.round(c.end * k),
    text: c.text,
  }));
};
export const footerFor = (n) => ({ left: VIDEO_LABEL, right: `Câu ${String(n).padStart(2, '0')} / ${CUES.length}` });

/** Khung cảnh chuẩn: eyebrow, tiêu đề lấy từ cues.js, footer, phụ đề. */
export function Scene({ n, frame, overlay, title, tag, children }) {
  const c = cue(n);
  return (
    <SceneFrame frame={frame} eyebrow={EYEBROW} title={title ?? c.title} tag={tag} footer={footerFor(n)} captions={captionsFor(n)} overlay={overlay}>
      {children}
    </SceneFrame>
  );
}

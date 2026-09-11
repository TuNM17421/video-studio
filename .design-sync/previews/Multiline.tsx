import React from 'react';
import { Multiline, C } from 'vinuni-lesson-video-ds';

// SVG text — needs fontFamily on the svg, else it falls back to serif.
const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Guide = ({ y, w }: { y: number; w: number }) => (
  <path d={`M 0 ${y} H ${w}`} stroke={C.dotInactive} strokeDasharray="6 6" strokeWidth={1} />
);

export const CardLines = () => (
  <Stage w={480} h={200}>
    <Guide y={100} w={480} />
    <Multiline x={240} y={100} lines={['BỨC THƯ', 'cần tóm tắt', 'trước 17:00']} firstWeight={700} size={28} lineHeight={40} />
  </Stage>
);

export const LeftAligned = () => (
  <Stage w={560} h={200}>
    <Multiline x={40} y={100} anchor="start" lines={['Mô hình không “hiểu” câu hỏi,', 'nó đoán token tiếp theo', 'có xác suất cao nhất.']} size={26} lineHeight={38} color={C.textMuted} weight={500} />
  </Stage>
);

export const AccentColor = () => (
  <Stage w={480} h={200}>
    <Multiline x={240} y={100} lines={['ƯU TIÊN XỬ LÝ', 'rủi ro cao']} firstWeight={700} size={32} lineHeight={44} color={C.red} />
  </Stage>
);

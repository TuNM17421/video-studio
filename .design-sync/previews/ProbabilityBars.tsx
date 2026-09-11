import React from 'react';
import { ProbabilityBars, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const next = [
  { label: 'hoàn', value: 62, highlight: true },
  { label: 'xử', value: 24 },
  { label: 'hỏi', value: 14 },
];

export const Rounded = () => (
  <Stage w={640} h={330}>
    <ProbabilityBars x={20} y={80} items={next} max={100} barW={330} barH={38} rowGap={70} labelW={110} size={26} rounded title="Khả năng token tiếp theo" />
  </Stage>
);

export const Classic = () => (
  <Stage w={700} h={380}>
    <ProbabilityBars
      x={20}
      y={80}
      items={[
        { label: 'mưa', value: 48, highlight: true },
        { label: 'nắng', value: 31 },
        { label: 'đẹp', value: 15 },
      ]}
      max={100}
      title="Hôm nay trời …"
      footnote="MINH HỌA · số liệu giả định"
    />
  </Stage>
);

export const Revealing = () => (
  <Stage w={640} h={330}>
    <ProbabilityBars x={20} y={80} items={next} max={100} barW={330} barH={38} rowGap={70} labelW={110} size={26} rounded reveal={0.55} title="Đang tính xác suất" />
  </Stage>
);

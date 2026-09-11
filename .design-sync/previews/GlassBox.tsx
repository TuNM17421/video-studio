import React from 'react';
import { GlassBox, Card, ProbabilityBars, Chip, C, SvgText } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Tag = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <SvgText x={x} y={y} size={17} weight={700} anchor="start" color={C.textMuted}>{children}</SvgText>
);

// Inner "layers" of the machine: stacked bars.
const Layers = ({ x, y, n = 4, lit = -1 }: { x: number; y: number; n?: number; lit?: number }) => (
  <g>
    {Array.from({ length: n }, (_, i) => (
      <rect key={i} x={x + i * 70} y={y} width={46} height={150} rx={12} fill={i === lit ? C.redSoft : C.dotInactive} stroke={i === lit ? C.red : 'none'} strokeWidth={3} />
    ))}
  </g>
);

export const Default = () => (
  <Stage w={560} h={300}>
    <GlassBox x={30} y={50} w={500} h={220} label="MÔ HÌNH NGÔN NGỮ LỚN">
      <Layers x={90} y={85} />
      <Tag x={380} y={170}>4 lớp</Tag>
    </GlassBox>
  </Stage>
);

export const WithProbabilities = () => (
  <Stage w={640} h={340}>
    <GlassBox x={30} y={50} w={580} h={260} label="BỘ ĐOÁN TỪ TIẾP THEO">
      <ProbabilityBars
        x={70}
        y={100}
        items={[
          { label: 'hoàn', value: 62, highlight: true },
          { label: 'xử', value: 24 },
          { label: 'hỏi', value: 14 },
        ]}
        max={100}
        barW={300}
        barH={34}
        rowGap={62}
        labelW={100}
        size={24}
        rounded
      />
    </GlassBox>
  </Stage>
);

export const ActiveFlash = () => (
  <Stage w={560} h={300}>
    <GlassBox x={30} y={50} w={500} h={220} label="TÁC TỬ ĐANG XỬ LÝ" active={1}>
      <Layers x={90} y={85} lit={2} />
      <Chip x={375} y={150} label="ĐANG CHẠY" tone="red" />
    </GlassBox>
  </Stage>
);

export const RedAccentWithCards = () => (
  <Stage w={720} h={320}>
    <GlassBox x={30} y={50} w={660} h={240} label="ỨNG DỤNG CHATBOT" accent={C.red}>
      <Card x={80} y={100} w={260} h={140} label="BƯỚC 1" lines={['ĐỌC CÂU HỎI', 'tách ý chính']} />
      <Card x={380} y={100} w={260} h={140} label="BƯỚC 2" lines={['TRẢ LỜI', 'kèm nguồn']} />
    </GlassBox>
  </Stage>
);

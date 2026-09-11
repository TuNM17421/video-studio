import React from 'react';
import { Icon, ICON_NAMES, C, SvgText } from 'vinuni-lesson-video-ds';

// Icon places a named line icon inside a scene SVG, centred on (x, y).
const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Tag = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <SvgText x={x} y={y} size={17} weight={600} color={C.textMuted}>{children}</SvgText>
);

export const Gallery = () => (
  <Stage w={1300} h={330}>
    {ICON_NAMES.map((name, i) => {
      const x = 65 + (i % 10) * 130;
      const y = 60 + Math.floor(i / 10) * 160;
      return (
        <g key={name}>
          <Icon name={name} x={x} y={y} size={64} />
          <Tag x={x} y={y + 70}>{name}</Tag>
        </g>
      );
    })}
  </Stage>
);

export const Sizes = () => (
  <Stage w={560} h={200}>
    {[30, 42, 56, 96].map((s, i) => {
      const x = [50, 130, 230, 400][i];
      return (
        <g key={s}>
          <Icon name="database" x={x} y={90} size={s} />
          <Tag x={x} y={175}>{`${s} px`}</Tag>
        </g>
      );
    })}
  </Stage>
);

export const Colors = () => (
  <Stage w={620} h={200}>
    <Icon name="bulb" x={80} y={85} size={72} color={C.accent} />
    <Tag x={80} y={170}>accent</Tag>
    <Icon name="bulb" x={230} y={85} size={72} color={C.accentStrong} />
    <Tag x={230} y={170}>accentStrong</Tag>
    <Icon name="bulb" x={380} y={85} size={72} color={C.red} />
    <Tag x={380} y={170}>red</Tag>
    <circle cx={530} cy={85} r={52} fill={C.accent} />
    <Icon name="bulb" x={530} y={85} size={54} color="#fff" />
    <Tag x={530} y={170}>trắng / nền đặc</Tag>
  </Stage>
);

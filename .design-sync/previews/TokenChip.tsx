import React from 'react';
import { TokenChip, Bracket, SvgText, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Default = () => (
  <Stage w={330} h={120}>
    <TokenChip x={80} y={20} text="trời" />
  </Stage>
);

export const Selected = () => (
  <Stage w={330} h={120}>
    <TokenChip x={80} y={20} text="mưa" selected active={1} />
  </Stage>
);

export const DashedAndMuted = () => (
  <Stage w={430} h={120}>
    <TokenChip x={30} y={20} text="???" dashed />
    <TokenChip x={230} y={20} text="đã" muted />
  </Stage>
);

export const Sentence = () => (
  <Stage w={640} h={200}>
    <TokenChip x={20} y={20} w={130} h={64} size={28} text="Hôm" />
    <TokenChip x={165} y={20} w={130} h={64} size={28} text="nay" />
    <TokenChip x={310} y={20} w={130} h={64} size={28} text="trời" />
    <TokenChip x={455} y={20} w={130} h={64} size={28} text="mưa" selected active={1} />
    <Bracket x={20} y={100} w={420} h={16} />
    <SvgText x={20} y={160} size={21} weight={600} anchor="start" color={C.textMuted}>Tiền tố · phần văn bản đã có</SvgText>
  </Stage>
);

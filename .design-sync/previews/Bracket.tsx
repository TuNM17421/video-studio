import React from 'react';
import { Bracket, TokenChip, Card, C, SvgText } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const UnderTokens = () => (
  <Stage w={640} h={230}>
    <TokenChip x={30} y={30} text="Hôm" />
    <TokenChip x={230} y={30} text="nay" />
    <TokenChip x={430} y={30} text="trời" />
    <Bracket x={40} y={130} w={550} />
    <SvgText x={315} y={200} size={22} weight={700} color={C.accentStrong}>MỘT CÂU · 3 token</SvgText>
  </Stage>
);

export const RedGroup = () => (
  <Stage w={760} h={290}>
    <Card x={30} y={30} w={330} h={150} label="BÀI 1" lines={['TÓM TẮT', 'ý chính']} />
    <Card x={400} y={30} w={330} h={150} label="BÀI 2" lines={['TÓM TẮT', 'ý chính']} />
    <Bracket x={50} y={200} w={660} color={C.red} />
    <SvgText x={380} y={270} size={22} weight={700} color={C.red}>Ý CHÍNH CHUNG</SvgText>
  </Stage>
);

export const UpDirection = () => (
  <Stage w={640} h={210}>
    <SvgText x={315} y={40} size={22} weight={700} color={C.accentStrong}>CÙNG MỘT NGỮ CẢNH</SvgText>
    <Bracket x={40} y={100} w={550} direction="up" />
    <TokenChip x={30} y={110} text="mèo" />
    <TokenChip x={230} y={110} text="ngủ" selected />
    <TokenChip x={430} y={110} text="trên" muted />
  </Stage>
);

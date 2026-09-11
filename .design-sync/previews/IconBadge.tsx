import React from 'react';
import { IconBadge, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Default = () => (
  <Stage w={300} h={260}>
    <IconBadge name="bulb" x={150} y={110} label="Ý tưởng" />
  </Stage>
);

export const Capabilities = () => (
  <Stage w={820} h={230}>
    <IconBadge name="edit" x={130} y={90} size={120} label="Sinh văn bản" />
    <IconBadge name="code" x={410} y={90} size={120} label="Viết code" />
    <IconBadge name="chat-bubble" x={690} y={90} size={120} label="Trò chuyện" color={C.red} />
  </Stage>
);

export const FilledHub = () => (
  <Stage w={300} h={260}>
    <IconBadge name="robot" x={150} y={110} filled label="Tác tử" />
  </Stage>
);

export const Small = () => (
  <Stage w={420} h={120}>
    <IconBadge name="check" x={70} y={60} size={64} />
    <IconBadge name="database" x={170} y={60} size={64} />
    <IconBadge name="alert-bubble" x={270} y={60} size={64} color={C.red} />
    <IconBadge name="gear" x={370} y={60} size={64} filled />
  </Stage>
);

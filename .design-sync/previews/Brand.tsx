import React from 'react';
import { C, Brand } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const ModelMakers = () => (
  <Stage w={900} h={260}>
    <Brand name="anthropic" x={130} y={100} size={72} label />
    <Brand name="claude" x={340} y={100} size={72} label />
    <Brand name="gemini" x={560} y={100} size={72} label="Gemini" />
    <Brand name="meta" x={770} y={100} size={72} label />
  </Stage>
);

export const DeveloperTools = () => (
  <Stage w={900} h={260}>
    <Brand name="mcp" x={150} y={100} size={72} label="MCP" />
    <Brand name="github" x={380} y={100} size={72} label />
    <Brand name="python" x={600} y={100} size={72} label />
    <Brand name="huggingface" x={800} y={100} size={72} label="Hugging Face" />
  </Stage>
);

export const Monochrome = () => (
  <Stage w={900} h={260}>
    <Brand name="anthropic" x={150} y={110} size={72} variant="mono" />
    <Brand name="mcp" x={370} y={110} size={72} variant="mono" />
    <Brand name="github" x={590} y={110} size={72} variant="mono" />
    <Brand name="python" x={790} y={110} size={72} variant="mono" />
  </Stage>
);

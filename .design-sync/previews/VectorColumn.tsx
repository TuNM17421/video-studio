import React from 'react';
import { VectorColumn, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Default = () => (
  <Stage w={400} h={250}>
    <VectorColumn x={145} y={20} values={['0.2', '-0.1', '0.4']} label="Vector minh họa" />
  </Stage>
);

export const Highlighted = () => (
  <Stage w={400} h={250}>
    <VectorColumn x={145} y={20} values={['0.2', '-0.1', '0.4']} highlight={2} label="Vector minh họa" />
  </Stage>
);

export const Embeddings = () => (
  <Stage w={460} h={360}>
    <VectorColumn x={30} y={20} values={['0.8', '0.1', '-0.3', '0.5', '0.2']} highlight={0} label="“mèo”" />
    <VectorColumn x={175} y={20} values={['0.7', '0.2', '-0.2', '0.4', '0.1']} highlight={0} label="“chó”" />
    <VectorColumn x={320} y={20} values={['-0.5', '0.9', '0.6', '0.0', '-0.4']} bracketColor={C.red} label="“xe”" />
  </Stage>
);

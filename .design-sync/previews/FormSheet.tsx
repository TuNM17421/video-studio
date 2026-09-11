import React from 'react';
import { FormSheet, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const empty = [{ label: 'Ai gặp khó?' }, { label: 'Vướng bước nào?' }, { label: 'Chậm hoặc sai ở đâu?' }];

export const Empty = () => (
  <Stage w={560} h={310}>
    <FormSheet x={20} y={20} w={520} labelW={280} title="PHIẾU MÔ TẢ" rowH={68} rows={empty} />
  </Stage>
);

export const Filled = () => (
  <Stage w={560} h={310}>
    <FormSheet
      x={20} y={20} w={520} labelW={280} title="PHIẾU MÔ TẢ" rowH={68}
      rows={[{ label: 'Ai gặp khó?', value: 'Học viên năm 1' }, { label: 'Vướng bước nào?', value: 'Nộp bài' }, { label: 'Chậm hoặc sai ở đâu?' }]}
    />
  </Stage>
);

export const ActiveRow = () => (
  <Stage w={560} h={310}>
    <FormSheet x={20} y={20} w={520} labelW={280} title="PHIẾU MÔ TẢ" rowH={68} rows={empty} active={1} />
  </Stage>
);

export const Revealing = () => (
  <Stage w={560} h={310}>
    <FormSheet x={20} y={20} w={520} labelW={280} title="PHIẾU MÔ TẢ" rowH={68} rows={empty} reveal={[1, 0.5, 0]} />
  </Stage>
);

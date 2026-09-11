import React from 'react';
import { Heatmap, SvgText, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const words = ['Tôi', 'đi', 'học', 'ở', 'trường', 'xa'];
const causal = (r: number, c: number) => (c > r ? 0 : 1 - (r - c) * 0.17);

export const Attention = () => (
  <Stage w={580} h={365}>
    <Heatmap x={180} y={50} rows={6} cols={6} cell={40} gap={6} value={causal} rowLabels={words} colLabels={['Tôi', 'đi', 'học', 'ở', 'trg', 'xa']} labelSize={16} />
    <SvgText x={318} y={352} size={16} weight={600} color={C.textMuted}>MINH HỌA · chú ý theo từng chữ</SvgText>
  </Stage>
);

export const AccentMatrix = () => (
  <Stage w={520} h={260}>
    <Heatmap
      x={170} y={50} rows={4} cols={5} cell={44} gap={6} color={C.accent}
      value={(r, c) => [[0.9, 0.2, 0.4, 0.1, 0.6], [0.3, 0.8, 0.1, 0.5, 0.2], [0.1, 0.4, 0.95, 0.3, 0.7], [0.5, 0.1, 0.2, 0.85, 0.3]][r][c]}
      rowLabels={['Lớp A', 'Lớp B', 'Lớp C', 'Lớp D']} colLabels={['T2', 'T3', 'T4', 'T5', 'T6']} labelSize={16}
    />
  </Stage>
);

export const Revealing = () => (
  <Stage w={580} h={365}>
    <Heatmap x={180} y={50} rows={6} cols={6} cell={40} gap={6} value={causal} reveal={0.4} rowLabels={words} colLabels={['Tôi', 'đi', 'học', 'ở', 'trg', 'xa']} labelSize={16} />
    <SvgText x={318} y={352} size={16} weight={600} color={C.textMuted}>reveal 0.4 · đang hiện dần</SvgText>
  </Stage>
);

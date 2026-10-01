import React from 'react';
import { TwinPair, MetricRow, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const STAGE = { w: 1200, h: 640 };
const G = { x: 110, y: 160, w: 980, h: 280, gap: 70 };

// One render function for both sides, so the two drawings cannot drift apart. The ONLY thing it is
// allowed to branch on is side.variant — branch on geometry and it stops being a comparison.
const Phone = (s: any) => (
  <g>
    <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={22} fill={C.bg} stroke={s.accent} strokeWidth={s.variant === 'b' ? 7 : 4} />
    {s.variant === 'b'
      ? <rect x={s.x + 40} y={s.y + 80} width={s.w - 80} height={108} rx={14} fill={C.redSoft} />
      : <circle cx={s.x + s.w / 2} cy={s.y + 134} r={86} fill={C.redSoft} />}
    <rect x={s.x + s.w / 2 - 44} y={s.y + 112} width={88} height={46} rx={9} fill={C.bg} stroke={C.red} strokeWidth={3} />
    <text x={s.x + s.w / 2} y={s.y + 144} fontSize={22} fontWeight={700} fill={C.red} textAnchor="middle">Chip</text>
  </g>
);

export const OneVariable = () => (
  <Stage {...STAGE}>
    <TwinPair {...G} render={Phone}
      a={{ label: 'Không có buồng hơi' }} b={{ label: 'Có buồng hơi' }}
      diff="Khác đúng một chỗ: nhiệt tụ một điểm, hay trải thành tấm" />
  </Stage>
);

// The pairing it is built for: a MetricRow under each side with the SAME labels in the same order.
export const WithReadingsUnder = () => (
  <Stage w={1200} h={760}>
    <TwinPair {...G} render={Phone}
      a={{ label: 'Không có buồng hơi' }} b={{ label: 'Có buồng hơi' }} />
    <MetricRow x={110} y={530} w={455} h={140} size={46}
      items={[{ label: 'Nóng nhất', value: '47,2 °C' }, { label: 'FPS', value: '48' }]} />
    <MetricRow x={635} y={530} w={455} h={140} size={46} lead
      items={[{ label: 'Nóng nhất', value: '39,0 °C' }, { label: 'FPS', value: '60', accent: true }]} />
  </Stage>
);

// Reveal left then right, each on its own spoken phrase; side B is where the lesson lands.
export const RightSideArriving = () => (
  <Stage {...STAGE}>
    <TwinPair {...G} render={Phone} aReveal={1} bReveal={0.45} diffReveal={0}
      a={{ label: 'Không có buồng hơi' }} b={{ label: 'Có buồng hơi' }} />
  </Stage>
);

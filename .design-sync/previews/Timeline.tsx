import React from 'react';
import { Timeline, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

// Labels sit 48 px above the rail, years 62 px below — 150 px of room each way is enough.
// The end labels are centred on their dots, so the stage keeps ~150 px past each end of the rail.
const G = { x: 150, y: 150, w: 1460 };
const STAGE = { w: 1760, h: 300 };

// The four milestones of the AI-history video, rail fully drawn.
const MILESTONES = [
  { year: '1950', label: 'TURING' },
  { year: '1956', label: 'DARTMOUTH' },
  { year: '1997', label: 'DEEP BLUE' },
  { year: '2017', label: 'TRANSFORMER' },
];

export const AiMilestones = () => (
  <Stage {...STAGE}>
    <Timeline {...G} items={MILESTONES} progress={1} />
  </Stage>
);

// The milestone being discussed carries `current` — red, larger dot.
export const CurrentMilestone = () => (
  <Stage {...STAGE}>
    <Timeline {...G} progress={1}
      items={MILESTONES.map((m) => (m.year === '2017' ? { ...m, current: true } : m))} />
  </Stage>
);

// Mid-beat: the rail filling left to right, the last two milestones not lit yet.
export const RailFilling = () => (
  <Stage {...STAGE}>
    <Timeline {...G} items={MILESTONES} progress={0.55} />
  </Stage>
);

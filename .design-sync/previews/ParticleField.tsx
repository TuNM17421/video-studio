import React from 'react';
import { ParticleField, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const STAGE = { w: 1200, h: 620 };
const BOX = { x: 90, y: 120, w: 1020, h: 400 };
const WICK = 390;
const CHIP = 600;
// Two convection cells, because the heat enters in the middle and the vapor leaves both ways.
// The rise starts at the WICK SURFACE, never inside it, or the particle turns to vapor while still
// in the liquid; the descent goes deeper, and the closing run is the capillary return.
const CELL_L = [{ x: CHIP, y: WICK }, { x: CHIP, y: 200 }, { x: 150, y: 200 }, { x: 150, y: 450 }];
const CELL_R = [{ x: CHIP, y: WICK }, { x: CHIP, y: 200 }, { x: 1050, y: 200 }, { x: 1050, y: 450 }];
const HEAT = { x: CHIP, y: 400, r: 300, boost: 2.3 };
const FLOW = { speed: 1.15, wander: 52, wanderY: 0.7, lane: { x: 150, y: 40 }, r: 11,
  coolAt: [0.49, 1] as const, phaseFade: 0.07, heat: HEAT };

const Chamber = ({ children }: { children?: React.ReactNode }) => (
  <>
    <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={18} fill={C.bg} stroke={C.red} strokeWidth={5} />
    <rect x={BOX.x} y={WICK} width={BOX.w} height={BOX.y + BOX.h - WICK} fill={C.bgAlt} />
    {Array.from({ length: 34 }, (_, i) => (
      <line key={i} x1={110 + i * 30} y1={WICK} x2={92 + i * 30} y2={BOX.y + BOX.h} stroke={C.dotInactive} strokeWidth={4} />
    ))}
    <line x1={BOX.x} y1={WICK} x2={BOX.x + BOX.w} y2={WICK} stroke={C.dotInactive} strokeWidth={4} />
    {children}
    <rect x={CHIP - 70} y={546} width={140} height={56} rx={10} fill={C.bg} stroke={C.red} strokeWidth={4} />
    <text x={CHIP} y={584} fontSize={28} fontWeight={700} fill={C.red} textAnchor="middle">Chip</text>
  </>
);

// The vapor chamber cycle: boil off at the chip, spread, condense at the cold ends, wick back.
// Red is vapor, blue is condensate in the wick; the dots over the chip are faster and wider,
// because mean molecular speed goes as √T.
export const VaporChamberCycle = () => (
  <Stage {...STAGE}>
    <Chamber>
      <ParticleField {...BOX} {...FLOW} frame={238} count={46} seed={3} path={CELL_L} />
      <ParticleField {...BOX} {...FLOW} frame={238} count={46} seed={8} path={CELL_R} />
    </Chamber>
  </Stage>
);

// A later frame — the field has moved on; nothing about it is random, only seeded.
export const SameFieldLater = () => (
  <Stage {...STAGE}>
    <Chamber>
      <ParticleField {...BOX} {...FLOW} frame={292} count={46} seed={3} path={CELL_L} />
      <ParticleField {...BOX} {...FLOW} frame={292} count={46} seed={8} path={CELL_R} />
    </Chamber>
  </Stage>
);

// Without `path` the particles only mill about inside the box — free gas, with a hot corner.
export const FreeGasWithHotSpot = () => (
  <Stage {...STAGE}>
    <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={18} fill={C.bg} stroke={C.accent} strokeWidth={5} />
    <ParticleField {...BOX} frame={238} count={70} seed={5} speed={1} wander={46} wanderY={0.9} r={11}
      heat={{ x: 330, y: 330, r: 300, boost: 2.4 }} />
  </Stage>
);

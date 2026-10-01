import React from 'react';
import { WipeSplit, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const STAGE = { w: 1300, h: 640 };
const G = { x: 90, y: 120, w: 1120, h: 440 };

// ONE scene, drawn at two fidelities, with a shape straddling the cut: the viewer must see the same
// thing change, not two pictures side by side.
const X0 = 110, X1 = 1190, ROAD = 500, K = 60;
const RIDGE = [[110, 420], [340, 280], [520, 360], [760, 240], [980, 350], [1190, 290]];
const SUN = { cx: 650, cy: 260, r: 92 };
const ridgeY = (x: number) => {
  for (let i = 1; i < RIDGE.length; i++) {
    if (x <= RIDGE[i][0]) {
      const a = RIDGE[i - 1], b = RIDGE[i];
      return a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0]));
    }
  }
  return RIDGE[RIDGE.length - 1][1];
};
const line = RIDGE.map((p) => `${p[0]},${p[1]}`).join(' ');

const Fine = (
  <g>
    <circle cx={SUN.cx} cy={SUN.cy} r={SUN.r} fill={C.redSoft} />
    <circle cx={SUN.cx} cy={SUN.cy} r={SUN.r} fill="none" stroke={C.red} strokeWidth={5} />
    <polygon points={`${line} ${X1},${ROAD} ${X0},${ROAD}`} fill={C.dotInactive} />
    <polyline points={line} fill="none" stroke={C.accent} strokeWidth={5} />
  </g>
);

// Low resolution encoded as bigger quantisation cells — vector-native, and sharp at any output size.
const cells: React.ReactNode[] = [];
for (let x = X0; x < X1; x += K) {
  const top = Math.floor(ridgeY(x + K / 2) / K) * K;
  if (top < ROAD) cells.push(<rect key={`m${x}`} x={x} y={top} width={K} height={ROAD - top} fill={C.dotInactive} />);
  cells.push(<rect key={`e${x}`} x={x} y={top} width={K} height={K} fill={C.bg} stroke={C.accent} strokeWidth={5} />);
}
for (let cx = SUN.cx - SUN.r - K; cx < SUN.cx + SUN.r + K; cx += K) {
  for (let cy = SUN.cy - SUN.r - K; cy < SUN.cy + SUN.r + K; cy += K) {
    const gx = Math.round((cx - X0) / K) * K + X0;
    const gy = Math.round(cy / K) * K;
    const dx = gx + K / 2 - SUN.cx, dy = gy + K / 2 - SUN.cy;
    if (dx * dx + dy * dy <= SUN.r * SUN.r) {
      cells.push(<rect key={`s${gx}_${gy}`} x={gx} y={gy} width={K} height={K} fill={C.redSoft} stroke={C.red} strokeWidth={4} />);
    }
  }
}
const Coarse = <g>{cells}</g>;

// Held comparison: the before state on the left, because Vietnamese reads left to right.
// The pill says the AGENT that causes the change — that is what makes it a causal sentence.
export const HeldComparison = () => (
  <Stage {...STAGE}>
    <WipeSplit {...G} at={0.5} label="AI" labelY={470} left={Coarse} right={Fine}
      leftLabel="GPU vẽ ở độ phân giải thấp" rightLabel="AI dựng lại, hình nét" />
  </Stage>
);

// Running wipe: animate `at` and the divider travels, leaving the new state behind it.
export const MidWipe = () => (
  <Stage {...STAGE}>
    <WipeSplit {...G} at={0.28} label="AI" labelY={470} left={Coarse} right={Fine}
      leftLabel="Thô" rightLabel="AI dựng lại, hình nét" />
  </Stage>
);

// `frame={false}` drops the stage box when the split sits inside a card that already has one.
export const NoStageBox = () => (
  <Stage {...STAGE}>
    <WipeSplit {...G} at={0.62} label="AI" labelY={470} frame={false} left={Coarse} right={Fine} />
  </Stage>
);

import React from 'react';
import { LineChart, C, fbm } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

// The legend sits 44 px above the plot and the x labels 34 px below, so the stage keeps room either side.
const STAGE = { w: 1200, h: 520 };
const G = { x: 170, y: 150, w: 940, h: 280 };
const AXES = { xRange: [0, 20] as const, yRange: [28, 52] as const, xTicks: [0, 5, 10, 15, 20], yTicks: [30, 40, 50], xTickLabel: 'phút' };
const degC = (v: number) => `${v.toFixed(1).replace('.', ',')} °C`;

// A live trace: `sample` closed over fbm, so the reading wobbles the way a measurement does.
// Frame 238 of the vapor-chamber scene — the no-cooling case riding its throttle ceiling.
const F = 238;
const noCooling = (t: number) => {
  const base = 30 + 17 * (1 - Math.exp(-t / 3.2));
  return base + Math.max(0, Math.min(1, (base - 43) / 3)) * 2.3 * fbm(11, t * 1.8 + (F / 30) * 1.1, 3);
};
const cooled = (t: number) => 30 + 9 * (1 - Math.exp(-t / 4.5)) + 0.5 * fbm(21, t * 1.3 + (F / 30) * 0.6, 3);

export const TwoCasesOverTime = () => (
  <Stage {...STAGE}>
    <LineChart {...G} {...AXES} rules={[{ y: 46, label: 'NGƯỠNG HẠ XUNG' }]}
      series={[
        { label: 'Không có buồng hơi', accent: C.accent, readout: degC, sample: noCooling },
        { label: 'Có buồng hơi', accent: C.red, readout: degC, sample: cooled },
      ]} />
  </Stage>
);

// Mid-beat: the lines drawing left to right, the head dots riding the end of what is drawn.
export const DrawingIn = () => (
  <Stage {...STAGE}>
    <LineChart {...G} {...AXES} progress={0.55}
      series={[
        { label: 'Không có buồng hơi', accent: C.accent, sample: noCooling },
        { label: 'Có buồng hơi', accent: C.red, sample: cooled },
      ]} />
  </Stage>
);

// Fixed points instead of a sample function, one series, no legend.
export const FixedPoints = () => (
  <Stage {...STAGE}>
    <LineChart {...G} xRange={[0, 20]} yRange={[30, 60]} xTicks={[0, 10, 20]} yTicks={[30, 45, 60]} xTickLabel="phút"
      series={[{ label: 'FPS', accent: C.accent, points: [{ x: 0, y: 60 }, { x: 7, y: 55 }, { x: 14, y: 48 }, { x: 20, y: 47 }] }]} />
  </Stage>
);

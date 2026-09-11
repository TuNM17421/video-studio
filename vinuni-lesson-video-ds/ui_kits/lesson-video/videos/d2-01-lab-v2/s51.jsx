import React from 'react';
import { Flow, Pill, SvgText } from '../../../../components/index.js';
import { C, ROLE, appear, linearProgress, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';
import { CHAIN, chainBox } from './s50.jsx';

/*
 * Câu 51 — the chain of câu 50 slides into a narrow column on the left; a double-diamond outline draws
 * in on the right. The first diamond (find and shape the problem) is lit as the next topic; the second
 * (solution) stays muted. The "DOUBLE DIAMOND" pill appears when the name is spoken.
 */
const N = 51;
const T = {
  slide: [0, 36],
  draw: [38, 98], // after the slide, while the title is still being read
  name: spokenAt(N, 'Double Diamond') - 4,
  first: spokenAt(N, 'tìm và định hình') - 6,
  link: [spokenAt(N, 'nối tiếp') - 4, spokenAt(N, 'nối tiếp') + 28],
  second: spokenAt(N, 'lựa chọn giải pháp') - 6,
};
const col = (i) => ({ x: 110, y: 330 + i * 150, w: 360, h: 120 });
const D1 = { cx: 900, cy: 620, rx: 300, ry: 250 };
const D2 = { cx: 1500, cy: 620, rx: 300, ry: 250 };
const diamond = (d) => `M ${d.cx - d.rx} ${d.cy} L ${d.cx} ${d.cy - d.ry} L ${d.cx + d.rx} ${d.cy} L ${d.cx} ${d.cy + d.ry} Z`;
const PERIM = 4 * Math.hypot(300, 250);

const lerp = (a, b, t) => a + (b - a) * t;

export default function S51() {
  const frame = useFrame();
  const s = smooth(frame, T.slide[0], T.slide[1]);
  const draw = linearProgress(frame, T.draw[0], T.draw[1]);
  const lit = appear(frame, T.first);
  const d2 = appear(frame, T.second);
  return (
    <Scene n={N} frame={frame}>
      {CHAIN.map((c, i) => {
        const a = chainBox(i);
        const b = col(i);
        const box = { x: lerp(a.x, b.x, s), y: lerp(a.y, b.y, s), w: lerp(a.w, b.w, s), h: lerp(a.h, b.h, s) };
        return <RoleCard key={i} {...box} tone={c.tone} label={c.label} lines={c.lines} size={lerp(30, 22, s)} />;
      })}
      {draw > 0 ? (
        <g>
          <path d={diamond(D1)} fill={lit > 0.001 ? C.bgAlt : 'none'} stroke={C.accent} strokeWidth={4 + lit} strokeDasharray={PERIM} strokeDashoffset={PERIM * (1 - draw)} strokeLinejoin="round" />
          <path d={diamond(D2)} fill="none" stroke={ROLE.purple} strokeOpacity={0.45 + 0.25 * d2} strokeWidth={4} strokeDasharray={PERIM} strokeDashoffset={PERIM * (1 - draw)} strokeLinejoin="round" />
        </g>
      ) : null}
      <Pill x={1200 - 130} y={318} w={260} label="DOUBLE DIAMOND" variant="solid" opacity={appear(frame, T.name)} />
      <g opacity={lit < 1 ? lit : undefined}>
        <SvgText x={D1.cx} y={D1.cy - 6} size={32} weight={700} color={C.text}>Vấn đề</SvgText>
        <SvgText x={D1.cx} y={D1.cy + 34} size={22} weight={600} color={C.textMuted}>tìm và định hình</SvgText>
        <SvgText x={D1.cx} y={D1.cy + ((D1.ry + 60))} size={18} weight={700} color={C.accent} letterSpacing={1.2}>TIẾP THEO</SvgText>
      </g>
      <g opacity={d2 * 0.7}>
        <SvgText x={D2.cx} y={D2.cy + 10} size={30} weight={700} color={ROLE.purple}>Giải pháp</SvgText>
      </g>
      <Flow points={[{ x: 480, y: 620 }, { x: D1.cx - D1.rx - 12, y: 620 }]} frame={frame} start={T.link[0]} end={T.link[1]} />
    </Scene>
  );
}

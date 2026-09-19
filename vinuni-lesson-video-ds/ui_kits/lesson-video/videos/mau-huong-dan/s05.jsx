import React from 'react';
import { Card, StaticPath, SvgText } from '../../../../components/index.js';
import { appear, linearProgress, useFrame } from '../../../../lib/index.js';
import { C } from '../../../../lib/tokens.js';
import { spokenAt } from './cues.js';
import { Guide, Scene, StepRail } from './shared.jsx';
import { TIMELINE } from './timeline.js';

/*
 * Câu 05 — "Giọng đọc được thu trước, rồi mỗi cảnh được dựng đúng theo độ dài của giọng thật."
 * Bước 3 rồi Bước 4. Dạng sóng là giọng thật của chính video này: tám đoạn, mỗi đoạn dài đúng bằng câu
 * đã đo. Hàng cảnh bên dưới dùng cùng những độ dài đó — đường nối nét đứt chỉ ranh giới trùng nhau.
 */
const N = 5;
const T = {
  wave: [0, spokenAt(N, 'thu trước') + 8],
  scenes: spokenAt(N, 'mỗi cảnh') - 6,
  match: spokenAt(N, 'đúng theo độ dài') - 4,
  real: spokenAt(N, 'giọng thật') - 4,
};

const X0 = 200;
const W = 1100;
const WAVE_Y = 560;
const SCENE_Y = 700;
const total = TIMELINE.reduce((s, t) => s + t.duration, 0);
const SEGS = (() => {
  let x = X0;
  return TIMELINE.map((t) => {
    const w = (t.duration / total) * W;
    const seg = { n: t.n, x, w, speech: ((t.duration - t.pause) / t.duration) * w };
    x += w;
    return seg;
  });
})();

/** Deterministic bar heights (no randomness in scenes). */
const barH = (i) => 16 + Math.abs(Math.sin(i * 1.7) * 34 + Math.sin(i * 0.45) * 22);

export default function S05() {
  const frame = useFrame();
  const sweep = X0 + linearProgress(frame, T.wave[0], T.wave[1]) * W;
  const active = frame < T.scenes ? 2 : 3;
  const bars = [];
  SEGS.forEach((s) => {
    for (let bx = s.x + 4; bx < s.x + s.speech; bx += 11) bars.push(bx);
  });
  return (
    <Scene n={N} frame={frame}>
      <StepRail frame={frame} active={active} activeAt={active === 3 ? T.scenes : 0} />
      <SvgText x={X0} y={WAVE_Y - 74} size={22} weight={700} color={C.textMuted} anchor="start">GIỌNG ĐỌC</SvgText>
      {bars.map((bx, i) => (
        bx < sweep ? <rect key={i} x={bx} y={WAVE_Y - barH(i) / 2} width={6} height={barH(i)} rx={3} fill={C.accent} /> : null
      ))}
      <SvgText x={X0} y={SCENE_Y - 22} size={22} weight={700} color={C.textMuted} anchor="start" opacity={appear(frame, T.scenes)}>CẢNH</SvgText>
      {SEGS.map((s, i) => (
        <Card
          key={s.n}
          x={s.x + 3}
          y={SCENE_Y}
          w={s.w - 6}
          h={120}
          lines={[String(s.n)]}
          size={24}
          opacity={appear(frame, T.scenes + i * 3, 10)}
          active={s.n === N ? appear(frame, T.real, 10) : 0}
        />
      ))}
      {SEGS.slice(1).map((s) => (
        <StaticPath key={s.n} points={[{ x: s.x, y: WAVE_Y + 44 }, { x: s.x, y: SCENE_Y - 6 }]} dashed color={C.accent} strokeWidth={2} opacity={appear(frame, T.match, 12)} />
      ))}
      <Guide
        frame={frame}
        mood={[{ at: 0, name: 'neutral' }, { at: T.real, name: 'happy' }]}
        prop={[{ at: T.real, name: 'lightbulb' }]}
      />
    </Scene>
  );
}

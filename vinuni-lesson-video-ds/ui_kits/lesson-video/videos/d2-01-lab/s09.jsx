import React from 'react';
import { DocumentSheet, Flow, SvgText } from '../../../../components/index.js';
import { C, appear, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Lan, RoleCard, Scene } from './shared.jsx';

/*
 * Câu 09 — the obstacle: three guides labelled for different classes slide in; Lan's path splits into
 * three branches and she cannot tell which one is hers (red "?"). Orange card names the obstacle.
 */
const N = 9;
const T = {
  problem: spokenAt(N, 'Trở ngại') + 2,
  sheets: [16, 24, 32],
  branch: [spokenAt(N, 'hướng dẫn nào') - 4, spokenAt(N, 'hướng dẫn nào') + 34],
  ask: spokenAt(N, 'lớp của mình') - 6,
};
const LAN = { x: 330, y: 650, r: 62 };
const SHEET_W = 180;
const SHEET_H = (168 * SHEET_W) / 215;
const SHEETS = ['Lớp A', 'Lớp B', 'Lớp C'].map((c, i) => ({ label: `Hướng dẫn · ${c}`, x: 1420, y: 290 + i * 220 }));
const TRUNK_X = 800;
const start = { x: LAN.x + LAN.r + 14, y: LAN.y };

export default function S09() {
  const frame = useFrame();
  const qa = appear(frame, T.ask);
  return (
    <Scene n={N} frame={frame}>
      <RoleCard x={110} y={290} w={600} h={150} tone="problem" label="TRỞ NGẠI" lines={['Chưa biết hướng dẫn nào', 'cho lớp của mình']} size={26} opacity={appear(frame, T.problem)} />
      <Lan {...LAN} />
      {SHEETS.map((s, i) => {
        const k = smooth(frame, T.sheets[i], T.sheets[i] + 26);
        return <DocumentSheet key={s.label} x={s.x + 220 * (1 - k)} y={s.y} w={SHEET_W} label={s.label} opacity={k} />;
      })}
      {frame >= T.branch[0]
        ? SHEETS.map((s, i) => {
            const y = s.y + SHEET_H / 2;
            return (
              <Flow key={i} points={[start, { x: TRUNK_X, y: start.y }, { x: TRUNK_X, y }, { x: s.x - 6, y }]} frame={frame} start={T.branch[0] + i * 4} end={T.branch[1] + i * 4} />
            );
          })
        : null}
      <g opacity={qa < 1 ? qa : undefined}>
        <circle cx={600} cy={560} r={36} fill={C.bg} stroke={C.red} strokeWidth={4} />
        <SvgText x={600} y={575} size={42} weight={700} color={C.red}>?</SvgText>
      </g>
    </Scene>
  );
}

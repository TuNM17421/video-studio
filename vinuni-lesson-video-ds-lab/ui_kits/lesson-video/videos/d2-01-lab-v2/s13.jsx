import React from 'react';
import { Magnifier } from '../../../../components/index.js';
import { C, appear, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene, ToneLabel } from './shared.jsx';

/*
 * Câu 13 — the day's stance: a question card in focus under a magnifier; the solution cards that were
 * in front recede (smaller, lower, dimmed) once "thay vì vội đi tìm giải pháp" is said.
 */
const N = 13;
const T = {
  sols: 6,
  question: spokenAt(N, 'đặt câu hỏi xuyên suốt') - 10,
  lens: spokenAt(N, 'đặt câu hỏi xuyên suốt') + 4,
  recede: [spokenAt(N, 'thay vì vội') - 6, spokenAt(N, 'thay vì vội') + 30],
};
const q = { x: 610, y: 330, w: 700, h: 190 };
const SOL_X = [270, 750, 1230];

function Question({ opacity }) {
  return <RoleCard {...q} tone="unknown" label="LẬP TRƯỜNG" lines={['Đặt câu hỏi', 'xuyên suốt ngày học']} size={32} opacity={opacity} />;
}

export default function S13() {
  const frame = useFrame();
  const k = smooth(frame, T.recede[0], T.recede[1]);
  const oq = appear(frame, T.question);
  return (
    <Scene n={N} frame={frame}>
      {SOL_X.map((x, i) => {
        const w = 420 - 120 * k;
        const h = 140 - 40 * k;
        const cx = x + 210;
        return (
          <RoleCard
            key={i}
            x={cx - w / 2}
            y={600 + 170 * k}
            w={w}
            h={h}
            tone="solution"
            label={k < 0.5 ? 'GIẢI PHÁP' : undefined}
            lines={['Giải pháp']}
            size={28 - 6 * k}
            opacity={appear(frame, T.sols + i * 6)}
            muted={k}
          />
        );
      })}
      <ToneLabel x={960} y={940} tone="solution" anchor="middle" opacity={appear(frame, T.recede[1] - 6)}>
        TÌM GIẢI PHÁP · ĐỂ SAU
      </ToneLabel>
      <Question opacity={oq} />
      <Magnifier
        path={[
          { x: q.x + 170, y: q.y + 112, at: T.lens },
          { x: q.x + 530, y: q.y + 112, at: T.lens + 50 },
          { x: q.x + q.w + 110, y: q.y + 95, at: T.lens + 80 },
        ]}
        frame={frame}
        r={86}
        zoom={1.5}
        color={C.accent}
        opacity={appear(frame, T.lens)}
      >
        <Question opacity={1} />
      </Magnifier>
    </Scene>
  );
}

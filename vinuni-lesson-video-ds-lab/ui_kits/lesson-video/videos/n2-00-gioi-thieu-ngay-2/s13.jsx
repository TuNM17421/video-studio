import React from 'react';
import { Chip, Cross, Flow, GlassBox, Icon, Person, Pill } from '../../../../components/index.js';
import { C, anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { PartScene } from './shared.jsx';

/*
 * Câu 13 (MINH HỌA) — two error situations of equal weight, each ending at the affected person.
 * Left, BÁO NHẦM: the AI's alert (red path) lands on someone who does not need help.
 * Right, BỎ SÓT: the AI's path stops short of the person who does need help; nobody is alerted.
 */
const N = 13;
const T = {
  left: spokenAt(N, 'báo nhầm') - 8, // 102
  leftFlow: [spokenAt(N, 'báo nhầm') + 10, spokenAt(N, 'không gặp khó') - 6], // 120–194
  right: spokenAt(N, 'bỏ sót') - 8, // 232
  rightFlow: [spokenAt(N, 'bỏ sót') + 8, spokenAt(N, 'đang cần hỗ trợ') + 4], // 248–294
};
const PANEL_Y = 450;
const aiL = { x: 130, y: 610, w: 250, h: 170 };
const aiR = { x: 1050, y: 610, w: 250, h: 170 };
const pL = { x: 720, y: 695, r: 66 };
const pR = { x: 1640, y: 695, r: 66 };
const STOP_X = 1470; // the missed path ends here, short of the person

function AiBox({ b, opacity }) {
  return (
    <GlassBox {...b} label="HỆ THỐNG AI" opacity={opacity}>
      <Icon name="robot" x={b.x + b.w / 2} y={b.y + b.h / 2 + 8} size={72} />
    </GlassBox>
  );
}

export default function S13() {
  const frame = useFrame();
  const oL = appear(frame, T.left);
  const oR = appear(frame, T.right);
  const hitL = pulse(frame, T.leftFlow[1]);
  return (
    <PartScene n={N} frame={frame}>
      {/* BÁO NHẦM */}
      <Pill x={130} y={PANEL_Y} label="BÁO NHẦM" active opacity={oL} />
      <AiBox b={aiL} opacity={oL} />
      <Flow
        points={[anchor(aiL, 'right'), { x: pL.x - pL.r - 8, y: pL.y }]}
        frame={frame}
        start={T.leftFlow[0]}
        end={T.leftFlow[1]}
        color={C.red}
        hideIn={[aiL]}
      />
      <Person x={pL.x} y={pL.y} r={pL.r} name="Người không cần giúp" opacity={oL} color={hitL > 0.45 ? C.red : C.accent} />
      <Chip x={pL.x - 100} y={pL.y - pL.r - 58} w={200} label="BÁO: CẦN GIÚP" tone="red" opacity={appear(frame, T.leftFlow[1])} />

      {/* BỎ SÓT */}
      <Pill x={1050} y={PANEL_Y} label="BỎ SÓT" active opacity={oR} />
      <AiBox b={aiR} opacity={oR} />
      <Flow
        points={[anchor(aiR, 'right'), { x: STOP_X, y: pR.y }]}
        frame={frame}
        start={T.rightFlow[0]}
        end={T.rightFlow[1]}
        color={C.textMuted}
        dashed
        arrow={false}
        hideIn={[aiR]}
      />
      <Cross x={(STOP_X + pR.x - pR.r) / 2} y={pR.y} size={36} opacity={appear(frame, T.rightFlow[1])} />
      <Person x={pR.x} y={pR.y} r={pR.r} name="Người đang cần giúp" active opacity={oR} />
      <Chip x={pR.x - 100} y={pR.y - pR.r - 58} w={200} label="KHÔNG AI BÁO" tone="muted" opacity={appear(frame, T.rightFlow[1] + 6)} />
    </PartScene>
  );
}

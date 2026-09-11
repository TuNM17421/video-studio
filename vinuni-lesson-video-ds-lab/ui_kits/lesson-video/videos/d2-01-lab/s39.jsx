import React from 'react';
import { AgentLoop, StopGate, SvgText } from '../../../../components/index.js';
import { C, appear, popScale, useFrame } from '../../../../lib/index.js';
import { spokenAt, speechEnd } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 39 — MINH HỌA. The re-ask loop keeps turning: Lan asks → the machine answers → still not the right
 * class → ask again. The answer counter rises on every lap (abstract pips, no real count) while the loop
 * never exits to "đúng hướng dẫn"; a stop gate gives the verdict: not enough evidence.
 */
const N = 39;
const STAGES = [
  { label: 'LAN HỎI', sub: 'nộp bài ở đâu?', role: 'input' },
  { label: 'MÁY TRẢ LỜI', sub: 'tạo một câu trả lời', role: 'process' },
  { label: 'CHƯA ĐÚNG LỚP', sub: 'phải hỏi lại', role: 'check' },
];
const LOOP = { cx: 740, cy: 610, w: 700, h: 450, start: 16, lap: 58, laps: 3 };
const answerAt = (k) => LOOP.start + LOOP.lap * (k + 1 / 3);
const T = {
  counter: 8,
  gate: spokenAt(N, 'vì Lan') + 30,
  verdict: speechEnd(N) - 8,
};

export default function S39() {
  const frame = useFrame();
  const answers = [0, 1, 2].filter((k) => frame >= answerAt(k)).length;
  return (
    <Scene n={N} frame={frame}>
      <AgentLoop
        cx={LOOP.cx}
        cy={LOOP.cy}
        w={LOOP.w}
        h={LOOP.h}
        stages={STAGES}
        center="VÒNG HỎI LẠI"
        centerSub="chưa tới hướng dẫn đúng"
        frame={frame}
        start={LOOP.start}
        lap={LOOP.lap}
        laps={LOOP.laps}
        errorStage={{ stage: 2, label: 'HỎI LẠI' }}
        activeStage={-1}
      />
      {/* Answer counter: one bubble per machine answer — abstract, no number (MINH HỌA). */}
      <RoleCard x={1290} y={330} w={480} h={150} tone="metric" label="CÂU TRẢ LỜI MÁY TẠO" opacity={appear(frame, T.counter)}>
        {[0, 1, 2].map((k) => {
          const at = answerAt(k);
          if (frame < at) return <rect key={k} x={1330 + k * 120} y={392} width={90} height={56} rx={16} fill="none" stroke={C.dotInactive} strokeWidth={3} strokeDasharray="8 7" />;
          const sc = popScale(frame, at);
          const cx = 1375 + k * 120;
          return (
            <g key={k} transform={`translate(${cx} 420) scale(${sc}) translate(${-cx} -420)`}>
              <rect x={1330 + k * 120} y={392} width={90} height={56} rx={16} fill={C.accent} />
              <path d={`M ${1348 + k * 120} 446 l -6 16 l 20 -16 Z`} fill={C.accent} />
            </g>
          );
        })}
        <SvgText x={1715} y={432} size={34} weight={700} color={C.accentStrong} opacity={appear(frame, answerAt(2))}>…</SvgText>
      </RoleCard>
      <SvgText x={1530} y={532} size={21} weight={600} color={C.textMuted} opacity={appear(frame, answerAt(1))}>
        tăng, nhưng khó khăn chưa giảm
      </SvgText>
      <StopGate x={1530} y={680} r={56} label="CHƯA ĐỦ BẰNG CHỨNG" detail="số câu trả lời ≠ khó khăn đã giảm" icon="octagon-x" frame={frame} at={T.verdict} opacity={appear(frame, T.gate)} />
    </Scene>
  );
}

import React from 'react';
import { Card, Enclosure, Flow, GlassBox, Icon, Person, SvgText } from '../../../../components/index.js';
import { C, anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { PartScene } from './shared.jsx';

/*
 * Câu 10 — two ways to organise the work, side by side. Left: a person sets the rules and the steps in
 * advance; the particle runs the preset path. Right: a result goes into AI, which picks the next step
 * from candidates that stay inside an allowed scope ("Trong phạm vi cho phép", under the AI card).
 */
const N = 10;
const AI_AT = spokenAt(N, 'hoặc để AI'); // 240
const T = {
  panels: spokenAt(N, 'so sánh hai cách') - 6, // 44
  rules: spokenAt(N, 'con người đặt sẵn') - 6, // 124
  steps: [spokenAt(N, 'con người đặt sẵn') + 2, spokenAt(N, 'con người đặt sẵn') + 10, spokenAt(N, 'con người đặt sẵn') + 18],
  stepFlows: [[160, 190], [194, 224]],
  result: AI_AT - 6,
  ai: AI_AT - 2,
  resultFlow: [AI_AT + 10, AI_AT + 44], // 250–284
  options: spokenAt(N, 'chọn bước tiếp') - 4, // ≈ 276
  scope: spokenAt(N, 'chọn bước tiếp') + 6,
  chosenFlow: [spokenAt(N, 'kết quả vừa nhận được') - 6, spokenAt(N, 'kết quả vừa nhận được') + 24], // 334–364
};

const LEFT = { x: 90, y: 420, w: 810, h: 520 };
const RIGHT = { x: 1020, y: 420, w: 810, h: 520 };
const steps = [0, 1, 2].map((i) => ({ x: 140 + i * 255, y: 600, w: 200, h: 110 }));
const result = { x: 1060, y: 565, w: 200, h: 110 };
const ai = { x: 1300, y: 545, w: 300, h: 150 };
const options = [0, 1, 2].map((i) => ({ x: 1140 + i * 220, y: 800, w: 180, h: 90 }));
const CHOSEN = 1;
const scope = { x: 1110, y: 770, w: 680, h: 150 };

function Panel({ box, label, opacity }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={30} fill="none" stroke={C.dotInactive} strokeWidth={3} />
      <SvgText x={box.x + box.w / 2} y={box.y + 48} size={22} weight={700} color={C.accentStrong} letterSpacing={1.2}>
        {label}
      </SvgText>
    </g>
  );
}

export default function S10() {
  const frame = useFrame();
  const aiIn = appear(frame, T.ai);
  const aiOut = anchor(ai, 'bottom');
  const chosenIn = anchor(options[CHOSEN], 'top');
  const chosen = pulse(frame, T.chosenFlow[1]);
  const settled = frame >= T.chosenFlow[1];
  return (
    <PartScene n={N} frame={frame}>
      <Panel box={LEFT} label="CON NGƯỜI ĐẶT QUY TẮC" opacity={appear(frame, T.panels)} />
      <Panel box={RIGHT} label="AI CHỌN BƯỚC TIẾP" opacity={appear(frame, T.panels + 6)} />

      {/* left: preset rules + fixed steps */}
      <Person x={180} y={530} r={40} opacity={appear(frame, T.rules)} />
      <SvgText x={240} y={538} size={22} weight={600} anchor="start" color={C.textMuted} opacity={appear(frame, T.rules)}>
        Quy tắc và các bước xử lý đặt sẵn
      </SvgText>
      {T.stepFlows.map(([a, b], i) => (
        <Flow key={i} points={[anchor(steps[i], 'right'), anchor(steps[i + 1], 'left')]} frame={frame} start={a} end={b} hideIn={[steps[i], steps[i + 1]]} />
      ))}
      {steps.map((s, i) => (
        <Card key={i} {...s} lines={[`BƯỚC ${i + 1}`]} size={24} opacity={appear(frame, T.steps[i])} active={i > 0 ? pulse(frame, T.stepFlows[i - 1][1]) : 0} />
      ))}
      <SvgText x={LEFT.x + LEFT.w / 2} y={800} size={22} weight={600} color={C.textMuted} opacity={appear(frame, T.stepFlows[1][1])}>
        Luôn đi đúng thứ tự đã định
      </SvgText>

      {/* right: result → AI → next step inside the allowed scope */}
      <Card {...result} label="KẾT QUẢ" lines={['vừa nhận được']} size={22} opacity={appear(frame, T.result)} />
      <Flow points={[anchor(result, 'right'), anchor(ai, 'left')]} frame={frame} start={T.resultFlow[0]} end={T.resultFlow[1]} hideIn={[result, ai]} />
      <GlassBox {...ai} label="AI" opacity={aiIn} active={pulse(frame, T.resultFlow[1])}>
        <Icon name="robot" x={ai.x + ai.w / 2} y={ai.y + ai.h / 2 + 8} size={70} opacity={aiIn} />
      </GlassBox>
      <Enclosure {...scope} labelX={scope.x + 24} label="TRONG PHẠM VI CHO PHÉP" opacity={appear(frame, T.scope)} />
      {options.map((o, i) => (
        <Card
          key={i}
          {...o}
          lines={[`Bước ${String.fromCharCode(65 + i)}`]}
          size={22}
          fill={C.bg}
          opacity={appear(frame, T.options + i * 4)}
          accent={settled && i === CHOSEN ? C.red : C.accent}
          active={i === CHOSEN ? chosen : 0}
        />
      ))}
      <Flow points={[aiOut, chosenIn]} frame={frame} start={T.chosenFlow[0]} end={T.chosenFlow[1]} color={C.red} hideIn={[ai, options[CHOSEN]]} />
    </PartScene>
  );
}

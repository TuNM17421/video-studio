import React from 'react';
import { Card, Flow, HookOverlay, Icon, SceneFrame, SvgText } from '../../../../components/index.js';
import { C, anchor, appear, pulse, useFrame } from '../../../../lib/index.js';
import { EYEBROW, captionsFor, cue, footerFor } from './shared.jsx';

/*
 * Câu 01 — hook. "Bắt đầu từ đâu?" holds while the first clause is read, then a vague request appears
 * with two equal options (choose a tool / understand the difficulty). Neither option is favoured: the
 * question stays open until câu 02. MINH HỌA: self-authored situation.
 */
const N = 1;
const T = {
  hook: 120, // HookOverlay duration — the backdrop clears at 104–119
  request: 122,
  tool: 166, // "chọn công cụ" ≈ f 170
  toolFlow: [170, 222],
  need: 204, // "tìm hiểu người dùng đang gặp khó khăn" ≈ f 210
  needFlow: [208, 260],
  question: 268,
};
const request = { x: 180, y: 505, w: 470, h: 170 };
const tool = { x: 1110, y: 390, w: 520, h: 140 };
const need = { x: 1110, y: 650, w: 520, h: 140 };
const JUNCTION_X = 860;

function QuestionMark({ x, y, opacity }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <circle cx={x} cy={y} r={34} fill={C.bg} stroke={C.red} strokeWidth={4} />
      <SvgText x={x} y={y + 14} size={40} weight={700} color={C.red}>
        ?
      </SvgText>
    </g>
  );
}

export default function S01() {
  const frame = useFrame();
  const c = cue(N);
  const out = anchor(request, 'right');
  const toolIn = anchor(tool, 'left');
  const needIn = anchor(need, 'left');
  return (
    <SceneFrame
      frame={frame}
      eyebrow={EYEBROW}
      title={c.title}
      tag={c.tag}
      footer={footerFor(N)}
      captions={captionsFor(N)}
      overlay={<HookOverlay frame={frame} duration={T.hook} question="Bắt đầu từ đâu?" />}
    >
      <Card {...request} dashed label="YÊU CẦU" lines={['“Làm một trợ lý AI”', 'yêu cầu còn mơ hồ']} size={28} lineHeight={40} opacity={appear(frame, T.request)} />
      <Flow
        points={[out, { x: JUNCTION_X, y: out.y }, { x: JUNCTION_X, y: toolIn.y }, toolIn]}
        frame={frame}
        start={T.toolFlow[0]}
        end={T.toolFlow[1]}
        hideIn={[request, tool]}
      />
      <Flow
        points={[out, { x: JUNCTION_X, y: out.y }, { x: JUNCTION_X, y: needIn.y }, needIn]}
        frame={frame}
        start={T.needFlow[0]}
        end={T.needFlow[1]}
        hideIn={[request, need]}
      />
      <Card {...tool} lines={['CHỌN CÔNG CỤ']} size={30} opacity={appear(frame, T.tool)} active={pulse(frame, T.toolFlow[1])} />
      <Icon name="gear" x={tool.x + 74} y={tool.y + tool.h / 2} size={54} opacity={appear(frame, T.tool)} />
      <Card {...need} lines={['HIỂU KHÓ KHĂN']} size={30} opacity={appear(frame, T.need)} active={pulse(frame, T.needFlow[1])} />
      <Icon name="users" x={need.x + 74} y={need.y + need.h / 2} size={54} opacity={appear(frame, T.need)} />
      <QuestionMark x={tool.x + tool.w / 2} y={(tool.y + tool.h + need.y) / 2} opacity={appear(frame, T.question)} />
    </SceneFrame>
  );
}

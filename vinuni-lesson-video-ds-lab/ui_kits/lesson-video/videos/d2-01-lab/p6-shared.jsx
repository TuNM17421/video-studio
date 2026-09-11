import React from 'react';
import { Cross, Flow, Gate, Icon, SvgText, ToolCard, gateStop, toolCardHeight } from '../../../../components/index.js';
import { C, clamp01, pulse } from '../../../../lib/index.js';
import { RoleCard, TONE, ToneLabel } from './shared.jsx';

/*
 * Part 6 board (câu 41–45): the proposal (purple zone, ToolCard) on the left, a decision gate in the
 * middle, the four questions the team must answer on the right (+ the consequence zone of câu 44).
 * `swap` (0–1, câu 45) moves the question set in front of (left of) the proposal.
 */
export const TOOL_PROPS = {
  name: 'gui_thu_dien_tu',
  does: 'Tự chọn cách xử lý rồi gửi thư điện tử cho học viên.',
  inputs: [{ name: 'yeu_cau', type: 'chuỗi', required: true }, { name: 'email_hoc_vien', type: 'email' }],
  returns: 'Thư đã gửi tới học viên.',
  illustrative: true,
};
const TOOL_W = 500;
const TOOL_H = toolCardHeight({ ...TOOL_PROPS, w: TOOL_W });
const ZONE = { x: 100, y: 280, w: 560, h: TOOL_H + 110 };
const TOOL = { x: 130, y: 350, w: TOOL_W, h: TOOL_H };
const GATE_Y = TOOL.y + TOOL.h / 2;

export const QUESTIONS = [
  { ask: 'Ai cần?', value: 'Người gặp vấn đề', tone: 'user' },
  { ask: 'Khó việc gì?', value: 'Bước bị vướng', tone: 'problem' },
  { ask: 'Có bằng chứng gì?', value: 'Bằng chứng đang xảy ra', tone: 'user' },
  { ask: 'Muốn kết quả gì?', value: 'Kết quả mong muốn', tone: 'job' },
];
const QX = 950;
const SLOT_W = 420;
const SLOT_H = 150;
const slotBox = (i) => ({ x: QX + (i % 2) * (SLOT_W + 30), y: 300 + Math.floor(i / 2) * (SLOT_H + 26), w: SLOT_W, h: SLOT_H });
const CONSEQ = { x: QX, y: 666, w: 2 * SLOT_W + 30, h: 250 };
export const EMAIL_ERRORS = ['Gửi nhầm người', 'Sai hướng dẫn', 'Gửi lặp lại'];

function QuestionSlot({ b, q, fill, hot, opacity }) {
  if (opacity <= 0.001) return null;
  const f = clamp01(fill);
  const [stroke, soft] = TONE[q.tone];
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={22} fill={f > 0.5 ? soft : C.bg} stroke={f > 0.5 ? stroke : C.accent} strokeWidth={3 + 2 * clamp01(hot)} strokeDasharray={f > 0.5 ? undefined : '12 10'} />
      <SvgText x={b.x + b.w / 2} y={b.y + (f > 0 ? 48 : b.h / 2 + 12)} size={f > 0 ? 22 : 30} weight={700} color={f > 0 ? stroke : C.text}>
        {q.ask}
      </SvgText>
      {f > 0 ? (
        <SvgText x={b.x + b.w / 2} y={b.y + 108} size={27} weight={700} color={C.text} opacity={f}>
          {q.value}
        </SvgText>
      ) : null}
    </g>
  );
}

function Mark({ x, y, opacity, k = 0 }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <circle cx={x} cy={y} r={30 + 4 * k} fill={C.bg} stroke={C.red} strokeWidth={4 + 2 * k} />
      <SvgText x={x} y={y + 13} size={36} weight={700} color={C.red}>
        ?
      </SvgText>
    </g>
  );
}

export function Board({
  frame,
  toolIn = 1,
  zoneLabel = 'ĐỀ NGHỊ',
  zoneLabel2, // crossfades in over zoneLabel
  zoneMix = 0,
  gateIn = 1,
  gateState = 'pending',
  gateLabel = 'QUYẾT ĐỊNH XÂY?',
  gateAt,
  flow, // [start, end] tool → gate travel
  slotsIn = [1, 1, 1, 1],
  fills = [0, 0, 0, 0],
  hots = [0, 0, 0, 0],
  headIn = 1,
  conseqIn = 0,
  emailIn = [0, 0, 0],
  qmark = 0,
  qmarkAt,
  swap = 0,
  dim = 0,
}) {
  // After the swap: questions start at x 100, gate at 1110, proposal at 1210.
  const dq = (100 - QX) * swap;
  const dp = 1150 * swap;
  const gate = { x: 805 + (1140 - 805) * swap, y: GATE_Y, h: 190 };
  const flowOut = 1 - clamp01(swap * 3);
  return (
    <g opacity={dim ? 1 - dim * 0.6 : undefined}>
      {/* proposal */}
      <g transform={dp ? `translate(${dp} 0)` : undefined} opacity={toolIn < 1 ? toolIn : undefined}>
        <rect x={ZONE.x} y={ZONE.y} width={ZONE.w} height={ZONE.h} rx={32} fill="none" stroke={TONE.solution[0]} strokeWidth={3} strokeDasharray="15 12" />
        <ToneLabel x={ZONE.x + 30} y={ZONE.y + 44} tone="solution" opacity={1 - zoneMix}>
          {zoneLabel}
        </ToneLabel>
        {zoneLabel2 ? (
          <ToneLabel x={ZONE.x + 30} y={ZONE.y + 44} tone="solution" opacity={zoneMix}>
            {zoneLabel2}
          </ToneLabel>
        ) : null}
        <ToolCard {...TOOL_PROPS} x={TOOL.x} y={TOOL.y} w={TOOL.w} />
        <Mark x={TOOL.x + TOOL.w - 8} y={TOOL.y - 4} opacity={qmark} k={qmarkAt != null ? pulse(frame, qmarkAt) : 0} />
      </g>
      {flowOut > 0.001 ? (
        flow ? (
          <Flow points={[{ x: TOOL.x + TOOL.w + 12, y: GATE_Y }, gateStop(gate, 'left')]} frame={frame} start={flow[0]} end={flow[1]} color={TONE.solution[0]} opacity={flowOut} />
        ) : (
          <Flow points={[{ x: TOOL.x + TOOL.w + 12, y: GATE_Y }, gateStop(gate, 'left')]} progress={1} showParticle={false} fadeIn={false} color={TONE.solution[0]} opacity={flowOut} />
        )
      ) : null}
      {swap > 0.5 ? (
        <Flow points={[{ x: 100 + CONSEQ.w + 12, y: GATE_Y }, gateStop(gate, 'left')]} progress={1} showParticle={false} fadeIn={false} opacity={clamp01(swap * 2 - 1)} />
      ) : null}
      <Gate x={gate.x} y={gate.y} h={gate.h} state={gateState} label={gateLabel} frame={frame} at={gateAt} opacity={gateIn} />
      {/* questions */}
      <g transform={dq ? `translate(${dq} 0)` : undefined}>
        <SvgText x={QX} y={280} size={18} weight={700} anchor="start" color={C.accentStrong} letterSpacing={1.4} opacity={headIn}>
          CẦN BIẾT TRƯỚC KHI QUYẾT ĐỊNH
        </SvgText>
        {QUESTIONS.map((q, i) => (
          <QuestionSlot key={i} b={slotBox(i)} q={q} fill={fills[i]} hot={hots[i]} opacity={slotsIn[i]} />
        ))}
        {conseqIn > 0.001 ? (
          <RoleCard {...CONSEQ} tone="problem" label="HẬU QUẢ KHI GỬI THƯ SAI" opacity={conseqIn}>
            {EMAIL_ERRORS.map((e, i) => {
              const o = emailIn[i];
              if (o <= 0.001) return null;
              const x = CONSEQ.x + 24 + i * 272;
              return (
                <g key={e} opacity={o < 1 ? o : undefined}>
                  <rect x={x} y={CONSEQ.y + 62} width={250} height={140} rx={18} fill={C.bg} stroke={TONE.problem[0]} strokeWidth={2.5} />
                  <Icon name="mail" x={x + 125} y={CONSEQ.y + 110} size={52} color={C.accent} />
                  <Cross x={x + 160} y={CONSEQ.y + 128} size={24} strokeWidth={6} />
                  <SvgText x={x + 125} y={CONSEQ.y + 180} size={21} weight={700} color={C.text}>
                    {e}
                  </SvgText>
                </g>
              );
            })}
            <SvgText x={CONSEQ.x + CONSEQ.w - 24} y={CONSEQ.y + 34} size={17} weight={700} anchor="end" color={TONE.problem[0]} opacity={clamp01(emailIn[2])}>
              VÍ DỤ MINH HỌA
            </SvgText>
          </RoleCard>
        ) : null}
      </g>
    </g>
  );
}

import React from 'react';
import { Flow, Gate, LineIcon, Swimlane, SvgText } from '../../../../components/index.js';
import { C, ROLE, clamp01 } from '../../../../lib/index.js';
import { BOARD, RoleCard, STEPS, TONE, ToneLabel, boardStep } from './shared.jsx';

/*
 * Câu 28–33 helpers: the two-lane board with its steps, the links between them, the lane-1 extras
 * (approval gate under "Nháp phản hồi", escalation to "Nhân sự hỗ trợ" under the step row) and the
 * small chatbot chip. Geometry comes only from BOARD / boardStep so later scenes line up.
 */

/** Step copy split to fit a 300 px card. */
const STEP_LINES = [
  [['Câu hỏi về sản phẩm,', 'chính sách'], ['Giải đáp'], ['Tư vấn mua hàng'], ['Chăm sóc sau mua']],
  [['Yêu cầu hỗ trợ'], ['Phân loại yêu cầu'], ['Tra cứu nghiệp vụ'], ['Nháp phản hồi']],
];

export const step = boardStep;
const laneH = BOARD.h / BOARD.lanes.length;

/** Lane 0 extra chip "Bán thêm · bán chéo" under "Chăm sóc sau mua". */
const s03 = boardStep(0, 3);
export const UPSELL = { x: s03.x + 10, y: s03.y + s03.h + 16, w: s03.w - 20, h: 46 };

/** Lane 1 extras (below the step row, inside lane 1). */
const s11 = boardStep(1, 1);
const s12 = boardStep(1, 2);
const s13 = boardStep(1, 3);
export const ESC_Y = s11.y + s11.h + 54; // horizontal run of the escalation branch
export const ESC_CARD = { x: s12.x - 20, y: ESC_Y - 28, w: 250, h: 56 };
export const ESC_PATH = [
  { x: s11.x + s11.w / 2, y: s11.y + s11.h + 10 },
  { x: s11.x + s11.w / 2, y: ESC_Y },
  { x: ESC_CARD.x - 10, y: ESC_Y },
];
export const GATE = { x: s13.x + 70, y: s13.y + s13.h + 50, h: 104, orientation: 'horizontal' };

/** Workflow outlines (câu 30): one rounded path around each lane's chain. */
export const OUTLINES = [
  { x: boardStep(0, 0).x - 22, y: boardStep(0, 0).y - 22, w: s03.x + s03.w + 22 - (boardStep(0, 0).x - 22), h: UPSELL.y + UPSELL.h + 14 - (boardStep(0, 0).y - 22) },
  { x: boardStep(1, 0).x - 22, y: s11.y - 22, w: s13.x + s13.w + 22 - (boardStep(1, 0).x - 22), h: BOARD.y + 2 * laneH - 8 - (s11.y - 22) },
];

function vis(o) {
  return clamp01(o ?? 0);
}

/**
 * The board. `lanes[l].steps[i]` = { o, hot, muted } ; `lanes[l].links[i]` (link from step i to i+1) =
 * { start, end } (animated) | 1 (static, drawn) | undefined (hidden). `extras`: upsell, esc (o, flow),
 * gate (o, state, at), laneStart (Swimlane reveal frame; undefined = settled).
 */
export function Board({ frame, lanes, extras = {}, opacity = 1, laneStart, children }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <Swimlane {...BOARD} frame={laneStart == null ? undefined : frame} start={laneStart ?? 0} per={12} />
      {lanes.map((ln, l) => (
        <g key={l}>
          {(ln.links || []).map((lk, i) => {
            if (!lk) return null;
            const a = boardStep(l, i);
            const b = boardStep(l, i + 1);
            const pts = [
              { x: a.x + a.w + 6, y: a.y + a.h / 2 },
              { x: b.x - 6, y: b.y + b.h / 2 },
            ];
            return lk === 1 ? (
              <Flow key={i} points={pts} progress={1} showParticle={false} fadeIn={false} opacity={ln.muted ? 1 - 0.64 * ln.muted : 1} />
            ) : (
              <Flow key={i} points={pts} frame={frame} start={lk.start} end={lk.end} />
            );
          })}
          {STEP_LINES[l].map((lines, i) => {
            const s = (ln.steps || [])[i] || {};
            const o = vis(s.o);
            if (o <= 0.001) return null;
            const b = boardStep(l, i);
            return <RoleCard key={i} {...b} tone="user" lines={lines} size={lines.length > 1 ? 22 : 24} hot={s.hot || 0} muted={s.muted ?? ln.muted ?? 0} opacity={o} />;
          })}
        </g>
      ))}
      {vis(extras.upsell) > 0.001 ? (
        <RoleCard {...UPSELL} tone="user" dashed lines={['Bán thêm · bán chéo']} size={20} opacity={vis(extras.upsell)} muted={extras.upsellMuted || 0} hot={extras.upsellHot || 0} />
      ) : null}
      {extras.esc && vis(extras.esc.o) > 0.001 ? <Escalation frame={frame} {...extras.esc} /> : null}
      {extras.gate && vis(extras.gate.o) > 0.001 ? <Approval frame={frame} {...extras.gate} /> : null}
      {children}
    </g>
  );
}

/** Escalation: from "Phân loại yêu cầu" down and right to an orange "Nhân sự hỗ trợ" card. */
export function Escalation({ frame, o = 1, flow, card = 1, hot = 0, muted = 0 }) {
  const m = 1 - 0.64 * clamp01(muted);
  return (
    <g opacity={o * m < 1 ? o * m : undefined}>
      {flow === 1 || flow == null ? (
        <Flow points={ESC_PATH} progress={1} showParticle={false} fadeIn={false} color={ROLE.orange} />
      ) : (
        <Flow points={ESC_PATH} frame={frame} start={flow[0]} end={flow[1]} color={ROLE.orange} />
      )}
      <SvgText x={ESC_PATH[1].x - 18} y={ESC_Y + 7} size={18} weight={700} anchor="end" color={ROLE.orange}>
        Câu hỏi phức tạp, rủi ro cao
      </SvgText>
      <RoleCard {...ESC_CARD} tone="problem" lines={['Nhân sự hỗ trợ']} size={22} opacity={clamp01(card)} hot={hot} />
    </g>
  );
}

/** Approval: a horizontal Gate under "Nháp phản hồi", label "CON NGƯỜI / PHÊ DUYỆT" to its right. */
export function Approval({ frame, o = 1, state = 'pending', at, muted = 0 }) {
  const m = 1 - 0.64 * clamp01(muted);
  const hue = state === 'open' ? ROLE.green : ROLE.amber;
  const lx = GATE.x + GATE.h / 2 + 18;
  return (
    <g opacity={o * m < 1 ? o * m : undefined}>
      <path d={`M ${GATE.x} ${s13.y + s13.h + 6} V ${GATE.y - 34}`} stroke={C.dotInactive} strokeWidth={5} strokeLinecap="round" />
      <Gate {...GATE} state={state} frame={frame} at={at} />
      <SvgText x={lx} y={GATE.y - 4} size={18} weight={700} anchor="start" color={hue} letterSpacing={1}>
        CON NGƯỜI
      </SvgText>
      <SvgText x={lx} y={GATE.y + 20} size={18} weight={700} anchor="start" color={hue} letterSpacing={1}>
        PHÊ DUYỆT
      </SvgText>
    </g>
  );
}

/** Small purple chatbot chip pinned on the top edge of a step (lane l, step i). */
export function ChatChip({ l, i, opacity = 1, hot = 0, label = 'CHATBOT' }) {
  if (opacity <= 0.001) return null;
  const b = boardStep(l, i);
  const w = 150;
  const h = 40;
  const x = b.x + b.w - w - 12;
  const y = b.y - h / 2;
  const [stroke, soft] = TONE.solution;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={soft} stroke={stroke} strokeWidth={2.5 + 2 * clamp01(hot)} />
      <LineIcon name="bot" x={x + 26} y={y + h / 2} size={24} color={stroke} />
      <SvgText x={x + 44} y={y + h / 2 + 6} size={16} weight={700} anchor="start" color={stroke} letterSpacing={1}>
        {label}
      </SvgText>
    </g>
  );
}
export const chipCenter = (l, i) => {
  const b = boardStep(l, i);
  return { x: b.x + b.w - 12 - 75, y: b.y };
};

/** Rounded dashed outline drawn on (0–1) with an optional label pill on its top edge. */
export function Outline({ box, draw = 1, label, labelO = 0, tone = 'neutral' }) {
  const d = clamp01(draw);
  if (d <= 0.001 && labelO <= 0.001) return null;
  const [stroke] = TONE[tone] || TONE.neutral;
  const per = 2 * (box.w + box.h);
  const lw = 400;
  return (
    <g>
      {d > 0.001 ? (
        <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={30} fill="none" stroke={stroke} strokeWidth={3} strokeDasharray={`${per * d} ${per}`} />
      ) : null}
      {label && labelO > 0.001 ? (
        <g opacity={labelO < 1 ? labelO : undefined}>
          <rect x={box.x + 40} y={box.y - 20} width={lw} height={40} rx={20} fill={C.bg} stroke={stroke} strokeWidth={2.5} />
          <SvgText x={box.x + 40 + lw / 2} y={box.y + 7} size={18} weight={700} color={stroke} letterSpacing={1}>
            {label}
          </SvgText>
        </g>
      ) : null}
    </g>
  );
}

/** Fully settled board (câu 30–32 start from it). */
export function settledLanes(muted = [0, 0]) {
  return [0, 1].map((l) => ({
    muted: muted[l],
    steps: STEPS[l].map(() => ({ o: 1 })),
    links: [1, 1, 1],
  }));
}

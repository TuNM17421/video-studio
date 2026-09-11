import React from 'react';
import { Flow, Swimlane, SvgText } from '../../../../components/index.js';
import { C, ROLE, clamp01 } from '../../../../lib/index.js';
import { BOARD, STEPS, TONE, boardStep, RoleCard } from './shared.jsx';

/*
 * Helpers for câu 40–45 only (phần 9–10). The board of câu 43–44 is the shared BOARD moved down to
 * y 390 (the band 260–380 above it carries the scene's one-line point or the outside chatbot); câu 45
 * uses a narrower board so a metric card fits at the end of each lane.
 */
export const BV = { ...BOARD, y: 390, h: 540 };

/** Step copy split into lines that fit a 300 px step (the words of STEPS, unchanged). */
const STEP_LINES = {
  'Câu hỏi về sản phẩm, chính sách': ['Câu hỏi về sản phẩm,', 'chính sách'],
  'Phân loại yêu cầu': ['Phân loại', 'yêu cầu'],
  'Tra cứu nghiệp vụ': ['Tra cứu', 'nghiệp vụ'],
  'Chăm sóc sau mua': ['Chăm sóc', 'sau mua'],
};
export const stepLines = (s) => STEP_LINES[s] || [s];

/** The two-lane workflow: Swimlane + step cards + static arrows. `stepBox(lane, i)` places steps. */
export function WorkflowBoard({ b = BV, stepBox = (l, i) => boardStep(l, i, b), opacity = 1, size = 22, muted = [], under }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <Swimlane x={b.x} y={b.y} w={b.w} h={b.h} lanes={b.lanes} headerW={b.headerW} />
      {under}
      {STEPS.map((row, lane) =>
        row.map((s, i) => {
          const box = stepBox(lane, i);
          const next = i < row.length - 1 ? stepBox(lane, i + 1) : null;
          return (
            <g key={`${lane}-${i}`}>
              {next ? (
                <Flow
                  points={[{ x: box.x + box.w + 6, y: box.y + box.h / 2 }, { x: next.x - 6, y: next.y + next.h / 2 }]}
                  progress={1}
                  showParticle={false}
                  strokeWidth={3}
                  fadeIn={false}
                />
              ) : null}
              <RoleCard {...box} tone="user" lines={stepLines(s)} size={size} muted={muted.includes(`${lane}-${i}`) ? 1 : 0} />
            </g>
          );
        }),
      )}
    </g>
  );
}

/** Small uppercase chip in a TONE (outline + soft fill). */
export function ToneChip({ x, y, w, h = 36, tone = 'problem', label, opacity = 1, size = 17 }) {
  if (opacity <= 0.001) return null;
  const [stroke, soft] = TONE[tone];
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={soft} stroke={stroke} strokeWidth={2.5} />
      <SvgText x={x + w / 2} y={y + h / 2 + size * 0.36} size={size} weight={700} color={stroke}>
        {label}
      </SvgText>
    </g>
  );
}

/** The pain zone around one step: orange dashed halo, drawn under the step card. */
export function PainZone({ box, pad = 20, grow = 1, hot = 0, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const g = clamp01(grow);
  const p = pad * g;
  const a = clamp01(hot);
  return (
    <rect
      x={box.x - p}
      y={box.y - p}
      width={box.w + 2 * p}
      height={box.h + 2 * p}
      rx={26}
      fill={ROLE.orangeSoft}
      stroke={ROLE.orange}
      strokeWidth={3 + 2 * a}
      strokeDasharray="12 10"
      opacity={opacity < 1 ? opacity : undefined}
    />
  );
}

export { C };

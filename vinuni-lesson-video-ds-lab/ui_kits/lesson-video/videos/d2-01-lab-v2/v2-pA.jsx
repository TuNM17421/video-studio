import React from 'react';
import { SvgText } from '../../../../components/index.js';
import { C, appear } from '../../../../lib/index.js';
import { RoleCard } from './shared.jsx';

/*
 * Layouts shared by câu 01–09 of d2-01-lab-v2 (the day opener) so consecutive scenes that "giữ hình"
 * keep every card in the same place.
 */

/* ── câu 01 + pause: the central question and four faint hint cards ─────────────────────────────── */
export const QUESTION = { x: 380, y: 480, w: 1160, h: 220 };
export const HINTS = [
  { x: 150, y: 300, label: 'Bài toán', tone: 'job', from: { x: -40, y: -20 } },
  { x: 1470, y: 300, label: 'Giải pháp', tone: 'solution', from: { x: 40, y: -20 } },
  { x: 150, y: 800, label: 'Nhu cầu', tone: 'job', from: { x: -40, y: 20 } },
  { x: 1470, y: 800, label: 'Công nghệ', tone: 'solution', from: { x: 40, y: 20 } },
];
const HINT_W = 300;
const HINT_H = 96;

export function QuestionBoard({ frame, hintsAt = [0, 0, 0, 0], questionAt = 0, hot = 0 }) {
  const q = appear(frame, questionAt);
  return (
    <g>
      {HINTS.map((h, i) => {
        const a = appear(frame, hintsAt[i], 36);
        return (
          <g key={h.label} transform={`translate(${(1 - a) * h.from.x} ${(1 - a) * h.from.y})`}>
            <RoleCard x={h.x} y={h.y} w={HINT_W} h={HINT_H} tone={h.tone} lines={[h.label]} size={28} opacity={a * 0.55} dashed />
          </g>
        );
      })}
      {q > 0.001 ? (
        <g opacity={q < 1 ? q : undefined} transform={`translate(0 ${(1 - q) * 16})`}>
          <RoleCard x={QUESTION.x} y={QUESTION.y} w={QUESTION.w} h={QUESTION.h} tone="unknown" hot={hot} />
          <SvgText x={960} y={QUESTION.y + 96} size={48} weight={700} color={C.text}>
            Mình đã chắc là đang giải
          </SvgText>
          <SvgText x={960} y={QUESTION.y + 164} size={48} weight={700} color={C.text}>
            đúng bài toán chưa?
          </SvgText>
        </g>
      ) : null}
    </g>
  );
}

/* ── câu 03–04: two contrasting cards ─────────────────────────────────────────────────────────── */
export const PAIR_L = { x: 250, y: 440, w: 560, h: 240 };
export const PAIR_R = { x: 1110, y: 440, w: 560, h: 240 };
export const PAIR_MID = { x: 960, y: 560 };

/** Big red symbol between the pair ('≠' or '?'). */
export function MidSymbol({ ch, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <circle cx={PAIR_MID.x} cy={PAIR_MID.y} r={58} fill={C.bg} stroke={C.red} strokeWidth={4} />
      <SvgText x={PAIR_MID.x} y={PAIR_MID.y + 24} size={66} weight={700} color={C.red}>
        {ch}
      </SvgText>
    </g>
  );
}

/* ── câu 06 + 09: the chain of day goals ──────────────────────────────────────────────────────── */
export const GOALS = [
  ['Phân biệt bài toán', 'với giải pháp'],
  ['Đặt câu hỏi', 'làm rõ'],
  ['Rồi mới đề xuất', 'công nghệ'],
];
export const GOAL_X = [150, 720, 1290];
export const GOAL_W = 480;

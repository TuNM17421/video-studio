import React from 'react';
import { Flow, LineIcon, Pill, SvgText, Swimlane } from '../../../../components/index.js';
import { C, ROLE, appear, clamp01, pillWidth } from '../../../../lib/index.js';
import { BOARD, ChatbotBlock, RoleCard, TONE, ToneLabel, boardStep } from './shared.jsx';

/*
 * Helpers for câu 19–27 only.
 *   Layout A (câu 19–23): the chatbot request alone at the center, questions / branches around it.
 *   Layout B (câu 24–27): the two lanes of BOARD (same geometry as the board of câu 28+), with the
 *   chatbot straddling the lane divider — so câu 28 continues the same picture.
 */

/* ── layout A ──────────────────────────────────────────────────────────────────────────────── */
export const BOT_A = { x: 780, y: 530, w: 360, h: 120 };
export const BOT_A_CY = BOT_A.y + BOT_A.h / 2;
const REQUEST = 'YÊU CẦU · XÂY MỘT CHATBOT AI';
const REQ_W = pillWidth(REQUEST, 18);

export function RequestPill({ opacity = 1, muted = 0 }) {
  const o = opacity * (1 - clamp01(muted) * 0.64);
  return <Pill x={960 - REQ_W / 2} y={432} w={REQ_W} label={REQUEST} accent={ROLE.purple} opacity={o} />;
}

export function BotA({ hot = 0, opacity = 1, muted = 0 }) {
  return <ChatbotBlock {...BOT_A} hot={hot} opacity={opacity} muted={muted} />;
}

/** Three open questions around the chatbot (câu 21). */
export const QUESTION_ZONES = [
  { x: 200, y: 535, w: 420, h: 110, text: 'Ai sẽ dùng?', from: { x: BOT_A.x, y: BOT_A_CY }, to: { x: 620, y: BOT_A_CY } },
  { x: 1300, y: 535, w: 420, h: 110, text: 'Vướng ở đâu?', from: { x: BOT_A.x + BOT_A.w, y: BOT_A_CY }, to: { x: 1300, y: BOT_A_CY } },
  { x: 740, y: 790, w: 440, h: 110, text: 'Tham gia công việc nào?', from: { x: 960, y: BOT_A.y + BOT_A.h }, to: { x: 960, y: 790 } },
];

/** Two branch columns (câu 22–23). */
export const COLS = [
  { x: 100, y: 330, w: 520, h: 430 },
  { x: 1300, y: 330, w: 520, h: 430 },
];
const ROW_H = 118;
const rowBox = (col, i) => ({ x: col.x + 20, y: col.y + 18 + i * (ROW_H + 18), w: col.w - 40, h: ROW_H });
/** Different order per branch: same name, different problem. */
export const COL_ROWS = [
  ['steps', 'metric', 'risk'],
  ['risk', 'steps', 'metric'],
];
const ROW_LABEL = { steps: 'CHUỖI BƯỚC', metric: 'CHỈ SỐ', risk: 'RỦI RO' };
const ROW_TONE = { steps: 'user', metric: 'metric', risk: 'problem' };

/** Abstract glyph per zone — shapes differ between the branches, no content. */
function Glyph({ kind, variant, b }) {
  const [stroke] = TONE[ROW_TONE[kind]];
  const cy = b.y + b.h / 2 + 12;
  const x0 = b.x + 200;
  if (kind === 'steps') {
    if (variant === 0) {
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={x0 + i * 78} y={cy - 18} width={44} height={36} rx={8} fill={C.bg} stroke={stroke} strokeWidth={3} />
          ))}
          {[0, 1].map((i) => (
            <line key={i} x1={x0 + 44 + i * 78} y1={cy} x2={x0 + 78 + i * 78} y2={cy} stroke={stroke} strokeWidth={3} />
          ))}
        </g>
      );
    }
    return (
      <g>
        <rect x={x0} y={cy - 18} width={44} height={36} rx={8} fill={C.bg} stroke={stroke} strokeWidth={3} />
        <path d={`M ${x0 + 44} ${cy} H ${x0 + 90} M ${x0 + 90} ${cy - 26} V ${cy + 26} M ${x0 + 90} ${cy - 26} H ${x0 + 130} M ${x0 + 90} ${cy + 26} H ${x0 + 130}`} fill="none" stroke={stroke} strokeWidth={3} />
        <rect x={x0 + 130} y={cy - 42} width={44} height={32} rx={8} fill={C.bg} stroke={stroke} strokeWidth={3} />
        <rect x={x0 + 130} y={cy + 10} width={44} height={32} rx={8} fill={C.bg} stroke={stroke} strokeWidth={3} />
      </g>
    );
  }
  if (kind === 'metric') {
    if (variant === 0) {
      return (
        <g>
          {[22, 36, 50].map((h, i) => (
            <rect key={i} x={x0 + i * 40} y={cy + 24 - h} width={26} height={h} rx={5} fill={C.dotInactive} stroke={stroke} strokeWidth={2.5} />
          ))}
        </g>
      );
    }
    return (
      <g>
        <path d={`M ${x0} ${cy + 18} A 40 40 0 0 1 ${x0 + 80} ${cy + 18}`} fill="none" stroke={stroke} strokeWidth={4} strokeLinecap="round" />
        <line x1={x0 + 40} y1={cy + 18} x2={x0 + 62} y2={cy - 6} stroke={stroke} strokeWidth={4} strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      {Array.from({ length: variant === 0 ? 1 : 2 }, (_, i) => (
        <LineIcon key={i} name="triangle-alert" x={x0 + 22 + i * 60} y={cy} size={40} color={stroke} />
      ))}
    </g>
  );
}

/** Branch column `ci`: frame + the three zones, each with its own reveal (by kind). */
export function BranchColumn({ ci, frameOpacity = 1, reveal = {}, muted = 0 }) {
  const col = COLS[ci];
  if (frameOpacity <= 0.001) return null;
  const m = 1 - clamp01(muted) * 0.64;
  return (
    <g opacity={frameOpacity * m < 1 ? frameOpacity * m : undefined}>
      <rect x={col.x} y={col.y} width={col.w} height={col.h} rx={26} fill={C.bg} stroke={C.dotInactive} strokeWidth={3} />
      {COL_ROWS[ci].map((kind, i) => {
        const b = rowBox(col, i);
        const o = clamp01(reveal[kind] ?? 0);
        if (o <= 0.001) return null;
        return (
          <RoleCard key={kind} {...b} tone={ROW_TONE[kind]} label={ROW_LABEL[kind]} opacity={o}>
            <Glyph kind={kind} variant={ci} b={b} />
          </RoleCard>
        );
      })}
    </g>
  );
}

/** Flows from the chatbot out to both columns. */
export function branchFlows(frame, start, end) {
  return [
    <Flow key="l" points={[{ x: BOT_A.x, y: BOT_A_CY }, { x: COLS[0].x + COLS[0].w, y: BOT_A_CY }]} frame={frame} start={start} end={end} hideIn={[BOT_A, COLS[0]]} color={ROLE.purple} />,
    <Flow key="r" points={[{ x: BOT_A.x + BOT_A.w, y: BOT_A_CY }, { x: COLS[1].x, y: BOT_A_CY }]} frame={frame} start={start} end={end} hideIn={[BOT_A, COLS[1]]} color={ROLE.purple} />,
  ];
}

/** The three questions as chips under each column (câu 23). hot = [3 values 0–1]. */
export const CHIP_TEXT = [['Ai dùng?'], ['Vướng', 'ở đâu?'], ['Tham gia', 'việc nào?']];
export function QuestionChips({ ci, show = [0, 0, 0], hot = [0, 0, 0] }) {
  const col = COLS[ci];
  const w = 160;
  const gap = (col.w - 3 * w) / 2;
  return CHIP_TEXT.map((lines, i) => (
    <RoleCard key={i} x={col.x + i * (w + gap)} y={790} w={w} h={84} tone="unknown" lines={lines} size={21} lineHeight={25} hot={hot[i]} opacity={show[i]} dashed={hot[i] <= 0.001 && show[i] < 1} />
  ));
}

export function SameNameLabel({ opacity }) {
  return (
    <ToneLabel x={960} y={700} tone="solution" anchor="middle" opacity={opacity}>
      CÙNG TÊN, KHÁC BÀI TOÁN
    </ToneLabel>
  );
}

/* ── layout B ──────────────────────────────────────────────────────────────────────────────── */
const LANE_H = BOARD.h / BOARD.lanes.length;
export const LANE_CY = [BOARD.y + LANE_H / 2, BOARD.y + LANE_H * 1.5];
const bodyCx = BOARD.x + BOARD.headerW + (BOARD.w - BOARD.headerW) / 2;
export const BOT_B = { x: bodyCx - 180, y: BOARD.y + LANE_H - 55, w: 360, h: 110 };

/** The two lanes; header labels (BOARD label + sub) fade in with `labels` [0–1, 0–1]. */
export function Lanes({ frame, start = 0, labels = [0, 0], hot = [0, 0] }) {
  const lanes = BOARD.lanes.map((l) => ({ icon: l.icon, tone: l.tone, label: '' }));
  const hcx = BOARD.x + 6 + (BOARD.headerW - 6) / 2;
  return (
    <g>
      <Swimlane x={BOARD.x} y={BOARD.y} w={BOARD.w} h={BOARD.h} headerW={BOARD.headerW} lanes={lanes} frame={frame} start={start} per={10} />
      {BOARD.lanes.map((l, i) => {
        const o = clamp01(labels[i]);
        const a = clamp01(hot[i]);
        const cy = LANE_CY[i];
        return (
          <g key={i}>
            {a > 0.001 ? (
              <rect x={BOARD.x + 4} y={BOARD.y + i * LANE_H + 4} width={BOARD.headerW - 8} height={LANE_H - 8} rx={16} fill="none" stroke={C.accent} strokeWidth={3 + 2 * a} opacity={a} />
            ) : null}
            {o > 0.001 ? (
              <g opacity={o < 1 ? o : undefined}>
                <SvgText x={hcx} y={cy + 27} size={20} weight={700} color={C.accent} letterSpacing={1.2}>
                  {l.label}
                </SvgText>
                <SvgText x={hcx} y={cy + 54} size={18} weight={600} color={C.textMuted}>
                  {l.sub}
                </SvgText>
              </g>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export function BotB({ hot = 0, opacity = 1 }) {
  return <ChatbotBlock {...BOT_B} hot={hot} opacity={opacity} />;
}

/** Chatbot → into each lane (the same request placed in two contexts). */
export function placeFlows(frame, start, end) {
  return [0, 1].map((i) => {
    const from = i === 0 ? { x: BOT_B.x + BOT_B.w / 2, y: BOT_B.y } : { x: BOT_B.x + BOT_B.w / 2, y: BOT_B.y + BOT_B.h };
    return <Flow key={i} points={[from, { x: from.x, y: LANE_CY[i] + (i === 0 ? 34 : -34) }]} frame={frame} start={start} end={end} hideIn={[BOT_B]} color={ROLE.purple} />;
  });
}

/** Future chain per lane: "?" nodes at the step slots of câu 28, linked by dashed amber arrows. */
export function QuestionChain({ lane, frame, start, per = 14 }) {
  const cy = LANE_CY[lane];
  const xs = [0, 1, 2, 3].map((i) => {
    const b = boardStep(lane, i);
    return b.x + b.w / 2;
  });
  const r = 30;
  const [amber, amberSoft] = TONE.unknown;
  return (
    <g>
      {xs.slice(0, -1).map((x, i) => {
        const t0 = start + i * per;
        if (frame < t0) return null;
        return <Flow key={`f${i}`} points={[{ x: x + r + 8, y: cy }, { x: xs[i + 1] - r - 8, y: cy }]} frame={frame} start={t0} end={t0 + per + 6} dashed showParticle={false} drawBase={false} color={amber} />;
      })}
      {xs.map((x, i) => {
        const o = appear(frame, start + i * per - 6, 18);
        if (o <= 0.001) return null;
        return (
          <g key={`q${i}`} opacity={o < 1 ? o : undefined}>
            <circle cx={x} cy={cy} r={r} fill={amberSoft} stroke={amber} strokeWidth={3} strokeDasharray="8 6" />
            <SvgText x={x} y={cy + 12} size={32} weight={700} color={amber}>
              ?
            </SvgText>
          </g>
        );
      })}
    </g>
  );
}

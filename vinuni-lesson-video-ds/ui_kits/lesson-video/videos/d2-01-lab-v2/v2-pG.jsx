import React from 'react';
import { LineIcon, Swimlane, SvgText } from '../../../../components/index.js';
import { C } from '../../../../lib/index.js';
import { BOARD, RoleCard, TONE } from './shared.jsx';

/*
 * Câu 46–49 board: the same two lanes as BOARD, a little shorter so a free column on the right holds the
 * default meter (câu 46) and the three warning cards (câu 48). Steps are the first three of each lane's
 * script words; a metric card closes each lane (no name, no value — câu 46 says so).
 */
export const MB = { x: BOARD.x, y: 300, w: BOARD.w, h: 560, headerW: BOARD.headerW, lanes: BOARD.lanes };
export const laneC = (l) => MB.y + MB.h / 4 + (l * MB.h) / 2; // 440 · 720
const CHIP_LINES = [
  [['Câu hỏi về', 'sản phẩm, chính sách'], ['Giải đáp'], ['Tư vấn mua hàng']],
  [['Yêu cầu hỗ trợ'], ['Phân loại yêu cầu'], ['Tra cứu nghiệp vụ']],
];
export const chip = (l, i) => ({ x: 372 + i * 270, y: laneC(l) - 46, w: 240, h: 92 });
export const metricBox = (l) => ({ x: 1190, y: laneC(l) - 58, w: 250, h: 116 });
export const RIGHT_X = 1478; // free column x 1478–1818
export const chipsBounds = { x: 358, y: laneC(0) - 62, w: 800, h: laneC(1) - laneC(0) + 124 };
export const metricBounds = { x: 1176, y: laneC(0) - 72, w: 278, h: laneC(1) - laneC(0) + 144 };

/** Marker drawn inside a metric card: lane 0 = circle gauge, lane 1 = diamond — different, unnamed. */
function Marker({ lane, x, y }) {
  const [stroke] = TONE.metric;
  return lane === 0 ? (
    <g>
      <circle cx={x} cy={y} r={24} fill="none" stroke={stroke} strokeWidth={4} />
      <path d={`M ${x} ${y} L ${x + 15} ${y - 12}`} stroke={stroke} strokeWidth={4} strokeLinecap="round" />
    </g>
  ) : (
    <path d={`M ${x} ${y - 26} L ${x + 26} ${y} L ${x} ${y + 26} L ${x - 26} ${y} Z`} fill="none" stroke={stroke} strokeWidth={4} strokeLinejoin="round" />
  );
}

export function MetricCard({ lane, opacity = 1, hot = 0, muted = 0 }) {
  const b = metricBox(lane);
  return (
    <RoleCard {...b} tone="metric" label="METRIC" hot={hot} opacity={opacity} muted={muted}>
      <Marker lane={lane} x={b.x + 64} y={b.y + 72} />
      {[0, 1].map((k) => (
        <rect key={k} x={b.x + 112} y={b.y + 58 + k * 22} width={k ? 70 : 104} height={10} rx={5} fill={C.dotInactive} />
      ))}
    </RoleCard>
  );
}

/** Lanes + three steps per lane (+ optional metric cards). `steps` 0–1 dims the steps (muted). */
export function MiniBoard({ opacity = 1, stepsMuted = 0, metrics = 1, metricMuted = 0, metricHot = [0, 0] }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <Swimlane {...MB} />
      {CHIP_LINES.map((row, l) =>
        row.map((lines, i) => (
          <RoleCard key={`${l}-${i}`} {...chip(l, i)} tone="user" lines={lines} size={lines.length > 1 ? 20 : 22} muted={stepsMuted} />
        )),
      )}
      {CHIP_LINES.map((row, l) =>
        row.slice(0, 2).map((_, i) => {
          const a = chip(l, i);
          return (
            <path key={`a${l}${i}`} d={`M ${a.x + a.w + 6} ${laneC(l)} H ${a.x + 264}`} stroke={C.accent} strokeWidth={3} opacity={1 - stepsMuted * 0.6} />
          );
        }),
      )}
      {metrics > 0.001 ? [0, 1].map((l) => <MetricCard key={l} lane={l} opacity={metrics} muted={metricMuted} hot={metricHot[l]} />) : null}
    </g>
  );
}

/** Orange warning card for the free right column. */
export function WarningCard({ x = RIGHT_X, y, w = 340, h = 150, index, lines, opacity = 1, hot = 0, icon = 'triangle-alert' }) {
  if (opacity <= 0.001) return null;
  const [stroke] = TONE.problem;
  return (
    <RoleCard x={x} y={y} w={w} h={h} tone="problem" label={`DẤU HIỆU ${index}`} lines={lines} size={21} hot={hot} opacity={opacity}>
      <LineIcon name={icon} x={x + w - 34} y={y + 30} size={30} color={stroke} />
    </RoleCard>
  );
}

/** Dashed orange outline marking a board region a warning refers to. */
export function WarnOutline({ b, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={26} fill="none" stroke={TONE.problem[0]} strokeWidth={4} strokeDasharray="14 10" opacity={opacity} />;
}

export { SvgText };

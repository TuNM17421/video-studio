import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { drawOn } from '../../lib/paths.js';
import { SvgText } from '../text/Text.jsx';

const NW = 260;
const NH = 88;

/** Where the ray from a node's center toward (dx, dy) leaves its rectangle, plus a small gap. */
function edgeOffset(dx, dy, gap = 12) {
  const hw = NW / 2 + gap;
  const hh = NH / 2 + gap;
  const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  return t;
}

/**
 * ConceptMap — a handful of concepts (3–6) and the named relations between them: DỮ LIỆU —sinh ra→
 * MÔ HÌNH —dẫn tới→ KẾT QUẢ.
 * Anatomy: nodes 260 × 88, radius 22, bgAlt with a 3 px accent stroke, label 18/700 accentStrong;
 * `strong` nodes take a 5 px accent stroke (the hub), `accent` nodes a redSoft fill, red stroke and red
 * label (the conclusion). Edges are 4 px accent lines (5 px red when `accent`) clipped 12 px short
 * of both node borders, with an arrowhead at the target and a 17/700 label beside the midpoint.
 * Node positions are fractions of the map box: `cx`/`cy` 0–1 across `w` × `h`. Keep nodes ≥ 300 px apart
 * horizontally or ≥ 130 px vertically so labels do not collide.
 * `nodeReveal` / `edgeReveal` (0–1 arrays, optional) build the map in narration order: show both ends of
 * an edge before drawing it — each edge draws from its source toward its target.
 */
export function ConceptMap({ x, y, w = 800, h = 520, nodes = [], edges = [], nodeReveal, edgeReveal, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const pt = (n) => ({ x: x + n.cx * w, y: y + n.cy * h });
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {edges.map((e, i) => {
        const r = edgeReveal ? clamp01(edgeReveal[i] ?? 0) : 1;
        if (r <= 0.001) return null;
        const a = pt(nodes[e.from]);
        const b = pt(nodes[e.to]);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const t0 = edgeOffset(dx, dy);
        const t1 = 1 - edgeOffset(dx, dy);
        const sx = a.x + dx * t0;
        const sy = a.y + dy * t0;
        const ex = a.x + dx * t1;
        const ey = a.y + dy * t1;
        const color = e.accent ? C.red : C.accent;
        const d = `M ${sx} ${sy} L ${ex} ${ey}`;
        const ux = dx / len;
        const uy = dy / len;
        const head = `M ${ex - ux * 16 - uy * 10} ${ey - uy * 16 + ux * 10} L ${ex} ${ey} L ${ex - ux * 16 + uy * 10} ${ey - uy * 16 - ux * 10}`;
        // Label beside the midpoint, on the side away from the line (normal pointing up/right).
        const nx = uy >= 0 ? uy : -uy;
        const ny = uy >= 0 ? -ux : ux;
        const mx = (sx + ex) / 2 + nx * 24;
        const my = (sy + ey) / 2 + ny * 24;
        const anchor = Math.abs(dx) < 1 ? 'start' : Math.abs(dy) < 1 ? 'middle' : nx > 0 ? 'start' : 'end';
        return (
          <g key={`e${i}`}>
            <path d={d} fill="none" stroke={color} strokeWidth={e.accent ? 5 : 4} strokeLinecap="round" {...drawOn(d, r)} />
            {r >= 0.999 ? (
              <path d={head} fill="none" stroke={color} strokeWidth={e.accent ? 5 : 4} strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
            {e.label ? (
              <SvgText x={mx} y={my + 6} size={17} weight={700} anchor={anchor} color={e.accent ? C.red : C.textMuted} opacity={r}>
                {e.label}
              </SvgText>
            ) : null}
          </g>
        );
      })}
      {nodes.map((n, i) => {
        const r = nodeReveal ? clamp01(nodeReveal[i] ?? 0) : 1;
        if (r <= 0.001) return null;
        const p = pt(n);
        return (
          <g key={`n${i}`} opacity={r < 1 ? r : undefined}>
            <rect
              x={p.x - NW / 2}
              y={p.y - NH / 2}
              width={NW}
              height={NH}
              rx={22}
              fill={n.accent ? C.redSoft : C.bgAlt}
              stroke={n.accent ? C.red : C.accent}
              strokeWidth={n.strong ? 5 : 3}
            />
            <SvgText x={p.x} y={p.y + 7} size={18} weight={700} color={n.accent ? C.red : C.accentStrong}>
              {n.label}
            </SvgText>
          </g>
        );
      })}
    </g>
  );
}

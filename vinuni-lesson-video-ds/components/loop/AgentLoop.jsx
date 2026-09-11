import React from 'react';
import { C, ROLE, ROLE_OF } from '../../lib/tokens.js';
import { appear, clamp01, pulse } from '../../lib/motion.js';
import { pathD, pointAtDistance, polylineLength, textWidth } from '../../lib/geometry.js';
import { Flow, Particle } from '../flow/Flow.jsx';
import { Card } from '../cards/Card.jsx';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';

/**
 * AgentLoop — a cyclic diagram (SVG): 3–4 stage cards on a circle / ellipse, curved arrows between
 * consecutive stages (clockwise, first stage at the top), and one data particle travelling round
 * the loop. The default is the ReAct loop SUY NGHĨ → HÀNH ĐỘNG → QUAN SÁT.
 *
 * Anatomy: dotInactive base track (5 px) · accent arcs (5 px) trimmed 14 px clear of each card,
 * arrowhead at each arc end · stage cards (radius 22, stroke 3; `role` → ROLE_OF stroke + soft fill,
 * label 24/700 + optional sub 20/600 muted + optional LineIcon) · optional center label
 * (17/700 micro caps + 24/700 line) · optional `exit` branch: a red Flow leaving a stage radially to a
 * red Card ("HOÀN TẤT" / "HỎI NGƯỜI DÙNG") · optional `errorStage`: the arc leaving that stage turns
 * ROLE.orange with an orange outline tag riding on it ("KẾT QUẢ LỖI").
 * variant 'flywheel': no cards — N labeled arcs with gaps (bánh đà), labels outside the arcs.
 *
 * States: settled (no `frame`) = all arcs drawn, no particle, no pulse · animated (`frame` given):
 * the particle starts at stage 0 at `start` and takes `lap` frames per lap for `laps` laps; during
 * lap 1 each arc is revealed behind the particle (Flow contract); the stage the particle just reached
 * pulses (red-soft overlay, 54 frames) unless `activeStage` is given (then that stage is held active).
 * With `exit`, the particle stops at the exit stage on its last lap and the exit Flow runs from there
 * (30 frames), then the exit card appears — unless `exit.at` sets the frame explicitly.
 *
 * Timing (frames): arrival of stage i on lap k = start + lap·(k + dist_i/L) (≈ start + lap·(k + i/N) on a circle).
 * `illustrative` defaults to false (structural diagram).
 * @category loop
 */

const SAMPLES = 360;
const TRIM = 14; // arc clearance from a card edge (px)

function stageSize(s, size) {
  if (!s) return { w: 0, h: 0 };
  const iconW = s.icon ? 48 : 0;
  const tw = Math.max(textWidth(s.label || '', size, 700), s.sub ? textWidth(s.sub, size - 4, 600) : 0);
  return { w: s.w ?? Math.max(200, Math.round(tw + iconW + 56)), h: s.h ?? (s.sub ? 104 : 78) };
}

/** Pure geometry for an AgentLoop's props (shared by the component and `loopStagePoint`). */
export function loopGeometry(props) {
  const {
    cx = 960,
    cy = 600,
    r = 270,
    w,
    h,
    stages = DEFAULT_STAGES,
    variant = 'loop',
    fontSize = 24,
    startAngle = -90,
  } = props;
  const rx = w != null ? w / 2 : r;
  const ry = h != null ? h / 2 : r;
  const n = Math.max(1, stages.length);
  const loop = [];
  for (let k = 0; k <= SAMPLES; k++) {
    const a = ((startAngle + (360 * k) / SAMPLES) * Math.PI) / 180;
    loop.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  const cum = [0];
  for (let k = 1; k <= SAMPLES; k++) cum.push(cum[k - 1] + Math.hypot(loop[k].x - loop[k - 1].x, loop[k].y - loop[k - 1].y));
  const L = cum[SAMPLES];
  const idx = stages.map((_, i) => Math.round((i * SAMPLES) / n));
  const nodes = stages.map((s, i) => {
    const p = loop[idx[i]];
    const { w: sw, h: sh } = variant === 'flywheel' ? { w: 0, h: 0 } : stageSize(s, fontSize);
    return { x: p.x, y: p.y, dist: cum[idx[i]], box: { x: p.x - sw / 2, y: p.y - sh / 2, w: sw, h: sh } };
  });
  const inBox = (b, q, pad) => b.w > 0 && q.x > b.x - pad && q.x < b.x + b.w + pad && q.y > b.y - pad && q.y < b.y + b.h + pad;
  const gap = variant === 'flywheel' ? Math.min(34, L / n / 6) : 0;
  const segments = stages.map((_, i) => {
    const i0 = idx[i];
    const i1 = i + 1 < n ? idx[i + 1] : SAMPLES;
    const a = nodes[i].box;
    const b = nodes[(i + 1) % n].box;
    let k0 = i0;
    let k1 = i1;
    while (k0 < i1 && (inBox(a, loop[k0], TRIM) || cum[k0] - cum[i0] < gap)) k0++;
    while (k1 > k0 && (inBox(b, loop[k1], TRIM + 6) || cum[i1] - cum[k1] < gap)) k1--;
    const pts = loop.slice(k0, k1 + 1);
    return { pts, from: cum[k0], to: cum[k1], mid: loop[Math.round((i0 + i1) / 2)] };
  });
  return { cx, cy, rx, ry, loop, cum, L, nodes, segments, n };
}

/** Center + card box of stage `i` for the given AgentLoop props: { x, y, box: {x, y, w, h} }. */
export function loopStagePoint(props, i) {
  const g = loopGeometry(props);
  const node = g.nodes[((i % g.n) + g.n) % g.n];
  return { x: node.x, y: node.y, box: node.box };
}

const DEFAULT_STAGES = [
  { label: 'SUY NGHĨ', sub: 'chọn việc tiếp theo', role: 'reasoning' },
  { label: 'HÀNH ĐỘNG', sub: 'gọi một công cụ', role: 'action' },
  { label: 'QUAN SÁT', sub: 'đọc kết quả trả về', role: 'input' },
];

/** Distance from a box center to its edge along unit direction (dx, dy). */
function edgeDist(box, dx, dy) {
  const hw = box.w / 2;
  const hh = box.h / 2;
  const tx = Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : Infinity;
  const ty = Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : Infinity;
  return Math.min(tx, ty);
}

function arrowHead(pts, color, opacity) {
  if (opacity <= 0.001 || pts.length < 2) return null;
  const last = pts[pts.length - 1];
  const prev = pts[Math.max(0, pts.length - 4)];
  const ang = (Math.atan2(last.y - prev.y, last.x - prev.x) * 180) / Math.PI;
  return (
    <g opacity={opacity < 1 ? opacity : undefined} transform={`translate(${last.x} ${last.y}) rotate(${ang})`}>
      <path d="M -16 -11 L 0 0 L -16 11 Z" fill={color} />
    </g>
  );
}

export function AgentLoop(props) {
  const {
    stages = DEFAULT_STAGES,
    variant = 'loop',
    frame,
    start = 0,
    lap = 180,
    laps = 1,
    activeStage,
    exit,
    errorStage,
    center,
    centerSub,
    counterSlot,
    fontSize = 24,
    opacity = 1,
    illustrative = false,
    children,
  } = props;
  if (opacity <= 0.001) return null;
  const g = loopGeometry(props);
  const { nodes, segments, L, n, cx, cy, rx, ry } = g;
  const animated = frame != null;

  // ----- particle timing
  const exitIdx = exit ? ((exit.stage % n) + n) % n : -1;
  const exitFrac = exit ? nodes[exitIdx].dist / L : 0;
  const lapsN = Math.max(1, laps);
  const particleEnd = exit ? start + lap * (lapsN - 1 + (exitIdx === 0 ? 1 : exitFrac)) : start + lap * lapsN;
  const exitAt = exit ? exit.at ?? particleEnd : 0;
  const t = animated ? (frame - start) / lap : Infinity; // laps travelled
  const running = animated && frame >= start && frame < particleEnd;
  const firstLapD = animated ? clamp01(t) * L : L; // reveal distance during lap 1
  const posD = running ? (t - Math.floor(t)) * L : 0;
  const pt = running ? pointAtDistance(g.loop, posD) : null;

  // ----- active stage (last arrival)
  const errIdx = errorStage == null ? -1 : typeof errorStage === 'object' ? errorStage.stage : errorStage;
  const errLabel = typeof errorStage === 'object' && errorStage.label != null ? errorStage.label : 'KẾT QUẢ LỖI';
  const activeOf = (i) => {
    if (activeStage != null) return activeStage === i ? 1 : 0;
    if (!animated || frame < start) return 0;
    // most recent arrival of stage i
    const frac = i === 0 ? 0 : nodes[i].dist / L;
    const lastFrame = Math.min(frame, particleEnd);
    const k = Math.floor((lastFrame - start) / lap - frac);
    if (k < 0) return 0;
    const at = start + lap * (k + frac);
    if (at > particleEnd + 0.001) return 0;
    return pulse(frame, at);
  };

  const hideBoxes = nodes.map((nd) => nd.box);
  const showPt =
    pt && !(variant !== 'flywheel' && hideBoxes.some((b) => pt.x > b.x - 18 && pt.x < b.x + b.w + 18 && pt.y > b.y - 18 && pt.y < b.y + b.h + 18));

  const tagBox = { x: cx - rx - 40, y: cy - ry - 90, w: rx * 2 + 80, h: ry * 2 + 180 };

  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {/* base track */}
      {segments.map((s, i) => (
        <path key={`b${i}`} d={pathD(s.pts)} fill="none" stroke={C.dotInactive} strokeWidth={5} strokeLinecap="round" opacity={0.9} />
      ))}
      {/* arcs */}
      {segments.map((s, i) => {
        const len = polylineLength(s.pts);
        const rev = animated ? clamp01((firstLapD - s.from) / Math.max(1, s.to - s.from)) : 1;
        if (rev <= 0.001) return null;
        const role = variant === 'flywheel' && stages[i]?.role ? ROLE_OF[stages[i].role]?.[0] : null;
        const color = i === errIdx ? ROLE.orange : role || C.accent;
        return (
          <g key={`a${i}`}>
            <path
              d={pathD(s.pts)}
              fill="none"
              stroke={color}
              strokeWidth={variant === 'flywheel' ? 7 : 5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={len}
              strokeDashoffset={len * (1 - rev)}
            />
            {arrowHead(s.pts, color, clamp01((rev - 0.9) / 0.1))}
          </g>
        );
      })}
      {/* error tag riding the orange arc */}
      {errIdx >= 0 && errIdx < n
        ? (() => {
            const s = segments[errIdx];
            const rev = animated ? clamp01((firstLapD - s.from) / Math.max(1, s.to - s.from)) : 1;
            const m = pointAtDistance(s.pts, polylineLength(s.pts) / 2);
            const dx = m.x - cx;
            const dy = m.y - cy;
            const d = Math.hypot(dx, dy) || 1;
            const tw = textWidth(errLabel, 17, 700) + 32;
            const px = m.x + (dx / d) * 34;
            const py = m.y + (dy / d) * 34;
            const x0 = dx >= 0 ? px : px - tw;
            return (
              <g opacity={rev < 1 ? clamp01((rev - 0.5) * 2) : undefined}>
                <rect x={x0} y={py - 18} width={tw} height={36} rx={18} fill={ROLE.orangeSoft} stroke={ROLE.orange} strokeWidth={2} />
                <SvgText x={x0 + tw / 2} y={py + 6} size={17} weight={700} color={ROLE.orange} letterSpacing={0.6}>
                  {errLabel}
                </SvgText>
              </g>
            );
          })()
        : null}
      {/* flywheel labels */}
      {variant === 'flywheel'
        ? stages.map((s, i) => {
            const m = segments[i].mid;
            const dx = m.x - cx;
            const dy = m.y - cy;
            const d = Math.hypot(dx, dy) || 1;
            const ux = dx / d;
            const uy = dy / d;
            const off = 34;
            const lx = m.x + ux * off;
            const ly = m.y + uy * off;
            const anchor = ux > 0.35 ? 'start' : ux < -0.35 ? 'end' : 'middle';
            const baseY = uy < -0.35 ? ly - (s.sub ? 32 : 4) : uy > 0.35 ? ly + 22 : ly + (s.sub ? -6 : 8);
            const a = activeOf(i);
            return (
              <g key={`fl${i}`}>
                <SvgText x={lx} y={baseY} size={fontSize} weight={700} anchor={anchor} color={a > 0.45 ? C.red : C.text}>
                  {s.label}
                </SvgText>
                {s.sub ? (
                  <SvgText x={lx} y={baseY + 30} size={fontSize - 4} weight={600} anchor={anchor} color={C.textMuted}>
                    {s.sub}
                  </SvgText>
                ) : null}
              </g>
            );
          })
        : null}
      {/* stage cards */}
      {variant !== 'flywheel'
        ? stages.map((s, i) => {
            const b = nodes[i].box;
            const [stroke, soft] = s.role && ROLE_OF[s.role] ? ROLE_OF[s.role] : [C.accent, C.bgAlt];
            const a = activeOf(i);
            const hot = a > 0.45;
            const iconW = s.icon ? 48 : 0;
            const tx = b.x + b.w / 2 + iconW / 2;
            return (
              <g key={`st${i}`}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={22} fill={soft} stroke={stroke} strokeWidth={3} />
                {a > 0.001 ? (
                  <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={22} fill={C.redSoft} stroke={C.red} strokeWidth={5} opacity={a * 0.72} />
                ) : null}
                {s.icon ? <LineIcon name={s.icon} x={b.x + 28 + 20} y={b.y + b.h / 2} size={36} color={hot ? C.red : stroke} /> : null}
                <SvgText x={tx} y={b.y + (s.sub ? b.h / 2 - 4 : b.h / 2 + fontSize * 0.36)} size={fontSize} weight={700} color={hot ? C.red : C.text}>
                  {s.label}
                </SvgText>
                {s.sub ? (
                  <SvgText x={tx} y={b.y + b.h / 2 + 28} size={fontSize - 4} weight={600} color={C.textMuted}>
                    {s.sub}
                  </SvgText>
                ) : null}
              </g>
            );
          })
        : null}
      {/* center */}
      {center ? (
        <g>
          <SvgText x={cx} y={cy + (centerSub ? -6 : 8)} size={fontSize} weight={700} color={C.accentStrong} letterSpacing={0.5}>
            {center}
          </SvgText>
          {centerSub ? (
            <SvgText x={cx} y={cy + 24} size={17} weight={600} color={C.textMuted}>
              {centerSub}
            </SvgText>
          ) : null}
        </g>
      ) : null}
      {counterSlot ? <g transform={`translate(${cx} ${cy + (center ? 64 : 0)})`}>{counterSlot}</g> : null}
      {/* exit branch */}
      {exit
        ? (() => {
            const nd = nodes[exitIdx];
            const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
            let [dx, dy] = dirs[exit.side] || [nd.x - cx, nd.y - cy];
            const dl = Math.hypot(dx, dy) || 1;
            dx /= dl;
            dy /= dl;
            const ew = exit.w ?? Math.max(200, Math.round(textWidth(exit.label, fontSize, 700) + 56));
            const eh = exit.sub ? 104 : 78;
            const srcBox = variant === 'flywheel' ? { w: 0, h: 0 } : nd.box;
            const from = { x: nd.x + dx * (edgeDist(srcBox, dx, dy) + (variant === 'flywheel' ? 18 : 6)), y: nd.y + dy * (edgeDist(srcBox, dx, dy) + (variant === 'flywheel' ? 18 : 6)) };
            const len = exit.length ?? 130;
            const ecx = from.x + dx * (len + edgeDist({ w: ew, h: eh }, dx, dy));
            const ecy = from.y + dy * (len + edgeDist({ w: ew, h: eh }, dx, dy));
            const to = { x: from.x + dx * len, y: from.y + dy * len };
            const boxO = animated ? appear(frame, exitAt + 24) : 1;
            return (
              <g>
                {animated ? (
                  <Flow points={[from, to]} frame={frame} start={exitAt} end={exitAt + 30} color={C.red} />
                ) : (
                  <Flow points={[from, to]} progress={1} color={C.red} />
                )}
                <Card
                  x={ecx - ew / 2}
                  y={ecy - eh / 2}
                  w={ew}
                  h={eh}
                  accent={C.red}
                  fill={C.redSoft}
                  lines={exit.sub ? [exit.label, exit.sub] : [exit.label]}
                  opacity={boxO}
                />
              </g>
            );
          })()
        : null}
      {showPt ? <Particle x={pt.x} y={pt.y} /> : null}
      {illustrativeTag(illustrative, tagBox)}
      {children}
    </g>
  );
}

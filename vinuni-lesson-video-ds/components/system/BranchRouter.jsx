import React from 'react';
import { C, ROLE_OF, alpha } from '../../lib/tokens.js';
import { CLAMP, EASE, appear, interpolate, linearProgress, pulse } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { curvePath, drawOn, getLength, pointOnPath } from '../../lib/paths.js';
import { SvgText } from '../text/Text.jsx';

function toneOf(tone) {
  if (!tone) return [C.accent, C.dotInactive];
  if (ROLE_OF[tone]) return ROLE_OF[tone];
  if (tone === 'red' || tone === C.red) return [C.red, C.redSoft];
  const hex = C[tone] || tone;
  return [hex, alpha(hex, 0.12)];
}

const DEST_H = 56;

/** Geometry of every branch: { d, end, dest: {x,y,w,h}, labelAt } (labelAt = right-middle of the label pill, above the track) — for placing extra marks or Flows. */
export function branchGeometry({ x, y, branches = [], spread = 150, length = 460, destW }) {
  const n = branches.length;
  return branches.map((b, i) => {
    const ey = y + (i - (n - 1) / 2) * spread;
    const end = { x: x + length, y: ey };
    const pts = [{ x, y }, { x: x + length * 0.3, y }, { x: x + length * 0.72, y: ey }, end];
    const d = curvePath(pts, 'monotoneX');
    const w = destW ?? (b.dest ? Math.round(textWidth(b.dest, 22, 700) + 48) : 0);
    return { d, end, dest: { x: end.x, y: ey - DEST_H / 2, w, h: DEST_H }, labelAt: { x: end.x - 22, y: ey - 30 } };
  });
}

/**
 * BranchRouter — one input splitting into N routed lanes ("Ba làn đường xanh/vàng/đỏ", "ngã tư với
 * 4 biển chỉ dẫn", "trả lời ngay hay gọi tool"). Source point (x, y) on the left; branches fan out to
 * the right over `length` px, `spread` px apart vertically, each an S-curve (curvePath monotoneX).
 *
 * Anatomy: source node (accent dot, white halo) · per branch: 5 px track in the branch `tone`
 * (ROLE_OF name / C token — green 'output', amber 'memory', red …), a white label pill with tone
 * stroke sitting just above the straight run, right-aligned 22 px before the arrow (`label`, e.g. CAO / TRUNG BÌNH / THẤP), arrowhead into a
 * destination chip (`dest`, soft tone fill + tone stroke, 22/700 text).
 *
 * Motion: `active` = index of the chosen branch. With `frame`, the chosen path draws on (drawOn)
 * from `start` to `end` with a red particle riding it (hidden 18 px from each end, like Flow);
 * other branches dim to 35 % over 12 f from `start`; the chosen chip pulses once at `end` and keeps
 * a 5 px stroke. Without `frame` everything renders settled (chosen fully drawn). With no `active`
 * all branches are drawn at full strength and the shared trunk is accent.
 */
export function BranchRouter({
  x,
  y,
  branches = [],
  spread = 150,
  length = 460,
  destW,
  active,
  frame,
  start = 0,
  end = 45,
  opacity = 1,
  sourceLabel,
}) {
  if (opacity <= 0.001 || branches.length === 0) return null;
  const geo = branchGeometry({ x, y, branches, spread, length, destW });
  const hasActive = active != null && active >= 0;
  const settled = frame == null;
  const t = settled ? 1 : linearProgress(frame, start, end);
  const dim = hasActive ? (settled ? 1 : interpolate(frame, [start, start + 12], [0, 1], { ...CLAMP, easing: EASE.out })) : 0;
  const arrive = settled ? 0 : pulse(frame, end);
  const clearance = 18;

  const renderBranch = (b, i) => {
    const g = geo[i];
    const [stroke, soft] = toneOf(b.tone);
    const chosen = hasActive && i === active;
    const o = chosen ? 1 : 1 - dim * 0.65;
    const len = getLength(g.d);
    const arrowO = chosen && hasActive ? (settled ? 1 : interpolate(frame, [start + (end - start) * (1 - clearance / len), end + 6], [0, 1], CLAMP)) : 1;
    const lw = b.label ? Math.round(textWidth(b.label, 17, 700) + b.label.length * 1 + 28) : 0;
    return (
      <g key={`br-${i}`} opacity={o < 1 ? o : undefined}>
        <path d={g.d} fill="none" stroke={chosen ? C.dotInactive : stroke} strokeWidth={5} strokeLinecap="round" opacity={chosen ? 1 : 0.9} />
        {chosen ? <path d={g.d} fill="none" stroke={stroke} strokeWidth={6} strokeLinecap="round" {...drawOn(g.d, t)} /> : null}
        {arrowO > 0.001 ? (
          <path
            d={`M ${g.end.x - 16} ${g.end.y - 11} L ${g.end.x} ${g.end.y} L ${g.end.x - 16} ${g.end.y + 11} Z`}
            fill={stroke}
            opacity={arrowO < 1 ? arrowO : undefined}
          />
        ) : null}
        {b.label ? (
          <g>
            <rect x={g.labelAt.x - lw} y={g.labelAt.y - 17} width={lw} height={34} rx={17} fill={C.bg} stroke={stroke} strokeWidth={2} />
            <SvgText x={g.labelAt.x - lw / 2} y={g.labelAt.y + 6} size={17} weight={700} color={stroke} letterSpacing={1}>
              {b.label}
            </SvgText>
          </g>
        ) : null}
        {b.dest ? (
          <g>
            <rect x={g.dest.x} y={g.dest.y} width={g.dest.w} height={g.dest.h} rx={18} fill={soft} stroke={stroke} strokeWidth={chosen ? 5 : 3} />
            {chosen && arrive > 0.001 ? (
              <rect x={g.dest.x - 6} y={g.dest.y - 6} width={g.dest.w + 12} height={g.dest.h + 12} rx={22} fill="none" stroke={stroke} strokeWidth={4} opacity={arrive * 0.5} />
            ) : null}
            <SvgText x={g.dest.x + g.dest.w / 2} y={g.dest.y + g.dest.h / 2 + 8} size={22} weight={700} color={C.text}>
              {b.dest}
            </SvgText>
          </g>
        ) : null}
      </g>
    );
  };

  let particle = null;
  if (hasActive && !settled && frame >= start && frame < end) {
    const g = geo[active];
    const len = getLength(g.d);
    const dist = t * len;
    if (dist > clearance && dist < len - clearance) {
      const p = pointOnPath(g.d, t);
      particle = (
        <g>
          <circle cx={p.x} cy={p.y} r={13} fill={C.bg} />
          <circle cx={p.x} cy={p.y} r={9} fill={C.red} />
        </g>
      );
    }
  }

  const srcO = settled ? 1 : appear(frame, start - 24);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {branches.map((b, i) => (hasActive && i === active ? null : renderBranch(b, i)))}
      {hasActive ? renderBranch(branches[active], active) : null}
      {!hasActive ? (
        <path d={`M ${x} ${y} H ${x + length * 0.3}`} stroke={C.accent} strokeWidth={5} strokeLinecap="round" />
      ) : null}
      {particle}
      <g opacity={srcO < 1 ? srcO : undefined}>
        <circle cx={x} cy={y} r={15} fill={C.bg} />
        <circle cx={x} cy={y} r={11} fill={C.accent} />
      </g>
      {sourceLabel ? (
        <SvgText x={x - 26} y={y + 7} size={20} weight={700} anchor="end" color={C.accentStrong}>
          {sourceLabel}
        </SvgText>
      ) : null}
    </g>
  );
}

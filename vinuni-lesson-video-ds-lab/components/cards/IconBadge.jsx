import React from 'react';
import { C } from '../../lib/tokens.js';
import { Icon } from '../icons/Icons.jsx';
import { SvgText } from '../text/Text.jsx';

/**
 * Legacy icon-in-circle badge (IconCard / HubDiagram center) — white circle, 3 px stroke, line
 * icon at 52 % of the diameter, 25 px label below. `filled` = solid circle with a white icon
 * (hub center). Use for SECONDARY labels (capabilities at the end of a flow); never as the
 * main storytelling device of a core concept — that is a glassbox, flow or reshaping chart.
 * Port of IconCard / HubDiagram in src/primitives/lightScene.tsx.
 */
export function IconBadge({ name, x, y, size = 150, color = C.accent, label, opacity = 1, scale = 1, filled = false }) {
  if (opacity <= 0.001) return null;
  const r = size / 2;
  return (
    <g
      opacity={opacity < 1 ? opacity : undefined}
      transform={scale !== 1 ? `translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})` : undefined}
    >
      <circle cx={x} cy={y} r={r - 1.5} fill={filled ? color : C.bg} stroke={color} strokeWidth={3} />
      <Icon name={name} x={x} y={y} size={size * 0.52} color={filled ? C.bg : color} />
      {label ? (
        <SvgText x={x} y={y + r + 42} size={25} weight={600}>
          {label}
        </SvgText>
      ) : null}
    </g>
  );
}

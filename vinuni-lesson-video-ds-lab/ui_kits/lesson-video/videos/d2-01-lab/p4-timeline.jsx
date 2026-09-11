import React from 'react';
import { IllustrativeStamp, SvgText } from '../../../../components/index.js';
import { C } from '../../../../lib/index.js';
import { Lan } from './shared.jsx';
import { AXIS } from './p4-shared.jsx';

/** Common frame of câu 31–33: sheet label + stamp and Lan at the start of the axis. */
export function TimelineFrame({ opacity = 1, lan = 1 }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <SvgText x={AXIS.x0 - 160} y={318} size={20} weight={700} anchor="start" color={C.accentStrong} letterSpacing={2}>
        PHIẾU QUAN SÁT CỦA LAN
      </SvgText>
      <IllustrativeStamp x={AXIS.x0 + 210} y={296} label="MINH HỌA" />
      <Lan x={AXIS.x0 - 150} y={AXIS.y} r={46} opacity={lan} />
    </g>
  );
}

import React from 'react';
import { DocumentSheet, Flow, SvgText } from '../../../../components/index.js';
import { C, appear, clamp01, linearProgress, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { PartScene } from './shared.jsx';

/*
 * Câu 14 — part 6 opens: three sheets from earlier parts flow into one description document, each into
 * its own section, and the section's lines fill as it is named. Lines are bars only — no content.
 */
const N = 14;
const SAY = [spokenAt(N, 'bản mô tả vấn đề'), spokenAt(N, 'cách giải quyết dự kiến'), spokenAt(N, 'những điều phải kiểm tra')];
const T = {
  doc: 14,
  sheets: SAY.map((t) => t - 14), // 46, 96, 156
  flows: SAY.map((t) => [t - 6, t + 22]), // arrive 82, 132, 192
  fill: SAY.map((t) => [t + 22, t + 60]),
};
const NAMES = ['Vấn đề', 'Cách dự kiến', 'Điều cần kiểm tra'];
const SHEET_W = 130;
const SHEET_H = (168 * SHEET_W) / 215;
const sheets = NAMES.map((_, i) => ({ x: 210, y: 432 + i * 172, w: SHEET_W, h: SHEET_H }));
const doc = { x: 780, y: 430, w: 900, h: 510 };
const FOLD = 60;
const SEC_TOP = doc.y + 88;
const SEC_H = 136;
const sections = NAMES.map((_, i) => ({ x: doc.x + 30, y: SEC_TOP + i * SEC_H, w: doc.w - 60, h: SEC_H - 16 }));

function Section({ s, name, fill, active, opacity }) {
  if (opacity <= 0.001) return null;
  const bars = [0.92, 0.7];
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={16} fill={active > 0.001 ? C.redSoft : C.bg} fillOpacity={active > 0.001 ? active * 0.8 : 1} stroke={C.dotInactive} strokeWidth={2} />
      <SvgText x={s.x + 26} y={s.y + 38} size={22} weight={700} anchor="start" color={C.accentStrong}>
        {name}
      </SvgText>
      {bars.map((len, i) => {
        const t = clamp01(fill * bars.length - i);
        return t > 0 ? <rect key={i} x={s.x + 26} y={s.y + 60 + i * 26} width={(s.w - 52) * len * t} height={12} rx={6} fill={i === 0 ? C.accent : C.dotInactive} /> : null;
      })}
    </g>
  );
}

export default function S14() {
  const frame = useFrame();
  const od = appear(frame, T.doc);
  return (
    <PartScene n={N} frame={frame}>
      {sheets.map((s, i) => (
        <DocumentSheet key={i} x={s.x} y={s.y} w={s.w} label={NAMES[i]} opacity={appear(frame, T.sheets[i])} />
      ))}
      {od > 0.001 ? (
        <g opacity={od < 1 ? od : undefined}>
          <path
            d={`M ${doc.x} ${doc.y} H ${doc.x + doc.w - FOLD} L ${doc.x + doc.w} ${doc.y + FOLD} V ${doc.y + doc.h} H ${doc.x} Z`}
            fill={C.bgAlt}
            stroke={C.accent}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <path d={`M ${doc.x + doc.w - FOLD} ${doc.y} V ${doc.y + FOLD} H ${doc.x + doc.w}`} fill="none" stroke={C.accent} strokeWidth={3} />
          <SvgText x={doc.x + 30} y={doc.y + 54} size={20} weight={700} anchor="start" color={C.red} letterSpacing={1.2}>
            BẢN MÔ TẢ
          </SvgText>
        </g>
      ) : null}
      {sections.map((s, i) => (
        <Section
          key={i}
          s={s}
          name={NAMES[i]}
          opacity={od}
          fill={linearProgress(frame, T.fill[i][0], T.fill[i][1])}
          active={pulse(frame, T.flows[i][1])}
        />
      ))}
      {sheets.map((s, i) => {
        const y0 = s.y + s.h / 2;
        const y1 = sections[i].y + sections[i].h / 2;
        const mx = 560;
        return (
          <Flow
            key={i}
            points={[{ x: s.x + s.w + 10, y: y0 }, { x: mx, y: y0 }, { x: mx, y: y1 }, { x: doc.x, y: y1 }]}
            frame={frame}
            start={T.flows[i][0]}
            end={T.flows[i][1]}
            hideIn={[doc]}
          />
        );
      })}
    </PartScene>
  );
}

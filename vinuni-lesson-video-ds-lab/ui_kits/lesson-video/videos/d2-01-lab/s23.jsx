import React from 'react';
import { IllustrativeStamp, SvgText } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene, ToneLabel } from './shared.jsx';

/*
 * Câu 23 — MINH HỌA. The four artifacts of this part shrink to thumbnails; one stamp is laid across
 * them all, with the note that they are not real survey results.
 */
const N = 23;
const T = {
  thumbs: 2,
  stamp: spokenAt(N, 'minh họa cách tìm') - 6,
  note: spokenAt(N, 'không phải kết quả') - 6,
};
const W = 560;
const H = 240;
const CELLS = [
  { x: 330, y: 290, name: 'Phiếu quan sát' },
  { x: 1030, y: 290, name: 'Phiếu phỏng vấn' },
  { x: 330, y: 580, name: 'Khay yêu cầu hỗ trợ' },
  { x: 1030, y: 580, name: 'Biểu đồ câu hỏi' },
];

function Mini({ i, x, y }) {
  if (i === 0)
    return [0, 1].map((r) => (
      <g key={r}>
        <rect x={x + 30} y={y + 70 + r * 60} width={180} height={18} rx={9} fill={C.dotInactive} />
        <rect x={x + 240} y={y + 60 + r * 60} width={280} height={40} rx={10} fill={C.bgAlt} stroke={C.accent} strokeWidth={2} />
      </g>
    ));
  if (i === 1)
    return (
      <g>
        <rect x={x + 30} y={y + 70} width={500} height={70} rx={14} fill={C.bgAlt} stroke={C.accent} strokeWidth={2} />
        {[0, 1, 2].map((k) => (
          <rect key={k} x={x + 30 + k * 170} y={y + 165} width={150} height={40} rx={10} fill={C.dotInactive} />
        ))}
      </g>
    );
  if (i === 2)
    return [0, 1, 2].map((k) => (
      <g key={k}>
        <rect x={x + 30 + k * 170} y={y + 60} width={150} height={150} rx={12} fill={C.bg} stroke={C.accent} strokeWidth={2} />
        {[0, 1].map((r) => (k < 2 || r === 0 ? <rect key={r} x={x + 44 + k * 170} y={y + 80 + r * 50} width={122} height={36} rx={8} fill={C.dotInactive} /> : null))}
      </g>
    ));
  return (
    <g>
      <path d={`M ${x + 60} ${y + 210} H ${x + 500}`} stroke={C.text} strokeWidth={3} />
      <rect x={x + 150} y={y + 90} width={90} height={120} rx={8} fill={C.accent} />
      <rect x={x + 300} y={y + 90} width={90} height={120} rx={8} fill={C.accent} />
    </g>
  );
}

export default function S23() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      {CELLS.map((c, i) => (
        <RoleCard key={c.name} x={c.x} y={c.y} w={W} h={H} tone="neutral" label={c.name.toUpperCase()} opacity={appear(frame, T.thumbs + i * 6)} muted={appear(frame, T.stamp) * 0.3}>
          <Mini i={i} x={c.x} y={c.y} />
        </RoleCard>
      ))}
      <IllustrativeStamp x={960} y={560} variant="stamp" anchor="center" size={56} opacity={appear(frame, T.stamp, 12)} />
      <ToneLabel x={960} y={900} anchor="middle" tone="unknown" size={24} opacity={appear(frame, T.note)}>
        CÁCH TÌM BẰNG CHỨNG · KHÔNG PHẢI KẾT QUẢ KHẢO SÁT THẬT
      </ToneLabel>
    </Scene>
  );
}

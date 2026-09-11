import React from 'react';
import { BranchRouter, Pill, SvgText } from '../../../../components/index.js';
import { C, appear, clamp01, linearProgress, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene, TONE } from './shared.jsx';

/*
 * Câu 11 — the end-of-day deliverable: one problem description with nine sections (rows only, no
 * content — the sections are taught later), which feeds a three-way decision: triển khai · tạm hoãn ·
 * dừng lại. No branch is chosen: the decision belongs to the practice session.
 */
const N = 11;
const T = {
  doc: spokenAt(N, 'một bản mô tả bài toán') - 10,
  rows: [spokenAt(N, 'một bản mô tả bài toán'), spokenAt(N, 'để quyết định') + 4],
  router: spokenAt(N, 'triển khai') - 10,
  practice: spokenAt(N, 'trong buổi thực hành') - 4,
};
const doc = { x: 240, y: 300, w: 520, h: 620 };
const FOLD = 56;
const ROW0 = doc.y + 118;
const ROW_H = 52;

export default function S11() {
  const frame = useFrame();
  const od = appear(frame, T.doc);
  const fill = linearProgress(frame, T.rows[0], T.rows[1]) * 9;
  const [stroke, soft] = TONE.neutral;
  return (
    <Scene n={N} frame={frame}>
      {od > 0.001 ? (
        <g opacity={od < 1 ? od : undefined}>
          <path d={`M ${doc.x} ${doc.y} H ${doc.x + doc.w - FOLD} L ${doc.x + doc.w} ${doc.y + FOLD} V ${doc.y + doc.h} H ${doc.x} Z`} fill={soft} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />
          <path d={`M ${doc.x + doc.w - FOLD} ${doc.y} V ${doc.y + FOLD} H ${doc.x + doc.w}`} fill="none" stroke={stroke} strokeWidth={3} />
          <SvgText x={doc.x + 34} y={doc.y + 56} size={22} weight={700} anchor="start" color={C.accentStrong} letterSpacing={1.2}>
            BẢN MÔ TẢ BÀI TOÁN
          </SvgText>
          <SvgText x={doc.x + 34} y={doc.y + 90} size={20} weight={600} anchor="start" color={C.textMuted}>
            đủ chín mục
          </SvgText>
          {Array.from({ length: 9 }, (_, i) => {
            const t = clamp01(fill - i);
            const y = ROW0 + i * ROW_H;
            return (
              <g key={i}>
                <circle cx={doc.x + 50} cy={y + 12} r={15} fill={t > 0.5 ? C.accent : C.bg} stroke={C.accent} strokeWidth={2} />
                <SvgText x={doc.x + 50} y={y + 19} size={17} weight={700} color={t > 0.5 ? C.bg : C.accent}>
                  {i + 1}
                </SvgText>
                <rect x={doc.x + 84} y={y + 6} width={doc.w - 140} height={12} rx={6} fill={C.dotInactive} />
                {t > 0 ? <rect x={doc.x + 84} y={y + 6} width={(doc.w - 140) * (i % 3 === 2 ? 0.6 : i % 2 ? 0.78 : 0.9) * t} height={12} rx={6} fill={C.accent} /> : null}
              </g>
            );
          })}
        </g>
      ) : null}
      <BranchRouter
        x={doc.x + doc.w + 30}
        y={doc.y + doc.h / 2}
        spread={200}
        length={560}
        destW={300}
        branches={[
          { dest: 'TRIỂN KHAI', tone: 'output' },
          { dest: 'TẠM HOÃN', tone: 'memory' },
          { dest: 'DỪNG LẠI', tone: 'red' },
        ]}
        opacity={appear(frame, T.router)}
      />
      <SvgText x={1330} y={330} size={22} weight={700} color={C.accentStrong} opacity={appear(frame, T.router)} letterSpacing={1}>
        QUYẾT ĐỊNH
      </SvgText>
      <Pill x={1180} y={860} w={300} label="TRONG BUỔI THỰC HÀNH" size={17} h={44} opacity={appear(frame, T.practice)} />
    </Scene>
  );
}

import React from 'react';
import { DataTable, SvgText, dataTableLayout } from '../../../../components/index.js';
import { C, ROLE, appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene } from './shared.jsx';

/*
 * Câu 34 — before / new approach side by side: same task, same start, same stop. The new approach's
 * time stays "Chưa thử" — no improvement figure is invented.
 */
const N = 34;
const T = {
  header: spokenAt(N, 'Khi thử cách mới') + 2,
  per: 26,
  same: spokenAt(N, 'chỉ dừng đồng hồ') - 4,
};
const PROPS = {
  x: 130,
  y: 290,
  w: 1420,
  title: 'PHIẾU ĐO · TRƯỚC VÀ CÁCH MỚI',
  illustrative: 'MINH HỌA',
  columns: [
    { key: 'k', label: 'Tiêu chí', w: 1.3 },
    { key: 'a', label: 'Trước', w: 2 },
    { key: 'b', label: 'Cách mới', w: 2 },
  ],
  rows: [
    { k: 'Việc giao', a: 'Tìm hướng dẫn nộp bài', b: 'Tìm hướng dẫn nộp bài' },
    { k: 'Bấm giờ khi', a: 'Lan bắt đầu tìm', b: 'Lan bắt đầu tìm' },
    { k: 'Dừng khi', a: 'Xác nhận đúng hướng dẫn của lớp', b: 'Xác nhận đúng hướng dẫn của lớp' },
    { k: 'Thời gian', a: '8 phút (minh họa)', b: { status: 'untested', text: 'Chưa thử' } },
  ],
};
const L = dataTableLayout(PROPS);

export default function S34() {
  const frame = useFrame();
  const s = appear(frame, T.same);
  const r0 = L.rows[0];
  const r2 = L.rows[2];
  const top = r0.y - 6;
  const bottom = r2.y + r2.h + 6;
  return (
    <Scene n={N} frame={frame}>
      <DataTable {...PROPS} frame={frame} start={T.header} per={T.per} />
      {s > 0.001 ? (
        <g opacity={s < 1 ? s : undefined}>
          <rect x={PROPS.x - 14} y={top} width={PROPS.w + 28} height={bottom - top} rx={16} fill="none" stroke={ROLE.green} strokeWidth={5} />
          <rect x={PROPS.x + PROPS.w + 36} y={(top + bottom) / 2 - 24} width={236} height={48} rx={24} fill={ROLE.greenSoft} stroke={ROLE.green} strokeWidth={2.5} />
          <SvgText x={PROPS.x + PROPS.w + 154} y={(top + bottom) / 2 + 7} size={19} weight={700} color={C.text}>
            GIỐNG NHAU
          </SvgText>
        </g>
      ) : null}
      <SvgText x={PROPS.x + PROPS.w / 2} y={Math.min(930, L.bottom + 60)} size={24} weight={600} color={C.textMuted} opacity={appear(frame, T.same + 30)}>
        Ô thời gian của cách mới để trống cho tới khi thử thật
      </SvgText>
    </Scene>
  );
}

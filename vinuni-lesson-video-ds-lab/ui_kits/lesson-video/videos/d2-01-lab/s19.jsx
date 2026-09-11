import React from 'react';
import { BrowserFrame, Cursor, FormSheet, Person, SpeechBubble, SvgText, browserContentBox } from '../../../../components/index.js';
import { C, ROLE, appear, useFrame } from '../../../../lib/index.js';
import { spokenAt, speechEnd } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 19 — nghe kể và xem cách làm. Lan's cursor moves across the course pages and twice clicks back;
 * the observer marks each "quay lại" with an amber pip and notes where she stopped. At the end what Lan
 * says is set against what she did ("đối chiếu"). MINH HỌA.
 */
const N = 19;
const T = {
  frame: 4,
  move: spokenAt(N, 'tự tìm hướng dẫn') - 10,
  observer: spokenAt(N, 'ghi chỗ') - 30,
  stop: spokenAt(N, 'dừng lại') - 4,
  compare: spokenAt(N, 'đối chiếu') - 8,
  told: spokenAt(N, 'điều họ kể') - 4,
};
const WIN = { x: 120, y: 290, w: 860, h: 470 };
const b = browserContentBox(WIN, 26);
const TABS = ['Bài học', 'Tài liệu', 'Hộp thư'];
const tabX = (i) => b.x + i * 270;
const TAB_Y = b.y + 50;
const BACK = { x: b.x, y: b.y + 330 };
const m = T.move;
const PATH = [
  { x: b.x + 420, y: b.y + 240, at: m },
  { x: tabX(0) + 110, y: TAB_Y + 30, at: m + 16, click: true },
  { x: tabX(1) + 110, y: TAB_Y + 30, at: m + 34, click: true },
  { x: BACK.x + 70, y: BACK.y + 26, at: m + 52, click: true },
  { x: tabX(2) + 110, y: TAB_Y + 30, at: m + 70, click: true },
  { x: BACK.x + 70, y: BACK.y + 26, at: m + 88, click: true },
  { x: tabX(1) + 110, y: TAB_Y + 30, at: T.stop, click: true },
];
const backs = [m + 52, m + 88];
const SHEET = { x: 1180, y: 300, w: 640 };

export default function S19() {
  const frame = useFrame();
  const tab = frame >= T.stop ? 1 : frame >= m + 70 ? 2 : frame >= m + 34 ? 1 : 0;
  const slotX = SHEET.x + 28 + 330;
  const row0 = SHEET.y + 56 + 9;
  return (
    <Scene n={N} frame={frame}>
      <BrowserFrame {...WIN} title="Khóa học" url="lms.truong.edu.vn/khoa-hoc" opacity={appear(frame, T.frame)}>
        {TABS.map((t, i) => (
          <g key={t}>
            <rect x={tabX(i)} y={TAB_Y} width={240} height={60} rx={12} fill={i === tab ? C.dotInactive : C.bgAlt} stroke={i === tab ? C.accent : C.dotInactive} strokeWidth={2} />
            <SvgText x={tabX(i) + 120} y={TAB_Y + 38} size={22} weight={700} color={i === tab ? C.accentStrong : C.textMuted}>
              {t}
            </SvgText>
          </g>
        ))}
        {[0, 1, 2].map((r) => (
          <rect key={r} x={b.x} y={b.y + 150 + r * 52} width={b.w * (0.9 - r * 0.18)} height={30} rx={8} fill={C.dotInactive} />
        ))}
        <rect x={BACK.x} y={BACK.y} width={200} height={52} rx={26} fill={C.bg} stroke={C.accent} strokeWidth={2} />
        <SvgText x={BACK.x + 100} y={BACK.y + 34} size={20} weight={700} color={C.accent}>
          ← Quay lại
        </SvgText>
      </BrowserFrame>
      <Cursor path={PATH} frame={frame} opacity={appear(frame, T.move, 10)} />

      <Person x={1080} y={420} r={44} name="Người quan sát" color={C.accentStrong} opacity={appear(frame, T.observer)} />
      <FormSheet
        {...SHEET}
        labelW={330}
        title="PHIẾU QUAN SÁT · MINH HỌA"
        rows={[
          { label: 'Quay lại trang trước', value: undefined },
          { label: 'Chỗ dừng lại', value: frame >= T.stop + 8 ? 'Mục Tài liệu' : undefined },
        ]}
        opacity={appear(frame, T.observer)}
      />
      {backs.map((t, i) => (
        <g key={i} opacity={appear(frame, t, 12)}>
          <rect x={slotX + 20 + i * 46} y={row0 + 24} width={30} height={30} rx={8} fill={ROLE.amberSoft} stroke={ROLE.amber} strokeWidth={3} />
        </g>
      ))}

      <SpeechBubble x={1180} y={560} w={300} h={80} lines={['Điều Lan kể']} tail="left" opacity={appear(frame, T.told)} />
      <RoleCard x={1520} y={560} w={300} h={80} tone="user" lines={['Điều Lan làm']} size={24} opacity={appear(frame, T.compare)} />
      <SvgText x={1500} y={710} size={22} weight={700} color={ROLE.amber} opacity={appear(frame, T.told + 6)}>
        ⇄ đối chiếu
      </SvgText>
      <SvgText x={1500} y={745} size={20} weight={600} color={C.textMuted} opacity={appear(frame, Math.min(T.told + 10, speechEnd(N)))}>
        lời kể có khớp cách làm?
      </SvgText>
    </Scene>
  );
}

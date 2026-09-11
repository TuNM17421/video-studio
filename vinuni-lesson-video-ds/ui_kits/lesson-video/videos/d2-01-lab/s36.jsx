import React from 'react';
import { BrowserFrame, Check, Magnifier, SpeechBubble, SvgText, UIButton } from '../../../../components/index.js';
import { C, ROLE, appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Lan, RoleCard, Scene } from './shared.jsx';

/*
 * Câu 36 — MINH HỌA. Lan has the RIGHT document open (green "đúng tài liệu"), but a magnifier stops on a
 * line with unfamiliar wording (amber): finding is not understanding. The link button still works,
 * so moving it may not help much (amber note on the button).
 */
const N = 36;
const WIN = { x: 130, y: 280, w: 1080, h: 640 };
const LINES = [
  { t: 'Hướng dẫn nộp bài · Lớp A', head: true },
  { t: '1. Nộp bài trong mục Bài tập của lớp.' },
  { t: '2. Đặt tên tệp theo quy ước của lớp.' },
  { t: '3. Chọn “kênh nộp chính thức” khi', hard: true },
  { t: '    “trạng thái đồng bộ” đã bật.', hard: true },
  { t: '4. Nộp bản cuối trước hạn của lớp.' },
];
const LX = WIN.x + 60;
const LY0 = WIN.y + 150;
const PITCH = 66;
const T = {
  win: 0,
  scan: spokenAt(N, 'không hiểu') - 40,
  hard: spokenAt(N, 'không hiểu') - 4,
  stuck: spokenAt(N, 'không hiểu') + 10,
  button: spokenAt(N, 'việc đổi vị trí') - 10,
  note: spokenAt(N, 'có thể chưa giúp') - 4,
};

function DocText({ hard }) {
  return (
    <g>
      {LINES.map((l, i) => {
        const y = LY0 + i * PITCH;
        return (
          <g key={i}>
            {l.hard && hard > 0.001 ? <rect x={LX - 12} y={y - 34} width={780} height={50} rx={10} fill={ROLE.amberSoft} opacity={hard} /> : null}
            <SvgText x={LX} y={y} size={l.head ? 32 : 26} weight={l.head ? 700 : 600} anchor="start" color={l.head ? C.accentStrong : C.text}>
              {l.t}
            </SvgText>
          </g>
        );
      })}
    </g>
  );
}

export default function S36() {
  const frame = useFrame();
  const hard = appear(frame, T.hard);
  const hy = LY0 + 3 * PITCH - 8;
  const path = [
    { x: LX + 160, y: LY0 + PITCH - 8, at: T.scan },
    { x: LX + 420, y: LY0 + 2 * PITCH - 8, at: T.scan + 22 },
    { x: LX + 380, y: hy, at: T.hard },
  ];
  const doc = <DocText hard={hard} />;
  return (
    <Scene n={N} frame={frame}>
      <BrowserFrame {...WIN} url="lop-a.khoahoc.vn/huong-dan-nop-bai" title="Lớp A" illustrative={false} opacity={appear(frame, T.win)}>
        {doc}
        <g opacity={appear(frame, 10)}>
          <Check x={WIN.x + 70} y={WIN.y + WIN.h - 60} size={34} color={ROLE.green} strokeWidth={6} />
          <SvgText x={WIN.x + 100} y={WIN.y + WIN.h - 50} size={20} weight={700} anchor="start" color={ROLE.green} letterSpacing={1.2}>
            ĐÚNG TÀI LIỆU CỦA LỚP
          </SvgText>
        </g>
      </BrowserFrame>
      <Magnifier path={path} frame={frame} r={80} zoom={1.5} color={frame >= T.hard ? ROLE.amber : C.accent} opacity={appear(frame, T.scan - 10) * (1 - appear(frame, T.button - 6, 18))}>
        {doc}
      </Magnifier>

      <Lan x={1440} y={400} r={60} />
      <SpeechBubble x={1540} y={300} w={300} h={96} lines={['Đoạn này', 'nghĩa là gì?']} tail="left" opacity={appear(frame, T.stuck)} />

      <g opacity={appear(frame, T.button)}>
        <UIButton x={1330} y={640} w={300} label="Mở hướng dẫn" icon="file-text" />
        <Check x={1670} y={672} size={34} color={ROLE.green} strokeWidth={6} />
        <SvgText x={1480} y={740} size={19} weight={600} color={C.textMuted}>nút vẫn dùng được</SvgText>
      </g>
      <RoleCard x={1290} y={780} w={520} h={100} tone="unknown" lines={['Đổi vị trí nút', 'có thể chưa giúp nhiều']} size={22} opacity={appear(frame, T.note)} />
    </Scene>
  );
}

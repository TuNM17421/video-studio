import React from 'react';
import { ChatWindow, SvgText, Tray, trayItemBox } from '../../../../components/index.js';
import { C, EASE, appear, interpolate, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Dung, RoleCard, Scene } from './shared.jsx';

/*
 * Câu 05 — Dũng (nhân viên hỗ trợ) in the support inbox: Lan asks where to submit, Dũng drags the link
 * chip into his reply, then has to ask which class she is in. On the right the same question keeps
 * landing in a tray of repeated questions. Mock screen (MINH HỌA).
 */
const N = 5;
const T = {
  dung: 0,
  chat: 8,
  ask: 30,
  repeat: spokenAt(N, 'câu hỏi lặp lại') - 10,
  chip: spokenAt(N, 'gửi đường dẫn') - 16,
  drag: [spokenAt(N, 'gửi đường dẫn') - 6, spokenAt(N, 'gửi đường dẫn') + 16],
  reply: spokenAt(N, 'gửi đường dẫn') + 18,
  klass: spokenAt(N, 'hỏi Lan học lớp nào') - 2,
};
const chat = { x: 430, y: 300, w: 700, h: 540 };
const tray = { x: 1230, y: 300, w: 560, h: 540 };
const CHIP = { w: 250, h: 52 };

export default function S05() {
  const frame = useFrame();
  const t = interpolate(frame, T.drag, [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE.inOut });
  const chipX = interpolate(t, [0, 1], [130, chat.x + 60]);
  const chipY = interpolate(t, [0, 1], [760, chat.y + chat.h - 66]);
  const chipO = appear(frame, T.chip) * (1 - appear(frame, T.reply - 2, 8));
  return (
    <Scene n={N} frame={frame}>
      <Dung x={250} y={520} opacity={appear(frame, T.dung)} />
      <ChatWindow
        {...chat}
        title="Hộp thư hỗ trợ"
        subtitle="Dũng trả lời Lan · học viên mới"
        frame={frame}
        opacity={appear(frame, T.chat)}
        cps={34}
        messages={[
          { role: 'user', text: 'Nộp bài ở đâu ạ?', at: T.ask },
          { role: 'assistant', text: 'Hướng dẫn nộp bài: lms.truong.edu.vn/nop-bai', at: T.reply },
          { role: 'assistant', text: 'Bạn học lớp nào?', at: T.klass },
        ]}
      />
      {chipO > 0.001 ? (
        <g opacity={chipO < 1 ? chipO : undefined}>
          <rect x={chipX} y={chipY} width={CHIP.w} height={CHIP.h} rx={26} fill={C.bg} stroke={C.accent} strokeWidth={3} />
          <SvgText x={chipX + CHIP.w / 2} y={chipY + 34} size={20} weight={700} color={C.accent}>
            đường dẫn
          </SvgText>
        </g>
      ) : null}
      <Tray {...tray} label="CÂU HỎI LẶP LẠI" icon="inbox" tone="check" opacity={appear(frame, T.repeat - 6)}>
        {[0, 1, 2, 3].map((i) => (
          <RoleCard key={i} {...trayItemBox(tray, i, { itemH: 96 })} tone="neutral" lines={['“Nộp bài ở đâu ạ?”']} size={24} opacity={appear(frame, T.repeat + i * 12)} />
        ))}
      </Tray>
    </Scene>
  );
}

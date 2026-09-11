import React from 'react';
import { Flow, LineIcon } from '../../../../components/index.js';
import { ROLE, appear, interpolate, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene, ToneLabel } from './shared.jsx';

/*
 * Câu 42 — walk back from the technology: the purple block of câu 41 shrinks into the top-right corner,
 * a dashed arrow runs back from it to the user, and the chain is rebuilt step by step as it is named:
 * người dùng → công đoạn bị mắc → quy trình hiện tại → ai quá tải · điểm vướng lặp lại.
 */
const N = 42;
const SAY = {
  back: spokenAt(N, 'đi ngược lại'),
  user: spokenAt(N, 'hỏi người dùng'),
  stage: spokenAt(N, 'công đoạn nào'),
  flow: spokenAt(N, 'quy trình hiện tại'),
  load: spokenAt(N, 'ai đang bị quá tải'),
  repeat: spokenAt(N, 'điểm vướng xuất hiện'),
};
const T = {
  shrink: [0, SAY.back + 10],
  back: [SAY.back - 4, SAY.back + 40],
  user: SAY.user - 8,
  stage: SAY.stage - 10,
  flow: SAY.flow - 8,
  load: SAY.load - 8,
  repeat: SAY.repeat - 6,
};
const BIG = { x: 330, y: 360, w: 1260, h: 560 };
const SMALL = { x: 1480, y: 262, w: 300, h: 96 };
const CARD = { y: 560, w: 380, h: 170 };
const XS = [110, 540, 970, 1400];
const cards = XS.map((x) => ({ x, y: CARD.y, w: CARD.w, h: CARD.h }));

export default function S42() {
  const frame = useFrame();
  const s = smooth(frame, T.shrink[0], T.shrink[1]);
  const tech = {
    x: interpolate(s, [0, 1], [BIG.x, SMALL.x]),
    y: interpolate(s, [0, 1], [BIG.y, SMALL.y]),
    w: interpolate(s, [0, 1], [BIG.w, SMALL.w]),
    h: interpolate(s, [0, 1], [BIG.h, SMALL.h]),
  };
  const done = frame >= T.shrink[1];
  const links = [
    [0, 1, T.stage - 16, T.stage + 4],
    [1, 2, T.flow - 16, T.flow + 4],
    [2, 3, T.load - 16, T.load + 4],
  ];
  return (
    <Scene n={N} frame={frame}>
      <RoleCard {...tech} tone="solution" label={done ? undefined : 'CÔNG NGHỆ'} lines={done ? ['Công nghệ'] : []} size={24} muted={done ? 0.4 : 0}>
        <LineIcon name="server" x={done ? tech.x + 48 : tech.x + tech.w / 2} y={tech.y + tech.h / 2} size={interpolate(s, [0, 1], [110, 36])} color={ROLE.purple} />
      </RoleCard>
      {frame >= T.back[0] ? (
        <Flow
          points={[{ x: SMALL.x - 14, y: SMALL.y + SMALL.h / 2 }, { x: XS[0] + CARD.w / 2, y: SMALL.y + SMALL.h / 2 }, { x: XS[0] + CARD.w / 2, y: CARD.y - 14 }]}
          frame={frame}
          start={T.back[0]}
          end={T.back[1]}
          dashed
          hideIn={[cards[0]]}
        />
      ) : null}
      <ToneLabel x={560} y={SMALL.y + SMALL.h / 2 - 20} tone="unknown" opacity={appear(frame, T.back[0] + 10)}>
        ĐI NGƯỢC LẠI TỪNG BƯỚC
      </ToneLabel>

      {links.map(([a, b, s0, s1]) => (
        <Flow key={a} points={[{ x: cards[a].x + CARD.w + 6, y: CARD.y + CARD.h / 2 }, { x: cards[b].x - 6, y: CARD.y + CARD.h / 2 }]} frame={frame} start={s0} end={s1} hideIn={[cards[a], cards[b]]} />
      ))}
      <RoleCard {...cards[0]} tone="user" label="1 · HỎI" lines={['Người dùng']} size={28} opacity={appear(frame, T.user)} />
      <RoleCard {...cards[1]} tone="user" label="2 · CÔNG ĐOẠN" lines={['Đang mắc ở', 'công đoạn nào?']} size={26} opacity={appear(frame, T.stage)} />
      <RoleCard {...cards[2]} tone="user" label="3 · QUY TRÌNH" lines={['Quy trình hiện tại', 'đang diễn ra ra sao?']} size={26} opacity={appear(frame, T.flow)} />
      <RoleCard {...cards[3]} tone="problem" label="4 · CHỖ VƯỚNG" lines={['Ai đang bị quá tải?']} size={26} opacity={appear(frame, T.load)} />
      <RoleCard x={cards[3].x} y={CARD.y + CARD.h + 30} w={CARD.w} h={110} tone="problem" lines={['Điểm vướng', 'lặp lại ở đâu?']} size={26} opacity={appear(frame, T.repeat)} />
    </Scene>
  );
}

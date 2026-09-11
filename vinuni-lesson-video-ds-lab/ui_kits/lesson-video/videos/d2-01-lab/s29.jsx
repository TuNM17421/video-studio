import React from 'react';
import { Enclosure, SvgText } from '../../../../components/index.js';
import { C, ROLE, appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';
import { Sentence } from './p4-shared.jsx';

/*
 * Câu 29 — the sentence says WHAT to solve; the chatbot is only a solution hypothesis below a dotted
 * line, in a dashed purple zone, with a question mark: it still has to be tried.
 */
const N = 29;
const T = {
  sentence: 2,
  understood: spokenAt(N, 'hiểu cần giải quyết') - 4,
  line: spokenAt(N, 'còn trợ lý') - 16,
  zone: spokenAt(N, 'còn trợ lý') - 8,
  bot: spokenAt(N, 'trợ lý hội thoại') - 4,
  q: spokenAt(N, 'có giúp được') - 2,
  test: spokenAt(N, 'vẫn phải thử') - 4,
};
const TOP = { x: 160, y: 270, w: 1600, h: 220 };
const ZONE = { x: 520, y: 600, w: 880, h: 320 };
const BOT = { x: 640, y: 680, w: 520, h: 150 };

export default function S29() {
  const frame = useFrame();
  const lineP = appear(frame, T.line, 30);
  const q = appear(frame, T.q);
  return (
    <Scene n={N} frame={frame}>
      <RoleCard {...TOP} tone="neutral" label="CÂU VẤN ĐỀ · CẦN GIẢI QUYẾT VIỆC GÌ" hot={pulse(frame, T.understood)} opacity={appear(frame, T.sentence)} />
      <Sentence cx={960} y={TOP.y + 104} size={34} lineH={58} lit={[1, 1, 1]} opacity={appear(frame, T.sentence)} />
      {lineP > 0.001 ? (
        <g>
          <line x1={160} y1={545} x2={160 + 1600 * lineP} y2={545} stroke={C.textMuted} strokeWidth={3} strokeDasharray="4 12" strokeLinecap="round" />
          <SvgText x={1760} y={532} size={20} weight={700} anchor="end" color={C.textMuted} opacity={lineP}>
            chưa chọn công nghệ
          </SvgText>
        </g>
      ) : null}
      <Enclosure {...ZONE} label="GIẢ THUYẾT GIẢI PHÁP" color={ROLE.purple} opacity={appear(frame, T.zone)} />
      <RoleCard {...BOT} tone="solution" dashed lines={['Trợ lý hội thoại', 'có giúp được không?']} size={28} opacity={appear(frame, T.bot)} />
      {q > 0.001 ? (
        <g opacity={q < 1 ? q : undefined}>
          <circle cx={BOT.x + BOT.w + 70} cy={BOT.y + BOT.h / 2} r={38} fill={C.bg} stroke={C.red} strokeWidth={4} />
          <SvgText x={BOT.x + BOT.w + 70} y={BOT.y + BOT.h / 2 + 15} size={42} weight={700} color={C.red}>?</SvgText>
        </g>
      ) : null}
      <g opacity={appear(frame, T.test)}>
        {frame >= T.test ? (
          <>
            <rect x={760} y={856} width={400} height={46} rx={23} fill={ROLE.amberSoft} stroke={ROLE.amber} strokeWidth={2.5} />
            <SvgText x={960} y={886} size={20} weight={700} color={C.text}>PHẢI THỬ MỚI BIẾT</SvgText>
          </>
        ) : null}
      </g>
    </Scene>
  );
}

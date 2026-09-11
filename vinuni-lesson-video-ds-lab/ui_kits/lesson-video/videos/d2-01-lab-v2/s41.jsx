import React from 'react';
import { LineIcon, SpeechBubble } from '../../../../components/index.js';
import { ROLE, appear, interpolate, smooth, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';
import { PROBLEM_CARDS } from './s40.jsx';

/*
 * Câu 41 — the call “hãy làm chatbot” appears first; right after, a purple technology layer grows into
 * the foreground and covers the two problem descriptions (they dim behind it).
 */
const N = 41;
const T = {
  bubble: spokenAt(N, 'hãy làm chatbot') - 6,
  grow: [spokenAt(N, 'nghĩ ngay') - 8, spokenAt(N, 'công nghệ') + 18],
};
const SMALL = { x: 810, y: 560, w: 300, h: 120 };
const BIG = { x: 330, y: 360, w: 1260, h: 560 };

export default function S41() {
  const frame = useFrame();
  const g = smooth(frame, T.grow[0], T.grow[1]);
  const box = {
    x: interpolate(g, [0, 1], [SMALL.x, BIG.x]),
    y: interpolate(g, [0, 1], [SMALL.y, BIG.y]),
    w: interpolate(g, [0, 1], [SMALL.w, BIG.w]),
    h: interpolate(g, [0, 1], [SMALL.h, BIG.h]),
  };
  const ob = appear(frame, T.grow[0], 12);
  return (
    <Scene n={N} frame={frame}>
      {PROBLEM_CARDS.map((c) => (
        <RoleCard key={c.label} {...c} tone="neutral" size={30} muted={g} />
      ))}
      <SpeechBubble x={700} y={258} w={520} h={80} lines={['“Hãy làm chatbot”']} size={30} tail="left" opacity={appear(frame, T.bubble)} />
      <RoleCard {...box} tone="solution" label="CÔNG NGHỆ" size={34} opacity={ob}>
        <LineIcon name="server" x={box.x + box.w / 2} y={box.y + box.h / 2} size={interpolate(g, [0, 1], [48, 110])} color={ROLE.purple} />
      </RoleCard>
    </Scene>
  );
}

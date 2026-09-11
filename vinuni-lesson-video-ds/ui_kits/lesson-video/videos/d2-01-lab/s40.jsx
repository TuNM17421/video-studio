import React from 'react';
import { Enclosure, Icon, Multiline, Stopwatch, SvgText } from '../../../../components/index.js';
import { C, ROLE, appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 40 — the kit to write down before building: the difficulty, the number to measure and what is
 * still unconfirmed, laid side by side on the design team's table. Each card lands on its words.
 */
const N = 40;
const TABLE = { x: 110, y: 300, w: 1700, h: 600 };
const CARD = { y: 390, w: 480, h: 440 };
const XS = [180, 720, 1260];
const KIT = [
  { say: 'khó khăn cần giải quyết', tone: 'problem', label: 'KHÓ KHĂN', lines: ['Học viên mới khó tìm đúng', 'hướng dẫn trước lần nộp đầu,', 'phải chờ và hỏi lại'] },
  { say: 'con số sẽ đo', tone: 'metric', label: 'CÁCH ĐO', lines: ['Thời gian tìm', 'đúng hướng dẫn'] },
  { say: 'điều nhóm còn chưa', tone: 'unknown', label: 'ĐIỀU CHƯA RÕ', dashed: true, lines: ['Hướng dẫn khó tìm', 'là nguyên nhân chính?'] },
];
const T = { table: 0, cards: KIT.map((k) => spokenAt(N, k.say) - 6) };

export default function S40() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <Enclosure {...TABLE} label="BÀN NHÓM THIẾT KẾ" color={C.accent} opacity={appear(frame, T.table)} />
      {KIT.map((k, i) => {
        const x = XS[i];
        const o = appear(frame, T.cards[i]);
        const cx = x + CARD.w / 2;
        return (
          <RoleCard key={i} x={x} y={CARD.y} w={CARD.w} h={CARD.h} tone={k.tone} label={k.label} dashed={k.dashed} opacity={o}>
            {i === 0 ? <Icon name="alert-bubble" x={cx} y={CARD.y + 150} size={96} color={ROLE.orange} /> : null}
            {i === 1 ? <Stopwatch x={cx} y={CARD.y + 155} r={58} sweep={0.3} color={C.accentStrong} wedge={false} /> : null}
            {i === 2 ? (
              <SvgText x={cx} y={CARD.y + 190} size={110} weight={700} color={ROLE.amber}>?</SvgText>
            ) : null}
            <Multiline x={cx} y={CARD.y + 320} lines={k.lines} size={k.lines.length > 2 ? 23 : 27} lineHeight={k.lines.length > 2 ? 32 : 36} firstWeight={700} />
          </RoleCard>
        );
      })}
    </Scene>
  );
}

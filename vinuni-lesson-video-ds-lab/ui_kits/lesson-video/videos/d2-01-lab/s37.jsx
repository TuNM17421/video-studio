import React from 'react';
import { Flow, FormSheet } from '../../../../components/index.js';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene, ToneLabel } from './shared.jsx';

/*
 * Câu 37 — MINH HỌA. The observation sheet feeds three candidate causes, each an amber dashed card
 * (not yet confirmed), connected as it is named. The sheet does not choose between them.
 */
const N = 37;
const SHEET = { x: 140, y: 380, w: 640 };
const ROW_H = 92;
const sheetH = 56 + 3 * ROW_H + 18;
const CAUSES = [
  { say: 'thiếu đường dẫn', lines: ['Thiếu đường dẫn'] },
  { say: 'thiếu thông tin', lines: ['Thiếu thông tin'] },
  { say: 'đã thấy hướng dẫn', lines: ['Thấy nhưng', 'không hiểu'] },
];
const cards = CAUSES.map((_, i) => ({ x: 1140, y: 320 + i * 190, w: 600, h: 140 }));
const JX = 960;
const T = {
  sheet: 0,
  look: spokenAt(N, 'cần xem thêm') - 4,
  cards: CAUSES.map((c) => spokenAt(N, c.say) - 8),
  flows: CAUSES.map((c) => [spokenAt(N, c.say) - 14, spokenAt(N, c.say) + 12]),
};

export default function S37() {
  const frame = useFrame();
  const out = { x: SHEET.x + SHEET.w + 10, y: SHEET.y + sheetH / 2 };
  return (
    <Scene n={N} frame={frame}>
      <FormSheet
        {...SHEET}
        rowH={ROW_H}
        labelW={250}
        title="PHIẾU QUAN SÁT"
        rows={[
          { label: 'Trang đã mở', value: 'Bài học · Tài liệu' },
          { label: 'Dừng lại ở', value: 'Đoạn hướng dẫn' },
          { label: 'Hỏi thêm', value: 'Hai lượt' },
        ]}
        opacity={appear(frame, T.sheet)}
      />
      <ToneLabel x={SHEET.x} y={SHEET.y + sheetH + 50} tone="unknown" opacity={appear(frame, T.look)}>
        CẦN XEM THÊM ĐỂ BIẾT
      </ToneLabel>
      {cards.map((b, i) => (
        <Flow
          key={i}
          points={[out, { x: JX, y: out.y }, { x: JX, y: b.y + b.h / 2 }, { x: b.x, y: b.y + b.h / 2 }]}
          frame={frame}
          start={T.flows[i][0]}
          end={T.flows[i][1]}
        />
      ))}
      {cards.map((b, i) => (
        <RoleCard key={i} {...b} tone="unknown" dashed label="NGUYÊN NHÂN?" lines={CAUSES[i].lines} size={28} opacity={appear(frame, T.cards[i])} hot={pulse(frame, T.flows[i][1])} />
      ))}
    </Scene>
  );
}

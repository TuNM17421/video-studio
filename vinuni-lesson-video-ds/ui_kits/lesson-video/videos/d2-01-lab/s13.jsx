import React from 'react';
import { BrowserFrame, Chip, DocumentSheet, Flow, UIButton, uiButtonWidth } from '../../../../components/index.js';
import { C, appear, fade, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Lan, RoleCard, Scene } from './shared.jsx';

/*
 * Câu 13 — a non-AI option. First Lan's long path detours through three scattered pages before it
 * reaches the right guide; then a "Hướng dẫn nộp bài" button is placed next to the assignment and the
 * short path Lan → button → right guide replaces the long one (which fades).
 */
const N = 13;
const LAN = { x: 200, y: 600, r: 58 };
const WIN = { x: 430, y: 290, w: 1390, h: 560 };
const TASK = { x: 500, y: 390, w: 470, h: 130 };
const BW = uiButtonWidth('Hướng dẫn nộp bài');
const BTN = { x: 500, y: LAN.y - 32, w: BW, h: 64 };
const DOC = { x: 1380, y: 420, w: 260 };
const DOC_H = (168 * DOC.w) / 215;
const CHIPS = ['Trang bài học', 'Tài liệu', 'Hộp thư'];
const CHIP_Y = 905;
const CHIP_X = [620, 900, 1180];
const T = {
  long: [6, 70],
  button: spokenAt(N, 'Một nút') + 6,
  short: [spokenAt(N, 'giúp Lan') - 12, spokenAt(N, 'giúp Lan') + 18],
  short2: [spokenAt(N, 'giúp Lan') + 18, spokenAt(N, 'giúp Lan') + 44],
  noAI: spokenAt(N, 'không dùng') - 6,
};
const midY = LAN.y;
const longPts = [
  { x: LAN.x, y: LAN.y + LAN.r + 90 },
  { x: LAN.x, y: CHIP_Y },
  { x: DOC.x + DOC.w + 80, y: CHIP_Y },
  { x: DOC.x + DOC.w + 80, y: DOC.y + DOC_H / 2 },
  { x: DOC.x + DOC.w + 8, y: DOC.y + DOC_H / 2 },
];

export default function S13() {
  const frame = useFrame();
  const longFade = 1 - 0.75 * fade(frame, T.short[0], 30);
  return (
    <Scene n={N} frame={frame}>
      <BrowserFrame {...WIN} title="Bài tập 1" url="khoahoc.truong.edu.vn/bai-tap-1" illustrative={false}>
        <RoleCard {...TASK} label="BÀI TẬP 1" lines={['Nộp bài lần đầu']} size={26} />
        <DocumentSheet {...DOC} label="Hướng dẫn · Lớp A" detail="đúng lớp của Lan" />
        <UIButton {...BTN} label="Hướng dẫn nộp bài" variant="primary" opacity={appear(frame, T.button)} frame={frame} pressAt={T.short[1]} />
        <Chip x={BTN.x} y={BTN.y + 100} label="KHÔNG DÙNG TRÍ TUỆ NHÂN TẠO" tone="muted" opacity={appear(frame, T.noAI)} />
      </BrowserFrame>
      <Lan {...LAN} />
      <g opacity={longFade < 1 ? longFade : undefined}>
        <Flow points={longPts} frame={frame} start={T.long[0]} end={T.long[1]} dashed />
        {CHIPS.map((c, i) => (
          <Chip key={c} x={CHIP_X[i] - 80} y={CHIP_Y - 18} w={160} label={c.toUpperCase()} tone="blue" size={16} opacity={appear(frame, 10 + i * 10)} />
        ))}
      </g>
      {frame >= T.short[0] ? <Flow points={[{ x: LAN.x + LAN.r + 12, y: midY }, { x: BTN.x, y: midY }]} frame={frame} start={T.short[0]} end={T.short[1]} hideIn={[BTN]} /> : null}
      {frame >= T.short2[0] ? (
        <Flow points={[{ x: BTN.x + BTN.w, y: midY }, { x: DOC.x, y: midY }]} frame={frame} start={T.short2[0]} end={T.short2[1]} color={C.accent} hideIn={[BTN]} />
      ) : null}
    </Scene>
  );
}

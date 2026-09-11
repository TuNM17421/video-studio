import React from 'react';
import { Bracket, BrowserFrame, Cursor, SvgText, browserContentBox } from '../../../../components/index.js';
import { C, ROLE, appear, useFrame } from '../../../../lib/index.js';
import { spokenAt, speechEnd } from './cues.js';
import { Lan, Scene, ToneLabel } from './shared.jsx';

/*
 * Câu 04 — Lan (học viên mới) opens the lesson page, the documents page and the inbox in turn; each
 * click reveals one fragment of the submission guide (amber band = the piece she needs). A bracket
 * closes the three: the guide is scattered. All screens are mock (MINH HỌA).
 */
const N = 4;
const PAGES = [
  { title: 'Trang bài học', url: 'lms.truong.edu.vn/bai-hoc' },
  { title: 'Tài liệu', url: 'lms.truong.edu.vn/tai-lieu' },
  { title: 'Hộp thư', url: 'mail.truong.edu.vn' },
];
const FW = 420;
const FH = 330;
const frames = PAGES.map((_, i) => ({ x: 470 + i * (FW + 40), y: 360, w: FW, h: FH }));
const say = spokenAt(N, 'hướng dẫn nằm');
const T = {
  lan: 0,
  pages: [say - 24, say - 16, say - 8],
  visit: [say + 4, say + 36, say + 68],
  scattered: Math.min(speechEnd(N) - 10, say + 96),
};

function Fragment({ box, i, reveal }) {
  const b = browserContentBox(box, 26);
  const bars = [0.9, 0.62, 0.78];
  return (
    <g>
      {bars.map((k, j) => (
        <rect key={j} x={b.x} y={b.y + 30 + j * 34} width={b.w * k} height={12} rx={6} fill={C.dotInactive} />
      ))}
      {reveal > 0.001 ? (
        <g opacity={reveal < 1 ? reveal : undefined}>
          <rect x={b.x - 8} y={b.y + 138} width={b.w + 16} height={58} rx={12} fill={ROLE.amberSoft} stroke={ROLE.amber} strokeWidth={2} />
          <SvgText x={b.x + b.w / 2} y={b.y + 175} size={22} weight={700} color={C.text}>
            {`Mảnh hướng dẫn ${i + 1}/3`}
          </SvgText>
        </g>
      ) : null}
    </g>
  );
}

export default function S04() {
  const frame = useFrame();
  const path = [{ x: 330, y: 820, at: 0 }];
  frames.forEach((f, i) => {
    path.push({ x: f.x + f.w / 2 + 40, y: f.y + f.h - 70, at: T.visit[i], click: true });
    if (i < 2) path.push({ x: f.x + f.w / 2 + 40, y: f.y + f.h - 70, at: T.visit[i] + 8 });
  });
  const oCur = appear(frame, T.pages[0]);
  return (
    <Scene n={N} frame={frame}>
      <Lan x={250} y={520} opacity={appear(frame, T.lan)} />
      {frames.map((f, i) => (
        <g key={i}>
          <SvgText x={f.x + f.w / 2} y={f.y - 20} size={24} weight={700} color={C.accentStrong} opacity={appear(frame, T.pages[i])}>
            {PAGES[i].title}
          </SvgText>
          <BrowserFrame {...f} url={PAGES[i].url} illustrative={false} opacity={appear(frame, T.pages[i])}>
            <Fragment box={f} i={i} reveal={appear(frame, T.visit[i] + 2, 14)} />
          </BrowserFrame>
        </g>
      ))}
      <Bracket x={frames[0].x} y={frames[0].y + FH + 22} w={frames[2].x + FW - frames[0].x} direction="down" color={ROLE.orange} opacity={appear(frame, T.scattered)} />
      <ToneLabel x={1160} y={frames[0].y + FH + 110} tone="problem" anchor="middle" size={26} opacity={appear(frame, T.scattered)}>
        HƯỚNG DẪN PHÂN TÁN
      </ToneLabel>
      <Cursor path={path} frame={frame} opacity={oCur} />
    </Scene>
  );
}

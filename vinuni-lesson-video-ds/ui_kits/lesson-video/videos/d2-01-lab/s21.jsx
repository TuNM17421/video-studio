import React from 'react';
import { EmailCard, Flow, SpeechBubble, SvgText, Tray, emailCardHeight, trayItemBox } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { Scene, ToneLabel } from './shared.jsx';

/*
 * Câu 21 — xem lại các yêu cầu đã lưu. Saved tickets drop into trays by topic (no counts) so the repeated
 * question shows; one ticket opens to its detail, and a follow-up question is asked to learn the reason.
 */
const N = 21;
const T = {
  trays: 4,
  drop: spokenAt(N, 'đã lưu') - 6,
  repeat: spokenAt(N, 'lặp lại') - 6,
  open: spokenAt(N, 'đọc kỹ') - 16,
  ask: spokenAt(N, 'hỏi thêm') - 6,
  why: spokenAt(N, 'hiểu lý do') - 6,
};
const TRAYS = [
  { x: 110, label: 'HỎI NƠI NỘP', n: 3 },
  { x: 440, label: 'KHÁC', n: 1 },
  { x: 770, label: 'HỎI HƯỚNG DẪN LỚP', n: 3 },
].map((t) => ({ ...t, y: 300, w: 310, h: 440 }));
const OPEN = { tray: 2, item: 0 };
const MAIL = { x: 1180, y: 300, w: 640 };

function Ticket({ b, opacity, hot }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={12} fill={C.bg} stroke={hot ? C.accentStrong : C.accent} strokeWidth={hot ? 4 : 2} />
      <rect x={b.x + 16} y={b.y + 18} width={b.w * 0.6} height={12} rx={6} fill={C.accent} />
      <rect x={b.x + 16} y={b.y + 40} width={b.w * 0.8} height={10} rx={5} fill={C.dotInactive} />
    </g>
  );
}

export default function S21() {
  const frame = useFrame();
  let k = 0;
  const lines = ['Em thấy ba hướng dẫn khác nhau,', 'không biết cái nào cho lớp em.'];
  const src = trayItemBox(TRAYS[OPEN.tray], OPEN.item, { itemH: 66 });
  return (
    <Scene n={N} frame={frame}>
      {TRAYS.map((t, ti) => (
        <Tray key={t.label} x={t.x} y={t.y} w={t.w} h={t.h} label={t.label} tone="accent" opacity={appear(frame, T.trays + ti * 6)} emptyLabel="">
          {Array.from({ length: t.n }, (_, i) => {
            const at = T.drop + k++ * 6;
            return <Ticket key={i} b={trayItemBox(t, i, { itemH: 66 })} opacity={appear(frame, at, 12)} hot={ti === OPEN.tray && i === OPEN.item && frame >= T.open} />;
          })}
        </Tray>
      ))}
      <ToneLabel x={110} y={800} tone="user" size={20} opacity={appear(frame, T.repeat)}>
        CÂU HỎI LẶP LẠI HIỆN RA THEO CHỦ ĐỀ
      </ToneLabel>
      <Flow points={[{ x: TRAYS[2].x + TRAYS[2].w + 8, y: src.y + src.h / 2 }, { x: MAIL.x, y: src.y + src.h / 2 }]} frame={frame} start={T.open} end={T.open + 14} />
      <EmailCard {...MAIL} h={emailCardHeight(2)} from="hoc-vien@truong.edu.vn" to="ho-tro@truong.edu.vn" subject="Hướng dẫn nộp bài nào của lớp em?" lines={lines} opacity={appear(frame, T.open + 12)} />
      <SpeechBubble x={MAIL.x} y={MAIL.y + emailCardHeight(2) + 40} w={MAIL.w} h={84} lines={['“Bạn đã xem những hướng dẫn nào?”']} tail="left" opacity={appear(frame, T.ask)} />
      <ToneLabel x={MAIL.x} y={MAIL.y + emailCardHeight(2) + 200} tone="unknown" size={20} opacity={appear(frame, T.why)}>
        ĐỌC KỸ + HỎI THÊM → HIỂU LÝ DO
      </ToneLabel>
    </Scene>
  );
}

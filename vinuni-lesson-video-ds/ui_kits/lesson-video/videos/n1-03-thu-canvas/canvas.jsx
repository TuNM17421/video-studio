import React from 'react';
import {
  AttentionLines, Canvas, SvgText, TokenRow, VectorStrip, tokenLayout,
} from '../../../../components/index.js';
import { C, appear, linearProgress } from '../../../../lib/index.js';
import { CUES } from './cues.js';

/*
 * MẶT PHẲNG — mọi thứ có một chỗ cố định và nằm đó tới hết video.
 * Không phần tử nào đổi toạ độ; muốn xem gần thì LIA CAMERA tới nó. Đổi toạ độ là teleport, và teleport
 * chính là thứ làm bản dựng trước trông như slide.
 *
 *            y 120   câu văn gốc
 *            y 240   hàng "đếm tiếng" (cách đếm sai, câu 04)
 *            y 430   HÀNG TOKEN  ← vật liệu chính, không bao giờ nhúc nhích
 *            y 578   mã số dưới từng viên
 *            y 470→640  vòng cung chú ý (câu 06), dưới hàng token
 *            y 760   dãy số mọc ra từ dưới viên "␣trời"
 */
const S = (n) => CUES[n - 1].start;
const E = (n) => CUES[n - 1].end;

export const TOKENS = [
  { text: 'T', id: 51 }, { text: 'ôi', id: 23865 }, { text: '␣mang', id: 18033 },
  { text: '␣ô', id: 27598 }, { text: '␣vì', id: 60010 }, { text: '␣trời', id: 177808 },
];
const TEXTS = TOKENS.map((t) => t.text);
const TIENG = ['Tôi', 'mang', 'ô', 'vì', 'trời'];

export const ROW = { x: 250, y: 430, tokens: TEXTS, size: 52, padX: 28, gap: 20, maxW: 4000 };
const CELLS = tokenLayout(ROW);
const LAST = CELLS[CELLS.length - 1];
const SLOT = { x: LAST.x + LAST.w + 26, y: ROW.y, w: 170, h: LAST.h };
const VEC = [0.8, -0.35, 0.15, 0.62, -0.9, 0.4, 0.25, -0.55];
const VEC_X = LAST.cx - (8 * 62 + 7 * 5) / 2;

/* Ô trống nhìn về từng viên phía trước — trọng số minh hoạ cho hình, lời đọc không đưa số nào. */
const LOOKS = [
  { from: 0, to: 0, w: 0.2 }, { from: 0, to: 1, w: 0.25 }, { from: 0, to: 2, w: 0.45 },
  { from: 0, to: 3, w: 0.3 }, { from: 0, to: 4, w: 0.5 }, { from: 0, to: 5, w: 0.85 },
];

/*
 * CAMERA — mỗi câu một chỗ nhìn. Lia khi lời đọc chuyển ý, không lia giữa một ý.
 * w nhỏ = xem gần. Câu 02 zoom vào hai ô "T" + "ôi"; câu 06 lùi ra xem cả cung chú ý.
 */
export const CAMERA = [
  { at: 0, w: 1500, x: 900, y: 240, dur: 0 },
  { at: S(1), w: 1820, x: 900, y: 380, dur: 46 },
  { at: S(2) + 40, w: 620, x: 400, y: 470, dur: 50 },
  { at: S(3), w: 1820, x: 900, y: 420, dur: 50 },
  { at: S(4), w: 1980, x: 900, y: 350, dur: 50 },
  { at: S(5), w: 1620, x: 860, y: 570, dur: 50 },
  { at: S(6) + 20, w: 2280, x: 900, y: 520, dur: 56 },
];

export default function CanvasLayer({ frame }) {
  // câu 01 — câu văn chia dần thành sáu viên
  const grow = linearProgress(frame, S(1) + 20, E(1) - 10) * 6;
  // câu 02 — "Tôi" = T + ôi
  const splitHi = frame < S(2) + 30 ? -1 : frame < S(2) + 140 ? 0 : frame < E(2) ? 1 : -1;
  // câu 04 — hàng đếm tiếng
  const tieng = appear(frame, S(4) + 10);
  // câu 05 — mã số rồi dãy số
  const ids = linearProgress(frame, S(5) + 8, S(5) + 130) * 6;
  const vec = linearProgress(frame, S(5) + 110, E(5) + 20);
  // câu 06 — ô trống nhìn về phía sau
  const slot = appear(frame, S(6) - 6);
  const look = linearProgress(frame, S(6) + 30, E(6) - 20);

  return (
    <Canvas frame={frame} camera={CAMERA}>
      <SvgText x={900} y={140} size={46} weight={600} color={C.textMuted} opacity={1 - appear(frame, S(4) - 20, 20) * 0.65}>
        Tôi mang ô vì trời…
      </SvgText>

      {tieng > 0.01 ? (
        <g opacity={tieng}>
          <TokenRow x={ROW.x} y={250} tokens={TIENG} size={48} padX={26} gap={20} maxW={4000} color={C.textMuted} />
          <SvgText x={1560} y={308} size={36} weight={700} anchor="start" color={C.textMuted}>đếm tiếng: 5</SvgText>
          <SvgText x={1560} y={492} size={36} weight={700} anchor="start" color={C.red} opacity={appear(frame, S(4) + 90)}>token thật: 6</SvgText>
        </g>
      ) : null}

      <TokenRow {...ROW} shown={Math.min(6, Math.floor(grow) + (grow > 0 ? 1 : 0))} highlight={splitHi} />

      <SvgText x={ROW.x} y={396} size={24} weight={700} anchor="start" color={C.textMuted} opacity={appear(frame, S(3) + 60)}>
        BỘ TÁCH: GPT-5
      </SvgText>
      {splitHi >= 0 ? (
        <SvgText x={400} y={352} size={34} weight={700} color={C.red} opacity={appear(frame, S(2) + 34)}>
          một từ, hai mảnh
        </SvgText>
      ) : null}

      {CELLS.map((c, i) => {
        const on = i < Math.floor(ids) ? 1 : i === Math.floor(ids) ? ids % 1 : 0;
        if (on <= 0.01) return null;
        return (
          <SvgText key={i} x={c.cx} y={578} size={30} weight={700} color={C.accentStrong} opacity={on}>
            {String(TOKENS[i].id)}
          </SvgText>
        );
      })}

      {vec > 0.01 ? (
        <VectorStrip x={VEC_X} y={760} values={VEC} cell={62} h={72} gap={5} label="một dãy số" reveal={vec} opacity={vec} />
      ) : null}

      {slot > 0.01 ? (
        <g opacity={slot}>
          <rect x={SLOT.x} y={SLOT.y} width={SLOT.w} height={SLOT.h} rx={8} fill={C.bgAlt} stroke={C.red} strokeWidth={3} strokeDasharray="12 10" />
          <SvgText x={SLOT.x + SLOT.w / 2} y={SLOT.y + SLOT.h / 2 + 18} size={48} weight={700} color={C.red}>?</SvgText>
        </g>
      ) : null}
      {look > 0.001 ? (
        <AttentionLines
          // neo đặt DƯỚI hàng mã số, nếu không cung sẽ cắt ngang mấy con số
          from={[{ x: SLOT.x + SLOT.w / 2, y: 612 }]}
          to={CELLS.map((c) => ({ x: c.cx, y: 612 }))}
          links={LOOKS} dip={200} maxWidth={11} reveal={look}
        />
      ) : null}
    </Canvas>
  );
}

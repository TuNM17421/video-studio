import React from 'react';
import {
  AttentionLines, Canvas, Card, Flow, ProbabilityBars, SvgText, TokenRow, VectorStrip, tokenLayout,
} from '../../../../components/index.js';
import { C, appear, interpolate, CLAMP, linearProgress, pulse } from '../../../../lib/index.js';
import { CUES } from './cues.js';

/*
 * MẶT PHẲNG của N1-03 — một mặt phẳng cho cả video, camera đi trên nó (styles/illustrated.md).
 *
 * Luật số một: KHÔNG phần tử nào đổi toạ độ. Muốn xem gần thì lia camera tới nó. Bản dựng trước ra
 * giống slide đúng vì tôi làm ngược: giữ camera, dời vật.
 *
 *   ── băng trên (y −330 … −130) ── phần khung: cỗ máy (câu 02, 23) · tạo câu ≠ kiểm chứng (câu 04)
 *   ── băng giữa (y 120 … 880) ──── câu văn, hàng token, mã số, dãy số, cung chú ý
 *   ── băng dưới (y 1000 … 1230) ── điều kiện dừng (câu 24)
 *   ── bên phải (x 1650 … 3200) ─── bảng khả năng, quy tắc chọn, "mưa" hai mảnh, bảng bước sau
 *
 * Câu mọc dần sang phải: hàng token thêm viên ␣m ở câu 20 và ở nguyên đó tới hết.
 */
const S = (n) => CUES[n - 1].start;
const E = (n) => CUES[n - 1].end;

export const TOKENS = [
  { text: 'T', id: 51 }, { text: 'ôi', id: 23865 }, { text: '␣mang', id: 18033 },
  { text: '␣ô', id: 27598 }, { text: '␣vì', id: 60010 }, { text: '␣trời', id: 177808 },
];
export const MUA = [{ text: '␣m', id: 284 }, { text: 'ưa', id: 43653 }];
const TIENG = ['Tôi', 'mang', 'ô', 'vì', 'trời'];

/* Hàng token: một toạ độ gốc, tám ô (sáu ô đầu + ␣m ở câu 20; ô thứ tám chỉ dùng để tính chỗ). */
export const ROW = {
  x: 250, y: 430, size: 52, padX: 28, gap: 20, maxW: 9000,
  tokens: TOKENS.concat(MUA).map((t) => t.text),
};
const CELLS = tokenLayout(ROW);
const H = CELLS[0].h;
const SIX = CELLS[5]; // ␣trời
const ADDED = CELLS[6]; // ␣m — ô trống của câu 11 nằm đúng chỗ này
const ROW_R = SIX.x + SIX.w;

const IDS_Y = 578;
const ARC_Y = 612;
const VEC = [0.8, -0.35, 0.15, 0.62, -0.9, 0.4, 0.25, -0.55];
const VEC_X = SIX.cx - (8 * 62 + 7 * 5) / 2;

const MACHINE = [
  { x: 250, y: -330, w: 380, h: 190, lines: ['Phần câu đã có'], step: 'DỰ ĐOÁN' },
  { x: 720, y: -330, w: 380, h: 190, lines: ['Mô hình'], step: 'CHỌN' },
  { x: 1190, y: -330, w: 380, h: 190, lines: ['Mảnh tiếp theo'], step: 'NỐI' },
];
const BARS = { x: 2050, y: 600, max: 100, barW: 460, barH: 42, rowGap: 74, labelW: 160, size: 30, showValues: true };
const ITEMS = [
  { label: 'mưa', value: 60, highlight: true }, { label: 'nắng', value: 20 },
  { label: 'lạnh', value: 10 }, { label: 'khác', value: 10 },
];
const EMPTY = ITEMS.map(() => ({ label: '', value: 0 }));
const BARS_R = BARS.x + BARS.labelW + BARS.barW + 130;
const ROW_Y = (i) => BARS.y + i * BARS.rowGap + BARS.barH / 2;

const LOOKS = [
  { from: 0, to: 0, w: 0.2 }, { from: 0, to: 1, w: 0.25 }, { from: 0, to: 2, w: 0.45 },
  { from: 0, to: 3, w: 0.3 }, { from: 0, to: 4, w: 0.5 }, { from: 0, to: 5, w: 0.85 },
];

/* CAMERA — một chỗ nhìn cho mỗi câu. Lia lúc lời đọc chuyển ý, không lia giữa một ý. */
export const CAMERA = [
  { at: 0, w: 1500, x: 760, y: 150, dur: 0 },
  { at: S(2), w: 1700, x: 910, y: -230, dur: 46 },
  { at: S(3), w: 1500, x: 760, y: 160, dur: 46 },
  { at: S(4), w: 1500, x: 2700, y: -230, dur: 46 },
  { at: S(5), w: 1760, x: 760, y: 420, dur: 50 },
  { at: S(6) + 40, w: 660, x: 400, y: 440, dur: 52 },
  { at: S(7), w: 1760, x: 760, y: 410, dur: 52 },
  { at: S(8), w: 2160, x: 960, y: 350, dur: 50 },
  { at: S(9), w: 1700, x: 800, y: 600, dur: 50 },
  { at: S(10), w: 2060, x: 820, y: 580, dur: 50 },
  { at: S(11), w: 1760, x: 880, y: 450, dur: 50 },
  { at: S(12), w: 1560, x: 2430, y: 700, dur: 54 },
  { at: S(16), w: 1460, x: 3240, y: 430, dur: 54 },
  { at: S(17), w: 1820, x: 2420, y: 600, dur: 54 },
  { at: S(18), w: 1660, x: 2480, y: 700, dur: 50 },
  { at: S(20), w: 2700, x: 1480, y: 645, dur: 56 },
  { at: S(21), w: 1760, x: 900, y: 450, dur: 50 },
  { at: S(22), w: 2300, x: 2880, y: 720, dur: 54 },
  { at: S(23), w: 2120, x: 840, y: 72, dur: 58 },
  { at: S(24), w: 1560, x: 2480, y: 1110, dur: 56 },
  { at: S(25), w: 1760, x: 900, y: 505, dur: 54 },
];

/* Cụm nào phải đọc được trong khoảng nào — tools/verify.mjs soát bằng checkCanvas. */
export const ZONES = [
  { id: 'câu văn gốc', x0: 300, y0: 96, x1: 1210, y1: 166, from: S(1) + 40, to: S(2) },
  { id: 'cỗ máy', x0: 250, y0: -340, x1: 1570, y1: -60, from: S(2) + 60, to: E(2) },
  { id: 'câu văn + ô trống', x0: 300, y0: 96, x1: 1240, y1: 200, from: S(3) + 50, to: E(3) },
  { id: 'tạo câu ≠ kiểm chứng', x0: 2120, y0: -340, x1: 3290, y1: -60, from: S(4) + 55, to: E(4) },
  { id: 'hàng token', x0: ROW.x, y0: ROW.y, x1: ROW_R, y1: ROW.y + H, from: S(5) + 60, to: S(6) + 30 },
  { id: 'hai ô T + ôi', x0: CELLS[0].x, y0: 348, x1: CELLS[1].x + CELLS[1].w, y1: ROW.y + H, from: S(6) + 100, to: E(6) },
  { id: 'hàng token + bộ tách', x0: ROW.x, y0: 376, x1: ROW_R, y1: ROW.y + H, from: S(7) + 60, to: E(7) },
  { id: 'hai hàng so nhau', x0: ROW.x, y0: 210, x1: 1920, y1: ROW.y + H, from: S(8) + 60, to: E(8) },
  { id: 'mã số + dãy số', x0: ROW.x, y0: ROW.y, x1: ROW_R, y1: 900, from: S(9) + 150, to: E(9) },
  { id: 'cung chú ý', x0: ROW.x, y0: ROW.y, x1: ADDED.x + ADDED.w, y1: 880, from: S(10) + 80, to: E(10) },
  { id: 'ô trống cuối câu', x0: ROW.x, y0: ROW.y, x1: ADDED.x + ADDED.w, y1: ROW.y + H, from: S(11) + 60, to: E(11) },
  { id: 'bảng khả năng', x0: BARS.x - 20, y0: 540, x1: BARS_R, y1: 940, from: S(12) + 60, to: E(15) },
  { id: 'mưa hai mảnh', x0: 2870, y0: 300, x1: 3600, y1: 570, from: S(16) + 60, to: E(16) },
  { id: 'quy tắc chọn + bảng', x0: BARS.x - 20, y0: 380, x1: BARS_R, y1: 940, from: S(17) + 60, to: E(17) },
  { id: 'bảng + kim chọn', x0: BARS.x - 20, y0: 540, x1: BARS_R + 330, y1: 940, from: S(18) + 60, to: E(19) },
  { id: 'câu dài thêm', x0: ROW.x, y0: ROW.y, x1: BARS_R, y1: 940, from: S(20) + 70, to: E(20) },
  { id: 'viên vừa nối', x0: ROW.x, y0: ROW.y, x1: ADDED.x + ADDED.w, y1: ROW.y + H, from: S(21) + 60, to: E(21) },
  { id: 'bảng bước sau', x0: 2870, y0: 560, x1: 3600, y1: 940, from: S(22) + 60, to: E(22) },
  { id: 'vòng lặp', x0: 250, y0: -392, x1: 1570, y1: ROW.y + H, from: S(23) + 70, to: E(23) },
  { id: 'điều kiện dừng', x0: 2120, y0: 1000, x1: 2840, y1: 1210, from: S(24) + 66, to: E(24) },
  { id: 'câu bị cắt', x0: ROW.x, y0: ROW.y - 96, x1: ADDED.x + ADDED.w + 260, y1: ROW.y + H + 40, from: S(25) + 64, to: E(25) },
];

export default function CanvasLayer({ frame }) {
  const typed = linearProgress(frame, S(1) + 15, S(1) + 150);
  const sentence = 'Tôi mang ô vì trời…'.slice(0, Math.max(1, Math.round(typed * 19)));
  const blank = appear(frame, S(3) + 30) * (1 - appear(frame, S(5) + 10, 20));
  const grow = linearProgress(frame, S(5) + 20, E(5) - 10) * 6;
  const shown6 = Math.min(6, Math.floor(grow) + (grow > 0 ? 1 : 0));
  const splitHi = frame < S(6) + 40 ? -1 : frame < S(6) + 150 ? 0 : frame < E(6) ? 1 : -1;
  const tieng = appear(frame, S(8) + 10) * (1 - appear(frame, S(12) - 30, 30));
  const ids = linearProgress(frame, S(9) + 10, S(9) + 130) * 6;
  const vec = linearProgress(frame, S(9) + 110, E(9));
  const slot = appear(frame, S(11) - 10);
  const look = linearProgress(frame, S(10) + 30, E(10) - 20);
  const bars = linearProgress(frame, S(12) + 20, S(12) + 130);
  const add = linearProgress(frame, S(20) + 30, S(20) + 110);
  const after = frame >= S(20) + 70;
  const hiAdded = frame >= S(21) && frame < E(21) ? 6 : add > 0.5 && frame < E(20) ? 6 : -1;
  const pick18 = appear(frame, S(18) + 36);
  const t19 = interpolate(frame, [S(19) + 30, S(19) + 100], [0, 1], CLAMP);
  const land19 = appear(frame, S(19) + 100);
  const cut = appear(frame, S(25) + 40);

  return (
    <Canvas frame={frame} camera={CAMERA}>
      {/* ── băng trên: cỗ máy (câu 02, nhắc lại ở câu 23) ── */}
      {MACHINE.map((m, i) => (
        <Card key={i} x={m.x} y={m.y} w={m.w} h={m.h} lines={m.lines} size={30}
          accent={i === 2 ? C.red : undefined} opacity={appear(frame, S(2) + 10 + i * 22)} />
      ))}
      <Flow points={[{ x: 630, y: -235 }, { x: 720, y: -235 }]} frame={frame} start={S(2) + 46} end={S(2) + 64} />
      <Flow points={[{ x: 1100, y: -235 }, { x: 1190, y: -235 }]} frame={frame} start={S(2) + 68} end={S(2) + 86} color={C.red} />
      <Flow points={[{ x: 1380, y: -140 }, { x: 910, y: -60 }, { x: 440, y: -140 }]} frame={frame} start={S(2) + 92} end={S(2) + 140} dashed />
      <SvgText x={910} y={-26} size={28} weight={700} color={C.textMuted} opacity={appear(frame, S(2) + 120)}>rồi lặp lại</SvgText>
      {MACHINE.map((m, i) => (
        <SvgText key={`st${i}`} x={m.x + m.w / 2} y={m.y - 24} size={26} weight={700} color={C.red}
          letterSpacing={1.4} opacity={appear(frame, S(23) + 20 + i * 24)}>{m.step}</SvgText>
      ))}

      {/* ── băng trên phải: tạo câu ≠ kiểm chứng (câu 04) ── */}
      <Card x={2120} y={-330} w={520} h={190} label="VIỆC CỦA MÔ HÌNH" lines={['Tạo câu nghe hợp lý']} size={30} opacity={appear(frame, S(4) + 14)} />
      <Card x={2770} y={-330} w={520} h={190} label="VIỆC CÒN LẠI" lines={['Kiểm chứng đúng sai']} size={30} accent={C.red} opacity={appear(frame, S(4) + 52)} />

      {/* ── câu văn gốc ── */}
      <SvgText x={760} y={150} size={58} weight={600} color={C.textMuted} opacity={1 - appear(frame, S(8) - 20, 20) * 0.6}>
        {frame < S(3) ? sentence : 'Tôi mang ô vì trời'}
      </SvgText>
      {blank > 0.01 ? (
        <rect x={1096} y={96} width={150} height={74} rx={10} fill={C.bgAlt} stroke={C.red} strokeWidth={4}
          opacity={blank * (0.4 + 0.6 * pulse(frame, S(3) + 60, 44))} />
      ) : null}

      {/* ── hàng đếm tiếng (câu 08) ── */}
      {tieng > 0.01 ? (
        <g opacity={tieng}>
          <TokenRow x={ROW.x} y={250} tokens={TIENG} size={48} padX={26} gap={20} maxW={9000} color={C.textMuted} />
          <SvgText x={1580} y={308} size={34} weight={700} anchor="start" color={C.textMuted}>đếm tiếng: 5</SvgText>
          <SvgText x={1580} y={492} size={34} weight={700} anchor="start" color={C.red} opacity={appear(frame, S(8) + 90)}>token thật: 6</SvgText>
        </g>
      ) : null}

      {/* ── HÀNG TOKEN — vật liệu chính ── */}
      <TokenRow {...ROW} shown={after ? 6 : shown6} enter={after ? add : 1} highlight={splitHi >= 0 ? splitHi : hiAdded} />
      <SvgText x={ROW.x} y={396} size={24} weight={700} anchor="start" color={C.textMuted} opacity={appear(frame, S(7) + 50)}>
        BỘ TÁCH: GPT-5
      </SvgText>
      {splitHi >= 0 ? (
        <SvgText x={406} y={358} size={34} weight={700} color={C.red} opacity={appear(frame, S(6) + 44)}>một từ, hai mảnh</SvgText>
      ) : null}

      {CELLS.slice(0, 6).map((c, i) => {
        const on = i < Math.floor(ids) ? 1 : i === Math.floor(ids) ? ids % 1 : 0;
        if (on <= 0.01) return null;
        return <SvgText key={i} x={c.cx} y={IDS_Y} size={30} weight={700} color={C.accentStrong} opacity={on}>{String(TOKENS[i].id)}</SvgText>;
      })}
      {vec > 0.01 ? <VectorStrip x={VEC_X} y={700} values={VEC} cell={62} h={72} gap={5} label="một dãy số" reveal={vec} opacity={vec} /> : null}

      {/* ── ô trống cuối câu + cung chú ý ── */}
      {slot > 0.01 && !after ? (
        <g opacity={slot}>
          <rect x={ADDED.x} y={ROW.y} width={ADDED.w} height={H} rx={8} fill={C.bgAlt} stroke={C.red} strokeWidth={3} strokeDasharray="12 10" />
          <SvgText x={ADDED.cx} y={ROW.y + H / 2 + 18} size={48} weight={700} color={C.red}>?</SvgText>
        </g>
      ) : null}
      {look > 0.001 && frame < E(10) ? (
        <AttentionLines
          from={[{ x: ADDED.cx, y: ARC_Y }]} to={CELLS.slice(0, 6).map((c) => ({ x: c.cx, y: ARC_Y }))}
          links={LOOKS} dip={200} maxWidth={11} reveal={look}
        />
      ) : null}
      {cut > 0.01 ? (
        <g opacity={cut}>
          <rect x={ADDED.x + ADDED.w + 16} y={ROW.y - 30} width={5} height={H + 60} fill={C.red} />
          <SvgText x={ADDED.x + ADDED.w + 150} y={ROW.y - 52} size={34} weight={700} color={C.red}>hết độ dài</SvgText>
        </g>
      ) : null}

      {/* ── bên phải: quy tắc chọn, bảng khả năng, kim chọn ── */}
      <Card x={BARS.x} y={390} w={620} h={130} label="SAU KHI CÓ BẢNG" lines={['Một quy tắc chọn']} size={30} accent={C.red} opacity={appear(frame, S(17) + 20)} />
      {bars > 0.001 ? (
        <ProbabilityBars {...BARS} items={ITEMS} title="Khả năng của mảnh nối tiếp" reveal={bars} />
      ) : null}
      {frame >= S(13) && frame < E(13) ? (
        <SvgText x={BARS.x + 100} y={968} size={28} weight={700} anchor="start" color={C.textMuted}>“khác” gom mọi cách nối còn lại</SvgText>
      ) : null}
      {frame >= S(14) && frame < E(15) ? (
        <SvgText x={BARS.x + 100} y={968} size={28} weight={700} anchor="start" color={C.red}>Tỷ lệ dựng cho dễ hình dung</SvgText>
      ) : null}
      {frame >= S(18) && frame < E(18) ? (
        <g opacity={pick18}>
          <SvgText x={BARS_R - 60} y={ROW_Y(0) + 12} size={38} weight={700} anchor="start" color={C.red}>◀</SvgText>
          <SvgText x={BARS_R} y={ROW_Y(0) + 12} size={28} weight={700} anchor="start" color={C.red}>luôn là mảnh này</SvgText>
        </g>
      ) : null}
      {frame >= S(19) && frame < E(19) ? (
        <g>
          <SvgText x={BARS_R - 60} y={interpolate(t19, [0, 1], [ROW_Y(0), ROW_Y(1)]) + 12} size={38} weight={700} anchor="start" color={C.red}>◀</SvgText>
          <SvgText x={BARS_R} y={ROW_Y(1) + 12} size={28} weight={700} anchor="start" color={C.red} opacity={land19}>mảnh ít khả năng vẫn có cửa</SvgText>
        </g>
      ) : null}

      {/* ── "mưa" tốn hai mảnh (câu 16) ── */}
      <SvgText x={3040} y={356} size={30} weight={700} color={C.textMuted} opacity={appear(frame, S(16) + 12)}>Trên thẻ ứng viên</SvgText>
      <TokenRow x={2920} y={390} tokens={['mưa']} size={56} padX={34} maxW={9000} color={C.textMuted} opacity={appear(frame, S(16) + 18)} />
      <SvgText x={3430} y={356} size={30} weight={700} color={C.red} opacity={appear(frame, S(16) + 64)}>Với mô hình</SvgText>
      <TokenRow x={3250} y={390} tokens={MUA.map((t) => t.text)} size={56} padX={34} maxW={9000} highlight={1} opacity={appear(frame, S(16) + 64)} />
      {MUA.map((t, i) => (
        <SvgText key={`m${i}`} x={3340 + i * 196} y={560} size={28} weight={700} color={C.accentStrong} opacity={appear(frame, S(16) + 92 + i * 14)}>
          {String(t.id)}
        </SvgText>
      ))}

      {/* ── bảng của bước sau: để trống (câu 22) ── */}
      {frame >= S(22) - 20 ? (
        <g opacity={appear(frame, S(22) + 10)}>
          <ProbabilityBars {...BARS} x={2920} y={600} items={EMPTY} title="Bảng của bước sau" showValues={false} reveal={1} />
          <SvgText x={3240} y={790} size={68} weight={700} color={C.red} opacity={appear(frame, S(22) + 70)}>?</SvgText>
        </g>
      ) : null}

      {/* ── điều kiện dừng (câu 24) ── */}
      <Card x={2120} y={1000} w={340} h={210} label="CÁCH MỘT" lines={['Có tín hiệu', 'kết thúc']} size={30} opacity={appear(frame, S(24) + 16)} />
      <Card x={2500} y={1000} w={340} h={210} label="CÁCH HAI" lines={['Chạm mức', 'độ dài cho phép']} size={30} accent={C.red} opacity={appear(frame, S(24) + 58)} />
    </Canvas>
  );
}

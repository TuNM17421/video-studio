import React from 'react';
import { Axes, Layer, MorphSequence, SvgText, shapes } from '../../../../components/index.js';
import { C, appear, clamp01, interpolate, CLAMP, linearProgress } from '../../../../lib/index.js';
import { CUES } from './cues.js';

/*
 * THỬ BIẾN HÌNH — bản viết lại bằng bộ khung `components/morph/`.
 *
 * Bản đầu tự viết path mũi tên, tự quản `t`, tự đặt opacity: 170 dòng. Bản này khai hai vật, mỗi vật một
 * danh sách trạng thái, còn lại là việc của MorphSequence. Đó là kiểm nghiệm cho chính bộ khung: nếu nó
 * không rút ngắn được file này thì nó chưa phải khung dựng, chỉ là một lớp bọc.
 *
 * Ba thứ mượn từ 3Blue1Brown, không thứ nào cần màu mới:
 *   · một vật biến hình liên tục, không cắt cảnh — MorphSequence;
 *   · thang đậm nhạt 100 / 40 / 15 — Layer;
 *   · nhịp chậm — mỗi chặng năm giây, biến hình chiếm gần hết chặng.
 *
 * Số trong clip là số minh hoạ cho phép thử kỹ thuật, không phải nội dung bài học nào.
 */
const S = (n) => CUES[n - 1].start;
const E = (n) => CUES[n - 1].end;

const O = { x: 960, y: 700 };
const V1 = [0.82, -0.3, 0.16, 0.6, -0.9, 0.42, 0.24, -0.55];
const V2 = [0.7, -0.15, 0.3, 0.52, -0.78, 0.5, 0.1, -0.4];
const CELL = { size: 74, gap: 6, h: 92 };

const STRIP1 = { x: 960 - (8 * CELL.size + 7 * CELL.gap) / 2, y: 330, n: 8, ...CELL };
const STRIP2 = { x: 1320, y: 300, n: 8, ...CELL };
const TIP1 = { x: O.x + 330, y: O.y - 250 };
const TIP2_FAR = { x: O.x + 385, y: O.y - 60 };
const TIP2_NEAR = { x: O.x + 352, y: O.y - 196 };

const cellFill = (v) => (v < 0 ? C.red : C.accent);
const cellAlpha = (v) => 0.12 + 0.88 * clamp01(Math.abs(v));

/** Các ô giá trị của một dải — mờ đi khi khung bao của nó bắt đầu biến hình. */
function Cells({ strip, values, reveal = 1 }) {
  return values.map((v, i) => {
    const on = clamp01(reveal * values.length - i);
    if (on <= 0.001) return null;
    return (
      <path key={i} d={shapes.cell({ x: strip.x, y: strip.y, i, ...CELL, r: 5 })}
        fill={cellFill(v)} fillOpacity={cellAlpha(v)} opacity={on} />
    );
  });
}

/** Một viên token — nguồn của dải số. */
function TokenCell({ x, y, text, size = 44 }) {
  const w = text.length * size * 0.62 + 52;
  return (
    <g>
      <path d={shapes.rect({ x, y, w, h: size * 2, r: 8 })} fill={C.bgAlt} stroke={C.accent} strokeWidth={2} />
      <SvgText x={x + w / 2} y={y + size * 1.2} size={size} weight={600} color={C.text}>{text}</SvgText>
    </g>
  );
}

export default function MorphLayer({ frame }) {
  const grow1 = linearProgress(frame, S(1) + 20, S(1) + 110);
  const grow2 = linearProgress(frame, S(3) + 8, S(3) + 60);
  const cellsOut1 = appear(frame, S(2) + 6, 34);
  const cellsOut2 = appear(frame, S(3) + 52, 30);
  const arc = appear(frame, S(4) + 16, 34);
  const close = interpolate(frame, [S(4) + 70, E(4) - 26], [0, 1], CLAMP);

  const tip2 = {
    x: interpolate(close, [0, 1], [TIP2_FAR.x, TIP2_NEAR.x]),
    y: interpolate(close, [0, 1], [TIP2_FAR.y, TIP2_NEAR.y]),
  };

  // cung góc giữa hai mũi tên
  const ang = (p) => Math.atan2(p.y - O.y, p.x - O.x);
  const a1 = ang(TIP1);
  const a2 = ang(tip2);
  const R = 150;
  const arcD = `M ${O.x + Math.cos(a2) * R} ${O.y + Math.sin(a2) * R} A ${R} ${R} 0 0 1 ${O.x + Math.cos(a1) * R} ${O.y + Math.sin(a1) * R}`;

  return (
    <g>
      <Layer level="frame" fade={appear(frame, S(2) + 20, 40)}>
        <Axes o={O} x={400} yUp={400} yDown={170} />
      </Layer>

      <Layer level="context" fade={appear(frame, S(1) + 4) * (1 - appear(frame, S(3), 30) * 0.6)}>
        <TokenCell x={STRIP1.x + (STRIP1.n * CELL.size + (STRIP1.n - 1) * CELL.gap) / 2 - 92} y={180} text="␣trời" />
      </Layer>

      <Layer level="main" fade={1 - cellsOut1}>
        <Cells strip={STRIP1} values={V1} reveal={grow1} />
        {frame < S(2) ? (
          <SvgText x={960} y={STRIP1.y + CELL.h + 46} size={28} weight={600} color={C.textMuted}>
            tám chiều, mỗi chiều một con số
          </SvgText>
        ) : null}
      </Layer>
      <Layer level="context" fade={1 - cellsOut2}>
        <Cells strip={STRIP2} values={V2} reveal={grow2} />
      </Layer>

      {/* VẬT MỘT — khung bao dải số, rồi thành mũi tên. Một vật, hai trạng thái. */}
      <MorphSequence
        frame={frame} opacity={appear(frame, S(1) + 16)}
        states={[
          { at: 0, shape: shapes.strip(STRIP1), fill: C.accent, fillOpacity: 0.1, stroke: C.accentStrong, strokeWidth: 3 },
          { at: S(2) + 10, dur: E(2) - S(2) - 34, shape: shapes.arrow({ from: O, to: TIP1 }), fillOpacity: 0.92, strokeWidth: 0 },
        ]}
      />

      {/* VẬT HAI — cùng chuyện, và ở chặng cuối nó quay lại gần vật một. */}
      <MorphSequence
        frame={frame} opacity={appear(frame, S(3) + 4)}
        states={[
          { at: 0, shape: shapes.strip(STRIP2), fill: C.red, fillOpacity: 0.1, stroke: C.red, strokeWidth: 3 },
          { at: S(3) + 55, dur: E(3) - S(3) - 65, shape: shapes.arrow({ from: O, to: TIP2_FAR, width: 11, head: 30 }), fillOpacity: 0.8, strokeWidth: 0 },
          { at: S(4) + 70, dur: E(4) - S(4) - 96, shape: shapes.arrow({ from: O, to: TIP2_NEAR, width: 11, head: 30 }) },
        ]}
      />

      {arc > 0.01 ? (
        <g opacity={arc}>
          <path d={arcD} fill="none" stroke={C.text} strokeWidth={4} />
          <SvgText x={O.x + Math.cos((a1 + a2) / 2) * (R + 54)} y={O.y + Math.sin((a1 + a2) / 2) * (R + 54) + 12}
            size={36} weight={700} color={C.text}>góc</SvgText>
        </g>
      ) : null}

      <SvgText x={O.x} y={980} size={38} weight={700} color={C.text}
        opacity={appear(frame, S(2) + 60) * (1 - appear(frame, S(3), 24))}>
        cùng một thứ, nhìn như một mũi tên
      </SvgText>
      <SvgText x={O.x} y={980} size={38} weight={700} color={C.text} opacity={appear(frame, S(4) + 100)}>
        gần nghĩa thì góc nhỏ
      </SvgText>
      <Layer level="context" fade={appear(frame, S(2) + 80)}>
        <SvgText x={TIP1.x + 40} y={TIP1.y - 10} size={30} weight={700} anchor="start" color={C.accentStrong}>␣trời</SvgText>
      </Layer>
      <Layer level="context" fade={appear(frame, S(3) + 96)}>
        <SvgText x={tip2.x + 40} y={tip2.y + 4} size={30} weight={700} anchor="start" color={C.red}>␣nắng</SvgText>
      </Layer>
    </g>
  );
}

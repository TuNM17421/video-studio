import React from 'react';
import { Bracket, Card, Flow, SceneFrame, SvgText, TokenChip } from '../../../components/index.js';
import { C, CLAMP, EASE, anchor, appear, clamp01, interpolate, pulse, useFrame } from '../../../lib/index.js';

export const meta = {
  id: 'next-token',
  title: 'Token vừa chọn trở thành ngữ cảnh mới',
  pattern: 'Token · phân bố · vòng lặp',
  duration: 480,
};

/*
 * Day01 V03 style (video-03-next-token): prefix → model → distribution → sampled token
 * appended → the longer prefix loops back → the distribution reshapes continuously.
 */
const T = {
  chips: [6, 12, 18],
  bracket: 30,
  note: 40,
  model: 48,
  prefixFlow: [60, 100], // prefix → model (model pulses once)
  bars: 104, // distribution panel is visible before the flow reaches it
  barsFlow: [108, 156],
  reveal: 156, // bars grow 50 f
  sample: 226, // "mưa" highlighted + empty slot for the next token
  sampleFlow: [236, 290], // sampled token → new chip (chip pulses once)
  sampleFade: 300, // the sampling path recedes before the loop uses its own lane
  extend: [306, 330], // bracket grows to cover four chips
  loopFlow: [334, 380], // new prefix → model (model pulses once)
  reshape: [384, 424], // values move continuously to the next distribution
  weights: 410,
};

const CAPTIONS = [
  { start: 0, end: 100, text: 'Mô hình nhận phần văn bản đã có, gọi là tiền tố.' },
  { start: 100, end: 226, text: 'Từ tiền tố, mô hình tính một phân bố cho token kế tiếp.' },
  { start: 226, end: 306, text: 'Lấy mẫu theo phân bố có thể chọn “mưa”, dù “nắng” cao hơn.' },
  { start: 306, end: 384, text: 'Token vừa chọn được nối vào, thành tiền tố mới.' },
  { start: 384, end: 480, text: 'Ở bước sau, phân bố đổi theo ngữ cảnh mới; trọng số vẫn giữ nguyên.' },
];

/* Fixed geometry (Day01 V03 grid): chips at x = 180 + i·200. */
const CHIP_Y = 290;
const chipX = (i) => 180 + i * 200;
const NEW_CHIP = { x: chipX(3), y: CHIP_Y, w: 170, h: 80 };
const BRACKET_Y = 384;
const CAPTION_Y = 436;
const GROUP_BOTTOM = 452; // chips + bracket + caption: connectors leave below this line
const MODEL = { x: 280, y: 520, w: 340, h: 210 };
const BARS = { x: 1050, y: 500, labelW: 155, barW: 360, barH: 43, rowGap: 76, size: 30, max: 50 };
const rowMid = (i) => BARS.y + i * BARS.rowGap + BARS.barH / 2;
/* Particle halo (r 13) + a 5 px active stroke + antialiasing: the point hides this close to a card. */
const CLEAR = 20;

const modelTop = anchor(MODEL, 'top');
const modelRight = anchor(MODEL, 'right');
const PREFIX_PATH = [{ x: modelTop.x, y: GROUP_BOTTOM }, modelTop];
const BARS_PATH = [modelRight, { x: BARS.x - 40, y: modelRight.y }];
/* Two separate lanes right of the chips: sampling comes in high, the loop leaves low. */
const SAMPLE_LANE_X = 1000;
const LOOP_LANE_X = 975;
const LOOP_RETURN_Y = 474;
const SAMPLE_PATH = [
  { x: BARS.x - 14, y: rowMid(1) },
  { x: SAMPLE_LANE_X, y: rowMid(1) },
  { x: SAMPLE_LANE_X, y: NEW_CHIP.y + 25 },
  { x: NEW_CHIP.x + NEW_CHIP.w, y: NEW_CHIP.y + 25 },
];
const LOOP_PATH = [
  { x: NEW_CHIP.x + NEW_CHIP.w, y: NEW_CHIP.y + 62 },
  { x: LOOP_LANE_X, y: NEW_CHIP.y + 62 },
  { x: LOOP_LANE_X, y: LOOP_RETURN_Y },
  { x: 560, y: LOOP_RETURN_Y },
  { x: 560, y: MODEL.y },
];

const FROM = [
  { label: 'nắng', value: 50 },
  { label: 'mưa', value: 30 },
  { label: 'đẹp', value: 10 },
  { label: 'khác', value: 10 },
];
const TO = [
  { label: 'nhẹ', value: 40 },
  { label: 'to', value: 30 },
  { label: 'dấu câu', value: 20 },
  { label: 'khác', value: 10 },
];
const SAMPLED = 1;

/* Two different strings never share a position at partial opacity: the old one leaves, then the new one arrives. */
const swapOut = (frame, at, span = 10) => interpolate(frame, [at, at + span], [1, 0], CLAMP);
const swapIn = (frame, at, span = 10) => interpolate(frame, [at + span, at + 2 * span], [0, 1], CLAMP);

function Model({ frame }) {
  const opacity = appear(frame, T.model);
  if (opacity <= 0.001) return null;
  const activity = Math.min(1, pulse(frame, T.prefixFlow[1]) + pulse(frame, T.loopFlow[1]));
  const cx = MODEL.x + MODEL.w / 2;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <Card {...MODEL} lines={[]} active={activity} />
      <SvgText x={cx} y={MODEL.y + 68} size={40} weight={700}>
        MÔ HÌNH
      </SvgText>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={MODEL.x + 44 + i * 53}
          y={MODEL.y + 110}
          width={30}
          height={45 + (i % 2) * 12}
          rx={5}
          fill={i === 2 && activity > 0.3 ? C.red : C.accent}
          opacity={0.2 + activity * 0.65}
        />
      ))}
      <SvgText x={cx} y={MODEL.y + MODEL.h + 40} size={24} weight={600} color={C.textMuted} opacity={appear(frame, T.weights)}>
        Trọng số giữ nguyên
      </SvgText>
    </g>
  );
}

/*
 * Local helper: ProbabilityBars' default geometry (label 155 · bar 360×43 · gap 76 · 30 px) plus
 * what the component does not offer — per-row label swaps and a fading red highlight.
 * Bar width and the % label always come from the same continuous value.
 */
function ReshapingBars({ frame }) {
  const opacity = appear(frame, T.bars);
  if (opacity <= 0.001) return null;
  const reveal = appear(frame, T.reveal, 50);
  const mix = interpolate(frame, T.reshape, [0, 1], { ...CLAMP, easing: EASE.inOut });
  const labelOut = swapOut(frame, T.reshape[0] + 2);
  const labelIn = swapIn(frame, T.reshape[0] + 2);
  const hot = appear(frame, T.sample, 14) * (1 - appear(frame, T.loopFlow[0], 14));
  const valueOpacity = clamp01((reveal - 0.6) / 0.4);
  const { x, y, labelW, barW, barH, rowGap, size, max } = BARS;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <SvgText x={x} y={y - 26} size={26} weight={600} anchor="start">
        Phân bố cho token kế tiếp
      </SvgText>
      {FROM.map((from, i) => {
        const to = TO[i];
        const value = from.value + (to.value - from.value) * mix;
        const top = y + i * rowGap;
        const base = top + barH / 2 + size * 0.35;
        const bw = barW * clamp01(value / max) * reveal;
        const h = i === SAMPLED ? hot : 0;
        const same = from.label === to.label;
        const valueText = `${Math.round(value)}%`;
        return (
          <g key={i}>
            <SvgText x={x} y={base} size={size} weight={600} anchor="start" opacity={(same ? 1 : labelOut) * (1 - h)}>
              {from.label}
            </SvgText>
            <SvgText x={x} y={base} size={size} weight={700} anchor="start" color={C.red} opacity={h}>
              {from.label}
            </SvgText>
            {!same ? (
              <SvgText x={x} y={base} size={size} weight={600} anchor="start" opacity={labelIn}>
                {to.label}
              </SvgText>
            ) : null}
            <rect x={x + labelW} y={top} width={barW} height={barH} rx={5} fill={C.bgAlt} />
            {bw > 0.5 ? <rect x={x + labelW} y={top} width={bw} height={barH} rx={5} fill={C.accent} /> : null}
            {bw > 0.5 && h > 0.001 ? <rect x={x + labelW} y={top} width={bw} height={barH} rx={5} fill={C.red} opacity={h} /> : null}
            <SvgText x={x + labelW + barW + 22} y={base} size={size} weight={700} anchor="start" opacity={valueOpacity * (1 - h)}>
              {valueText}
            </SvgText>
            <SvgText x={x + labelW + barW + 22} y={base} size={size} weight={700} anchor="start" color={C.red} opacity={valueOpacity * h}>
              {valueText}
            </SvgText>
          </g>
        );
      })}
      <SvgText x={x + labelW} y={y + FROM.length * rowGap + 16} size={24} weight={600} anchor="start" color={C.textMuted} opacity={valueOpacity}>
        Tổng 100% · “khác” là một nhóm
      </SvgText>
    </g>
  );
}

export default function NextToken() {
  const frame = useFrame();
  const arrived = frame >= T.sampleFlow[1];
  const groupOpacity = appear(frame, T.bracket);
  const bracketW = interpolate(frame, T.extend, [NEW_CHIP.x - chipX(0) - 30, NEW_CHIP.x + NEW_CHIP.w - chipX(0)], {
    ...CLAMP,
    easing: EASE.inOut,
  });
  const captionOut = swapOut(frame, T.extend[0], 9);
  const captionIn = swapIn(frame, T.extend[0], 9);

  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 01 · NỀN TẢNG AI & LLM"
      title={meta.title}
      tag="MINH HỌA"
      footer={{ left: '04 / 06 · LLM viết tiếp một câu như thế nào?' }}
      captions={CAPTIONS}
    >
      {['Hôm', 'nay', 'trời'].map((text, i) => (
        <TokenChip key={text} x={chipX(i)} y={CHIP_Y} text={text} opacity={appear(frame, T.chips[i])} />
      ))}
      <TokenChip
        x={NEW_CHIP.x}
        y={NEW_CHIP.y}
        w={NEW_CHIP.w}
        h={NEW_CHIP.h}
        text={arrived ? 'mưa' : '?'}
        selected={arrived}
        dashed={!arrived}
        muted={!arrived}
        active={pulse(frame, T.sampleFlow[1])}
        opacity={appear(frame, T.sample, 18)}
      />
      <Bracket x={chipX(0)} y={BRACKET_Y} w={bracketW} h={16} opacity={groupOpacity} />
      <SvgText x={chipX(0)} y={CAPTION_Y} size={26} weight={600} anchor="start" color={C.textMuted} opacity={groupOpacity * captionOut}>
        Tiền tố · phần văn bản đã có
      </SvgText>
      <SvgText x={chipX(0)} y={CAPTION_Y} size={26} weight={600} anchor="start" color={C.textMuted} opacity={captionIn}>
        Tiền tố mới · đầu vào cho lần dự đoán sau
      </SvgText>
      <SvgText x={1160} y={338} size={25} weight={600} anchor="start" color={C.textMuted} opacity={appear(frame, T.note)}>
        Cách chia token và số liệu minh họa
      </SvgText>

      <Model frame={frame} />
      <ReshapingBars frame={frame} />

      <Flow points={PREFIX_PATH} frame={frame} start={T.prefixFlow[0]} end={T.prefixFlow[1]} clearance={CLEAR} />
      <Flow points={BARS_PATH} frame={frame} start={T.barsFlow[0]} end={T.barsFlow[1]} clearance={CLEAR} />
      <Flow
        points={SAMPLE_PATH}
        frame={frame}
        start={T.sampleFlow[0]}
        end={T.sampleFlow[1]}
        color={C.red}
        clearance={CLEAR}
        opacity={1 - appear(frame, T.sampleFade, 18)}
      />
      <Flow points={LOOP_PATH} frame={frame} start={T.loopFlow[0]} end={T.loopFlow[1]} color={C.red} clearance={CLEAR} />
    </SceneFrame>
  );
}

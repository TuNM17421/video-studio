import React from 'react';
import { Card, Flow, GlassBox, Multiline, Pill, ProbabilityBars, SceneFrame, Slider, SvgText } from '../../../components/index.js';
import { C, anchor, appear, linearProgress, pulse, useFrame } from '../../../lib/index.js';

export const meta = {
  id: 'glassbox-model',
  title: 'Mô hình chọn token như thế nào?',
  pattern: 'Glassbox · phân bố co giãn',
  duration: 600,
};

/*
 * Re-timed port of Day05 video-01 Scene03 (authored ~1 800 f → 600 f here).
 * Beats: the request enters the glassbox (one pulse) · learned parameters · next-token
 * distribution + temperature slider HELD at t = 0 · linear sweep to t = 1 (bars, % and knob all
 * read the same value) · HELD at t = 1 while two phrasings leave the model · criteria row.
 */
const T = {
  request: 8,
  model: 24,
  reqFlow: [40, 104],
  grid: 116,
  bars: 206,
  barReveal: 214,
  slider: 226,
  knob: 268,
  pill: 288,
  sweep: [330, 420], // hold t = 0 from ~284 (bars fully grown) · hold t = 1 from 420 to the end
  outCards: 428,
  flowA: [444, 500],
  flowB: [462, 518],
  criteria: 530,
};

const CAPTIONS = [
  { start: 0, end: 110, text: 'Mô hình ngôn ngữ lớn không chứa sẵn một câu trả lời cho từng câu hỏi.' },
  { start: 110, end: 210, text: 'Nó học các tham số dạng số từ dữ liệu trong quá trình huấn luyện.' },
  { start: 210, end: 305, text: 'Ở mỗi bước, mô hình ước lượng khả năng của token tiếp theo.' },
  { start: 305, end: 425, text: 'Độ ngẫu nhiên (temperature) làm phân bố tập trung hơn hoặc rộng hơn.' },
  { start: 425, end: 520, text: 'Nên cùng một yêu cầu có thể cho hai cách diễn đạt khác nhau.' },
  { start: 520, end: 600, text: 'Khác nhau chưa phải lỗi: kiểm tra đúng ý, đúng giới hạn, dùng được.' },
];

/* Fixed rectangles; every connector endpoint is derived from them. */
const REQ = { x: 80, y: 432, w: 320, h: 180 };
const GLASS = { x: 500, y: 290, w: 820, h: 500 };
const CARD_A = { x: 1540, y: 330, w: 280, h: 150 };
const CARD_B = { x: 1540, y: 570, w: 280, h: 150 };
const FLOW_Y = REQ.y + REQ.h / 2;
const glassSide = (side) => anchor(GLASS, side, (FLOW_Y - GLASS.y) / GLASS.h);
const ELBOW_X = 1400;
const REQ_PATH = [anchor(REQ, 'right'), glassSide('left')];
const PATH_A = [glassSide('right'), { x: ELBOW_X, y: FLOW_Y }, { x: ELBOW_X, y: anchor(CARD_A, 'left').y }, anchor(CARD_A, 'left')];
const PATH_B = [glassSide('right'), { x: ELBOW_X, y: FLOW_Y }, { x: ELBOW_X, y: anchor(CARD_B, 'left').y }, anchor(CARD_B, 'left')];
/* Particle halo (r 13) + a 5 px active stroke + antialiasing: the point hides this close to a card. */
const CLEAR = 20;

/* Distribution panel inside the right half of the glassbox (x 920–1320). */
const BARS = { x: 950, y: 404, labelW: 70, barW: 200, barH: 34, rowGap: 72, size: 19 };
const TOKENS = ['hoàn', 'xử', 'hỏi'];
/* Extreme labels sit on the track line, 34 px outside it, so the knob never covers them. */
const SLIDER = { x1: 730, x2: 1140, y: 650, labelGap: 34 };

function ParameterGrid({ opacity }) {
  if (opacity <= 0.001) return null;
  const cells = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const emphasized = (row + col * 2) % 4 === 0;
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={615 + col * 56}
          y={390 + row * 47}
          width={42}
          height={30}
          rx={7}
          fill={emphasized ? C.redSoft : C.dotInactive}
          stroke={emphasized ? C.red : C.accent}
          strokeWidth={2}
        />,
      );
    }
  }
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <SvgText x={748} y={350} size={18} weight={700} color={C.accentStrong}>
        THAM SỐ DẠNG SỐ
      </SvgText>
      {cells}
      <SvgText x={748} y={610} size={17} weight={600} color={C.textMuted}>
        học từ dữ liệu huấn luyện
      </SvgText>
    </g>
  );
}

/* Output tray: the frame is visible before the particle arrives; its sentence fades in on arrival. */
function OutputCard({ box, label, lines, red = false, frame, arrival, opacity }) {
  if (opacity <= 0.001) return null;
  return (
    <>
      <Card {...box} label={label} lines={[]} accent={red ? C.red : C.accent} active={pulse(frame, arrival)} opacity={opacity} />
      <Multiline
        x={box.x + box.w / 2}
        y={box.y + box.h / 2 + 12}
        lines={lines}
        size={21}
        firstWeight={700}
        opacity={opacity * appear(frame, arrival, 18)}
      />
    </>
  );
}

export default function GlassboxModel() {
  const frame = useFrame();
  const t = linearProgress(frame, T.sweep[0], T.sweep[1]);
  const values = [78 - 30 * t, 16 + 18 * t, 6 + 12 * t];
  const reveal = appear(frame, T.barReveal, 70);
  const barsOpacity = appear(frame, T.bars, 30);
  const sliderOpacity = appear(frame, T.slider, 34);
  const outOpacity = appear(frame, T.outCards, 30);
  const criteria = appear(frame, T.criteria, 34);
  const knobX = BARS.x + BARS.labelW + BARS.barW * (values[0] / 100) * reveal;

  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 05 · THIẾT KẾ SẢN PHẨM AI"
      title={meta.title}
      tag="GLASSBOX"
      footer={{ left: '03 / 06 · Sản phẩm AI và ba lớp bất định' }}
      captions={CAPTIONS}
    >
      <Card {...REQ} label="YÊU CẦU" lines={['Hãy tóm tắt', 'thư khiếu nại']} size={23} opacity={appear(frame, T.request, 30)} />
      <GlassBox {...GLASS} label="MÔ HÌNH NGÔN NGỮ LỚN" active={pulse(frame, T.reqFlow[1])} opacity={appear(frame, T.model, 32)}>
        <path d="M 920 330 V 615" fill="none" stroke={C.dotInactive} strokeWidth={3} />
        <ParameterGrid opacity={appear(frame, T.grid, 38)} />
        {barsOpacity > 0.001 ? (
          <g opacity={barsOpacity < 1 ? barsOpacity : undefined}>
            <SvgText x={1115} y={350} size={18} weight={700} color={C.accentStrong}>
              KHẢ NĂNG TOKEN TIẾP THEO
            </SvgText>
            <ProbabilityBars
              x={BARS.x}
              y={BARS.y}
              labelW={BARS.labelW}
              barW={BARS.barW}
              barH={BARS.barH}
              rowGap={BARS.rowGap}
              size={BARS.size}
              rounded
              max={100}
              reveal={reveal}
              items={TOKENS.map((label, i) => ({ label, value: values[i], highlight: i === 0 }))}
            />
            <circle
              cx={knobX}
              cy={BARS.y + BARS.barH / 2}
              r={12}
              fill={C.bg}
              stroke={C.red}
              strokeWidth={5}
              opacity={appear(frame, T.knob)}
            />
          </g>
        ) : null}
        <Slider x1={SLIDER.x1} x2={SLIDER.x2} y={SLIDER.y} value={t} title="ĐỘ NGẪU NHIÊN (TEMPERATURE)" opacity={sliderOpacity} />
        <SvgText x={SLIDER.x1 - SLIDER.labelGap} y={SLIDER.y + 6} size={17} weight={700} anchor="end" color={C.textMuted} opacity={sliderOpacity}>
          TẬP TRUNG
        </SvgText>
        <SvgText x={SLIDER.x2 + SLIDER.labelGap} y={SLIDER.y + 6} size={17} weight={700} anchor="start" color={C.textMuted} opacity={sliderOpacity}>
          RỘNG
        </SvgText>
        <Pill x={760} y={728} w={300} label="CHỌN → NỐI → LẶP LẠI" active opacity={appear(frame, T.pill, 28)} />
      </GlassBox>
      <Flow points={REQ_PATH} frame={frame} start={T.reqFlow[0]} end={T.reqFlow[1]} clearance={CLEAR} />
      <Flow points={PATH_A} frame={frame} start={T.flowA[0]} end={T.flowA[1]} clearance={CLEAR} />
      <Flow points={PATH_B} frame={frame} start={T.flowB[0]} end={T.flowB[1]} color={C.red} clearance={CLEAR} />
      <OutputCard box={CARD_A} label="CÂU A" lines={['Cần xử lý gấp', 'trong hôm nay']} frame={frame} arrival={T.flowA[1]} opacity={outOpacity} />
      <OutputCard box={CARD_B} red label="CÂU B" lines={['Ưu tiên xử lý', 'trước cuối ngày']} frame={frame} arrival={T.flowB[1]} opacity={outOpacity} />
      {criteria > 0.001 ? (
        <g opacity={criteria < 1 ? criteria : undefined}>
          <Pill x={1270} y={865} w={150} label="ĐÚNG Ý" />
          <Pill x={1435} y={865} w={200} label="ĐÚNG GIỚI HẠN" />
          <Pill x={1650} y={865} w={170} label="DÙNG ĐƯỢC" active />
        </g>
      ) : null}
    </SceneFrame>
  );
}

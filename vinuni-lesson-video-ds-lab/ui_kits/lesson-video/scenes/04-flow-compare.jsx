import React from 'react';
import { Bracket, Card, Check, Enclosure, Flow, GlassBox, Pill, SceneFrame, SvgText } from '../../../components/index.js';
import { C, appear, linearProgress, pointAtDistance, polylineLength, pulse, useFrame } from '../../../lib/index.js';

export const meta = {
  id: 'flow-compare',
  title: 'Hai kiểu kỳ vọng',
  pattern: 'Flow · so sánh A/B',
  duration: 540,
};

/*
 * Re-timed port of Day05 video-01 Scene01 (authored 1 650 f → 540 f here).
 * Beat plan: rule path (input → rule → result, signal train) · language path (request →
 * glassbox → two different summaries) · shared meaning bracket · enclosure · criteria row.
 */
const T = {
  pillIntent: 10,
  pillSwitch: 18,
  rule: 26,
  inFlow: [34, 76],
  outFlow: [76, 118],
  result: 90,
  train: 128,
  trainStep: 22,
  pulses: [154, 242],
  invariant: 212,
  request: 250,
  glass: 262,
  reqFlow: [272, 314],
  trays: 300,
  trayText: 344,
  flowA: [318, 374],
  flowB: [338, 394],
  summary: 412,
  enclosure: 440,
  criteria: 476,
};

const CAPTIONS = [
  { start: 0, end: 118, text: 'Khi bật công tắc đèn, bạn chờ bóng đèn sáng ngay.' },
  { start: 118, end: 240, text: 'Lặp lại trong cùng điều kiện, công tắc vẫn cho cùng một kết quả.' },
  { start: 240, end: 336, text: 'Còn khi nhờ đồng nghiệp tóm tắt thư, hai bản có giống từng chữ không?' },
  { start: 336, end: 440, text: 'Thường là không: họ chọn từ khác nhưng vẫn giữ ý chính.' },
  { start: 440, end: 540, text: 'Vì vậy, mình đặt tiêu chí trước khi thiết kế và kiểm thử sản phẩm AI.' },
];

const switchPill = { x: 104, y: 323, w: 112, h: 50 };
const ruleCard = { x: 450, y: 273, w: 360, h: 150 };
const resultCard = { x: 1120, y: 273, w: 560, h: 150 };
const topY = ruleCard.y + ruleCard.h / 2;
const ruleIn = [{ x: switchPill.x + switchPill.w, y: topY }, { x: ruleCard.x, y: topY }];
const ruleOut = [{ x: ruleCard.x + ruleCard.w, y: topY }, { x: resultCard.x, y: topY }];
/* The signal dots ride the same lines, kept clear of both card faces. */
const CLEAR = 14;
const ruleInDots = [{ x: ruleIn[0].x + CLEAR, y: topY }, { x: ruleIn[1].x - CLEAR, y: topY }];
const ruleOutDots = [{ x: ruleOut[0].x + CLEAR, y: topY }, { x: ruleOut[1].x - CLEAR, y: topY }];

function SignalDot({ path, t }) {
  const p = pointAtDistance(path, t * polylineLength(path));
  return (
    <g>
      <circle cx={p.x} cy={p.y} r={12} fill={C.bg} />
      <circle cx={p.x} cy={p.y} r={8} fill={C.accent} />
    </g>
  );
}

/** Five dots: visible on the empty connectors, hidden while crossing the rule card. */
function SignalTrain({ frame }) {
  const dots = [];
  for (let i = 0; i < 5; i++) {
    const start = T.train + i * T.trainStep;
    const entry = start + 26;
    const exit = start + 48;
    const end = start + 82;
    if (frame >= start && frame < entry) dots.push(<SignalDot key={i} path={ruleInDots} t={linearProgress(frame, start, entry)} />);
    else if (frame >= exit && frame < end) dots.push(<SignalDot key={i} path={ruleOutDots} t={linearProgress(frame, exit, end)} />);
  }
  return <>{dots}</>;
}

function Bulb({ x, y, on, opacity }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity}>
      <circle cx={x} cy={y} r={52 + on * 10} fill={C.redSoft} opacity={0.2 + on * 0.8} />
      <path
        d={`M ${x - 28} ${y - 8} A 31 31 0 1 1 ${x + 28} ${y - 8} C ${x + 18} ${y + 7}, ${x + 15} ${y + 18}, ${x + 15} ${y + 28} H ${x - 15} C ${x - 15} ${y + 18}, ${x - 18} ${y + 7}, ${x - 28} ${y - 8}`}
        fill={C.bg}
        stroke={on > 0.35 ? C.red : C.accent}
        strokeWidth={4}
      />
      <path d={`M ${x - 14} ${y + 38} H ${x + 14} M ${x - 10} ${y + 48} H ${x + 10}`} fill="none" stroke={C.text} strokeLinecap="round" strokeWidth={4} />
    </g>
  );
}

export default function FlowCompare() {
  const frame = useFrame();
  const ruleActive = Math.min(1, pulse(frame, T.pulses[0]) + pulse(frame, T.pulses[1]));
  const trays = appear(frame, T.trays, 30);
  const summary = appear(frame, T.summary, 30);
  const criteria = appear(frame, T.criteria, 34);
  const trayText = frame >= T.trayText;

  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 05 · THIẾT KẾ SẢN PHẨM AI"
      title="Hai kiểu kỳ vọng"
      tag="SO SÁNH"
      footer={{ left: '01 / 06 · Sản phẩm AI và ba lớp bất định' }}
      captions={CAPTIONS}
    >
      <Pill x={105} y={260} w={210} label="THAO TÁC RÕ" active opacity={appear(frame, T.pillIntent)} />
      <Pill x={switchPill.x} y={switchPill.y} w={switchPill.w} label="BẬT" opacity={appear(frame, T.pillSwitch)} />
      <Card {...ruleCard} label="THEO QUY TẮC" lines={['CÔNG TẮC', 'đóng mạch']} active={ruleActive} opacity={appear(frame, T.rule)} />
      <Card {...resultCard} label="KẾT QUẢ" lines={['ĐÈN SÁNG', 'cùng trạng thái']} active={ruleActive} opacity={appear(frame, T.result)} />
      <Bulb x={1580} y={344} on={ruleActive} opacity={appear(frame, T.result)} />
      <Flow points={ruleIn} frame={frame} start={T.inFlow[0]} end={T.inFlow[1]} showParticle={false} />
      <Flow points={ruleOut} frame={frame} start={T.outFlow[0]} end={T.outFlow[1]} showParticle={false} />
      <SignalTrain frame={frame} />
      <SvgText x={960} y={464} size={21} weight={700} color={C.accentStrong} opacity={appear(frame, T.invariant)}>
        CÙNG ĐIỀU KIỆN → CÙNG TRẠNG THÁI QUAN SÁT ĐƯỢC
      </SvgText>

      <Card x={105} y={596} w={280} h={145} label="YÊU CẦU" lines={['BỨC THƯ', 'cần tóm tắt']} size={23} opacity={appear(frame, T.request, 30)} />
      <GlassBox x={450} y={545} w={430} h={250} label="TÓM TẮT" opacity={appear(frame, T.glass, 32)}>
        <path d="M 555 625 H 775 M 555 670 H 742 M 555 715 H 790" fill="none" stroke={C.accent} strokeLinecap="round" strokeWidth={13} />
        <circle cx={520} cy={625} r={7} fill={C.red} />
        <circle cx={520} cy={670} r={7} fill={C.red} />
        <circle cx={520} cy={715} r={7} fill={C.red} />
      </GlassBox>
      <Flow points={[{ x: 385, y: 668 }, { x: 450, y: 668 }]} frame={frame} start={T.reqFlow[0]} end={T.reqFlow[1]} />
      <Flow
        points={[{ x: 880, y: 668 }, { x: 990, y: 668 }, { x: 990, y: 578 }, { x: 1120, y: 578 }]}
        frame={frame}
        start={T.flowA[0]}
        end={T.flowA[1]}
      />
      <Flow
        points={[{ x: 880, y: 668 }, { x: 990, y: 668 }, { x: 990, y: 758 }, { x: 1120, y: 758 }]}
        frame={frame}
        start={T.flowB[0]}
        end={T.flowB[1]}
        color={C.red}
      />
      <Card
        x={1120}
        y={519}
        w={560}
        h={118}
        label="BẢN A"
        lines={trayText ? ['Cần xử lý gấp', 'trong hôm nay'] : []}
        size={22}
        active={pulse(frame, T.flowA[1])}
        opacity={trays}
      />
      <Card
        x={1120}
        y={699}
        w={560}
        h={118}
        accent={C.red}
        label="BẢN B"
        lines={trayText ? ['Ưu tiên xử lý', 'trước cuối ngày'] : []}
        size={22}
        active={pulse(frame, T.flowB[1])}
        opacity={trays}
      />
      <Bracket x={1190} y={813} w={420} color={C.red} opacity={summary} />
      <SvgText x={1400} y={864} size={20} weight={700} color={C.red} opacity={summary}>
        Ý CHÍNH CHUNG
      </SvgText>
      <Enclosure x={420} y={510} w={1290} h={372} label="ĐẦU RA NGÔN NGỮ" labelX={780} labelW={300} opacity={appear(frame, T.enclosure, 36)} />

      {criteria > 0.001 ? (
        <g opacity={criteria}>
          <rect x={450} y={892} width={1020} height={64} rx={22} fill={C.bgAlt} stroke={C.accent} strokeWidth={3} />
          <SvgText x={480} y={927} size={19} weight={700} anchor="start" color={C.accentStrong}>
            ĐẶT TIÊU CHÍ TRƯỚC
          </SvgText>
          <Check x={780} y={932} />
          <SvgText x={865} y={940} size={20} weight={700}>
            Nội dung
          </SvgText>
          <Check x={1025} y={932} />
          <SvgText x={1110} y={940} size={20} weight={700}>
            Giới hạn
          </SvgText>
          <Check x={1265} y={932} />
          <SvgText x={1375} y={940} size={20} weight={700}>
            Cách kiểm tra
          </SvgText>
        </g>
      ) : null}
    </SceneFrame>
  );
}

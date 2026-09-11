import React from 'react';
import { Card, Check, Cross, Flow, NumberBadge, Pill, SceneFrame, SvgText } from '../../../components/index.js';
import { C, anchor, appear, fadeWindow, layoutRow, linearProgress, pulse, useFrame } from '../../../lib/index.js';

export const meta = {
  id: 'check-question',
  title: 'Gặp câu trả lời sai: kiểm gì trước?',
  pattern: 'Câu hỏi kiểm tra · lựa chọn · đáp án',
  duration: 420,
};

/*
 * Day05 Scene06 pattern: question → two NEUTRAL options → thinking pause → reveal → evidence.
 * During the pause (T.pause → T.reveal, 104 f) both options share color, weight and badge style
 * and nothing hints at the answer. Every answer signal (red B, check, muted A, cross) starts at
 * T.reveal or later; B switches state on exactly that frame (one owner, no blended cross-fade)
 * and pulses once. The log card is on screen before the red point reaches it.
 */
const T = {
  caseCard: 10,
  optionA: 56,
  optionB: 72,
  pause: 110,
  reveal: 214,
  muteA: 220,
  log: 244,
  logFlow: [256, 290],
  pills: [318, 334, 350],
  evidence: 372,
};

const CAPTIONS = [
  { start: 0, end: 110, text: 'Bây giờ thử áp dụng: trợ lý AI trả lời sai một câu hỏi thực tế.' },
  { start: 110, end: 214, text: 'Bạn sẽ kiểm tra gì trước? Hãy chọn A hoặc B trước khi xem đáp án.' },
  { start: 214, end: 282, text: 'Phương án phù hợp hơn: xem lại đầu vào, tiêu chí và đường xử lý.' },
  { start: 282, end: 336, text: 'Ghi lại trường hợp trước, chưa vội kết luận nguyên nhân.' },
  { start: 336, end: 420, text: 'Lỗi có thể do dữ liệu, do thiết kế, hoặc chưa có phương án xử lý.' },
];

const caseCard = { x: 410, y: 262, w: 1100, h: 120 };
const optionA = { x: 250, y: 440, w: 650, h: 170 };
const optionB = { x: 1020, y: 440, w: 650, h: 170 };
const logCard = { x: 410, y: 690, w: 1100, h: 110 };
const logStart = anchor(optionB, 'bottom');
const logPath = [logStart, { x: logStart.x, y: logCard.y }];
const CAUSES = layoutRow(['DỮ LIỆU', 'THIẾT KẾ', 'CHƯA CÓ PHƯƠNG ÁN'], { gap: 36, size: 18, centerAt: 960 });

/** Five-step countdown for the thinking pause: one dot empties per step (pure function of frame). */
function Countdown({ frame, cx, y, opacity }) {
  if (opacity <= 0.001) return null;
  const steps = 5;
  const used = Math.min(steps, Math.floor(linearProgress(frame, T.pause, T.reveal) * steps));
  const dots = [];
  for (let i = 0; i < steps; i++) {
    dots.push(<circle key={i} cx={cx + (i - (steps - 1) / 2) * 36} cy={y} r={9} fill={i < steps - used ? C.accent : C.dotInactive} />);
  }
  return <g opacity={opacity}>{dots}</g>;
}

export default function CheckQuestion() {
  const frame = useFrame();
  const pauseUi = fadeWindow(frame, T.pause, T.reveal + 12, 12);
  const revealed = frame >= T.reveal;
  const aMuted = appear(frame, T.muteA, 24);
  const optA = appear(frame, T.optionA);
  const optB = appear(frame, T.optionB);

  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 05 · THIẾT KẾ SẢN PHẨM AI"
      title="Gặp một câu trả lời sai: kiểm gì trước?"
      tag="KIỂM TRA"
      footer={{ left: '06 / 06 · Sản phẩm AI và ba lớp bất định' }}
      captions={CAPTIONS}
    >
      <Card {...caseCard} accent={C.red} label="TRƯỜNG HỢP" lines={['TRỢ LÝ AI TRẢ LỜI SAI', 'một câu hỏi thực tế']} opacity={appear(frame, T.caseCard)} />

      <Card {...optionA} label="PHƯƠNG ÁN A" lines={['Sửa ngay câu trả lời đó', 'rồi chuyển sang việc khác']} opacity={optA} muted={aMuted} />
      <NumberBadge x={optionA.x + optionA.w / 2} y={optionA.y} value="A" opacity={optA * (1 - 0.64 * aMuted)} />

      <Card
        {...optionB}
        label="PHƯƠNG ÁN B"
        lines={['Xem lại đầu vào, tiêu chí', 'và đường xử lý khi không chắc']}
        accent={revealed ? C.red : C.accent}
        fill={revealed ? C.redSoft : C.bgAlt}
        active={pulse(frame, T.reveal)}
        opacity={optB}
      />
      <NumberBadge x={optionB.x + optionB.w / 2} y={optionB.y} value="B" active={revealed} opacity={optB} />

      <Cross x={optionA.x - 46} y={optionA.y + optionA.h / 2} opacity={appear(frame, T.muteA, 18)} />
      <Check x={optionB.x + optionB.w + 46} y={optionB.y + optionB.h / 2} opacity={appear(frame, T.reveal + 6, 18)} />

      <SvgText x={960} y={650} size={22} weight={600} color={C.textMuted} opacity={pauseUi}>
        Dừng video và chọn trước khi xem đáp án
      </SvgText>
      <Countdown frame={frame} cx={960} y={676} opacity={pauseUi} />

      <Card
        {...logCard}
        label="NHẬT KÝ TRƯỜNG HỢP"
        lines={['Ghi câu hỏi · câu trả lời · bối cảnh', 'Chưa kết luận nguyên nhân']}
        size={22}
        opacity={appear(frame, T.log)}
        active={pulse(frame, T.logFlow[1])}
      />
      <Flow points={logPath} frame={frame} start={T.logFlow[0]} end={T.logFlow[1]} color={C.red} />

      {CAUSES.map((c, i) => (
        <Pill key={c.label} x={c.x} y={822} w={c.w} label={c.label} opacity={appear(frame, T.pills[i], 20)} />
      ))}
      <SvgText x={960} y={918} size={19} weight={700} color={C.red} opacity={appear(frame, T.evidence)}>
        BA KHẢ NĂNG CẦN BẰNG CHỨNG · KHÔNG TỰ ĐỘNG CHỌN
      </SvgText>
    </SceneFrame>
  );
}

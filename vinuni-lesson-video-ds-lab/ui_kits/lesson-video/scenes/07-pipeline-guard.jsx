import React from 'react';
import { Card, Check, Chip, Cross, Flow, GlassBox, SceneFrame, SvgText } from '../../../components/index.js';
import { C, MONO, anchor, appear, pulse, textWidth, useFrame } from '../../../lib/index.js';

export const meta = {
  id: 'pipeline-guard',
  title: 'Lớp 2: ứng dụng kiểm tra trước khi chạy',
  pattern: 'Pipeline · hạt dữ liệu · chặn',
  duration: 480,
};

/*
 * Day04 V05 style ("Phòng thủ nhiều lớp"). Beat 1: a valid proposal travels through the app
 * (hidden while the checks run, one pulse per receiving card) to the read tool and back.
 * Beat 2: an untrusted proposal fails the first check; the app blocks it and returns a refusal.
 */
const T = {
  proposal: 6,
  glass: 14,
  list: 24,
  input: 32,
  tool: 40,
  result: 48,
  inFlow: [60, 96], // proposal → app (app pulses once)
  listOk: 104, // checks run in order while the point is hidden inside the app
  inputOk: 116,
  allow: 128,
  outFlow: [138, 174], // app → read tool (tool pulses once)
  toolFlow: [186, 220], // tool → result (result pulses once)
  reset: 250, // beat 1 recedes; its marks leave before beat 2 draws its own
  proposal2: 262,
  flag: 276, // the new proposal turns red: it came from an untrusted document
  inFlow2: [290, 326], // app pulses red once
  listFail: 336,
  reject: 346,
  block: 348,
  rejectFlow: [360, 392], // app → refusal (refusal pulses once)
  rule: 400,
};

const CAPTIONS = [
  { start: 0, end: 96, text: 'Mô hình chỉ đề nghị một thao tác, chưa trực tiếp chạy công cụ.' },
  { start: 96, end: 174, text: 'Ứng dụng kiểm tra theo thứ tự: công cụ được phép, đầu vào đúng dạng.' },
  { start: 174, end: 250, text: 'Hợp lệ thì công cụ đọc mới chạy và trả kết quả về cho mô hình.' },
  { start: 250, end: 336, text: 'Còn đề nghị “gửi toàn bộ nội dung” đến từ tài liệu chưa tin cậy.' },
  { start: 336, end: 410, text: 'Nó không có trong danh sách, nên ứng dụng chặn lại.' },
  { start: 410, end: 480, text: 'Đúng định dạng không tự tạo ra quyền chạy công cụ.' },
];

/* Fixed rectangles (100 px gutters); every connector endpoint is a card anchor. */
const PROP = { x: 80, y: 360, w: 290, h: 200 };
const GLASS = { x: 470, y: 290, w: 660, h: 340 };
const LIST = { x: 505, y: 335, w: 290, h: 160 };
const INPUT = { x: 815, y: 335, w: 290, h: 160 };
const TOOL = { x: 1230, y: 360, w: 290, h: 200 };
const RESULT = { x: 1620, y: 360, w: 220, h: 200 };
const PROP2 = { x: 80, y: 680, w: 290, h: 180 };
const REJECT = { x: 640, y: 700, w: 320, h: 160 };

const cx = (b) => b.x + b.w / 2;
const ROW_Y = PROP.y + PROP.h / 2;
const LANE2_Y = 580; // beat-2 entry lane, below the inner cards and clear of the decision chip
const MARK_Y = LIST.y + LIST.h + 38; // check / cross under each inner card
const DECISION_Y = 562; // ĐỌC / CHẶN chip lane
/* Particle halo (r 13) + a 5 px active stroke + antialiasing: the point hides this close to a card. */
const CLEAR = 20;
const glassAt = (side, y) => anchor(GLASS, side, (y - GLASS.y) / GLASS.h);

const P1 = [anchor(PROP, 'right'), glassAt('left', ROW_Y)];
const P2 = [glassAt('right', ROW_Y), anchor(TOOL, 'left')];
const P3 = [anchor(TOOL, 'right'), anchor(RESULT, 'left')];
const P4 = [anchor(PROP2, 'right'), { x: 420, y: anchor(PROP2, 'right').y }, { x: 420, y: LANE2_Y }, glassAt('left', LANE2_Y)];
const P5 = [anchor(GLASS, 'bottom', (cx(REJECT) - GLASS.x) / GLASS.w), anchor(REJECT, 'top')];

const chipWidth = (label) => Math.round(textWidth(label, 18, 700) + 26);

/* Read tool: its function name is code, so it is set in the mono stack. */
function ToolCard({ frame, muted }) {
  const opacity = appear(frame, T.tool);
  if (opacity <= 0.001) return null;
  const o = opacity * (1 - muted * 0.64);
  const mid = TOOL.y + TOOL.h / 2 + 12;
  return (
    <>
      <Card {...TOOL} icon="eye" label="CÔNG CỤ ĐỌC" lines={[]} active={pulse(frame, T.outFlow[1])} opacity={opacity} muted={muted} />
      <SvgText x={cx(TOOL)} y={mid - 16.5} size={19} weight={600} family={MONO} opacity={o}>
        read_course_document
      </SvgText>
      <SvgText x={cx(TOOL)} y={mid + 16.5} size={21} weight={600} color={C.textMuted} opacity={o}>
        chỉ đọc tài liệu
      </SvgText>
    </>
  );
}

export default function PipelineGuard() {
  const frame = useFrame();
  const beat1Out = appear(frame, T.reset, 16);
  const recede = appear(frame, T.reset, 20);
  const beat1Flow = 1 - 0.65 * recede;
  const listFail = appear(frame, T.listFail, 14);
  const glassActive = Math.min(1, pulse(frame, T.inFlow[1]) + pulse(frame, T.inFlow2[1]));
  const allowW = chipWidth('ĐỌC');
  const blockW = chipWidth('CHẶN');

  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 04 · PROMPT VÀ TOOL CALLING"
      title={meta.title}
      tag="DỮ LIỆU · KẾT QUẢ · MINH HỌA"
      footer={{ left: '05 · Phòng thủ nhiều lớp', right: '02 / 06' }}
      captions={CAPTIONS}
    >
      <Card
        {...PROP}
        icon="robot"
        label="ĐỀ NGHỊ CỦA MÔ HÌNH"
        lines={['ĐỌC DOC-B-01', 'có mã · là văn bản']}
        size={22}
        opacity={appear(frame, T.proposal)}
        muted={recede}
      />
      <GlassBox {...GLASS} label="ỨNG DỤNG · KIỂM TRA THEO THỨ TỰ" active={glassActive} opacity={appear(frame, T.glass, 30)}>
        <Card
          {...LIST}
          icon="check"
          label="DANH SÁCH CÔNG CỤ"
          lines={['ĐỌC TÀI LIỆU', 'được phép']}
          size={22}
          active={listFail}
          opacity={appear(frame, T.list)}
        />
        <Card {...INPUT} icon="code" label="THÔNG TIN ĐẦU VÀO" lines={['Có mã', 'là văn bản']} size={22} opacity={appear(frame, T.input)} />
        <Check x={cx(LIST)} y={MARK_Y} size={32} strokeWidth={6} opacity={appear(frame, T.listOk, 12) * (1 - beat1Out)} />
        <Check x={cx(INPUT)} y={MARK_Y} size={32} strokeWidth={6} opacity={appear(frame, T.inputOk, 12) * (1 - beat1Out)} />
        <Cross x={cx(LIST)} y={MARK_Y} size={26} strokeWidth={6} opacity={appear(frame, T.listFail, 12)} />
        <Chip x={cx(GLASS) - allowW / 2} y={DECISION_Y} label="ĐỌC" opacity={appear(frame, T.allow, 14) * (1 - beat1Out)} />
        <Chip x={cx(GLASS) - blockW / 2} y={DECISION_Y} label="CHẶN" tone="red" opacity={appear(frame, T.block, 14)} />
      </GlassBox>
      <ToolCard frame={frame} muted={recede} />
      <Card
        {...RESULT}
        icon="database"
        label="KẾT QUẢ"
        lines={['TRẢ VỀ', 'cho mô hình']}
        size={22}
        active={pulse(frame, T.toolFlow[1])}
        opacity={appear(frame, T.result)}
        muted={recede}
      />
      <Card
        {...PROP2}
        icon="robot"
        label="ĐỀ NGHỊ MỚI"
        lines={['“GỬI TOÀN BỘ', 'NỘI DUNG”']}
        size={22}
        active={appear(frame, T.flag, 14)}
        opacity={appear(frame, T.proposal2)}
      />
      <Card
        {...REJECT}
        accent={C.red}
        fill={C.redSoft}
        dashed
        label="BỊ TỪ CHỐI"
        lines={['không đúng quyền', 'kết quả · minh họa']}
        size={22}
        active={pulse(frame, T.rejectFlow[1])}
        opacity={appear(frame, T.reject)}
      />
      <Cross x={REJECT.x + REJECT.w - 40} y={REJECT.y + 36} size={26} strokeWidth={6} opacity={appear(frame, T.reject)} />
      <SvgText x={cx(REJECT)} y={912} size={20} weight={700} color={C.red} opacity={appear(frame, T.rule)}>
        KHÔNG · ĐÚNG DẠNG KHÔNG TỰ TẠO QUYỀN
      </SvgText>

      <Flow points={P1} frame={frame} start={T.inFlow[0]} end={T.inFlow[1]} opacity={beat1Flow} clearance={CLEAR} />
      <Flow points={P2} frame={frame} start={T.outFlow[0]} end={T.outFlow[1]} opacity={beat1Flow} clearance={CLEAR} />
      <Flow points={P3} frame={frame} start={T.toolFlow[0]} end={T.toolFlow[1]} opacity={beat1Flow} clearance={CLEAR} />
      <Flow points={P4} frame={frame} start={T.inFlow2[0]} end={T.inFlow2[1]} color={C.red} clearance={CLEAR} />
      <Flow points={P5} frame={frame} start={T.rejectFlow[0]} end={T.rejectFlow[1]} color={C.red} clearance={CLEAR} />
    </SceneFrame>
  );
}

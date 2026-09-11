import React from 'react';
import { JsonView, jsonLineAnchor, Flow, C, SvgText } from 'vinuni-lesson-video-ds';

// SVG JSON viewer in scene px — preview inside an <svg viewBox>.
const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const REQUEST = {
  model: 'claude-demo',
  system: 'Bạn là trợ lý học vụ của trường.',
  messages: [{ role: 'user', content: 'Lịch học thứ Hai của em?' }],
};

export const MessagesRequest = () => (
  <Stage w={1200} h={420}>
    <JsonView x={30} y={30} w={760} title="YÊU CẦU GỬI MÔ HÌNH" data={REQUEST}
      highlightKeys={['system', 'role']}
      glosses={{ system: 'chỉ dẫn hệ thống', role: 'vai người nói', content: 'nội dung câu hỏi' }} />
  </Stage>
);

const TOOL = {
  name: 'tra_lich_hoc',
  description: 'Tra lịch học theo mã học sinh',
  input_schema: {
    type: 'object',
    properties: {
      student_id: { type: 'string', pattern: '^HS-\\d{3}$' },
      day: { type: 'string', enum: ['thu_2', 'thu_3', 'thu_4'] },
    },
    required: ['student_id'],
  },
};

export const ToolDeclaration = () => (
  <Stage w={1240} h={740}>
    <JsonView x={30} y={30} w={800} title="KHAI BÁO CÔNG CỤ" data={TOOL} fontSize={18}
      highlightKeys={['required']}
      glosses={{ input_schema: 'khuôn dữ liệu vào', pattern: 'mẫu: HS-017', enum: 'giá trị cho phép', required: 'trường bắt buộc' }} />
  </Stage>
);

const USE = { x: 30, y: 60, w: 620, title: 'TOOL_USE · MÔ HÌNH GỌI', matchId: { id: 1 },
  data: { type: 'tool_use', id: 'toolu_DEMO_01', name: 'tra_lich_hoc', input: { student_id: 'HS-017' } } };
const RESULT = { x: 810, y: 60, w: 620, title: 'TOOL_RESULT · ỨNG DỤNG TRẢ', matchId: { tool_use_id: 1 },
  highlightKeys: ['tool_use_id'],
  data: { type: 'tool_result', tool_use_id: 'toolu_DEMO_01', content: 'Thứ Hai: Toán 7:30, Văn 9:15' } };

export const PairedIds = () => {
  const a = jsonLineAnchor(USE, 'id', 'right')!;
  const b = jsonLineAnchor(RESULT, 'tool_use_id', 'left')!;
  const mx = (a.x + b.x) / 2;
  return (
    <Stage w={1460} h={420}>
      <JsonView {...USE} />
      <JsonView {...RESULT} />
      <Flow points={[a, { x: mx, y: a.y }, { x: mx, y: b.y }, b]} progress={1} color={C.red} />
      <SvgText x={mx} y={390} size={22} weight={700} color={C.red}>Hai mã phải khớp</SvgText>
    </Stage>
  );
};

export const RevealingMidMotion = () => (
  <Stage w={1200} h={420}>
    <JsonView x={30} y={30} w={760} title="YÊU CẦU GỬI MÔ HÌNH" data={REQUEST} frame={22} start={0} per={4}
      glosses={{ system: 'chỉ dẫn hệ thống', role: 'vai người nói', content: 'nội dung câu hỏi' }} />
  </Stage>
);

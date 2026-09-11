import React from 'react';
import { LogCard, C } from 'vinuni-lesson-video-ds';

// SVG log card in scene px — preview inside an <svg viewBox>.
const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const REACT_STEPS = [
  { time: '19:02:11', level: 'info', actor: 'Suy luận', text: 'Cần lịch học của HS-017 → gọi công cụ' },
  { time: '19:02:12', level: 'ok', actor: 'Hành động', text: 'tra_lich_hoc(student_id="HS-017")', status: 'OK' },
  { time: '19:02:12', level: 'ok', actor: 'Quan sát', text: 'Thứ Hai: Toán 7:30, Văn 9:15', status: 'OK' },
  { time: '19:02:14', level: 'blocked', actor: 'Hành động', text: 'gui_email(toàn trường) — ngoài quyền', status: 'CHẶN' },
  { time: '19:02:15', level: 'ok', actor: 'Trả lời', text: 'Gửi lịch học cho học sinh', status: 'XONG' },
] as const;

export const ReactSteps = () => (
  <Stage w={1100} h={430}>
    <LogCard x={30} y={30} w={1040} rows={REACT_STEPS as any} />
  </Stage>
);

export const FourColumnAudit = () => (
  <Stage w={1100} h={470}>
    <LogCard x={30} y={30} w={1040} title="BẢN GHI SỰ KIỆN" columns={['THỜI GIAN', 'TÁC NHÂN', 'SỰ KIỆN', 'TRẠNG THÁI']}
      rows={REACT_STEPS as any} highlightIndex={3} />
  </Stage>
);

export const Levels = () => (
  <Stage w={1100} h={380}>
    <LogCard x={30} y={30} w={1040} title="NHẬT KÝ MÁY CHỦ MCP" rows={[
      { time: '08:15:02', level: 'info', actor: 'Máy chủ', text: 'Kết nối từ ứng dụng trợ lý học vụ' },
      { time: '08:15:03', level: 'warn', actor: 'Kiểm tra', text: 'Thiếu trường "day" — dùng mặc định thứ Hai' },
      { time: '08:15:04', level: 'error', actor: 'Công cụ', text: 'Hết thời gian chờ cơ sở dữ liệu (5 s)', status: 'LỖI' },
      { time: '08:15:06', level: 'ok', actor: 'Công cụ', text: 'Thử lại thành công', status: 'OK' },
    ]} />
  </Stage>
);

export const EmptyState = () => (
  <Stage w={760} h={330}>
    <LogCard x={30} y={30} w={700} empty />
  </Stage>
);

export const RevealingMidMotion = () => (
  <Stage w={1100} h={430}>
    <LogCard x={30} y={30} w={1040} rows={REACT_STEPS as any} frame={30} start={0} per={12} />
  </Stage>
);

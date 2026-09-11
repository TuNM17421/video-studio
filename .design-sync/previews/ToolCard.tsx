import React from 'react';
import { ToolCard, C, SvgText } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Note = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <SvgText x={x} y={y} size={19} weight={600} anchor="start" color={C.textMuted}>{children}</SvgText>
);

const TRA_HAN_NOP = {
  name: 'tra_han_nop',
  does: 'Tra hạn nộp bài tập của một học sinh trong một lớp.',
  inputs: [
    { name: 'ma_lop', type: 'chuỗi', required: true },
    { name: 'ma_hs', type: 'chuỗi', required: true },
    { name: 'bai_so', type: 'số' },
  ],
  returns: 'Hạn nộp (ngày giờ) và trạng thái: đã nộp / chưa nộp.',
};

export const Declaration = () => (
  <Stage w={740} h={430}>
    <ToolCard x={40} y={30} w={660} {...TRA_HAN_NOP} />
  </Stage>
);

export const BeingCalled = () => (
  <Stage w={740} h={470}>
    <ToolCard x={40} y={30} w={660} {...TRA_HAN_NOP} state="active" frame={17} at={0} />
    <Note x={40} y={455}>active · mô hình đang gọi công cụ này</Note>
  </Stage>
);

export const DisabledAndError = () => (
  <Stage w={1360} h={500}>
    <ToolCard
      x={30} y={30} w={620} state="disabled"
      name="gui_email"
      does="Gửi email cho phụ huynh thay giáo viên."
      inputs={[{ name: 'nguoi_nhan', type: 'email', required: true }, { name: 'noi_dung', type: 'chuỗi', required: true }]}
      returns="Mã thư đã gửi."
    />
    <Note x={30} y={480}>disabled · chưa được cấp quyền</Note>
    <ToolCard
      x={700} y={30} w={620} state="error" illustrative="LỖI MINH HỌA"
      {...TRA_HAN_NOP}
      errorText="Không tìm thấy lớp “AI 101” — thiếu mã lớp hợp lệ."
    />
    <Note x={700} y={480}>error · lời gọi thất bại</Note>
  </Stage>
);

export const Illustrative = () => (
  <Stage w={740} h={430}>
    <ToolCard
      x={40} y={30} w={660} illustrative
      name="dat_lich_phong"
      does="Đặt phòng học cho một buổi ôn tập."
      inputs={[{ name: 'phong', type: 'chuỗi', required: true }, { name: 'gio_bat_dau', type: 'giờ', required: true }, { name: 'so_nguoi', type: 'số' }]}
      returns="Mã đặt phòng hoặc lý do bị từ chối."
    />
  </Stage>
);

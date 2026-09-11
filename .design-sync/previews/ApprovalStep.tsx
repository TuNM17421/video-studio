import React from 'react';
import { ApprovalStep, Card, Flow, anchor, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>;

export const Waiting = () => (
  <Stage w={500} h={320}>
    <ApprovalStep x={30} y={30} title="Thư trả lời khách" lines={['Xin lỗi vì giao hàng trễ,', 'đề xuất mã giảm 10 %']} reviewer="Người duyệt: Minh" action="GỬI" state="waiting" illustrative />
  </Stage>
);

export const States = () => (
  <Stage w={1440} h={320}>
    <ApprovalStep x={30} y={30} title="Thư trả lời khách" lines={['Xin lỗi vì giao hàng trễ,', 'đề xuất mã giảm 10 %']} reviewer="Minh" action="GỬI" state="approved" />
    <ApprovalStep x={500} y={30} title="Hoàn tiền 2 triệu" lines={['Vượt mức tác tử được làm,', 'cần quản lý quyết định']} reviewer="Minh" action="GỬI" state="rejected" />
    <ApprovalStep x={970} y={30} title="Ghi chú cuộc họp" lines={['Minh sửa lại hạn chót', 'trước khi lưu vào hồ sơ']} reviewer="Minh" action="LƯU" state="edited" />
  </Stage>
);

const D = { x: 30, y: 85, w: 250, h: 150 };
export const UnlockMoment = () => (
  <Stage w={860} h={320}>
    <Card {...D} label="MÔ HÌNH" lines={['BẢN NHÁP', 'ghi chú cuộc họp']} />
    <Flow points={[anchor(D, 'right'), { x: 380, y: 160 }]} frame={90} start={10} end={40} />
    <ApprovalStep x={390} y={30} title="Ghi chú cuộc họp" lines={['3 việc cần làm,', 'hạn chót thứ Sáu']} reviewer="Người duyệt: Minh" action="LƯU" state="approved" frame={70} at={60} />
  </Stage>
);

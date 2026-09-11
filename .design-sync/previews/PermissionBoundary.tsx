import React from 'react';
import { PermissionBoundary, Card, Pill, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>;

const REFUND = { x: 650, y: 110, w: 230, h: 140 };

export const RefundOutside = () => (
  <Stage w={920} h={340}>
    <PermissionBoundary x={30} y={50} w={560} h={260} blocked={[REFUND]}>
      <Card x={70} y={110} w={230} h={140} label="CÔNG CỤ" lines={['TRA ĐƠN', 'đọc trạng thái']} />
      <Card x={320} y={110} w={230} h={140} label="CÔNG CỤ" lines={['TRẢ LỜI', 'soạn tin nhắn']} />
    </PermissionBoundary>
    <Card {...REFUND} accent={C.red} label="CÔNG CỤ" lines={['HOÀN TIỀN', 'ngoài phạm vi']} dashed />
  </Stage>
);

export const ReadOnly = () => (
  <Stage w={620} h={300}>
    <PermissionBoundary x={30} y={50} w={560} h={220} label="CHỈ ĐỌC" tone="output" illustrative>
      <Pill x={70} y={130} label="XEM ĐƠN HÀNG" />
      <Pill x={300} y={130} label="XEM LỊCH SỬ" />
      <Pill x={70} y={195} label="TÌM TÀI LIỆU" variant="muted" />
    </PermissionBoundary>
  </Stage>
);

export const TonesAndUnlocked = () => (
  <Stage w={920} h={260}>
    <PermissionBoundary x={30} y={50} w={260} h={170} label="HÀNH ĐỘNG" tone="check">
      <Pill x={75} y={110} w={170} label="ĐẶT LỊCH" />
    </PermissionBoundary>
    <PermissionBoundary x={330} y={50} w={260} h={170} label="RỦI RO CAO" tone="red">
      <Pill x={375} y={110} w={170} label="XÓA DỮ LIỆU" active />
    </PermissionBoundary>
    <PermissionBoundary x={630} y={50} w={260} h={170} label="ĐÃ CẤP" locked={false}>
      <Pill x={675} y={110} w={170} label="GỬI THƯ" />
    </PermissionBoundary>
  </Stage>
);

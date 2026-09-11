import React from 'react';
import { StopGate, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>;

export const FourConditions = () => (
  <Stage w={840} h={260}>
    <StopGate x={120} y={100} label="HẾT BƯỚC" detail="tối đa 10 bước" />
    <StopGate x={320} y={100} label="ĐỦ 3 LẦN" detail="thử lại 3 lần" />
    <StopGate x={520} y={100} label="CẦN NGƯỜI" detail="chờ duyệt" />
    <StopGate x={720} y={100} label="HẾT GIỜ" detail="quá 60 giây" />
  </Stage>
);

export const OneTriggered = () => (
  <Stage w={840} h={260}>
    <StopGate x={120} y={100} label="HẾT BƯỚC" detail="6 / 10 bước" />
    <StopGate x={320} y={100} label="ĐỦ 3 LẦN" detail="lần 3 vẫn lỗi" triggered frame={70} at={60} />
    <StopGate x={520} y={100} label="CẦN NGƯỜI" detail="chưa cần" />
    <StopGate x={720} y={100} label="HẾT GIỜ" detail="còn 40 giây" />
  </Stage>
);

export const IdleVsTriggered = () => (
  <Stage w={500} h={260}>
    <StopGate x={140} y={100} label="CẦN NGƯỜI" detail="đang chạy" />
    <StopGate x={360} y={100} label="CẦN NGƯỜI" detail="dừng · hỏi Minh" triggered />
  </Stage>
);

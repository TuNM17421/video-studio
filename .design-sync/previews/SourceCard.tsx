import React from 'react';
import { SourceCard, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>;

export const VerifiedVsUnverified = () => (
  <Stage w={1000} h={320}>
    <SourceCard x={20} y={30} w={460} title="Quy chế học vụ 2026 · Điều 12" page="[Trang 15]"
      excerpt="Người học rút học phần trong 14 ngày đầu được hoàn 100% học phí." highlight="trong 14 ngày đầu" state="verified" />
    <SourceCard x={520} y={30} w={460} title="“Theo quy định mới nhất…”" page="[không rõ trang]" state="unverified" />
  </Stage>
);

export const ResearchNeutral = () => (
  <Stage w={620} h={270}>
    <SourceCard x={40} y={30} w={540} title="Liu et al. · Lost in the Middle" page="[Trang 3]"
      excerpt="Mô hình dùng thông tin ở đầu và cuối ngữ cảnh tốt hơn thông tin nằm ở giữa." highlight="nằm ở giữa" highlightTone="accent" />
  </Stage>
);

export const Illustrative = () => (
  <Stage w={620} h={300}>
    <SourceCard x={40} y={30} w={540} title="Sổ tay học viên · Mục 3" page="[Trang 8]" illustrative
      excerpt="Bài nộp trễ quá 48 giờ không được chấm lại." highlight="48 giờ" state="verified" />
  </Stage>
);

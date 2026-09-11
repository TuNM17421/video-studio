import React from 'react';
import { C, IllustrativeStamp, ProbabilityBars, Card } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Labels = () => (
  <Stage w={900} h={220}>
    <IllustrativeStamp x={30} y={40} label="MINH HỌA" />
    <IllustrativeStamp x={220} y={40} label="TÓM TẮT MINH HỌA" />
    <IllustrativeStamp x={530} y={40} label="LỖI MINH HỌA" />
    <IllustrativeStamp x={30} y={130} label="CHƯA CHẠY THẬT" />
    <IllustrativeStamp x={300} y={130} label="PHƯƠNG ÁN THIẾT KẾ" />
    <IllustrativeStamp x={610} y={130} label="GIỚI HẠN MINH HỌA" />
  </Stage>
);

export const OnData = () => (
  <Stage w={900} h={360}>
    <ProbabilityBars x={40} y={90} items={[{ label: 'mưa', value: 60, highlight: true }, { label: 'nắng', value: 25 }, { label: 'gió', value: 15 }]} max={100} barW={380} barH={38} rowGap={70} labelW={110} size={26} rounded title="Hôm nay trời …" />
    <IllustrativeStamp x={860} y={30} anchor="top-right" />
  </Stage>
);

export const StampOverResult = () => (
  <Stage w={900} h={300}>
    <Card x={120} y={50} w={540} h={170} label="KẾT QUẢ" lines={['Hạn nộp: 21:00 thứ Sáu', 'nguồn: không có']} />
    <IllustrativeStamp x={690} y={225} label="LỖI MINH HỌA" variant="stamp" anchor="center" />
  </Stage>
);

export const Watermark = () => (
  <Stage w={900} h={300}>
    <rect x={60} y={40} width={780} height={220} rx={22} fill={C.bgAlt} stroke={C.dotInactive} strokeWidth={2} />
    <Card x={120} y={90} w={300} h={120} label="LMS" lines={['Trang bài nộp', 'giao diện giả lập']} />
    <Card x={480} y={90} w={300} h={120} label="HỘP THƯ" lines={['Nhắc hạn nộp', 'thư tự soạn']} />
    <IllustrativeStamp x={450} y={150} variant="watermark" size={90} />
  </Stage>
);

import React from 'react';
import { BrowserFrame, browserContentBox, Chip, C, SvgText, LineIcon } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const Row = ({ x, y, w, title, due, hot }: { x: number; y: number; w: number; title: string; due: string; hot?: boolean }) => (
  <g>
    <rect x={x} y={y} width={w} height={58} rx={14} fill={C.bgAlt} stroke={hot ? C.red : C.dotInactive} strokeWidth={2} />
    <LineIcon name="file-text" x={x + 30} y={y + 29} size={24} color={C.accent} />
    <SvgText x={x + 54} y={y + 36} size={19} weight={600} anchor="start">{title}</SvgText>
    <Chip x={x + w - 170} y={y + 11} w={156} label={due} tone={hot ? 'red' : 'blue'} size={16} />
  </g>
);

const LMS = { x: 30, y: 30, w: 760, h: 380 };
const lmsBody = browserContentBox(LMS, 28);

export const LmsPage = () => (
  <Stage w={820} h={440}>
    <BrowserFrame {...LMS} title="Lớp CLASS-A" url="lms.truong.edu.vn/lop/CLASS-A/bai-tap">
      <SvgText x={lmsBody.x} y={lmsBody.y + 26} size={17} weight={700} anchor="start" color={C.accent}>BÀI TẬP TUẦN 3</SvgText>
      <SvgText x={lmsBody.x} y={lmsBody.y + 64} size={26} weight={700} anchor="start">Nhập môn AI · nộp bài</SvgText>
      <Row x={lmsBody.x} y={lmsBody.y + 94} w={lmsBody.w} title="Bài 3 · Viết prompt tóm tắt" due="21:00 thứ Sáu" hot />
      <Row x={lmsBody.x} y={lmsBody.y + 166} w={lmsBody.w} title="Bài 4 · Đánh giá câu trả lời" due="21:00 thứ Hai" />
    </BrowserFrame>
  </Stage>
);

const Small = ({ x, y, label, active }: { x: number; y: number; label: string; active?: boolean }) => {
  const box = { x, y, w: 360, h: 230 };
  const b = browserContentBox(box, 20);
  return (
    <BrowserFrame {...box} url={`lms.truong.edu.vn/hs/${label}`} active={active ? 1 : 0}>
      <circle cx={b.x + 26} cy={b.y + 30} r={24} fill={C.dotInactive} />
      <LineIcon name="user-check" x={b.x + 26} y={b.y + 30} size={26} color={C.accent} />
      <SvgText x={b.x + 64} y={b.y + 38} size={22} weight={700} anchor="start">{label}</SvgText>
      <rect x={b.x} y={b.y + 76} width={b.w * 0.9} height={12} rx={6} fill={C.dotInactive} />
      <rect x={b.x} y={b.y + 100} width={b.w * 0.62} height={12} rx={6} fill={C.dotInactive} />
    </BrowserFrame>
  );
};

export const CompactScreens = () => (
  <Stage w={820} h={300}>
    <Small x={30} y={30} label="HS-017" />
    <Small x={430} y={30} label="HS-018" active />
  </Stage>
);

export const EmptyCustomTag = () => (
  <Stage w={820} h={300}>
    <BrowserFrame x={30} y={30} w={760} h={240} title="Hộp thư lớp" url="mail.truong.edu.vn/hop-thu" secure={false} illustrative="PHƯƠNG ÁN THIẾT KẾ" />
  </Stage>
);

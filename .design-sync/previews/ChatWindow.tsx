import React from 'react';
import { ChatWindow, C, SvgText } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Tag = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <SvgText x={x} y={y} size={17} weight={700} anchor="start" color={C.textMuted}>{children}</SvgText>
);

const turns = [
  { role: 'user' as const, text: 'Hạn nộp bài 3 của lớp CLASS-A là khi nào?', at: 0 },
  {
    role: 'assistant' as const,
    text: 'Bài 3 (viết prompt tóm tắt) hạn 21:00 thứ Sáu. Em nộp file PDF trên trang LMS của lớp nhé.',
    at: 20,
  },
];

export const Settled = () => (
  <Stage w={820} h={560}>
    <ChatWindow x={130} y={20} w={560} h={500} subtitle="trả lời theo lịch lớp" messages={turns} />
  </Stage>
);

export const MidStream = () => (
  <Stage w={820} h={560}>
    <ChatWindow x={130} y={20} w={560} h={500} subtitle="đang trả lời…" messages={turns} frame={70} streamStart={24} cps={36} />
    <Tag x={130} y={548}>frame 70 · streamStart 24 · cps 36 → nửa câu trả lời</Tag>
  </Stage>
);

export const ToolAndSystem = () => (
  <Stage w={820} h={560}>
    <ChatWindow
      x={130}
      y={20}
      w={560}
      h={500}
      messages={[
        { role: 'system', text: 'Phiên hỗ trợ học vụ · HS-017' },
        { role: 'user', text: 'Cho em xem điểm bài 2 ạ.' },
        { role: 'tool', text: 'tra_diem(ma_hs="HS-017", bai=2)' },
        { role: 'assistant', text: 'Bài 2 của em đạt 8,5 điểm. Nhận xét: cần nêu rõ nguồn.' },
      ]}
      highlightIndex={2}
      draft="Vì sao em bị trừ điểm?"
    />
  </Stage>
);

export const ScrolledLongThread = () => (
  <Stage w={820} h={560}>
    <ChatWindow
      x={130}
      y={20}
      w={560}
      h={500}
      title="Trợ lý khóa học"
      messages={[
        { role: 'user', text: 'Tóm tắt bài giảng hôm nay giúp em.' },
        { role: 'assistant', text: 'Hôm nay học ba ý: prompt là gì, vì sao cần ví dụ, và cách kiểm tra câu trả lời.' },
        { role: 'user', text: 'Ý thứ hai nói kỹ hơn được không?' },
        { role: 'assistant', text: 'Ví dụ giúp mô hình bắt chước đúng định dạng. Hai đến ba ví dụ ngắn thường đủ cho bài tập tuần này.' },
        { role: 'user', text: 'Cảm ơn trợ lý!' },
      ]}
    />
  </Stage>
);

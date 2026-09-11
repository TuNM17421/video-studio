import React from 'react';
import { EmailCard, emailCardHeight, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Draft = () => (
  <Stage w={620} h={420}>
    <EmailCard
      x={40}
      y={30}
      w={540}
      status="BẢN NHÁP"
      dashed
      subject="Nhắc hạn nộp bài 3 · lớp CLASS-A"
      lines={['Chào em, bài 3 hạn 21:00 thứ Sáu.', 'Em nộp file PDF trên trang LMS nhé.', 'Trợ lý học vụ']}
      attachment="huong-dan-bai-3.pdf"
    />
  </Stage>
);

export const StatusPair = () => (
  <Stage w={1000} h={380}>
    <EmailCard x={30} y={30} w={450} h={emailCardHeight(3)} status="CHỜ DUYỆT" subject="Gia hạn cho HS-017" to="gv.lan@truong.edu.vn" lines={3} />
    <EmailCard x={520} y={30} w={450} h={emailCardHeight(3)} status="ĐÃ GỬI" subject="Lịch học bù tuần 4" to="lop-class-a@truong.edu.vn" lines={3} />
  </Stage>
);

export const ActiveBlocked = () => (
  <Stage w={1000} h={380}>
    <EmailCard x={30} y={30} w={450} h={emailCardHeight(3)} status="BỊ CHẶN" subject="Gửi bảng điểm cả lớp" to="phuhuynh@ngoai-truong.vn" lines={3} active={1} />
    <EmailCard x={520} y={30} w={450} h={emailCardHeight(3)} subject="Không có trạng thái" lines={3} illustrative={false} />
  </Stage>
);

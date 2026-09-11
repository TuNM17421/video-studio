import React from 'react';
import { AgentLoop, C } from 'vinuni-lesson-video-ds';

// AgentLoop is an SVG fragment in scene px — preview it inside an <svg viewBox>.
const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const REACT = [
  { label: 'SUY NGHĨ', sub: 'chọn việc tiếp theo', role: 'reasoning' },
  { label: 'HÀNH ĐỘNG', sub: 'gọi công cụ tra lịch', role: 'action' },
  { label: 'QUAN SÁT', sub: 'đọc kết quả trả về', role: 'input' },
];

export const ReActSettled = () => (
  <Stage w={1000} h={700}>
    <AgentLoop cx={500} cy={370} w={620} h={430} stages={REACT} center="VÒNG ReAct" centerSub="lặp đến khi đủ thông tin" />
  </Stage>
);

export const ReActMidLap = () => (
  <Stage w={1000} h={700}>
    <AgentLoop cx={500} cy={370} w={620} h={430} stages={REACT} center="VÒNG ReAct" frame={78} start={0} lap={180} laps={2} />
  </Stage>
);

export const FourBlockAgent = () => (
  <Stage w={1100} h={760}>
    <AgentLoop
      cx={550}
      cy={380}
      w={660}
      h={480}
      stages={[
        { label: 'NHẬN THỨC', sub: 'đọc yêu cầu · tài liệu', role: 'input', icon: 'inbox' },
        { label: 'SUY LUẬN', sub: 'chọn bước tiếp theo', role: 'reasoning', icon: 'git-branch' },
        { label: 'HÀNH ĐỘNG', sub: 'gọi công cụ, gửi thư', role: 'action', icon: 'wrench' },
        { label: 'TRÍ NHỚ', sub: 'ghi lại kết quả', role: 'memory', icon: 'database' },
      ]}
      center="TÁC TỬ AI"
      centerSub="mũi tên kết quả quay lại"
      activeStage={1}
    />
  </Stage>
);

export const Flywheel = () => (
  <Stage w={1100} h={720}>
    <AgentLoop
      variant="flywheel"
      cx={550}
      cy={360}
      r={220}
      stages={[
        { label: 'NGƯỜI DÙNG TĂNG', sub: 'nhiều câu hỏi thật' },
        { label: 'DỮ LIỆU PHẢN HỒI', sub: 'lỗi được ghi lại' },
        { label: 'SẢN PHẨM TỐT HƠN', sub: 'trả lời đúng hơn' },
      ]}
      center="BÁNH ĐÀ"
      centerSub="mỗi vòng quay nhanh hơn"
    />
  </Stage>
);

export const ExitAndError = () => (
  <Stage w={1300} h={760}>
    <AgentLoop
      cx={520}
      cy={400}
      w={600}
      h={440}
      stages={REACT}
      center="VÒNG ReAct"
      errorStage={{ stage: 1, label: 'KẾT QUẢ LỖI' }}
      exit={{ stage: 0, label: 'HOÀN TẤT', sub: 'gửi câu trả lời', side: 'right', length: 150 }}
    />
  </Stage>
);

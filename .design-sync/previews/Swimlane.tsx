import React from 'react';
import { Swimlane, laneBox, laneY, Card, Flow, IllustrativeStamp, C, anchor } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

type Box = { x: number; y: number; w: number; h: number };
// Leave the card sideways, turn into the next lane, enter through its top / bottom edge.
const elbow = (a: Box, b: Box) => {
  const p = anchor(a, 'right');
  if (Math.abs(a.y - b.y) < 1) return [p, anchor(b, 'left')];
  const q = anchor(b, b.y > a.y ? 'top' : 'bottom');
  return [p, { x: q.x, y: p.y }, q];
};

// Day 3 · tool calling in 5 steps, one lane per actor.
const L5 = {
  x: 30, y: 30, w: 1540, h: 900, headerW: 220,
  lanes: [
    { label: 'NGƯỜI DÙNG', icon: 'users', tone: 'input' },
    { label: 'ỨNG DỤNG', icon: 'app-window', sub: 'điều phối' },
    { label: 'MÔ HÌNH', icon: 'bot', tone: 'reasoning' },
    { label: 'CÔNG CỤ', icon: 'wrench', tone: 'action' },
    { label: 'DỮ LIỆU', icon: 'database', tone: 'memory' },
  ],
};
const CW = 196, CH = 140;
const col = (k: number) => laneBox(L5, 0).x + 20 + k * 218;
const cell = (k: number, lane: number): Box => ({ x: col(k), y: laneY(L5, lane) - CH / 2, w: CW, h: CH });
const S1 = cell(0, 0), S2 = cell(1, 1), S3 = cell(2, 2), S4 = cell(3, 3), S4d = cell(3, 4), S5 = cell(4, 2), S6 = cell(5, 0);

export const ToolCallingFiveSteps = () => (
  <Stage w={1600} h={1000}>
    <Swimlane {...L5} activeLane={3}>
      <Card {...S1} size={21} label="BƯỚC 1" lines={['CÂU HỎI', 'hạn nộp AI101?']} />
      <Card {...S2} size={21} label="BƯỚC 2" lines={['GỬI MÔ HÌNH', 'câu hỏi + tool']} />
      <Card {...S3} size={21} label="BƯỚC 3" lines={['CHỌN TOOL', 'tra_han_nop']} />
      <Card {...S4} size={21} label="BƯỚC 4" accent={C.red} lines={['CHẠY TOOL', 'ma_lop=AI101']} />
      <Card {...S4d} size={21} label="BẢNG" lines={['HẠN NỘP', 'đọc 1 dòng']} />
      <Card {...S5} size={21} label="BƯỚC 5" lines={['SOẠN LỜI', 'dựa kết quả']} />
      <Card {...S6} size={21} label="TRẢ LỜI" lines={['23:59 THỨ SÁU', 'kèm nguồn']} />
      <Flow points={elbow(S1, S2)} progress={1} />
      <Flow points={elbow(S2, S3)} progress={1} />
      <Flow points={elbow(S3, S4)} progress={1} color={C.red} />
      <Flow points={[anchor(S4, 'bottom'), anchor(S4d, 'top')]} progress={1} strokeWidth={4} />
      <Flow points={elbow(S4, S5)} progress={1} />
      <Flow points={elbow(S5, S6)} progress={1} />
    </Swimlane>
    <IllustrativeStamp x={1570} y={950} anchor="top-right" />
  </Stage>
);

// "Ba làn ngang cùng nhận một thẻ yêu cầu" — same request, three strategies; the chosen lane is active.
const L3 = {
  x: 30, y: 30, w: 1340, h: 540, headerW: 250,
  lanes: [
    { label: 'TRẢ LỜI NGAY', icon: 'send', tone: 'output', sub: 'chỉ dùng prompt' },
    { label: 'TRA TÀI LIỆU', icon: 'search', tone: 'memory', sub: 'lấy đoạn liên quan' },
    { label: 'GỌI CÔNG CỤ', icon: 'wrench', tone: 'action', sub: 'hỏi hệ thống thật' },
  ],
};
export const SameRequestThreeLanes = () => (
  <Stage w={1400} h={600}>
    <Swimlane {...L3} activeLane={2}>
      {[0, 1, 2].map((i) => {
        const req = { x: laneBox(L3, i).x + 30, y: laneY(L3, i) - 70, w: 330, h: 140 };
        const out = { x: laneBox(L3, i).x + 640, y: laneY(L3, i) - 70, w: 380, h: 140 };
        const lines = [['ĐOÁN THEO TRÍ NHỚ', 'có thể sai ngày'], ['TRÍCH QUY CHẾ', 'không có hạn riêng lớp'], ['HẠN THẬT CỦA LỚP', 'từ hệ thống LMS']][i];
        return (
          <g key={i}>
            <Card {...req} size={21} label="YÊU CẦU" lines={['HẠN NỘP BÀI?', 'lớp AI101']} />
            <Flow points={[anchor(req, 'right'), anchor(out, 'left')]} progress={1} color={i === 2 ? C.red : C.accent} />
            <Card {...out} size={21} accent={i === 2 ? C.red : C.accent} label="KẾT QUẢ" lines={lines} />
          </g>
        );
      })}
    </Swimlane>
  </Stage>
);

// Four compact lanes mid-reveal (frame 22: lanes 0–1 in, 2 fading in, 3 not yet).
export const RevealingFourLanes = () => (
  <Stage w={1400} h={480}>
    <Swimlane
      x={30} y={30} w={1340} h={400} frame={22} start={0} per={10}
      lanes={[
        { label: 'NGƯỜI DÙNG', icon: 'users', tone: 'input' },
        { label: 'ỨNG DỤNG', icon: 'app-window' },
        { label: 'MÔ HÌNH', icon: 'bot', tone: 'process' },
        { label: 'DỮ LIỆU', icon: 'database', tone: 'memory' },
      ]}
    />
  </Stage>
);

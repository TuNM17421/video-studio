import React from 'react';
import { Tray, trayItemBox, C, SvgText, LineIcon } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

const Item = ({ box, title, sub, hot }: { box: { x: number; y: number; w: number; h: number }; title: string; sub: string; hot?: boolean }) => (
  <g>
    <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={16} fill={C.bg} stroke={hot ? C.red : C.dotInactive} strokeWidth={2} />
    <LineIcon name="mail" x={box.x + 30} y={box.y + box.h / 2} size={26} color={hot ? C.red : C.accent} />
    <SvgText x={box.x + 56} y={box.y + 34} size={18} weight={700} anchor="start">{title}</SvgText>
    <SvgText x={box.x + 56} y={box.y + 60} size={16} weight={500} anchor="start" color={C.textMuted}>{sub}</SvgText>
  </g>
);

const A = { x: 30, y: 30, w: 300, h: 380 };
const B = { x: 350, y: 30, w: 300, h: 380 };
const D = { x: 670, y: 30, w: 300, h: 380 };
const opt = { itemH: 84 };

export const Pipeline = () => (
  <Stage w={1000} h={440}>
    <Tray {...A} label="BẢN NHÁP" count={3} icon="pencil">
      <Item box={trayItemBox(A, 0, opt)} title="Nhắc hạn bài 3" sub="21:00 thứ Sáu" />
      <Item box={trayItemBox(A, 1, opt)} title="Lịch học bù" sub="lớp CLASS-A" />
      <Item box={trayItemBox(A, 2, opt)} title="Gia hạn HS-017" sub="chờ xác nhận" />
    </Tray>
    <Tray {...B} label="CHỜ DUYỆT" count={1} icon="hourglass" tone="memory" active={1}>
      <Item box={trayItemBox(B, 0, opt)} title="Gửi bảng điểm" sub="cần giáo viên duyệt" hot />
    </Tray>
    <Tray {...D} label="ĐÃ GỬI" count={0} icon="send" tone="output" />
  </Stage>
);

export const InputTray = () => (
  <Stage w={700} h={340}>
    <Tray x={30} y={30} w={420} h={280} label="KHAY ĐẦU VÀO" count={12} tone="input">
      <Item box={trayItemBox({ x: 30, y: 30, w: 420, h: 280 }, 0, opt)} title="Câu hỏi của HS-017" sub="hạn nộp bài 3 là khi nào?" />
      <Item box={trayItemBox({ x: 30, y: 30, w: 420, h: 280 }, 1, opt)} title="Câu hỏi của HS-018" sub="xin nộp muộn một ngày" />
    </Tray>
    <Tray x={480} y={30} w={190} h={280} label="ĐÃ LƯU" icon="archive" emptyLabel="Chưa có" />
  </Stage>
);

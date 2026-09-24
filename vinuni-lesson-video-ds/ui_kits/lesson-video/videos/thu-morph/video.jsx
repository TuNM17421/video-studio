import React from 'react';
import { Eyebrow, SceneFrame } from '../../../../components/index.js';
import { useFrame } from '../../../../lib/index.js';
import { PLAY_DURATION, TIMELINE } from './timeline.js';
import MorphLayer from './morph.jsx';

/*
 * THỬ NGHIỆM (20 giây, không lời đọc) — biến hình kiểu 3Blue1Brown trên NỀN TRẮNG hiện tại.
 * Không đụng bảng 9 màu, không đụng chrome: mục đích là tách biến số cần duyệt (nền tối) ra khỏi biến số
 * cần kỹ thuật (morph + thang độ đậm nhạt + nhịp chậm). Nếu morph không gánh được ở đây thì nền tối cũng
 * không cứu; nếu gánh được thì nền tối chỉ còn là lớp áo tuỳ chọn.
 */
export const meta = {
  id: 'thu-morph',
  title: 'Thử · Biến hình trên nền trắng',
  pattern: 'Thử nghiệm · 20 giây · không lời đọc',
  duration: PLAY_DURATION,
  markers: TIMELINE.map((t) => ({ frame: t.start, label: `Chặng ${t.n} · ${t.screen}` })),
};

export default function ThuMorph() {
  const frame = useFrame();
  return (
    <SceneFrame frame={frame} header={false} footer={{ left: 'Thử · biến hình nền trắng', right: '20 giây' }} overlay={<Eyebrow>THỬ NGHIỆM · BIẾN HÌNH</Eyebrow>}>
      <MorphLayer frame={frame} />
    </SceneFrame>
  );
}

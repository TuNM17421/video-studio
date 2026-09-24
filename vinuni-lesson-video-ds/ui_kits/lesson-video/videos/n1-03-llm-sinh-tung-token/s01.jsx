import React from 'react';
import { ChatWindow } from '../../../../components/index.js';
import { appear, useFrame } from '../../../../lib/index.js';
import { Scene } from './shared.jsx';

/* Câu 01 — chữ hiện dần trong một bong bóng trả lời: thứ người xem đã thấy hằng ngày. */
const N = 1;
export default function S01() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <ChatWindow
        x={460} y={280} w={1000} h={560}
        title="Trợ lý hội thoại" frame={frame} cps={16} opacity={appear(frame, 6)}
        messages={[
          { role: 'user', text: 'Giải thích giúp mình cách mô hình viết câu trả lời.', at: 12 },
          { role: 'assistant', text: 'Mô hình không viết cả câu một lúc. Nó tạo từng mảnh nhỏ, rồi dùng phần vừa có để viết tiếp.', at: 60 },
        ]}
      />
    </Scene>
  );
}

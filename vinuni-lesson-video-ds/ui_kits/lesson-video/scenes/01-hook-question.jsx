import React from 'react';
import { Card, Flow, HookOverlay, Pill, SceneFrame } from '../../../components/index.js';
import { C, anchor, appear, pulse, useFrame } from '../../../lib/index.js';

export const meta = {
  id: 'hook-question',
  title: 'Hook mở đầu → cảnh 1',
  pattern: 'Hook 150 f + nội dung',
  duration: 330,
};

/** The hook is part of scene 1: authored content runs on c = frame − HOOK, after the hook clears. */
const HOOK = 150;

const CAPTIONS = [
  { start: 0, end: 150, text: 'Cùng một câu hỏi, AI trả lời hai cách khác nhau: đó có phải là lỗi?' },
  { start: 150, end: 244, text: 'Phần mềm theo quy tắc: cùng điều kiện thì cùng một kết quả.' },
  { start: 244, end: 330, text: 'Nhưng một đầu ra ngôn ngữ có thể có nhiều cách viết đúng.' },
];

const left = { x: 250, y: 400, w: 560, h: 200 };
const right = { x: 1110, y: 400, w: 560, h: 200 };

export default function HookQuestion() {
  const frame = useFrame();
  const c = frame - HOOK;
  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 05 · THIẾT KẾ SẢN PHẨM AI"
      title="Cùng điều kiện, cùng kết quả?"
      tag="MINH HỌA"
      footer={{ left: '02 / 06 · Sản phẩm AI và ba lớp bất định' }}
      captions={CAPTIONS}
      overlay={<HookOverlay frame={frame} question={'Cùng một câu hỏi, AI trả lời\nhai cách khác nhau: đó có phải lỗi?'} />}
    >
      <Card
        {...left}
        label="PHẦN MỀM THEO QUY TẮC"
        lines={['Cùng điều kiện', '→ cùng kết quả']}
        size={30}
        lineHeight={42}
        opacity={appear(c, 6)}
        active={pulse(c, 36)}
      />
      <Flow points={[anchor(left, 'right'), anchor(right, 'left')]} frame={c} start={40} end={96} color={C.red} />
      <Card
        {...right}
        accent={C.red}
        label="ĐẦU RA NGÔN NGỮ"
        lines={['“Ưu tiên xử lý”', '“Cần xử lý gấp”']}
        size={30}
        lineHeight={42}
        opacity={appear(c, 60)}
        active={pulse(c, 96)}
      />
      <Pill x={770} y={660} w={380} label="CHƯA ĐỦ ĐỂ CHẤM NGÔN NGỮ" active opacity={appear(c, 124)} />
    </SceneFrame>
  );
}

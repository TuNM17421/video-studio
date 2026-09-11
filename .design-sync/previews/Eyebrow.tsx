import React from 'react';
import { Eyebrow, CenterHeader, Card, Player, C } from 'vinuni-lesson-video-ds';

// Eyebrow is HTML absolutely positioned on the 1920×1080 stage (.vk-scene) — preview it in a 16:9 Player frame.
const Frame = ({ scene }: { scene: React.ComponentType }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
    <Player scene={scene} duration={1} frame={0} controls={false} />
  </div>
);

function HeaderScene() {
  return (
    <div className="vk-scene" style={{ background: C.bg }}>
      <svg className="vk-svg" viewBox="0 0 1920 1080" width={1920} height={1080}>
        <CenterHeader title="Nhận thức và suy luận" tag="MINH HỌA" />
        <Card x={760} y={420} w={400} h={170} label="NHẬN THỨC" lines={['NHẬN THÔNG TIN', 'câu hỏi · tài liệu']} size={28} lineHeight={40} />
      </svg>
      <Eyebrow>NGÀY 03 · TỪ MÔ HÌNH ĐẾN TÁC TỬ</Eyebrow>
    </div>
  );
}

function AloneScene() {
  return (
    <div className="vk-scene" style={{ background: C.bg }}>
      <Eyebrow top={480}>NGÀY 05 · THIẾT KẾ SẢN PHẨM AI</Eyebrow>
      <Eyebrow top={560} opacity={0.4}>ĐANG HIỆN DẦN · OPACITY 0.4</Eyebrow>
    </div>
  );
}

export const OverTitle = () => <Frame scene={HeaderScene} />;
export const PositionAndFade = () => <Frame scene={AloneScene} />;

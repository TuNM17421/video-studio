import React from 'react';
import { SubtitleBar, CenterHeader, Card, Player, C } from 'vinuni-lesson-video-ds';

// SubtitleBar is an HTML navy bar at the bottom 96 px of the 1920×1080 stage — preview in a 16:9 Player frame.
const Frame = ({ scene }: { scene: React.ComponentType }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
    <Player scene={scene} duration={1} frame={0} controls={false} />
  </div>
);

function ShortScene() {
  return (
    <div className="vk-scene" style={{ background: C.bg }}>
      <svg className="vk-svg" viewBox="0 0 1920 1080" width={1920} height={1080}>
        <CenterHeader title="Agent gồm những khối nào?" />
        <Card x={760} y={440} w={400} h={170} label="SUY LUẬN" lines={['CHỌN VIỆC TIẾP', 'hỏi lại mã lớp']} size={28} lineHeight={40} />
      </svg>
      <SubtitleBar text="Mình gắn bốn nhóm việc với bốn tên trong sơ đồ." />
    </div>
  );
}

function LongScene() {
  return (
    <div className="vk-scene" style={{ background: C.bg }}>
      <SubtitleBar text="Mô hình không tra cứu đáp án, nó chọn token có xác suất cao nhất ở mỗi bước." />
    </div>
  );
}

export const ShortLine = () => <Frame scene={ShortScene} />;
export const MaxLength = () => <Frame scene={LongScene} />;

import React from 'react';
import { SceneFrame, Player, Card, Flow, GlassNode, ZoneLabel, C, useFrame } from 'vinuni-lesson-video-ds';

// SceneFrame fills the 1920×1080 stage. Player scales that stage to fit its container,
// so give Player a positioned 16:9 box and freeze it on a frame.
const Frame = ({ scene }: { scene: React.ComponentType }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
    <Player scene={scene} duration={1} frame={0} controls={false} />
  </div>
);

function CenterScene() {
  const frame = useFrame();
  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 03 · TỪ MÔ HÌNH ĐẾN TÁC TỬ"
      title="Nhận thức và suy luận"
      tag="MINH HỌA"
      footer={{ left: '02 / 06 · Agent gồm những khối nào?' }}
      caption="Mình gắn bốn nhóm việc với bốn tên trong sơ đồ."
    >
      <Card x={300} y={380} w={420} h={170} label="NHẬN THỨC" lines={['NHẬN THÔNG TIN', 'câu hỏi · tài liệu']} size={28} lineHeight={40} />
      <Flow points={[{ x: 720, y: 465 }, { x: 1200, y: 465 }]} progress={1} color={C.red} />
      <Card x={1200} y={380} w={420} h={170} accent={C.red} label="SUY LUẬN" lines={['CHỌN VIỆC TIẾP', 'hỏi lại mã lớp']} size={28} lineHeight={40} active={0.6} />
    </SceneFrame>
  );
}

function EditorialScene() {
  return (
    <SceneFrame
      frame={40}
      variant="editorial"
      kicker="DAY 28 · INTEGRATION CONTROLS"
      title="Event đã nối data."
      titleAccent="Còn hai rủi ro khác."
      subtitle="GitOps reconcile desired state với actual state."
    >
      <GlassNode x={480} y={560} label="GIT · DESIRED" subtitle="reviewed target" icon="document" />
      <Flow points={[{ x: 600, y: 560 }, { x: 1080, y: 560 }]} progress={1} />
      <ZoneLabel x={840} y={510} label="DESIRED" />
      <GlassNode x={1200} y={560} label="CONTROLLER" subtitle="compare · reconcile" icon="gear" tone="strong" />
      <GlassNode x={1560} y={800} label="ACTUAL STATE" subtitle="replicas = 1" icon="alert-bubble" tone="danger" />
    </SceneFrame>
  );
}

function TitleOnlyScene() {
  return (
    <SceneFrame frame={0} eyebrow="NGÀY 02 · AI TẠO SINH" title="Máy đoán chữ tiếp theo thế nào?" tag="MINH HỌA" caption={null}>
      <Card x={760} y={440} w={400} h={170} label="ĐẦU VÀO" icon="chat-bubble" lines={['CÂU HỎI', 'của người học']} size={28} lineHeight={40} />
    </SceneFrame>
  );
}

export const Center = () => <Frame scene={CenterScene} />;
export const Editorial = () => <Frame scene={EditorialScene} />;
export const NoCaption = () => <Frame scene={TitleOnlyScene} />;

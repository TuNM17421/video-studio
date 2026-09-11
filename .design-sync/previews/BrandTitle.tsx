import React from 'react';
import { BrandTitle, SceneFrame, Player, useFrame } from 'vinuni-lesson-video-ds';

// BrandTitle is a full-frame HTML title card: SceneFrame overlay with header={false},
// frozen in a 16:9 Player box after the 18-frame fade + spring have settled.
const Frame = ({ scene, frame = 90 }: { scene: React.ComponentType; frame?: number }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
    <Player scene={scene} duration={150} frame={frame} controls={false} />
  </div>
);

function DefaultScene() {
  const frame = useFrame();
  return (
    <SceneFrame frame={frame} header={false} overlay={<BrandTitle frame={frame} eyebrow="AI & LLM FOUNDATION · NGÀY 1" title="Bên trong một LLM" icon="neural-net" />} />
  );
}

function DocumentScene() {
  const frame = useFrame();
  return (
    <SceneFrame frame={frame} header={false} overlay={<BrandTitle frame={frame} eyebrow="NGÀY 04 · TRUY XUẤT TÀI LIỆU" title="RAG đọc tài liệu thế nào?" icon="document" />} />
  );
}

function NoEyebrowScene() {
  const frame = useFrame();
  return <SceneFrame frame={frame} header={false} overlay={<BrandTitle frame={frame} title="Tác tử chọn công cụ" icon="gear" />} />;
}

export const Default = () => <Frame scene={DefaultScene} />;
export const DocumentIcon = () => <Frame scene={DocumentScene} />;
export const NoEyebrow = () => <Frame scene={NoEyebrowScene} />;
export const Entering = () => <Frame scene={DefaultScene} frame={8} />;

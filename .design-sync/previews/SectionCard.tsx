import React from 'react';
import { SectionCard, SceneFrame, Player, useFrame } from 'vinuni-lesson-video-ds';

// SectionCard is a full-frame HTML chapter break: SceneFrame overlay with header={false}.
// Opacity settles by frame 16, the spring by ~60 — freeze at 90.
const Frame = ({ scene, frame = 90 }: { scene: React.ComponentType; frame?: number }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
    <Player scene={scene} duration={120} frame={frame} controls={false} />
  </div>
);

function WithIconScene() {
  const frame = useFrame();
  return <SceneFrame frame={frame} header={false} overlay={<SectionCard frame={frame} number={2} label="Transformer & Self-Attention" eyebrow="PHẦN 2" icon="layers" />} />;
}

function PlainScene() {
  const frame = useFrame();
  return <SceneFrame frame={frame} header={false} overlay={<SectionCard frame={frame} number="03" label="Đo trên cả tập trường hợp" eyebrow="PHẦN 3" />} />;
}

function NoEyebrowScene() {
  const frame = useFrame();
  return <SceneFrame frame={frame} header={false} overlay={<SectionCard frame={frame} number={1} label="Tìm khó khăn" icon="document" />} />;
}

export const WithIcon = () => <Frame scene={WithIconScene} />;
export const NumberOnly = () => <Frame scene={PlainScene} />;
export const NoEyebrow = () => <Frame scene={NoEyebrowScene} />;
export const Popping = () => <Frame scene={WithIconScene} frame={6} />;

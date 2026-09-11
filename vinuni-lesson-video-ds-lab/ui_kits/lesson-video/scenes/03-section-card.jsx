import React from 'react';
import { SceneFrame, SectionCard } from '../../../components/index.js';
import { useFrame } from '../../../lib/index.js';

export const meta = {
  id: 'section-card',
  title: 'Thẻ mở chương',
  pattern: 'Section number card',
  duration: 120,
};

export default function SectionCardScene() {
  const frame = useFrame();
  return (
    <SceneFrame
      frame={frame}
      header={false}
      overlay={<SectionCard frame={frame} number={2} label="Transformer & Self-Attention" eyebrow="Phần 2 · Bên trong mô hình" icon="layers" />}
    />
  );
}

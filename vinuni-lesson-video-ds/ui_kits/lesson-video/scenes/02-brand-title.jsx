import React from 'react';
import { BrandTitle, SceneFrame } from '../../../components/index.js';
import { useFrame } from '../../../lib/index.js';

export const meta = {
  id: 'brand-title',
  title: 'Thẻ tiêu đề thương hiệu',
  pattern: 'Title card',
  duration: 150,
};

export default function BrandTitleScene() {
  const frame = useFrame();
  return (
    <SceneFrame
      frame={frame}
      header={false}
      overlay={<BrandTitle frame={frame} eyebrow="AI & LLM Foundation · Ngày 1" title="Bên trong một LLM: dự đoán, chú ý và chi phí" icon="neural-net" />}
    />
  );
}

import React from 'react';
import { GlassNode, Flow, ZoneLabel, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const Default = () => (
  <Stage w={320} h={220}>
    <GlassNode x={160} y={110} label="CƠ SỞ DỮ LIỆU" subtitle="lưu hồ sơ học viên" icon="database" />
  </Stage>
);

export const Tones = () => (
  <Stage w={860} h={220}>
    <GlassNode x={150} y={110} label="GIT · DESIRED" subtitle="cấu hình đã duyệt" icon="document" />
    <GlassNode x={430} y={110} label="CONTROLLER" subtitle="so sánh · đồng bộ" icon="gear" tone="strong" />
    <GlassNode x={710} y={110} label="ACTUAL STATE" subtitle="replicas = 1" icon="alert-bubble" tone="danger" />
  </Stage>
);

export const PipelineWithLane = () => (
  <Stage w={900} h={260}>
    <GlassNode x={160} y={150} label="NGUỒN" subtitle="sự kiện đơn hàng" icon="chat-bubble" />
    <Flow points={[{ x: 280, y: 150 }, { x: 620, y: 150 }]} progress={1} />
    <ZoneLabel x={450} y={60} label="XỬ LÝ" />
    <GlassNode x={740} y={150} label="PIPELINE" subtitle="xử lý · ghi lại" icon="gear" tone="strong" />
  </Stage>
);

export const MutedAndLabelOnly = () => (
  <Stage w={600} h={220}>
    <GlassNode x={150} y={110} label="BỘ NHỚ ĐỆM" subtitle="ngoài phạm vi" icon="layers" muted />
    <GlassNode x={440} y={110} label="API GATEWAY" subtitle="chỉ nhãn, không icon" />
  </Stage>
);

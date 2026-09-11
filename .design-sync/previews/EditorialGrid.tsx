import React from 'react';
import { EditorialGrid, GlassNode, Flow, C } from 'vinuni-lesson-video-ds';

// EditorialGrid is an SVG <g> spanning the whole 1920×1080 scene.
const Stage = ({ viewBox, children }: { viewBox: string; children: React.ReactNode }) => (
  <svg viewBox={viewBox} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const FullScene = () => (
  <Stage viewBox="0 0 1920 1080">
    <EditorialGrid />
  </Stage>
);

export const WithDiagram = () => (
  <Stage viewBox="0 0 1920 1080">
    <EditorialGrid />
    <GlassNode x={600} y={540} label="GIT · DESIRED" subtitle="reviewed target" icon="document" />
    <Flow points={[{ x: 720, y: 540 }, { x: 1200, y: 540 }]} progress={1} />
    <GlassNode x={1320} y={540} label="CONTROLLER" subtitle="compare · reconcile" icon="gear" tone="strong" />
  </Stage>
);

import React from 'react';
import { EditorialHeader, EditorialGrid, Player, C } from 'vinuni-lesson-video-ds';

// EditorialHeader is HTML, left-aligned on the 1920×1080 stage — preview in a 16:9 Player frame.

// Crop: show only region (x,y,w,h) of the 1920×1080 stage, scaled up to the cell width.
const Crop = ({ x, y, w, h, scene }: { x: number; y: number; w: number; h: number; scene: React.ComponentType }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: `${w} / ${h}`, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', width: `${(1920 / w) * 100}%`, aspectRatio: '16 / 9', left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` }}>
      <Player scene={scene} duration={1} frame={0} controls={false} />
    </div>
  </div>
);
const Grid = () => (
  <svg className="vk-svg" viewBox="0 0 1920 1080" width={1920} height={1080}>
    <EditorialGrid />
  </svg>
);

function FullScene() {
  return (
    <div className="vk-scene" style={{ background: C.bg }}>
      <Grid />
      <EditorialHeader
        kicker="DAY 28 · INTEGRATION CONTROLS"
        title="Mọi component đều xanh."
        titleAccent="Vì sao platform vẫn sai?"
        subtitle="GitOps reconcile desired state với actual state."
      />
    </div>
  );
}

function PlainScene() {
  return (
    <div className="vk-scene" style={{ background: C.bg }}>
      <Grid />
      <EditorialHeader kicker="DAY 29 · OBSERVABILITY" title="Log, metric và trace kể ba câu chuyện khác nhau." titleSize={46} />
    </div>
  );
}

function EnteringScene() {
  return (
    <div className="vk-scene" style={{ background: C.bg }}>
      <Grid />
      <EditorialHeader frame={4} kicker="DAY 28 · INTEGRATION CONTROLS" title="Event đã nối data." titleAccent="Còn hai rủi ro khác." subtitle="Subtitle chưa hiện ở frame 4." />
    </div>
  );
}

export const WithAccent = () => <Crop x={0} y={0} w={1920} h={420} scene={FullScene} />;
export const NoAccent = () => <Crop x={0} y={0} w={1920} h={420} scene={PlainScene} />;
export const Entering = () => <Crop x={0} y={0} w={1920} h={420} scene={EnteringScene} />;

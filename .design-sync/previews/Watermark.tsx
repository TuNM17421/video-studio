import React from 'react';
import { Watermark, CenterHeader, Player, C } from 'vinuni-lesson-video-ds';

// Watermark is HTML pinned top-right of the 1920×1080 stage — preview in a 16:9 Player frame.
const Frame = ({ scene }: { scene: React.ComponentType }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
    <Player scene={scene} duration={1} frame={0} controls={false} />
  </div>
);

// Crop: show only region (x,y,w,h) of the 1920×1080 stage, scaled up to the cell width.
const Crop = ({ x, y, w, h, scene }: { x: number; y: number; w: number; h: number; scene: React.ComponentType }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: `${w} / ${h}`, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', width: `${(1920 / w) * 100}%`, aspectRatio: '16 / 9', left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` }}>
      <Player scene={scene} duration={1} frame={0} controls={false} />
    </div>
  </div>
);

function DefaultScene() {
  return (
    <div className="vk-scene" style={{ background: C.bg }}>
      <svg className="vk-svg" viewBox="0 0 1920 1080" width={1920} height={1080}>
        <CenterHeader title="Máy đoán chữ tiếp theo thế nào?" />
      </svg>
      <Watermark />
    </div>
  );
}

function CustomScene() {
  return (
    <div className="vk-scene" style={{ background: C.bg }}>
      <Watermark label="VinUni · Ngày 28 · Integration" />
    </div>
  );
}

export const Default = () => <Crop x={1120} y={0} w={800} h={120} scene={DefaultScene} />;
export const CustomLabel = () => <Crop x={1120} y={0} w={800} h={260} scene={CustomScene} />;
export const InScene = () => <Frame scene={DefaultScene} />;

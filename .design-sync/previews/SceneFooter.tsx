import React from 'react';
import { SceneFooter, SubtitleBar, Player, C } from 'vinuni-lesson-video-ds';

// SceneFooter is HTML at the bottom of the 1920×1080 stage (under the subtitle bar) — preview in a 16:9 Player frame.
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

function LeftRightScene() {
  return (
    <div className="vk-scene" style={{ background: C.bg }}>
      <SceneFooter left="02 / 06 · Agent gồm những khối nào?" right="NGÀY 03" />
    </div>
  );
}

function LeftOnlyScene() {
  return (
    <div className="vk-scene" style={{ background: C.bg }}>
      <SceneFooter left="05 / 06 · Máy đoán chữ tiếp theo thế nào?" />
    </div>
  );
}

function UnderCaptionScene() {
  return (
    <div className="vk-scene" style={{ background: C.bg }}>
      <SceneFooter left="01 / 06 · Tóm tắt bức thư" right="MINH HỌA" />
      <SubtitleBar text="Khi phụ đề bật, thanh navy phủ lên phần chân trang." />
    </div>
  );
}

export const LeftAndRight = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <Crop x={80} y={960} w={900} h={120} scene={LeftRightScene} />
    <Crop x={1020} y={960} w={900} h={120} scene={LeftRightScene} />
  </div>
);
export const LeftOnly = () => <Crop x={80} y={960} w={900} h={120} scene={LeftOnlyScene} />;
export const UnderSubtitle = () => <Frame scene={UnderCaptionScene} />;

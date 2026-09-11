import React from 'react';
import { Series, seriesDuration, Player, SceneFrame, SectionCard, Card, useFrame } from 'vinuni-lesson-video-ds';

// Series hard-cuts between scenes; each reads a scene-local frame via useFrame().
// Shown through a frozen Player at a frame inside scene 1 and one inside scene 2.
function ChapterScene() {
  const frame = useFrame();
  return <SceneFrame frame={frame} header={false} overlay={<SectionCard frame={frame} number={1} label="Mô hình ngôn ngữ" eyebrow="PHẦN 1" icon="layers" />} />;
}

function ContentScene() {
  const frame = useFrame();
  return (
    <SceneFrame frame={frame} eyebrow="NGÀY 01 · AI & LLM FOUNDATION" title="Đầu vào trở thành token" tag="MINH HỌA" caption="Câu hỏi được tách thành từng mảnh nhỏ gọi là token.">
      <Card x={300} y={420} w={420} h={170} label="CÂU HỎI" icon="chat-bubble" lines={['HÔM NAY TRỜI', 'đẹp không?']} size={28} lineHeight={40} />
      <Card x={1200} y={420} w={420} h={170} label="TOKEN" lines={['6 MẢNH', 'MINH HỌA']} size={28} lineHeight={40} />
    </SceneFrame>
  );
}

const sequences = [
  { component: ChapterScene, duration: 90, name: 'chapter' },
  { component: ContentScene, duration: 150, name: 'tokens' },
];

function Video() {
  const frame = useFrame();
  return <Series sequences={sequences} frame={frame} />;
}

const Frame = ({ frame }: { frame: number }) => (
  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden' }}>
    <Player scene={Video} duration={seriesDuration(sequences)} frame={frame} controls={false} />
  </div>
);

export const SceneOne = () => <Frame frame={70} />;
export const SceneTwo = () => <Frame frame={180} />;

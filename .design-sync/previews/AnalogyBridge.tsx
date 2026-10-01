import React from 'react';
import { AnalogyBridge, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

// The arc rises 105 px above the cards, so the stage keeps 150 px of headroom above y.
const G = { x: 60, y: 175, w: 1320, h: 220 };

// The canonical analogy from AnalogyBridge.prompt.md, settled (arc drawn, label in).
export const AskingForDirections = () => (
  <Stage w={1440} h={470}>
    <AnalogyBridge {...G} reveal={1} bridge={1}
      everyday={{ title: 'HỎI ĐƯỜNG', sub: 'người lạ đoán ý bạn' }}
      concept={{ title: 'PROMPT', sub: 'mô hình đoán ý bạn' }} />
  </Stage>
);

// Mid-beat: both cards in, the arc half drawn — its label only fades in over the last third.
export const BridgeDrawing = () => (
  <Stage w={1440} h={470}>
    <AnalogyBridge {...G} reveal={1} bridge={0.55}
      everyday={{ title: 'HỎI ĐƯỜNG', sub: 'người lạ đoán ý bạn' }}
      concept={{ title: 'PROMPT', sub: 'mô hình đoán ý bạn' }} />
  </Stage>
);

// First beat: the everyday side alone, before the narration names the concept.
export const EverydaySideOnly = () => (
  <Stage w={1440} h={470}>
    <AnalogyBridge {...G} reveal={0} bridge={0}
      everyday={{ title: 'BÀN LÀM VIỆC', sub: 'chỉ đặt vừa vài tập hồ sơ' }}
      concept={{ title: 'CỬA SỔ NGỮ CẢNH', sub: 'chỉ chứa vừa vài nghìn chữ' }} />
  </Stage>
);

// A second analogy, settled — the same component carries any pair the lesson compares.
export const ContextWindowAsDesk = () => (
  <Stage w={1440} h={470}>
    <AnalogyBridge {...G} reveal={1} bridge={1}
      everyday={{ title: 'BÀN LÀM VIỆC', sub: 'chỉ đặt vừa vài tập hồ sơ' }}
      concept={{ title: 'CỬA SỔ NGỮ CẢNH', sub: 'chỉ chứa vừa vài nghìn chữ' }} />
  </Stage>
);

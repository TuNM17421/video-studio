import React from 'react';
import { MisconceptionCard, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

// Belief card at y; the correction sits 246 px lower (150 card + 96 gap).
const G = { x: 60, y: 60, w: 1000 };
const STAGE = { w: 1120, h: 516 };

// The wording used in the Day 2 lab video: belief struck, correction revealed.
export const BeliefCorrected = () => (
  <Stage {...STAGE}>
    <MisconceptionCard {...G} strike={1} reveal={1}
      wrong={{ title: 'DÙNG LLM LÀ CÓ AGENT', sub: 'dùng mô hình ngôn ngữ là đã có agent' }}
      right={{ title: 'GỌI MÔ HÌNH MỘT LẦN', sub: 'vẫn là chatbot' }} />
  </Stage>
);

// First beat: the belief stands alone, unstruck — the correction is not on screen yet.
export const BeliefOnly = () => (
  <Stage {...STAGE}>
    <MisconceptionCard {...G} strike={0} reveal={0}
      wrong={{ title: 'AGENT THÔNG MINH HƠN', sub: 'thì luôn tốt hơn' }}
      right={{ title: 'ĐẮT HƠN, CHẬM HƠN', sub: 'và khó gỡ lỗi hơn' }} />
  </Stage>
);

// Mid-beat: the red strike crossing the belief title, correction still held back.
export const Striking = () => (
  <Stage {...STAGE}>
    <MisconceptionCard {...G} strike={0.6} reveal={0}
      wrong={{ title: 'AGENT THÔNG MINH HƠN', sub: 'thì luôn tốt hơn' }}
      right={{ title: 'ĐẮT HƠN, CHẬM HƠN', sub: 'và khó gỡ lỗi hơn' }} />
  </Stage>
);

// A third misconception, settled — one card per belief the lesson takes apart.
export const MoreToolsStronger = () => (
  <Stage {...STAGE}>
    <MisconceptionCard {...G} strike={1} reveal={1}
      wrong={{ title: 'CÀNG NHIỀU TOOL CÀNG MẠNH', sub: 'thì agent càng mạnh' }}
      right={{ title: 'NHIỀU TOOL, DỄ CHỌN NHẦM', sub: 'không phải càng mạnh hơn' }} />
  </Stage>
);

import React from 'react';
import { Flow } from '../../../../components/index.js';
import { appear, pulse, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { RoleCard, Scene } from './shared.jsx';

/*
 * Câu 50 — the line of thought as a chain of four cards, each on its words; the micro label (what the
 * concept does) appears when its predicate is spoken.
 */
const N = 50;
export const CHAIN = [
  { tone: 'solution', lines: ['Yêu cầu chatbot'], label: 'HÌNH HÀI GIẢI PHÁP', say: 'yêu cầu chatbot', does: 'hình hài giải pháp' },
  { tone: 'problem', lines: ['Đối tượng phục vụ', 'và pain point'], label: 'LÀM RÕ BÀI TOÁN', say: 'đối tượng phục vụ', does: 'mới giúp làm rõ' },
  { tone: 'user', lines: ['Workflow'], label: 'CÔNG VIỆC THỰC TẾ', say: 'workflow cho thấy', does: 'công việc thực tế' },
  { tone: 'job', lines: ['Metric'], label: 'THEO DÕI KẾT QUẢ', say: 'còn metric', does: 'theo dõi kết quả' },
];
const W = 370;
const GAP = 70;
export const chainBox = (i) => ({ x: 110 + i * (W + GAP), y: 500, w: W, h: 190 });
const T = CHAIN.map((c) => ({ in: spokenAt(N, c.say) - 8, does: spokenAt(N, c.does) - 4 }));

export default function S50() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      {CHAIN.map((c, i) => {
        const b = chainBox(i);
        return (
          <RoleCard
            key={i}
            {...b}
            tone={c.tone}
            label={frame >= T[i].does ? c.label : undefined}
            lines={c.lines}
            size={30}
            opacity={appear(frame, T[i].in)}
            hot={pulse(frame, T[i].does)}
          />
        );
      })}
      {CHAIN.slice(1).map((_, k) => {
        const a = chainBox(k);
        const b = chainBox(k + 1);
        return (
          <Flow
            key={k}
            points={[{ x: a.x + a.w + 8, y: a.y + a.h / 2 }, { x: b.x - 8, y: b.y + b.h / 2 }]}
            frame={frame}
            start={T[k + 1].in - 6}
            end={T[k + 1].in + 18}
          />
        );
      })}
    </Scene>
  );
}

import React from 'react';
import { FormSheet, Icon, SvgText } from '../../../../components/index.js';
import { C, appear, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { PartScene } from './shared.jsx';

/*
 * Câu 06 — part 2: one problem-description form. Each row appears and is highlighted as it is spoken
 * (who · which step · what delay or error). The answer slots stay empty: nothing has been measured yet.
 */
const N = 6;
const T = {
  form: 20,
  rows: [spokenAt(N, 'ai đang gặp khó') - 6, spokenAt(N, 'vướng ở bước nào') - 6, spokenAt(N, 'chậm trễ') - 30],
  clear: 248,
};
const form = { x: 470, y: 440, w: 1000, rowH: 100 };
const ICONS = ['users', 'split-path', 'alert-bubble'];

export default function S06() {
  const frame = useFrame();
  let active = -1;
  if (frame < T.clear) for (let i = 0; i < T.rows.length; i++) if (frame >= T.rows[i]) active = i;
  return (
    <PartScene n={N} frame={frame}>
      <FormSheet
        {...form}
        labelW={430}
        title="PHIẾU MÔ TẢ VẤN ĐỀ"
        rows={[{ label: 'Ai gặp khó?' }, { label: 'Vướng bước nào?' }, { label: 'Chậm hoặc sai ở đâu?' }]}
        reveal={T.rows.map((t) => appear(frame, t))}
        active={active}
        opacity={appear(frame, T.form)}
      />
      {ICONS.map((name, i) => (
        <Icon
          key={name}
          name={name}
          x={form.x - 62}
          y={form.y + 56 + 9 + i * form.rowH + form.rowH / 2}
          size={52}
          color={i === active ? C.red : C.accent}
          opacity={appear(frame, T.rows[i])}
        />
      ))}
      <SvgText x={form.x + form.w / 2} y={form.y + 56 + 3 * form.rowH + 18 + 56} size={22} color={C.textMuted} opacity={appear(frame, T.clear)}>
        Các ô để trống · chưa có kết quả đo
      </SvgText>
    </PartScene>
  );
}

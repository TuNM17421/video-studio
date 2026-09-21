import React from 'react';
import { Card, Flow, SvgText } from '../../../../components/index.js';
import { appear, useFrame } from '../../../../lib/index.js';
import { C } from '../../../../lib/tokens.js';
import { CUES, spokenAt } from './cues.js';
import { Guide, Row, Scene, StepRail } from './shared.jsx';

/*
 * Câu 04 — "Sau đó, agent cắt kịch bản thành từng câu và giữ nguyên văn từng chữ."
 * Bước 2. Kịch bản bên trái tách thành các dòng câu đánh số — chính bốn câu đầu của video này, chép
 * nguyên văn — rồi dòng nhấn "Giữ nguyên văn từng chữ".
 */
const N = 4;
const T = {
  cut: spokenAt(N, 'cắt kịch bản') - 4,
  rows: spokenAt(N, 'từng câu') - 8,
  verbatim: spokenAt(N, 'giữ nguyên văn') - 4,
};

const SCRIPT = { x: 200, y: 470, w: 330, h: 330 };
const ROWS_X = 700;
const ROW_W = 620;
const shorten = (t, max = 40) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);

export default function S04() {
  const frame = useFrame();
  return (
    <Scene n={N} frame={frame}>
      <StepRail frame={frame} active={1} />
      <Card {...SCRIPT} label="KỊCH BẢN" icon="document" lines={['kich-ban-goc.md']} />
      <Flow
        points={[{ x: SCRIPT.x + SCRIPT.w + 14, y: SCRIPT.y + SCRIPT.h / 2 }, { x: ROWS_X - 70, y: SCRIPT.y + SCRIPT.h / 2 }]}
        frame={frame}
        start={T.cut}
        end={T.rows}
        hideIn={[SCRIPT]}
      />
      {CUES.slice(0, 4).map((c, i) => (
        <Row key={c.n} x={ROWS_X} y={470 + i * 80} w={ROW_W} n={c.n} text={shorten(c.text)} opacity={appear(frame, T.rows + i * 6, 12)} />
      ))}
      <SvgText x={ROWS_X} y={836} size={30} weight={800} color={C.red} anchor="start" opacity={appear(frame, T.verbatim, 14)}>
        Giữ nguyên văn từng chữ
      </SvgText>
      <Guide frame={frame} mood={[{ at: 0, name: 'neutral' }, { at: T.verbatim, name: 'wink' }]} />
    </Scene>
  );
}

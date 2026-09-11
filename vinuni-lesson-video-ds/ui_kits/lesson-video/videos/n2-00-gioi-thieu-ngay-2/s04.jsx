import React from 'react';
import { DocumentSheet, Enclosure, Flow, Person, SpeechBubble, SvgText } from '../../../../components/index.js';
import { C, appear, linearProgress, useFrame } from '../../../../lib/index.js';
import { spokenAt } from './cues.js';
import { PartScene } from './shared.jsx';

/*
 * Câu 04 — part 1: the real difficulty behind a request. Right: a learner searching for the submission
 * guide never reaches it (the search stops halfway, red "?"), framed as KHÓ KHĂN THẬT. Left: the request
 * "Làm trợ lý hỗ trợ học viên"; a dashed connector leads from it to the difficulty behind it. MINH HỌA.
 */
const N = 4;
const T = {
  person: 42, // after the map has docked (0–36)
  guide: 50,
  search: [66, 126], // "tìm khó khăn" ≈ f 60; the search stops at 55 %
  stuck: 118,
  frame: spokenAt(N, 'tìm khó khăn') - 4,
  request: spokenAt(N, 'một đề nghị') - 6,
  link: [spokenAt(N, 'làm trợ lý') - 20, spokenAt(N, 'làm trợ lý') + 20],
};
const SEARCH_STOP = 0.55;

const P = { x: 1110, y: 610, r: 70 };
const doc = { x: 1520, y: 522, w: 215 };
const docMidY = doc.y + 84;
const search = [{ x: P.x + P.r + 10, y: docMidY }, { x: doc.x - 10, y: docMidY }];
const stopX = search[0].x + (search[1].x - search[0].x) * SEARCH_STOP;
const box = { x: 900, y: 470, w: 920, h: 340 };
const bubble = { x: 130, y: 585, w: 450, h: 110 };
const linkY = bubble.y + bubble.h / 2;

export default function S04() {
  const frame = useFrame();
  const searched = linearProgress(frame, T.search[0], T.search[1]) * SEARCH_STOP;
  const stuck = appear(frame, T.stuck);
  return (
    <PartScene n={N} frame={frame} dockIn>
      <Enclosure {...box} label="KHÓ KHĂN THẬT" opacity={appear(frame, T.frame)} />
      <Person x={P.x} y={P.y} r={P.r} name="Học viên" role="tìm hướng dẫn nộp bài" opacity={appear(frame, T.person)} />
      <DocumentSheet x={doc.x} y={doc.y} w={doc.w} label="Hướng dẫn nộp bài" opacity={appear(frame, T.guide)} />
      {frame >= T.search[0] ? (
        <Flow points={search} progress={searched} dashed arrow={false} color={C.red} opacity={appear(frame, T.search[0], 18)} />
      ) : null}
      <g opacity={stuck < 1 ? stuck : undefined}>
        <circle cx={stopX} cy={docMidY - 62} r={26} fill={C.redSoft} stroke={C.red} strokeWidth={3} />
        <SvgText x={stopX} y={docMidY - 52} size={30} weight={700} color={C.red}>
          ?
        </SvgText>
        <SvgText x={stopX} y={docMidY + 54} size={21} color={C.textMuted}>
          chưa thấy hướng dẫn
        </SvgText>
      </g>

      <SvgText x={bubble.x} y={bubble.y - 22} size={18} weight={700} anchor="start" color={C.red} letterSpacing={1.2} opacity={appear(frame, T.request)}>
        ĐỀ NGHỊ
      </SvgText>
      <SpeechBubble {...bubble} lines={['Làm trợ lý', 'hỗ trợ học viên']} size={28} opacity={appear(frame, T.request)} />
      <Flow points={[{ x: bubble.x + bubble.w + 8, y: linkY }, { x: box.x - 8, y: linkY }]} frame={frame} start={T.link[0]} end={T.link[1]} dashed />
      <SvgText x={(bubble.x + bubble.w + box.x) / 2} y={linkY - 26} size={20} color={C.textMuted} opacity={appear(frame, T.link[0])}>
        đằng sau đề nghị
      </SvgText>
    </PartScene>
  );
}

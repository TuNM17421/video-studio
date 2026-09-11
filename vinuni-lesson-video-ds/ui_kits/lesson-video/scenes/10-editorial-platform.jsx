import React from 'react';
import { Card, Enclosure, Flow, GlassNode, Particle, SceneFrame, StaticPath, SvgText, ZoneLabel } from '../../../components/index.js';
import {
  C,
  CLAMP,
  anchor,
  appear,
  enterScale,
  interpolate,
  linearProgress,
  pointAtDistance,
  polylineLength,
  pulse,
  smooth,
  useFrame,
} from '../../../lib/index.js';

export const meta = {
  id: 'editorial-platform',
  title: 'Vẽ platform theo đường dữ liệu',
  pattern: 'Editorial (Day28) · system map',
  duration: 420,
};

/*
 * Day28 editorial variant: 120 px grid, left kicker + two-tone title, an operations lane across
 * the top, four system nodes on the data path, a compute foundation underneath, then a governance
 * beat where a new model version travels its own red lane into SERVING.
 *
 * NAMED TECHNOLOGIES (Kafka, Airflow, vLLM, Kubernetes, MLflow…) must use their OFFICIAL logos via
 * GlassNode `logo` (keep the native colors). This template uses generic line icons on purpose.
 */
const T = {
  zones: [4, 8, 12, 16], // lane labels are opaque before the lane draws under them
  lane: [20, 56],
  nodes: [40, 54, 68, 82],
  guides: 88,
  compute: 100,
  flows: [
    [150, 190],
    [196, 236],
    [242, 282],
  ],
  governance: 284,
  vnew: [300, 366], // red pulse on SERVING runs 366 → 420, finishing on the last frame
};

const CAPTIONS = [
  { start: 0, end: 100, text: 'Hãy vẽ platform theo đường dữ liệu, không theo từng component.' },
  { start: 100, end: 150, text: 'Operations và compute cắt ngang toàn bộ đường chính.' },
  { start: 150, end: 242, text: 'Dữ liệu đi từ ingestion qua pipeline tới model management.' },
  { start: 242, end: 284, text: 'Rồi tới serving, nơi model trả kết quả cho người dùng.' },
  { start: 284, end: 420, text: 'Governance kiểm soát phiên bản model mới trước khi vào serving.' },
];

const LANE_Y = 300;
const NODE_Y = 500;
/* 320 px (brief said 250) so "MODEL MANAGEMENT" — 23 px bold, one line — keeps ≥ 20 px of padding,
   including during the 4 % arrival pulse. */
const NODE_W = 320;
const NODE_H = 150;
const NODE_X = [340, 770, 1200, 1630];
const NODES = [
  { label: 'DATA IN', subtitle: 'ingestion', icon: 'database' },
  { label: 'PIPELINE', subtitle: 'processing', icon: 'gear' },
  { label: 'MODEL MANAGEMENT', subtitle: 'version selected', icon: 'layers' },
  { label: 'SERVING', subtitle: 'model endpoint', icon: 'robot' },
];
const BOX = NODE_X.map((x) => ({ x: x - NODE_W / 2, y: NODE_Y - NODE_H / 2, w: NODE_W, h: NODE_H }));
const LANE = [
  { x: 190, y: LANE_Y },
  { x: 1780, y: LANE_Y },
];
/* Lane labels sit between the guide columns so none covers a junction. */
const ZONES = [
  { label: 'OPERATIONS', x: 245 },
  { label: 'BUILD', x: 555 },
  { label: 'DEPLOY', x: 985 },
  { label: 'TELEMETRY', x: 1415 },
];
const COMPUTE = { x: 180, y: 790, w: 1610, h: 110 };
const FLOWS = [0, 1, 2].map((i) => [anchor(BOX[i], 'right'), anchor(BOX[i + 1], 'left')]);

/* Governance beat: a dedicated red lane under the last two nodes, 45 px clear of the guide columns. */
const VNEW = [
  { x: NODE_X[2] + 45, y: BOX[2].y + NODE_H },
  { x: NODE_X[2] + 45, y: 650 },
  { x: NODE_X[3] - 45, y: 650 },
  { x: NODE_X[3] - 45, y: BOX[3].y + NODE_H },
];
const VNEW_LEN = polylineLength(VNEW);
const LEG = VNEW[1].y - VNEW[0].y;
const RUN = VNEW[2].x - VNEW[1].x;
const CLEAR = 14;
const GOV = { x: 1010, y: 395, w: 810, h: 330 };
const LABEL_W = 143;
/* Label shown only where its full width stays between the two guide columns (x 1200 and 1630). */
const LABEL_FADE = [LEG + 36, LEG + 76, LEG + RUN - 76, LEG + RUN - 36];

/**
 * The "MODEL v-new" token rides VNEW at the same distance as the red Flow's line head and is hidden
 * within CLEAR px of both node faces. Its label (Day28 DataParticle pill) sits in a lane BELOW the
 * horizontal run, so it never covers a node, the path still ahead, or a guide column.
 */
function VersionToken({ frame }) {
  if (frame < T.vnew[0] || frame >= T.vnew[1]) return null;
  const d = linearProgress(frame, T.vnew[0], T.vnew[1]) * VNEW_LEN;
  if (d <= CLEAR || d >= VNEW_LEN - CLEAR) return null;
  const p = pointAtDistance(VNEW, d);
  const labelOpacity = interpolate(d, LABEL_FADE, [0, 1, 1, 0], CLAMP);
  return (
    <g>
      <Particle x={p.x} y={p.y} color={C.red} />
      {labelOpacity > 0.001 ? (
        <g opacity={labelOpacity}>
          <rect x={p.x - LABEL_W / 2} y={p.y + 20} width={LABEL_W} height={34} rx={17} fill={C.bg} stroke={C.red} strokeWidth={2} />
          <SvgText x={p.x} y={p.y + 43} size={17} weight={700} color={C.red}>
            MODEL v-new
          </SvgText>
        </g>
      ) : null}
    </g>
  );
}

export default function EditorialPlatform() {
  const frame = useFrame();
  const guides = appear(frame, T.guides, 24) * 0.8;
  const redPulse = pulse(frame, T.vnew[1]);

  return (
    <SceneFrame
      frame={frame}
      variant="editorial"
      kicker="DAY 28 · PLATFORM MAP"
      title="Vẽ platform theo"
      titleAccent="đường dữ liệu."
      subtitle="Compute, Operations và Governance cắt ngang đường chính."
      captions={CAPTIONS}
    >
      {NODE_X.map((x) => (
        <g key={`guide-${x}`}>
          <StaticPath points={[{ x, y: LANE_Y }, { x, y: BOX[0].y }]} color={C.accent} strokeWidth={2} dashed opacity={guides} />
          <StaticPath points={[{ x, y: BOX[0].y + NODE_H }, { x, y: COMPUTE.y }]} color={C.accent} strokeWidth={2} dashed opacity={guides} />
        </g>
      ))}
      <Flow
        points={LANE}
        progress={smooth(frame, T.lane[0], T.lane[1])}
        color={C.accentStrong}
        strokeWidth={6}
        drawBase={false}
        showParticle={false}
        arrow={false}
        opacity={appear(frame, T.lane[0], 10)}
      />
      {ZONES.map((z, i) => (
        <ZoneLabel key={z.label} x={z.x} y={LANE_Y} label={z.label} color={C.accentStrong} opacity={appear(frame, T.zones[i], 14)} />
      ))}

      <Card
        {...COMPUTE}
        accent={C.accentStrong}
        label="COMPUTE FOUNDATION"
        lines={['CPU · GPU · MEMORY · SCHEDULING']}
        size={22}
        opacity={appear(frame, T.compute)}
      />

      {FLOWS.map((points, i) => (
        <Flow key={`flow-${i}`} points={points} frame={frame} start={T.flows[i][0]} end={T.flows[i][1]} />
      ))}

      <Enclosure {...GOV} label="GOVERNANCE" labelX={1290} opacity={appear(frame, T.governance, 30)} />
      <Flow points={VNEW} frame={frame} start={T.vnew[0]} end={T.vnew[1]} color={C.red} showParticle={false} />

      {NODES.map((n, i) => {
        const arrive = i === 0 ? 0 : pulse(frame, T.flows[i - 1][1]);
        const serving = i === 3;
        const tone = serving && redPulse > 0.2 ? 'danger' : arrive > 0.25 ? 'strong' : 'accent';
        const bump = Math.max(arrive, serving ? redPulse : 0);
        return (
          <GlassNode
            key={n.label}
            x={NODE_X[i]}
            y={NODE_Y}
            w={NODE_W}
            h={NODE_H}
            label={n.label}
            subtitle={n.subtitle}
            icon={n.icon}
            tone={tone}
            opacity={appear(frame, T.nodes[i])}
            scale={enterScale(frame, T.nodes[i]) * (1 + 0.04 * bump)}
          />
        );
      })}

      <VersionToken frame={frame} />
    </SceneFrame>
  );
}

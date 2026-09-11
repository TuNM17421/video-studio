import React from 'react';
import { Flow, LineIcon, StopGate, SvgText } from '../../../../components/index.js';
import { C, ROLE, clamp01 } from '../../../../lib/index.js';
import { RoleCard, TONE, ToneLabel } from './shared.jsx';

/*
 * Câu 34–38: the three-situation board (layout started in câu 33). One zone per situation, each a
 * small vertical chain. Zone 1 steps are accent (khách hàng bên ngoài), zone 2 steps accentStrong
 * (nội bộ) so the two chains read as different work, zone 3 is the escalation (orange → green).
 * Step copy = the narration's words only.
 */
export const ZONES = [
  { x: 90, y: 300, w: 560, h: 620 },
  { x: 680, y: 300, w: 560, h: 620 },
  { x: 1270, y: 300, w: 560, h: 620 },
];
export const ZONE_TITLE = ['Chatbot phục vụ khách hàng', 'Chatbot phục vụ nội bộ', 'Câu hỏi phức tạp, rủi ro cao'];
const ZONE_TONE = ['user', 'metric', 'problem'];
const CARD_H = 90;
const GAP = 70;
const TOP = 100;
const PAD = 40;

/** Box of chain row i in zone z. */
export const slot = (z, i) => ({ x: ZONES[z].x + PAD, y: ZONES[z].y + TOP + i * (CARD_H + GAP), w: ZONES[z].w - 2 * PAD, h: CARD_H });

const ITEMS = [
  [{ lines: ['Câu hỏi thường gặp', 'sản phẩm, chính sách'] }, { bot: true, sub: 'giải đáp' }, { lines: ['Tư vấn mua hàng'] }],
  [{ lines: ['Yêu cầu hỗ trợ'] }, { bot: true, sub: 'tra cứu thông tin nghiệp vụ' }, { lines: ['Nháp phản hồi'] }],
];

export function ZoneFrame({ z, opacity = 1, title = 0, hot = 0, muted = 0 }) {
  const b = ZONES[z];
  const o = opacity * (1 - 0.64 * clamp01(muted));
  if (o <= 0.001) return null;
  const tone = ZONE_TONE[z];
  const [stroke] = TONE[tone];
  const a = clamp01(hot);
  return (
    <g opacity={o < 1 ? o : undefined}>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={26} fill={C.bg} stroke={a > 0.001 ? stroke : C.dotInactive} strokeWidth={3 + 2 * a} />
      <ToneLabel x={b.x + 30} y={b.y + 42} tone={tone}>{`TÌNH HUỐNG ${z + 1}`}</ToneLabel>
      {title > 0.001 ? (
        <SvgText x={b.x + 30} y={b.y + 78} size={24} weight={700} anchor="start" color={C.text} opacity={clamp01(title)}>
          {ZONE_TITLE[z]}
        </SvgText>
      ) : null}
    </g>
  );
}

/** Purple "chatbot" step chip (the automated step): bot icon, CHATBOT micro label, one line of what it does. */
export function BotChip({ x, y, w, h, sub, hot = 0, opacity = 1, dashed, muted = 0 }) {
  const o = opacity * (1 - 0.64 * clamp01(muted));
  if (o <= 0.001) return null;
  const a = clamp01(hot);
  return (
    <g opacity={o < 1 ? o : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={ROLE.purpleSoft} stroke={ROLE.purple} strokeWidth={3 + 2 * a} strokeDasharray={dashed ? '12 10' : undefined} />
      {a > 0.001 ? <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx={27} fill="none" stroke={ROLE.purple} strokeWidth={3} opacity={a * 0.35} /> : null}
      <LineIcon name="bot" x={x + 44} y={y + h / 2} size={36} color={ROLE.purple} />
      <SvgText x={x + 84} y={sub ? y + 38 : y + h / 2 + 7} size={18} weight={700} anchor="start" color={ROLE.purple} letterSpacing={1.2}>
        CHATBOT
      </SvgText>
      {sub ? (
        <SvgText x={x + 84} y={y + 68} size={22} weight={600} anchor="start" color={C.text}>
          {sub}
        </SvgText>
      ) : null}
    </g>
  );
}

/** Green "con người tham gia" chip. */
export function HumanChip({ x, y, w, h = 60, label, hot = 0, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const a = clamp01(hot);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={ROLE.greenSoft} stroke={ROLE.green} strokeWidth={3 + 2 * a} />
      <LineIcon name="user-check" x={x + 38} y={y + h / 2} size={30} color={ROLE.green} />
      <SvgText x={x + 66} y={y + h / 2 + 8} size={22} weight={700} anchor="start" color={C.text}>
        {label}
      </SvgText>
    </g>
  );
}

function StepFlow({ points, frame, win, hideIn, settled }) {
  if (settled) return <Flow points={points} progress={1} showParticle={false} fadeIn={false} hideIn={hideIn} />;
  if (!win || frame < win[0]) return null;
  return <Flow points={points} frame={frame} start={win[0]} end={win[1]} hideIn={hideIn} />;
}

/**
 * Chain of zone 0 or 1. `vis` = opacity per row, `flows` = [[start, end], [start, end]] travel windows
 * (omit → settled, both connectors drawn), `hot` = same-hue pulse per row.
 */
export function Chain({ z, frame, vis = [1, 1, 1], flows, hot = [0, 0, 0], muted = 0 }) {
  const m = 1 - 0.64 * clamp01(muted);
  const items = ITEMS[z];
  return (
    <g opacity={m < 1 ? m : undefined}>
      {[0, 1].map((i) => {
        const a = slot(z, i);
        const b = slot(z, i + 1);
        const cx = a.x + a.w / 2;
        return (
          <StepFlow key={`f${i}`} points={[{ x: cx, y: a.y + a.h }, { x: cx, y: b.y }]} frame={frame} win={flows && flows[i]} settled={!flows} hideIn={[a, b]} />
        );
      })}
      {items.map((it, i) => {
        const b = slot(z, i);
        return it.bot ? (
          <BotChip key={i} {...b} sub={it.sub} hot={hot[i]} opacity={vis[i]} />
        ) : (
          <RoleCard key={i} {...b} tone={ZONE_TONE[z]} lines={it.lines} size={24} lineHeight={30} hot={hot[i]} opacity={vis[i]} />
        );
      })}
    </g>
  );
}

/* ── zone 3: the complex / high-risk question is handed to a person ─────────────────────────────── */
const Z3 = ZONES[2];
export const S3 = {
  card: slot(2, 0),
  chip: { x: Z3.x + 40, y: slot(2, 1).y, w: 260, h: CARD_H },
  gate: { x: Z3.x + 392, y: slot(2, 1).y + CARD_H / 2 },
  human: slot(2, 2),
};
const flowA = [
  { x: S3.chip.x + S3.chip.w / 2, y: S3.card.y + S3.card.h },
  { x: S3.chip.x + S3.chip.w / 2, y: S3.chip.y },
];
const flowB = [
  { x: Z3.x + 470, y: S3.card.y + S3.card.h },
  { x: Z3.x + 470, y: S3.human.y },
];

/**
 * Zone 3 chain. `vis` = { card, chip, gate, human } opacities; `flows` = { a: [s, e], b: [s, e] }
 * (omit → settled); `gateAt` = frame the StopGate triggers (omit → triggered); `hot` = { card, human }.
 */
export function Situation3({ frame, vis = { card: 1, chip: 1, gate: 1, human: 1 }, flows, gateAt, hot = {}, muted = 0 }) {
  const m = 1 - 0.64 * clamp01(muted);
  return (
    <g opacity={m < 1 ? m : undefined}>
      <StepFlow points={flowA} frame={frame} win={flows && flows.a} settled={!flows} hideIn={[S3.card, S3.chip]} />
      <StepFlow points={flowB} frame={frame} win={flows && flows.b} settled={!flows} hideIn={[S3.card, S3.human]} />
      <RoleCard {...S3.card} tone="problem" lines={['Câu hỏi phức tạp', 'hoặc rủi ro cao']} size={24} lineHeight={30} hot={hot.card ?? 0} opacity={vis.card} />
      <BotChip {...S3.chip} dashed muted={0.4} opacity={vis.chip} />
      {vis.gate > 0.001 ? (
        gateAt == null ? (
          <StopGate x={S3.gate.x} y={S3.gate.y} r={36} label="CẦN NGƯỜI" triggered opacity={vis.gate} />
        ) : (
          <StopGate x={S3.gate.x} y={S3.gate.y} r={36} label="CẦN NGƯỜI" frame={frame} at={gateAt} opacity={vis.gate} />
        )
      ) : null}
      <RoleCard {...S3.human} tone="job" label="CHUYỂN CHO" lines={['Nhân sự hỗ trợ']} size={26} hot={hot.human ?? 0} opacity={vis.human}>
        <LineIcon name="user-check" x={S3.human.x + 440} y={S3.human.y + S3.human.h / 2} size={36} color={ROLE.green} opacity={vis.human} />
      </RoleCard>
    </g>
  );
}

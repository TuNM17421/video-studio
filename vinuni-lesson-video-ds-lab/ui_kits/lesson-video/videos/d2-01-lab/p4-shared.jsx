import React from 'react';
import { DocumentSheet, Flow, SpeechBubble, Stopwatch, SvgText } from '../../../../components/index.js';
import { C, ROLE, clamp01, textWidth } from '../../../../lib/index.js';
import { Lan, RoleCard, TONE, problemSlotBoxes } from './shared.jsx';

/*
 * Part 4 (câu 24–34) — two stable layouts:
 *  · câu 24–28: "TRƯỚC" request card on the left, the three-slot problem sentence being written on the
 *    right, an annex row underneath (Lan · scattered pages · stopwatch + bubbles, then the full sentence).
 *  · câu 31–33: one MINH HỌA timeline 19:00 → 19:08.
 */
export const BEFORE = { x: 110, y: 420, w: 440, h: 180 };
export const SLOT_BOX = { x: 680, y: 420, w: 1140, h: 180 };
export const SLOTS = problemSlotBoxes(SLOT_BOX);
export const ANNEX_Y = 700;

export function ColumnHeads({ opacity = 1 }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <SvgText x={BEFORE.x} y={BEFORE.y - 30} size={20} weight={700} anchor="start" color={C.textMuted} letterSpacing={2}>
        TRƯỚC
      </SvgText>
      <SvgText x={SLOT_BOX.x} y={SLOT_BOX.y - 30} size={20} weight={700} anchor="start" color={C.accentStrong} letterSpacing={2}>
        VIẾT LẠI THÀNH CÂU VẤN ĐỀ
      </SvgText>
    </g>
  );
}

export function BeforeCard({ opacity = 1, muted = 0, hot = 0 }) {
  return (
    <RoleCard
      {...BEFORE}
      tone="solution"
      label="YÊU CẦU BAN ĐẦU"
      lines={['“Làm trợ lý hội thoại', 'hỗ trợ học viên”']}
      size={27}
      opacity={opacity}
      muted={muted}
      hot={hot}
    />
  );
}

/** Static arrow from the request to the sentence (drawn once in câu 24, kept afterwards). */
export function BeforeArrow({ frame, start, end, opacity = 1 }) {
  const y = BEFORE.y + BEFORE.h / 2;
  const pts = [{ x: BEFORE.x + BEFORE.w + 14, y }, { x: SLOT_BOX.x - 16, y }];
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {frame == null ? <Flow points={pts} progress={1} showParticle={false} /> : <Flow points={pts} frame={frame} start={start} end={end} />}
    </g>
  );
}

/** Center-bottom point of slot i (for connectors down to the annex row). */
export const slotBottom = (i) => ({ x: SLOTS[i].x + SLOTS[i].w / 2, y: SLOTS[i].y + SLOTS[i].h });

/*
 * The full problem sentence in two lines with three chunks lit by soft bands:
 *   0 người dùng (blue) · 1 khó khăn + lúc nào (orange) · 2 hậu quả (orange).
 */
export const SENTENCE_LINES = [
  [
    { t: 'Học viên mới ', k: 0 },
    { t: 'khó tìm đúng hướng dẫn cho lớp mình', k: 1 },
  ],
  [
    { t: 'trước lần nộp bài đầu tiên,', k: 1 },
    { t: ' nên phải chờ hỗ trợ và hỏi lại.', k: 2 },
  ],
];
const CHUNK_TONE = ['user', 'problem', 'problem'];

/** `lit` = per chunk 0–1 band strength; text always ink. Centered on cx; first baseline y. */
export function Sentence({ cx = 960, y, size = 36, lineH = 62, lit = [0, 0, 0], opacity = 1 }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {SENTENCE_LINES.map((line, li) => {
        // Each chunk is pinned to its estimated width (textLength, spacing only) so the bands fit exactly.
        const widths = line.map((s) => textWidth(s.t.trim(), size, 600) * 1.1);
        const gap = textWidth(' ', size) * 1.1;
        const total = widths.reduce((a, b) => a + b, 0) + gap * (line.length - 1);
        let x = cx - total / 2;
        const by = y + li * lineH;
        return (
          <g key={li}>
            {line.map((s, i) => {
              const x0 = x;
              x += widths[i] + gap;
              const a = clamp01(lit[s.k] ?? 0);
              const [stroke, soft] = TONE[CHUNK_TONE[s.k]];
              return (
                <g key={i}>
                  {a > 0.001 ? (
                    <g opacity={a < 1 ? a : undefined}>
                      <rect x={x0 - 8} y={by - size * 0.95} width={widths[i] + 16} height={size * 1.35} rx={10} fill={stroke === C.accent ? C.dotInactive : soft} />
                      <rect x={x0 - 8} y={by + size * 0.3} width={widths[i] + 16} height={4} rx={2} fill={stroke} />
                    </g>
                  ) : null}
                  <text x={x0} y={by} fill={C.text} fontSize={size} fontWeight={600} textLength={widths[i]} lengthAdjust="spacing">
                    {s.t.trim()}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

/* ── timeline of câu 31–33 ────────────────────────────────────────────────────────────────────── */
export const AXIS = { x0: 300, x1: 1620, y: 600 };
export const axisX = (minute) => AXIS.x0 + (minute / 8) * (AXIS.x1 - AXIS.x0);

/** Axis with 19:00 / 19:08 ticks and the two end marks. `draw` 0–1 draws the line left → right. */
export function Timeline({ draw = 1, startMark = 1, endMark = 1, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const { x0, x1, y } = AXIS;
  const xe = x0 + (x1 - x0) * clamp01(draw);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={C.dotInactive} strokeWidth={8} strokeLinecap="round" />
      <line x1={x0} y1={y} x2={xe} y2={y} stroke={C.accent} strokeWidth={8} strokeLinecap="round" />
      {Array.from({ length: 9 }, (_, m) => {
        const x = axisX(m);
        if (x > xe + 1) return null;
        return <line key={m} x1={x} y1={y - 10} x2={x} y2={y + 10} stroke={C.accent} strokeWidth={3} />;
      })}
      <g opacity={startMark < 1 ? startMark : undefined}>
        {startMark > 0.001 ? (
          <>
            <circle cx={x0} cy={y} r={16} fill={C.bg} stroke={C.accent} strokeWidth={5} />
            <SvgText x={x0} y={y + 62} size={30} weight={700} color={C.text}>19:00</SvgText>
            <SvgText x={x0} y={y - 40} size={24} weight={700} color={C.accentStrong}>Bắt đầu tìm</SvgText>
          </>
        ) : null}
      </g>
      <g opacity={endMark < 1 ? endMark : undefined}>
        {endMark > 0.001 ? (
          <>
            <circle cx={x1} cy={y} r={16} fill={ROLE.greenSoft} stroke={ROLE.green} strokeWidth={5} />
            <SvgText x={x1} y={y + 62} size={30} weight={700} color={C.text}>19:08</SvgText>
            <SvgText x={x1} y={y - 68} size={24} weight={700} color={C.text}>Xác nhận đúng</SvgText>
            <SvgText x={x1} y={y - 38} size={24} weight={700} color={C.text}>hướng dẫn của lớp</SvgText>
          </>
        ) : null}
      </g>
    </g>
  );
}

/** The 8-minute band over the axis (câu 32–33). */
export function SpanBand({ fill = 1, label = 1, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const { x0, x1, y } = AXIS;
  const w = (x1 - x0) * clamp01(fill);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x0} y={y - 26} width={w} height={52} rx={14} fill={C.accent} opacity={0.16} />
      <rect x={x0} y={y - 26} width={w} height={52} rx={14} fill="none" stroke={C.accent} strokeWidth={3} />
      {label > 0.001 ? (
        <SvgText x={(x0 + x1) / 2} y={y + 118} size={30} weight={700} color={C.accentStrong} opacity={label}>
          8 phút · tính cả thời gian chờ
        </SvgText>
      ) : null}
    </g>
  );
}

/* ── annex row under the slots (câu 25–27): what each slot points to ───────────────────────────── */
export const LAN_AT = { x: SLOTS[0].x + SLOTS[0].w / 2, y: 790, r: 56 };
export const PAGES = [
  { x: SLOTS[1].x + 16, y: 712, label: 'Bài học' },
  { x: SLOTS[1].x + 150, y: 752, label: 'Tài liệu' },
  { x: SLOTS[1].x + 284, y: 716, label: 'Hộp thư' },
];
export const PAGE_W = 110;
export const WATCH = { x: SLOTS[2].x + 62, y: 800, r: 46 };
export const ASKS = [
  { x: SLOTS[2].x + 132, y: 690, w: 210 },
  { x: SLOTS[2].x + 132, y: 800, w: 210 },
];

export function AnnexLan({ opacity = 1, active = false }) {
  return <Lan x={LAN_AT.x} y={LAN_AT.y} r={LAN_AT.r} active={active} opacity={opacity} />;
}
export function AnnexPages({ opacity = 1, show = [1, 1, 1] }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {PAGES.map((p, i) => (
        <DocumentSheet key={p.label} x={p.x} y={p.y} w={PAGE_W} label={p.label} opacity={show[i]} />
      ))}
    </g>
  );
}
export function AnnexImpact({ opacity = 1, sweep = 0.3, asks = [1, 1], watch = 1 }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <Stopwatch x={WATCH.x} y={WATCH.y} r={WATCH.r} sweep={sweep} color={ROLE.orange} wedge={false} opacity={watch} />
      <SvgText x={WATCH.x} y={WATCH.y + WATCH.r + 36} size={20} weight={700} color={ROLE.orange} opacity={watch}>
        chờ
      </SvgText>
      {ASKS.map((b, i) => (
        <SpeechBubble key={i} x={b.x} y={b.y} w={b.w} h={62} size={21} label="Hỏi lại…" tail="left" opacity={asks[i]} />
      ))}
    </g>
  );
}

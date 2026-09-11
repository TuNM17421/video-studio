import React from 'react';
import { Multiline, SceneFrame, SvgText } from '../../../../components/index.js';
import { LineIcon } from '../../../../components/index.js';
import { C, ROLE, clamp01, cueCaptions, sliceCaptions } from '../../../../lib/index.js';
import { CUES } from './cues.js';
import { TIMELINE } from './timeline.js';

export const EYEBROW = 'NGÀY 02 · XÁC ĐỊNH ĐÚNG VẤN ĐỀ';
export const VIDEO_LABEL = 'N2-M1-01 · “AI chatbot” chưa phải là một bài toán';

/*
 * One color meaning for the whole video (lab role colors, used only for outlines, zone labels and soft
 * fills — never body text or particles). Red keeps the base meaning: emphasis, wrong, question mark.
 *   JOB      green  — nhu cầu / mục tiêu / kết quả cần đạt, đã đủ rõ (đạt)
 *   PROBLEM  orange — điểm đau (pain point), dấu hiệu cảnh báo, rủi ro
 *   SOLUTION purple — giải pháp / chatbot / công nghệ (một hình hài giải pháp, chưa phải bài toán)
 *   UNKNOWN  amber  — điều chưa rõ, câu hỏi còn mở, đang chờ
 *   USER     accent — người dùng, bước workflow, dữ liệu trung tính
 */
export const TONE = {
  job: [ROLE.green, ROLE.greenSoft],
  problem: [ROLE.orange, ROLE.orangeSoft],
  solution: [ROLE.purple, ROLE.purpleSoft],
  unknown: [ROLE.amber, ROLE.amberSoft],
  user: [C.accent, C.bgAlt],
  metric: [C.accentStrong, C.dotInactive],
  neutral: [C.accent, C.bgAlt],
};

// Captions follow the playback timeline, mapped into each scene's authored frames (Series hands scenes
// authored time; with the measured cues.js the two are equal).
const CAPTIONS = cueCaptions(TIMELINE.map((t) => ({ start: t.start, end: t.end, text: t.text, pause: t.pause })));

export const cue = (n) => CUES[n - 1];
export const sceneLength = (n) => CUES[n - 1].end - CUES[n - 1].start;
export const captionsFor = (n) => {
  const t = TIMELINE[n - 1];
  if (!t.text) return [];
  const k = t.authored / t.duration;
  return sliceCaptions(CAPTIONS, t.start, t.duration).map((c) => ({
    start: Math.round(c.start * k),
    end: c.end === t.duration ? t.authored : Math.round(c.end * k),
    text: c.text,
  }));
};
export const footerFor = (n) => ({
  left: VIDEO_LABEL,
  right: `Câu ${String(n).padStart(2, '0')} / ${CUES.length}`,
});

/** Standard scene shell: header from cues.js (title, size, tag), footer, captions. */
export function Scene({ n, frame, overlay, title, tag, children }) {
  const c = cue(n);
  return (
    <SceneFrame
      frame={frame}
      eyebrow={EYEBROW}
      title={title ?? c.title}
      titleSize={c.titleSize}
      tag={tag === undefined ? c.tag : tag}
      footer={footerFor(n)}
      captions={captionsFor(n)}
      overlay={overlay}
    >
      {children}
    </SceneFrame>
  );
}

/** Small uppercase zone label with a colored dot (lab ZoneLabel look, tone from TONE). */
export function ToneLabel({ x, y, tone = 'neutral', children, anchor = 'start', opacity = 1, size = 18 }) {
  if (opacity <= 0.001) return null;
  const [stroke] = TONE[tone] || TONE.neutral;
  const dx = anchor === 'start' ? 18 : anchor === 'end' ? -18 : 0;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {anchor !== 'middle' ? <circle cx={x} cy={y - size * 0.35} r={6} fill={stroke} /> : null}
      <SvgText x={x + dx} y={y} size={size} weight={700} anchor={anchor} color={stroke} letterSpacing={1.2}>
        {children}
      </SvgText>
    </g>
  );
}

/* ── the running example: one chatbot request, two groups of users (câu 19–51) ─────────────────── */

/** The central "chatbot" block — the solution shape. Purple (SOLUTION). `w` ≥ 260. */
export function ChatbotBlock({ x, y, w = 300, h = 120, label = 'CHATBOT AI', sub, hot = 0, opacity = 1, muted = 0, dashed }) {
  return (
    <RoleCard x={x} y={y} w={w} h={h} tone="solution" hot={hot} opacity={opacity} muted={muted} dashed={dashed} lines={sub ? [label, sub] : [label]} size={28}>
      <LineIcon name="bot" x={x + 44} y={y + h / 2} size={40} color={ROLE.purple} />
    </RoleCard>
  );
}

/**
 * The two-workflow board: a Swimlane with lane 0 = KHÁCH HÀNG BÊN NGOÀI, lane 1 = NHÂN SỰ NỘI BỘ.
 * Steps are the script's words only (câu 28–31, 34–36). Use `boardStep(lane, i)` for step boxes so
 * every scene that shows the board puts the same step in the same place.
 */
export const BOARD = {
  x: 90,
  y: 300,
  w: 1740,
  h: 620,
  headerW: 250,
  lanes: [
    { label: 'KHÁCH HÀNG', sub: 'bên ngoài', icon: 'users', tone: 'input' },
    { label: 'NHÂN SỰ', sub: 'nội bộ', icon: 'user-check', tone: 'input' },
  ],
};
export const STEPS = [
  ['Câu hỏi về sản phẩm, chính sách', 'Giải đáp', 'Tư vấn mua hàng', 'Chăm sóc sau mua'],
  ['Yêu cầu hỗ trợ', 'Phân loại yêu cầu', 'Tra cứu nghiệp vụ', 'Nháp phản hồi'],
];
const STEP_W = 300;
const STEP_H = 108;
/** Box of step i (0–3) in lane `lane` of BOARD (or of a board override `b`). */
export function boardStep(lane, i, b = BOARD) {
  const bodyX = b.x + (b.headerW ?? 220) + 40;
  const bodyW = b.w - (b.headerW ?? 220) - 80;
  const gap = (bodyW - 4 * STEP_W) / 3;
  const laneH = b.h / b.lanes.length;
  return { x: bodyX + i * (STEP_W + gap), y: b.y + lane * laneH + (laneH - STEP_H) / 2, w: STEP_W, h: STEP_H };
}

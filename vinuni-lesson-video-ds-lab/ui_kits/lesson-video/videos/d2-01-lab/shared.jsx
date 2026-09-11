import React from 'react';
import { Multiline, Person, SceneFrame, SvgText } from '../../../../components/index.js';
import { C, ROLE, clamp01, cueCaptions, sliceCaptions } from '../../../../lib/index.js';
import { CUES } from './cues.js';
import { TIMELINE } from './timeline.js';

export const EYEBROW = 'NGÀY 02 · XÁC ĐỊNH ĐÚNG VẤN ĐỀ';
export const VIDEO_LABEL = 'N2-01 · Tách giải pháp khỏi vấn đề';

/*
 * One color meaning for the whole video (lab role colors, used only for outlines, zone labels and soft
 * fills — never body text or particles). Red keeps the base meaning: emphasis, wrong, question mark.
 *   JOB      green  — công việc cần hoàn thành, kết quả mong muốn, hướng dẫn ĐÚNG lớp (đạt)
 *   PROBLEM  orange — trở ngại / khó khăn / hậu quả (cảnh báo)
 *   SOLUTION purple — giải pháp đề xuất (một cách giải quyết, chưa chọn)
 *   UNKNOWN  amber  — giả định, điều chưa xác nhận, đang chờ
 *   USER     accent — người dùng, dữ liệu trung tính, câu hỏi nghiên cứu
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

/* ── the two characters (always named with their role, so "who is who" is never in doubt) ──────── */
export function Lan({ x, y, r = 62, role = 'học viên mới', active, opacity = 1 }) {
  return <Person x={x} y={y} r={r} name="Lan" role={role} color={active ? C.red : C.accent} opacity={opacity} />;
}
export function Dung({ x, y, r = 62, role = 'nhân viên hỗ trợ', opacity = 1 }) {
  return <Person x={x} y={y} r={r} name="Dũng" role={role} color={C.accentStrong} opacity={opacity} />;
}

/**
 * A card in a role tone. `hot` (0–1, drive with pulse()) thickens the stroke to 5 px and deepens the
 * soft fill in the SAME hue — this video never flashes a neutral card red (DAY02 feedback).
 * `lines`: first line bold. `label`: micro uppercase label top-left.
 */
export function RoleCard({ x, y, w, h, tone = 'neutral', label, lines = [], size = 26, lineHeight, dashed, hot = 0, opacity = 1, muted = 0, align = 'middle', children }) {
  const o = opacity * (1 - clamp01(muted) * 0.64);
  if (o <= 0.001) return null;
  const [stroke, soft] = TONE[tone] || TONE.neutral;
  const a = clamp01(hot);
  const lh = lineHeight ?? Math.round(size * 1.3);
  const tx = align === 'start' ? x + 28 : x + w / 2;
  return (
    <g opacity={o < 1 ? o : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={tone === 'neutral' ? C.bgAlt : soft} stroke={stroke} strokeWidth={3 + 2 * a} strokeDasharray={dashed ? '12 10' : undefined} />
      {a > 0.001 ? <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx={27} fill="none" stroke={stroke} strokeWidth={3} opacity={a * 0.35} /> : null}
      {label ? (
        <SvgText x={x + 24} y={y + 34} size={17} weight={700} anchor="start" color={stroke} letterSpacing={1.2}>
          {label}
        </SvgText>
      ) : null}
      {lines.length ? (
        <Multiline x={tx} y={y + h / 2 + (label ? 14 : 0)} lines={lines} size={size} lineHeight={lh} firstWeight={700} color={C.text} anchor={align} />
      ) : null}
      {children}
    </g>
  );
}

/* ── the problem sentence: three slots, used from câu 06 to câu 47 ─────────────────────────────── */
export const PROBLEM_SLOTS = [
  { key: 'user', label: 'NGƯỜI DÙNG', ask: 'Ai?', value: ['Học viên mới'] },
  { key: 'obstacle', label: 'KHÓ KHĂN · LÚC NÀO', ask: 'Khó việc gì, khi nào?', value: ['Khó tìm đúng hướng dẫn', 'trước lần nộp bài đầu'] },
  { key: 'impact', label: 'HẬU QUẢ', ask: 'Dẫn tới điều gì?', value: ['Phải chờ hỗ trợ', 'và hỏi lại'] },
];
const SLOT_TONE = ['user', 'problem', 'problem'];

/** Geometry of the three slots in a row starting at (x, y), total width w. */
export function problemSlotBoxes({ x = 160, y = 420, w = 1600, h = 170, gap = 56 } = {}) {
  const ws = [0.26, 0.4, 0.34].map((k) => k * (w - 2 * gap));
  let cx = x;
  return ws.map((sw) => {
    const b = { x: cx, y, w: sw, h };
    cx += sw + gap;
    return b;
  });
}

/**
 * The three-slot problem sentence. Per slot (arrays of 0–1): `show` = slot outline visible, `fill` =
 * value written in (else the dashed "ask" placeholder), `hot` = same-hue pulse. `values` overrides the
 * slot copy (e.g. the blank template of câu 46).
 */
export function ProblemSlots({ box = {}, show = [1, 1, 1], fill = [0, 0, 0], hot = [0, 0, 0], values, asks, opacity = 1, size = 26 }) {
  if (opacity <= 0.001) return null;
  const boxes = problemSlotBoxes(box);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {boxes.map((b, i) => {
        const s = PROBLEM_SLOTS[i];
        const f = clamp01(fill[i] ?? 0);
        const o = clamp01(show[i] ?? 0);
        if (o <= 0.001) return null;
        const [stroke, soft] = TONE[SLOT_TONE[i]];
        const a = clamp01(hot[i] ?? 0);
        return (
          <g key={s.key} opacity={o < 1 ? o : undefined}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={22} fill={f > 0.5 ? soft : C.bg} stroke={stroke} strokeWidth={3 + 2 * a} strokeDasharray={f > 0.5 ? undefined : '12 10'} />
            <SvgText x={b.x + 24} y={b.y + 34} size={17} weight={700} anchor="start" color={stroke} letterSpacing={1.2}>
              {s.label}
            </SvgText>
            {f < 1 ? (
              <SvgText x={b.x + b.w / 2} y={b.y + b.h / 2 + 24} size={24} weight={600} color={C.textMuted} opacity={1 - f}>
                {(asks && asks[i]) ?? s.ask}
              </SvgText>
            ) : null}
            {f > 0 ? (
              <Multiline x={b.x + b.w / 2} y={b.y + b.h / 2 + 16} lines={(values && values[i]) ?? s.value} size={size} lineHeight={Math.round(size * 1.3)} firstWeight={700} color={C.text} opacity={f} />
            ) : null}
            {i < boxes.length - 1 ? (
              <SvgText x={b.x + b.w + 28} y={b.y + b.h / 2 + 12} size={34} weight={700} color={C.textMuted}>
                …
              </SvgText>
            ) : null}
          </g>
        );
      })}
    </g>
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

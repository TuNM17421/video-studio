import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { Morph } from './Morph.jsx';

/**
 * MỘT vật, nhiều trạng thái, sống suốt cả video.
 *
 * Đây là khung dựng của style biến hình, cùng ý tưởng với `marks` của bảng trắng và `camera` của
 * Illustrated: khai một DANH SÁCH trạng thái theo khung hình, component tự tìm cặp bao quanh khung hiện
 * tại và nội suy. Nhờ vậy không chỗ nào phải tự quản `t`, và không ai vô tình xoá vật đi vẽ lại — lỗi
 * làm hỏng cả một style ở lần trước.
 *
 *   <MorphSequence frame={frame} states={[
 *     { at: 0,   shape: shapes.strip({…}), fillOpacity: 0.1, stroke: C.accentStrong, strokeWidth: 3 },
 *     { at: 150, dur: 110, shape: shapes.arrow({…}), fillOpacity: 0.92, strokeWidth: 0 },
 *     { at: 430, dur: 90,  shape: shapes.arrow({… hướng khác …}) },
 *   ]} />
 *
 * Trạng thái sau **thừa kế** mọi thuộc tính không khai của trạng thái trước — chỉ ghi cái đang đổi.
 * `at` là khung bắt đầu chuyển sang trạng thái ấy, `dur` là số khung chuyển (mặc định 60).
 */
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const KEYS = ['shape', 'fill', 'fillOpacity', 'stroke', 'strokeWidth'];

/** Trạng thái đã điền đủ thuộc tính (thừa kế từ trạng thái trước). */
export function resolveStates(states) {
  let prev = { fill: C.accent, fillOpacity: 1, stroke: 'none', strokeWidth: 0 };
  return states.map((s) => {
    const full = { ...prev };
    for (const k of KEYS) if (s[k] !== undefined) full[k] = s[k];
    prev = full;
    return { ...full, at: s.at, dur: s.dur ?? 60 };
  });
}

export function MorphSequence({ frame, states, opacity = 1, ease = easeInOut }) {
  if (opacity <= 0.001 || !states?.length) return null;
  const list = resolveStates(states);
  // `b` là trạng thái ĐÍCH: cái cuối cùng đã tới lượt ở khung này. `a` là cái trước nó.
  // (Lấy nhầm b = list[i + 1] thì cú chuyển VÀO một trạng thái bị bỏ qua hẳn — vật nhảy thẳng sang
  //  hình mới rồi đứng đó, đúng thứ style này sinh ra để tránh.)
  let i = 0;
  while (i < list.length - 1 && frame >= list[i + 1].at) i += 1;
  const b = list[i];
  const a = list[i - 1] ?? b;
  if (i === 0) return <Morph from={b.shape} to={b.shape} t={1} fill={b.fill} fillOpacity={b.fillOpacity} stroke={b.stroke} strokeWidth={b.strokeWidth} opacity={opacity} />;
  const t = ease(clamp01((frame - b.at) / (b.dur || 1)));
  return (
    <Morph
      from={a.shape} to={b.shape} t={t}
      fill={[a.fill, b.fill]} fillOpacity={[a.fillOpacity, b.fillOpacity]}
      stroke={[a.stroke, b.stroke]} strokeWidth={[a.strokeWidth, b.strokeWidth]}
      opacity={opacity}
    />
  );
}

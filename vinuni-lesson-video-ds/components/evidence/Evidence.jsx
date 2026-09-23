import React from 'react';
import { EVIDENCE, FONT } from '../../lib/tokens.js';
import { CLAMP, interpolate, spring } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';

/*
 * Evidence — ảnh chụp NGUỒN THẬT (trang web, văn bản, báo cáo, biểu đồ trong paper) dán lên khung,
 * kiểu phóng sự điều tra: giấy hơi nghiêng, băng keo ở góc, khung đỏ vẽ tay khoanh dòng quan trọng,
 * con dấu, và một dòng chú thích nói rõ đây là nguồn gì.
 *
 * Vì sao cần: sơ đồ tự vẽ chỉ nói "theo lý thuyết". Ảnh chụp nguồn thật nói "đây, có thật, xem đi".
 * Đây là thứ làm nên độ tin của kênh tham chiếu (xem script-craft.md §1).
 *
 * Mọi chuyển động là hàm thuần của `frame` (lib/motion.js). Không CSS animation, không randomness.
 *
 * Dùng:
 *   <Evidence frame={f} href="/media/files/thongtu-260.png"
 *             caption="Thông tư 260/1999/TT-BKHCNMT trên cổng thông tin Chính phủ"
 *             stamp="BÁO THẬT"
 *             marks={[{x:0.14,y:0.38,w:0.72,h:0.06},{x:0.14,y:0.62,w:0.72,h:0.06}]} />
 *
 * `marks` dùng toạ độ TƯƠNG ĐỐI (0..1) so với tấm ảnh, nên đổi ảnh không phải tính lại pixel.
 */

const FPS = 30;

/** Băng keo giấy ở một góc; `angle` để dán chéo. */
function Tape({ x, y, angle, w = 118, h = 40 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={EVIDENCE.tape} opacity="0.93" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke={EVIDENCE.tapeEdge} strokeWidth="2" />
    </g>
  );
}

export function Evidence({
  frame = 0,
  href,
  caption,
  stamp = null,
  marks = [],
  x = 300,
  y = 250,
  width = 1320,
  height = 660,
  tilt = -1.4,
}) {
  const f = Math.max(0, frame);

  // Tấm ảnh "rơi" vào khung: nảy nhẹ rồi đứng yên.
  const land = spring({ frame: f, fps: FPS, config: { damping: 16, stiffness: 150 } });
  const dropY = interpolate(land, [0, 1], [-40, 0]);
  const cardOpacity = interpolate(f, [0, 8], [0, 1], CLAMP);
  const angle = interpolate(land, [0, 1], [tilt - 2.5, tilt]);

  // Khung đỏ được "vẽ" ra lần lượt, mỗi khung cách nhau 8 frame, bắt đầu sau khi ảnh đã đứng.
  const markStart = 16;
  const markStep = 8;
  const markDraw = 10;

  // Con dấu đóng xuống: to rồi thu lại, như dấu mộc thật.
  const stampIn = interpolate(f, [22, 30], [0, 1], CLAMP);
  // Khung dấu phải ôm theo chữ: bản cũ đóng cứng 192 px nên "NGUỒN THẬT" lòi hẳn ra hai bên.
  const stampW = Math.max(192, textWidth(stamp || '', 27, 800) + 2 * (String(stamp || '').length - 1) + 52);
  const stampScale = interpolate(stampIn, [0, 0.6, 1], [1.9, 0.94, 1]);

  const capH = 62;

  return (
    <g opacity={cardOpacity}>
      <g transform={`translate(${x + width / 2} ${y + height / 2 + dropY}) rotate(${angle}) translate(${-width / 2} ${-height / 2})`}>
        {/* mép giấy */}
        <rect x={-10} y={-10} width={width + 20} height={height + 20} fill={EVIDENCE.paper} stroke={EVIDENCE.paperEdge} strokeWidth="2" />
        {/* ảnh chụp nguồn */}
        <image href={href} x={0} y={0} width={width} height={height} preserveAspectRatio="xMidYMid slice" />

        {/* khung đỏ khoanh dòng quan trọng, vẽ dần từ trái sang */}
        {marks.map((m, i) => {
          const t0 = markStart + i * markStep;
          const p = interpolate(f, [t0, t0 + markDraw], [0, 1], CLAMP);
          if (p <= 0) return null;
          const mx = m.x * width;
          const my = m.y * height;
          const mw = m.w * width * p;
          const mh = m.h * height;
          return <rect key={i} x={mx} y={my} width={mw} height={mh} fill="none" stroke={EVIDENCE.mark} strokeWidth="5" />;
        })}

        {/* băng keo 4 góc, dán sau cùng cho nằm trên ảnh */}
        <Tape x={16} y={10} angle={-38} />
        <Tape x={width - 16} y={10} angle={38} />
        <Tape x={16} y={height - 10} angle={38} />
        <Tape x={width - 16} y={height - 10} angle={-38} />

        {/* con dấu */}
        {stamp ? (
          <g transform={`translate(${width - stampW / 2 - 34} 44) rotate(-9) scale(${stampScale})`} opacity={stampIn}>
            <rect x={-stampW / 2} y={-27} width={stampW} height={54} fill={EVIDENCE.paper} stroke={EVIDENCE.stampInk} strokeWidth="4" />
            <text x={0} y={9} textAnchor="middle" fontFamily={FONT} fontSize={27} fontWeight="800" fill={EVIDENCE.stampInk} letterSpacing="2">
              {stamp}
            </text>
          </g>
        ) : null}
      </g>

      {/* chú thích nguồn: KHÔNG nghiêng theo ảnh, để luôn dễ đọc */}
      {caption ? (
        <g transform={`translate(${x + width / 2} ${y + height + 46})`} opacity={interpolate(f, [10, 18], [0, 1], CLAMP)}>
          <rect x={-560} y={-capH / 2} width={1120} height={capH} rx={10} fill={EVIDENCE.caption} opacity="0.92" />
          <text x={0} y={9} textAnchor="middle" fontFamily={FONT} fontSize={27} fontWeight="700" fill={EVIDENCE.paper}>
            {caption}
          </text>
        </g>
      ) : null}
    </g>
  );
}

/** Nền nâu đặt sau Evidence cho ảnh nổi lên. Dùng khi cả scene là một bằng chứng. */
export function EvidenceBoard() {
  return (
    <g>
      <rect x={0} y={0} width={1920} height={1080} fill={EVIDENCE.board} />
      <rect x={0} y={0} width={1920} height={1080} fill={EVIDENCE.boardDeep} opacity="0.35" />
    </g>
  );
}

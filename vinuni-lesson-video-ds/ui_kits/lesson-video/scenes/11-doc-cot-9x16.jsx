import React from 'react';
import { Bracket, Card, Check, Flow, GlassBox, SceneFrame, SvgText } from '../../../components/index.js';
import { C, appear, pulse, useFrame, useLayout } from '../../../lib/index.js';

export const meta = {
  id: 'doc-cot-9x16',
  title: 'Khổ dọc · một yêu cầu, hai bản tóm tắt',
  pattern: 'Khổ 9:16 · dòng chảy theo cột',
  duration: 420,
  format: '9x16',
};

/*
 * Cảnh mẫu của khổ dọc (1080×1920). Nó kể **đúng câu chuyện** của `04-flow-compare` — một yêu cầu đi vào
 * một hộp xử lý, ra hai bản tóm tắt khác chữ nhưng cùng ý — nhưng bày lại hoàn toàn:
 *
 *   ngang: yêu cầu → hộp → hai bản, ba cột cạnh nhau, mắt đi từ trái sang phải
 *   dọc:   yêu cầu ↓ hộp ↓ hai bản xếp chồng, một cột, mắt đi từ trên xuống
 *
 * Đó là lý do khổ phải chọn **trước** khi dựng cảnh: cắt cảnh ngang vào khung dọc thì mất hẳn cột phải
 * (đo ở #62: mất một nhân vật, nửa tiêu đề, 44 % khung trống). Không có toạ độ nào ở đây suy ra được từ
 * cảnh ngang.
 *
 * Mọi mốc đều lấy từ `useLayout()` chứ không viết thẳng số, nên cảnh không tự giả định mình đang ở khổ nào.
 */
const T = {
  request: 12,
  flowIn: [40, 78],
  glass: 60,
  lines: 96,
  flowFork: [150, 190],
  cardA: 170,
  textA: 206,
  flowB: [214, 252],
  cardB: 234,
  textB: 270,
  bracket: 296,
  criteria: 336,
};

/* Khổ dọc chỉ còn 46 ký tự một dòng (1080 − 2×56 px lề) — câu phải ngắn hơn hẳn bản ngang. */
const CAPTIONS = [
  { start: 0, end: 96, text: 'Nhờ đồng nghiệp tóm tắt một bức thư.' },
  { start: 96, end: 206, text: 'Hai người đọc cùng một thư.' },
  { start: 206, end: 300, text: 'Hai bản tóm tắt không giống từng chữ.' },
  { start: 300, end: 420, text: 'Nhưng cả hai giữ đúng ý chính.' },
];

export default function DocCot9x16() {
  const frame = useFrame();
  const L = useLayout();
  /* Một cột duy nhất, canh giữa khung 1080 px. */
  const midX = 540;
  const colX = L.contentXMin + 24;
  const colW = 1080 - 2 * colX;

  /* Cột đi từ contentTop xuống contentBottom; mỗi khối tự chừa khoảng thở cho mũi tên nối. */
  const request = { x: colX + 90, y: L.contentTop + 40, w: colW - 180, h: 170 };
  const glass = { x: colX, y: L.contentTop + 290, w: colW, h: 300 };
  const cardA = { x: colX, y: L.contentTop + 680, w: colW, h: 160 };
  const cardB = { x: colX, y: L.contentTop + 910, w: colW, h: 160 };
  const crit = { x: colX, y: L.contentBottom - 180, w: colW, h: 160 };

  const textA = frame >= T.textA;
  const textB = frame >= T.textB;
  const criteria = appear(frame, T.criteria, 34);
  const bracket = appear(frame, T.bracket, 28);

  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 05 · THIẾT KẾ SẢN PHẨM AI"
      title="Hai bản, một ý"
      tag="KHỔ DỌC"
      footer={{ left: '01 / 06 · Sản phẩm AI' }}
      captions={CAPTIONS}
    >
      <Card
        {...request}
        label="YÊU CẦU"
        lines={['BỨC THƯ', 'cần tóm tắt']}
        size={26}
        opacity={appear(frame, T.request, 30)}
      />
      <Flow
        points={[{ x: midX, y: request.y + request.h }, { x: midX, y: glass.y }]}
        frame={frame}
        start={T.flowIn[0]}
        end={T.flowIn[1]}
      />

      <GlassBox {...glass} label="TÓM TẮT" opacity={appear(frame, T.glass, 32)}>
        {frame >= T.lines ? (
          <g>
            <path
              d={`M ${glass.x + 150} ${glass.y + 96} H ${glass.x + 600} M ${glass.x + 150} ${glass.y + 152} H ${glass.x + 520} M ${glass.x + 150} ${glass.y + 208} H ${glass.x + 640}`}
              fill="none"
              stroke={C.accent}
              strokeLinecap="round"
              strokeWidth={14}
            />
            <circle cx={glass.x + 96} cy={glass.y + 96} r={8} fill={C.red} />
            <circle cx={glass.x + 96} cy={glass.y + 152} r={8} fill={C.red} />
            <circle cx={glass.x + 96} cy={glass.y + 208} r={8} fill={C.red} />
          </g>
        ) : null}
      </GlassBox>

      <Flow
        points={[{ x: midX, y: glass.y + glass.h }, { x: midX, y: cardA.y }]}
        frame={frame}
        start={T.flowFork[0]}
        end={T.flowFork[1]}
      />
      <Card
        {...cardA}
        label="BẢN A"
        lines={textA ? ['Cần xử lý gấp', 'trong hôm nay'] : []}
        size={25}
        active={pulse(frame, T.flowFork[1])}
        opacity={appear(frame, T.cardA, 30)}
      />
      <Flow
        points={[{ x: midX, y: cardA.y + cardA.h }, { x: midX, y: cardB.y }]}
        frame={frame}
        start={T.flowB[0]}
        end={T.flowB[1]}
        color={C.red}
      />
      <Card
        {...cardB}
        accent={C.red}
        label="BẢN B"
        lines={textB ? ['Ưu tiên xử lý', 'trước cuối ngày'] : []}
        size={25}
        active={pulse(frame, T.flowB[1])}
        opacity={appear(frame, T.cardB, 30)}
      />

      <Bracket x={colX + 120} y={cardB.y + cardB.h + 24} w={colW - 240} color={C.red} opacity={bracket} />
      <SvgText x={midX} y={cardB.y + cardB.h + 98} size={24} weight={700} color={C.red} opacity={bracket}>
        Ý CHÍNH CHUNG
      </SvgText>

      {criteria > 0.001 ? (
        <g opacity={criteria}>
          <rect x={crit.x} y={crit.y} width={crit.w} height={crit.h} rx={26} fill={C.bgAlt} stroke={C.accent} strokeWidth={3} />
          <SvgText x={midX} y={crit.y + 44} size={21} weight={700} color={C.accentStrong}>
            ĐẶT TIÊU CHÍ TRƯỚC
          </SvgText>
          <Check x={crit.x + 64} y={crit.y + 88} size={36} />
          <SvgText x={crit.x + 128} y={crit.y + 96} size={22} weight={700} anchor="start">
            Nội dung
          </SvgText>
          <Check x={crit.x + 360} y={crit.y + 88} size={36} />
          <SvgText x={crit.x + 424} y={crit.y + 96} size={22} weight={700} anchor="start">
            Giới hạn
          </SvgText>
          <Check x={crit.x + 630} y={crit.y + 88} size={36} />
          <SvgText x={crit.x + 694} y={crit.y + 96} size={22} weight={700} anchor="start">
            Cách kiểm tra
          </SvgText>
        </g>
      ) : null}
    </SceneFrame>
  );
}

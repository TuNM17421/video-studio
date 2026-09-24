import React from 'react';

/**
 * Thang độ đậm nhạt — ba mức, không hơn.
 *
 *   main 100 %    thứ lời đọc đang nói tới
 *   context 40 %  thứ vừa nói xong hoặc sắp nói, còn để người xem giữ mạch
 *   frame 15 %    khung: trục toạ độ, lưới, nhãn vùng
 *
 * Mắt chỉ phân biệt được vài mức. Dùng ba mức này thay cho opacity tự đặt thì mọi cảnh trong video
 * (và mọi video trong style) tách lớp giống nhau, và người xem học được quy ước sau vài giây.
 */
export const LAYER = Object.freeze({ main: 1, context: 0.4, frame: 0.15 });

export function Layer({ level = 'main', fade = 1, children }) {
  const o = (LAYER[level] ?? 1) * fade;
  if (o <= 0.001) return null;
  return <g opacity={o < 1 ? o : undefined}>{children}</g>;
}

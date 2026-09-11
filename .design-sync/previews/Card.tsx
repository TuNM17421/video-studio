import React from 'react';
import { Card, C, SvgText } from 'vinuni-lesson-video-ds';

// Cards are SVG groups positioned in scene px — preview them inside an <svg viewBox>.
const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Tag = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <SvgText x={x} y={y} size={17} weight={700} anchor="start" color={C.textMuted}>{children}</SvgText>
);

export const Default = () => (
  <Stage w={400} h={220}>
    <Card x={30} y={30} w={340} h={150} label="YÊU CẦU" lines={['BỨC THƯ', 'cần tóm tắt']} />
  </Stage>
);

export const WithIcon = () => (
  <Stage w={400} h={220}>
    <Card x={30} y={30} w={340} h={150} label="TÀI LIỆU" icon="document" lines={['HỢP ĐỒNG', '12 trang · PDF']} />
  </Stage>
);

export const Active = () => (
  <Stage w={400} h={220}>
    <Card x={30} y={30} w={340} h={150} label="KẾT QUẢ" lines={['ĐÈN SÁNG', 'đang nhận hạt']} active={1} />
  </Stage>
);

export const RedAccent = () => (
  <Stage w={400} h={220}>
    <Card x={30} y={30} w={340} h={150} accent={C.red} label="BẢN B" lines={['ƯU TIÊN XỬ LÝ', 'trước cuối ngày']} />
  </Stage>
);

export const DashedAndMuted = () => (
  <Stage w={760} h={240}>
    <Card x={30} y={30} w={340} h={150} label="GIẢ ĐỊNH" lines={['CHƯA CÓ', 'dữ liệu thật']} dashed />
    <Tag x={30} y={215}>dashed · hypothetical</Tag>
    <Card x={400} y={30} w={330} h={150} label="BƯỚC 1" lines={['ĐỌC ĐỀ', 'đã xong']} muted={1} />
    <Tag x={400} y={215}>muted · out of focus</Tag>
  </Stage>
);

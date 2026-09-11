import React from 'react';
import { UIButton, C, SvgText } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Tag = ({ x, y, children }: { x: number; y: number; children: string }) => (
  <SvgText x={x} y={y} size={17} weight={700} anchor="start" color={C.textMuted}>{children}</SvgText>
);

export const Variants = () => (
  <Stage w={860} h={170}>
    <UIButton x={30} y={40} w={180} label="Gửi thư" icon="send" />
    <Tag x={30} y={140}>primary</Tag>
    <UIButton x={240} y={40} w={180} label="Sửa hạn" icon="pencil" variant="secondary" />
    <Tag x={240} y={140}>secondary</Tag>
    <UIButton x={450} y={40} w={220} label="CHUYỂN KHOẢN" variant="danger" />
    <Tag x={450} y={140}>danger</Tag>
    <UIButton x={700} y={40} w={130} label="Hủy" variant="ghost" />
    <Tag x={700} y={140}>ghost</Tag>
  </Stage>
);

export const States = () => (
  <Stage w={860} h={170}>
    <UIButton x={30} y={40} w={180} label="Thử lại" icon="refresh-cw" />
    <Tag x={30} y={140}>default</Tag>
    <UIButton x={240} y={40} w={180} label="Thử lại" icon="refresh-cw" state="pressed" />
    <Tag x={240} y={140}>pressed</Tag>
    <UIButton x={450} y={40} w={180} label="Thử lại" icon="refresh-cw" state="disabled" />
    <Tag x={450} y={140}>disabled</Tag>
    <UIButton x={660} y={40} w={170} label="Gửi thư" icon="send" state="locked" />
    <Tag x={660} y={140}>locked</Tag>
  </Stage>
);

export const LockedPair = () => (
  <Stage w={860} h={170}>
    <UIButton x={170} y={50} w={220} label="Gửi thư" icon="send" state="locked" />
    <UIButton x={450} y={50} w={220} label="Sửa hạn" icon="pencil" variant="secondary" state="locked" />
    <Tag x={170} y={150}>cần giáo viên duyệt trước khi bấm</Tag>
  </Stage>
);

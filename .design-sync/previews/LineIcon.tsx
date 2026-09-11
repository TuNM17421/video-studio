import React from 'react';
import { C, LineIcon, Icon, Card, SvgText } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Row = ({ names, y, color = C.accent }: { names: string[]; y: number; color?: string }) => (
  <>
    {names.map((n, i) => (
      <g key={n}>
        <LineIcon name={n as any} x={70 + i * 120} y={y} size={56} color={color} />
        <SvgText x={70 + i * 120} y={y + 52} size={15} weight={600} color={C.textMuted}>{n}</SvgText>
      </g>
    ))}
  </>
);

export const SecurityAndControl = () => (
  <Stage w={860} h={330}>
    <Row names={['lock', 'lock-open', 'shield-check', 'shield-alert', 'key-round', 'octagon-x', 'stamp']} y={70} />
    <Row names={['user-check', 'triangle-alert', 'hourglass', 'pause', 'check', 'x', 'circle-help']} y={210} color={C.red} />
  </Stage>
);

export const SystemsAndTools = () => (
  <Stage w={860} h={330}>
    <Row names={['server', 'plug', 'wrench', 'braces', 'terminal', 'app-window', 'mouse-pointer']} y={70} />
    <Row names={['mail', 'send', 'inbox', 'archive', 'search', 'clock', 'git-branch']} y={210} />
  </Stage>
);

export const InsideCards = () => (
  <Stage w={860} h={250}>
    <Card x={30} y={40} w={380} h={150} label="HỘP THƯ" icon="mail" lines={['BẢN NHÁP', 'chờ giáo viên duyệt']} />
    <Card x={450} y={40} w={380} h={150} label="QUYỀN" icon="lock" accent={C.red} lines={['CỔNG QUYỀN', 'đang khóa']} />
  </Stage>
);

export const WithHandDrawnSet = () => (
  <Stage w={860} h={250}>
    <Icon name="document" x={200} y={100} size={96} />
    <SvgText x={200} y={190} size={18} weight={700} color={C.textMuted}>Icon · vẽ tay 3 px / 64</SvgText>
    <LineIcon name="file-text" x={620} y={100} size={96} />
    <SvgText x={620} y={190} size={18} weight={700} color={C.textMuted}>LineIcon · 1,125 / 24</SvgText>
  </Stage>
);

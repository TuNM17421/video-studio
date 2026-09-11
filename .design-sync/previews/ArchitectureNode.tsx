import React from 'react';
import { ArchitectureNode, nodePort, Flow, Pill, Icon, C, SvgText } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);
const Tag = ({ x, y, children, color = C.textMuted }: { x: number; y: number; children: string; color?: string }) => (
  <SvgText x={x} y={y} size={18} weight={700} color={color}>{children}</SvgText>
);

// Day 5 · MCP: the host app wraps the model and the client; the client talks to an external server.
const HOST = { x: 30, y: 30, w: 840, h: 360 };
const MODEL = { x: 80, y: 150, w: 300, h: 190 };
const CLIENT = { x: 500, y: 150, w: 320, h: 190 };
const SERVER = { x: 1060, y: 110, w: 400, h: 230 };
const DATA = { x: 1060, y: 380, w: 400, h: 100 };

export const McpArchitecture = () => {
  const req = [nodePort(CLIENT, 'right', 0.3), nodePort(SERVER, 'left', 0.3 * (CLIENT.h / SERVER.h) + (CLIENT.y - SERVER.y) / SERVER.h)];
  const res = [nodePort(SERVER, 'left', 0.7 * (CLIENT.h / SERVER.h) + (CLIENT.y - SERVER.y) / SERVER.h), nodePort(CLIENT, 'right', 0.7)];
  return (
    <Stage w={1500} h={510}>
      <ArchitectureNode {...HOST} container kind="host" title="ỨNG DỤNG CHỦ" subtitle="ví dụ: trợ lý học tập của trường" />
      <ArchitectureNode {...MODEL} kind="model" title="LLM" subtitle="quyết định gọi tool" />
      <ArchitectureNode {...CLIENT} kind="client" title="MCP CLIENT" subtitle="giữ kết nối, gửi yêu cầu" />
      <Flow points={[nodePort(MODEL, 'right'), nodePort(CLIENT, 'left')]} progress={1} strokeWidth={4} />
      <ArchitectureNode {...SERVER} kind="server" title="MCP SERVER" subtitle="tools · resources · prompts" />
      <ArchitectureNode {...DATA} kind="database" title="LỊCH HỌC" subtitle="hệ thống của trường" />
      <Flow points={[nodePort(SERVER, 'bottom'), nodePort(DATA, 'top')]} progress={1} strokeWidth={4} />
      <Flow points={req} progress={1} color={C.red} />
      <Flow points={res} progress={1} />
      <Tag x={940} y={req[0].y - 16} color={C.red}>YÊU CẦU</Tag>
      <Tag x={940} y={res[0].y + 34} color={C.accent}>KẾT QUẢ</Tag>
    </Stage>
  );
};

const KINDS = [
  ['user', 'SINH VIÊN', 'hỏi bằng lời'],
  ['app', 'CHATBOT LỚP', 'giao diện web'],
  ['host', 'IDE', 'chứa client'],
  ['client', 'MCP CLIENT', 'một kết nối'],
  ['server', 'MCP SERVER', 'mở tool ra ngoài'],
  ['api', 'API LỊCH', 'REST · JSON'],
  ['service', 'EMAIL', 'dịch vụ ngoài'],
  ['model', 'LLM', 'sinh câu trả lời'],
  ['database', 'ĐIỂM SỐ', 'bảng dữ liệu'],
] as const;

export const AllKinds = () => (
  <Stage w={1080} h={420}>
    {KINDS.map(([kind, title, sub], i) => (
      <ArchitectureNode key={kind} x={30 + (i % 3) * 345} y={30 + Math.floor(i / 3) * 128} w={320} h={108} kind={kind} title={title} subtitle={sub} />
    ))}
  </Stage>
);

// "Hai hộp phần mềm nối bằng mũi tên Yêu cầu và Kết quả" + the provider zone that runs the tool.
const APP = { x: 40, y: 150, w: 320, h: 180 };
const ZONE = { x: 620, y: 40, w: 640, h: 420 };
const API = { x: 680, y: 150, w: 320, h: 180 };
export const RequestResultWithProvider = () => (
  <Stage w={1300} h={500}>
    <ArchitectureNode {...ZONE} container dashed={false} kind="service" title="NHÀ CUNG CẤP" tone="process" subtitle="tool được thực thi ở đây" />
    <ArchitectureNode {...APP} kind="app" title="ỨNG DỤNG" subtitle="của bạn" />
    <ArchitectureNode {...API} kind="api" title="API THỜI TIẾT" subtitle="nhận yêu cầu" active={1} />
    <Icon name="gear" x={1130} y={240} size={96} color={C.accentStrong} />
    <SvgText x={1130} y={330} size={18} weight={600} color={C.textMuted}>thực thi</SvgText>
    <Flow points={[nodePort(APP, 'right', 0.35), nodePort(API, 'left', 0.35)]} progress={1} color={C.red} />
    <Flow points={[nodePort(API, 'left', 0.7), nodePort(APP, 'right', 0.7)]} progress={1} />
    <Pill x={420} y={138} label="YÊU CẦU" active size={17} h={40} />
    <Pill x={420} y={290} label="KẾT QUẢ" size={17} h={40} />
    <ArchitectureNode x={680} y={370} w={320} h={70} kind="database" title="NHẬT KÝ" muted={1} />
  </Stage>
);

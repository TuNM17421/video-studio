import React from 'react';
import { Gate, gateStop, Card, Flow, StaticPath, anchor, C } from 'vinuni-lesson-video-ds';

const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>;

export const States = () => (
  <Stage w={760} h={260}>
    <Gate x={110} y={120} state="open" label="ĐÃ MỞ" />
    <Gate x={290} y={120} state="blocked" label="BỊ CHẶN" />
    <Gate x={470} y={120} state="error" label="LỖI KIỂM TRA" />
    <Gate x={650} y={120} state="pending" label="ĐANG CHỜ" />
  </Stage>
);

const M = { x: 30, y: 80, w: 250, h: 150 };
const T = { x: 620, y: 80, w: 270, h: 150 };
const G = { x: 450, y: 155 };

export const BlockedTool = () => (
  <Stage w={920} h={300}>
    <Card {...M} label="MÔ HÌNH" lines={['ĐỀ XUẤT', 'gửi thư cho khách']} />
    <Flow points={[anchor(M, 'right'), gateStop(G)]} frame={90} start={20} end={60} color={C.red} />
    <Gate {...G} state="blocked" label="CỔNG QUYỀN" />
    <StaticPath points={[gateStop(G, 'right'), anchor(T, 'left')]} color={C.dotInactive} dashed />
    <Card {...T} label="CÔNG CỤ" lines={['GỬI THƯ', 'không được chạy']} dashed muted={0.7} />
  </Stage>
);

export const Arriving = () => (
  <Stage w={920} h={300}>
    <Card {...M} label="BẢN NHÁP" lines={['THƯ TRẢ LỜI', 'do mô hình viết']} />
    <Flow points={[anchor(M, 'right'), gateStop(G)]} frame={52} start={20} end={60} />
    <Gate {...G} state="pending" label="CỔNG DUYỆT" frame={52} at={60} />
    <StaticPath points={[gateStop(G, 'right'), anchor(T, 'left')]} color={C.dotInactive} dashed />
    <Card {...T} label="HÀNH ĐỘNG" lines={['NÚT GỬI', 'chờ người duyệt']} dashed />
  </Stage>
);

export const SourceCheckOpen = () => (
  <Stage w={920} h={300}>
    <Card {...M} label="CÂU TRẢ LỜI" lines={['CÓ TRÍCH DẪN', '3 nguồn nội bộ']} />
    <Flow points={[anchor(M, 'right'), gateStop(G)]} frame={90} start={10} end={40} />
    <Gate {...G} state="open" label="ĐỐI CHIẾU NGUỒN" />
    <Flow points={[gateStop(G, 'right'), anchor(T, 'left')]} frame={90} start={44} end={70} />
    <Card {...T} label="NGƯỜI DÙNG" lines={['NHẬN CÂU TRẢ LỜI', 'đã kiểm tra']} />
  </Stage>
);

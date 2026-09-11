import React from 'react';
import { DataTable, C } from 'vinuni-lesson-video-ds';

// DataTable is an SVG fragment in scene px — preview it inside an <svg viewBox>.
const Stage = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block', background: C.bg, fontFamily: 'var(--font-sans)' }}>{children}</svg>
);

export const AssignmentTable = () => (
  <Stage w={1400} h={420}>
    <DataTable
      x={40}
      y={30}
      w={1320}
      title="BẢNG PHÂN CÔNG"
      columns={[
        { key: 'task', label: 'Việc', w: 3 },
        { key: 'who', label: 'Ai làm', w: 1.7 },
        { key: 'check', label: 'Ai duyệt', w: 1.6 },
        { key: 'perm', label: 'Quyền', w: 2.7 },
        { key: 'handoff', label: 'Bàn giao', w: 3 },
      ]}
      rows={[
        { task: 'Tóm tắt thư khách hàng', who: 'Tác tử AI', check: 'Chị Lan', perm: 'Chỉ đọc hộp thư', handoff: 'Bản nháp trong thư mục chung' },
        { task: 'Soạn thư trả lời', who: 'Tác tử AI', check: 'Anh Minh', perm: 'Soạn, không gửi', handoff: 'Chờ duyệt trước 17:00' },
        { task: 'Gửi thư chính thức', who: 'Anh Minh', check: '—', perm: 'Gửi thư', handoff: 'Lưu vào hồ sơ khách' },
      ]}
      highlightCell={{ row: 1, key: 'perm' }}
    />
  </Stage>
);

export const ReActStepLog = () => (
  <Stage w={1500} h={400}>
    <DataTable
      x={40}
      y={30}
      w={1420}
      title="NHẬT KÝ CÁC BƯỚC"
      illustrative="TÓM TẮT MINH HỌA"
      fontSize={22}
      columns={[
        { key: 'step', label: 'Bước', w: 1, align: 'center' },
        { key: 'why', label: 'Vì sao chọn', w: 4 },
        { key: 'act', label: 'Việc đề nghị', w: 2.6, mono: true },
        { key: 'sent', label: 'Thông tin gửi đi', w: 2.4 },
        { key: 'res', label: 'Kết quả', w: 2, align: 'center' },
      ]}
      rows={[
        { step: '1', why: 'Cần biết lịch trống của giảng viên', act: 'tra_lich()', sent: 'mã lớp AI-201', res: { status: 'ok', text: 'Có 3 ô trống' } },
        { step: '2', why: 'Muốn báo cả lớp ngay', act: 'gui_thu_ca_lop()', sent: 'danh sách 120 email', res: { status: 'blocked', text: 'Bị chặn' } },
        { step: '3', why: 'Hỏi lại người dùng trước khi gửi', act: 'hoi_nguoi_dung()', sent: 'bản nháp thông báo', res: { status: 'pending' } },
      ]}
      highlightRow={1}
    />
  </Stage>
);

export const TestPlan3x3 = () => (
  <Stage w={1300} h={380}>
    <DataTable
      x={40}
      y={30}
      w={1220}
      title="KẾ HOẠCH THỬ 3 × 3"
      illustrative="MINH HỌA SOẠN SẴN — CHƯA CHẠY THẬT"
      columns={[
        { key: 'case', label: 'Tình huống', w: 3 },
        { key: 'a', label: 'Câu hỏi thường', w: 2, align: 'center' },
        { key: 'b', label: 'Thiếu thông tin', w: 2, align: 'center' },
        { key: 'c', label: 'Yêu cầu vượt quyền', w: 2, align: 'center' },
      ]}
      rows={[
        { case: 'Tra cứu điểm', a: { status: 'untested' }, b: { status: 'untested' }, c: { status: 'untested' } },
        { case: 'Đổi lịch học', a: { status: 'untested' }, b: { status: 'untested' }, c: { status: 'untested' } },
        { case: 'Xin miễn học phí', a: { status: 'untested' }, b: { status: 'untested' }, c: { status: 'untested' } },
      ]}
    />
  </Stage>
);

export const AllowlistBeforeAfter = () => (
  <Stage w={1400} h={440}>
    <DataTable
      x={40}
      y={30}
      w={1320}
      title="CÔNG CỤ ĐƯỢC PHÉP"
      columns={[
        { key: 'tool', label: 'Công cụ', w: 2.4, mono: true },
        { key: 'before', label: 'Trước', w: 2.6, tone: 'muted', strike: true },
        { key: 'after', label: 'Sau', w: 2.6, tone: 'red' },
        { key: 'st', label: 'Trạng thái', w: 2, align: 'center' },
      ]}
      rows={[
        { tool: 'doc_hop_thu', before: 'đọc mọi thư', after: 'chỉ thư của lớp', st: { status: 'ok', text: 'Được phép' } },
        { tool: 'gui_thu', before: 'gửi bất kỳ ai', after: 'cần người duyệt', st: { status: 'pending' } },
        { tool: 'xoa_tep', before: 'xoá không hỏi', after: 'không cấp quyền', st: { status: 'blocked' } },
        { tool: 'goi_api_ngoai', before: 'khoá sai định dạng', after: 'thử lại một lần', st: { status: 'error', text: 'Lỗi 401' } },
      ]}
      frame={200}
      start={0}
      per={12}
    />
  </Stage>
);

/**
 * Tiện ích quét SOURCE bằng regex mà không vấp vào comment.
 */
/**
 * Bỏ COMMENT khỏi source trước khi quét bằng regex.
 *
 * Retro d05-v06 F6 (và lane ĐÓNG GÓI vấp lại lần thứ hai ngày 22/09): `verify` báo
 * `non-deterministic call` cho một dòng `// đừng dùng Date.now()` và `storyboard-gate` G3 tính một
 * ví dụ `beatT('<cảnh>','<cụm từ>')` viết trong comment thành một lời gọi THẬT. Cả hai đều là báo
 * giả, và cả hai đều khiến người sửa đi bẻ CHỮ trong comment thay vì sửa code.
 *
 * Giữ nguyên ĐỘ DÀI file (thay ký tự bằng khoảng trắng) để số dòng/vị trí trong thông báo lỗi vẫn
 * đúng. Chuỗi được tôn trọng: `'// không phải comment'` không bị cắt.
 */
export function stripComments(src) {
  const s = String(src);
  let out = '';
  let i = 0;
  let mode = null; // null | 'line' | 'block' | quote char | '`'
  while (i < s.length) {
    const c = s[i];
    const d = s[i + 1];
    if (mode === null) {
      if (c === '/' && d === '/') { mode = 'line'; out += '  '; i += 2; continue; }
      if (c === '/' && d === '*') { mode = 'block'; out += '  '; i += 2; continue; }
      if (c === '"' || c === "'" || c === '`') { mode = c; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (mode === 'line') {
      if (c === '\n') { mode = null; out += c; i++; continue; }
      out += ' '; i++; continue;
    }
    if (mode === 'block') {
      if (c === '*' && d === '/') { mode = null; out += '  '; i += 2; continue; }
      out += c === '\n' ? c : ' '; i++; continue;
    }
    // đang trong chuỗi
    if (c === '\\') { out += s.slice(i, i + 2); i += 2; continue; }
    out += c;
    if (c === mode) mode = null;
    i++;
  }
  return out;
}

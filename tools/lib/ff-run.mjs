/**
 * Một chỗ duy nhất để kiểm KẾT QUẢ của một lần gọi ffmpeg bằng `spawnSync`.
 *
 * ── Vì sao có file này ────────────────────────────────────────────────────────────────────────
 * `spawnSync` hỏng theo BA kiểu, và chỉ kiểm một kiểu là chưa đủ:
 *   1. `r.error`        — không chạy nổi tiến trình (`ENOENT`), hoặc stdout/stderr vượt `maxBuffer`
 *                         (`ENOBUFS`). Đây là kiểu đã cắn thật: `audio-qa` không đặt `maxBuffer`,
 *                         `ebur128` in ~1,6 KB stderr mỗi GIÂY audio nên trần 1 MiB chỉ đủ tới
 *                         ~655 s. Bản 654,3 s ra 1.047.895 byte — cách trần 1,5 giây.
 *   2. `r.status !== 0` — ffmpeg chạy nhưng báo lỗi. Bỏ qua thì tool đem stderr rỗng đi phân tích
 *                         rồi in ra một bản báo cáo TRÔNG NHƯ THẬT.
 *   3. `r.status === null` — bị signal giết (OOM, timeout). Không có mã lỗi để đọc.
 *
 * Cái giá của việc bỏ sót không phải là "tool chết" — mà là **tool vẫn exit 0 với số bịa**. Đó là
 * kiểu hỏng tệ nhất cho một tool QA: nó nói "sạch" trong khi nó chưa đo được gì.
 *
 * `FF_MAX_BUFFER` để rộng tay: stderr của ffmpeg tỉ lệ với ĐỘ DÀI audio, mà độ dài video thì không
 * có trần. 256 MiB đủ cho ~45 giờ audio ở nhịp của `ebur128`.
 */
export const FF_MAX_BUFFER = 256 * 1024 * 1024;

/**
 * Trả `null` nếu lần gọi SẠCH, hoặc một chuỗi nói rõ hỏng kiểu gì.
 * Thuần tuý — không in, không `process.exit` — để test soi được cả ba nhánh.
 */
export function ffFailure(r, { cmd = 'ffmpeg' } = {}) {
  if (!r || typeof r !== 'object') return `${cmd}: không nhận được kết quả từ spawnSync`;
  if (r.error) {
    const code = r.error.code || '';
    if (code === 'ENOBUFS') {
      return `${cmd}: output vượt maxBuffer (ENOBUFS) — audio quá dài cho trần hiện tại, tăng FF_MAX_BUFFER`;
    }
    return `${cmd}: không chạy được (${code || r.error.message})`;
  }
  if (r.status === null) return `${cmd}: bị signal ${r.signal || 'không rõ'} giết giữa chừng`;
  if (r.status !== 0) return `${cmd}: thoát với mã ${r.status}`;
  return null;
}

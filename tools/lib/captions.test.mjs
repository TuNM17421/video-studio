/** npm run test:tools — page breaks must fall between phrases, never inside a compound or after a bare verb. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CAPTION_MAX, paginate } from '../../vinuni-lesson-video-ds/lib/captions.js';

test('a bound "từ" stays with its verb; the break moves to the comma', () => {
  // D1 câu 15 — the old break "…tạo sinh học | từ dữ liệu" read as "sinh học".
  assert.deepEqual(
    paginate('Trên bản đồ này, mình xét các mô hình tạo sinh học từ dữ liệu, nên đặt chúng trong vùng học máy.'),
    ['Trên bản đồ này, mình xét các mô hình tạo sinh học từ dữ liệu,', 'nên đặt chúng trong vùng học máy.'],
  );
});

test('the noun "từ ngữ" is not an opener, the preposition "từ" still is', () => {
  // D1 câu 18 — the old break "…kết hợp | từ ngữ từ lượng lớn…" rewarded the noun as if it opened a phrase.
  assert.deepEqual(
    paginate('Mô hình ngôn ngữ lớn học cách dùng và kết hợp từ ngữ từ lượng lớn dữ liệu, để xử lý văn bản.'),
    ['Mô hình ngôn ngữ lớn học cách dùng và kết hợp từ ngữ', 'từ lượng lớn dữ liệu, để xử lý văn bản.'],
  );
});

test('"bên trong" is never split', () => {
  // D1 câu 23 — the old break "…cho biết bên | trong đang dùng…" chased the opener "trong".
  assert.deepEqual(
    paginate('Vì vậy, tên ứng dụng bạn đang mở chưa cho biết bên trong đang dùng mô hình nào.'),
    ['Vì vậy, tên ứng dụng bạn đang mở', 'chưa cho biết bên trong đang dùng mô hình nào.'],
  );
});

test('a clause opener such as "và" still starts the next page', () => {
  assert.deepEqual(
    paginate('Mô hình đọc toàn bộ tài liệu bạn đưa vào và trả lời câu hỏi dựa trên nội dung của tài liệu đó.'),
    ['Mô hình đọc toàn bộ tài liệu bạn đưa vào', 'và trả lời câu hỏi dựa trên nội dung của tài liệu đó.'],
  );
});

test('"học" on its own still ends a page — only "học từ" is glued', () => {
  // 'học' closing "buổi học" or "phải học" is a fine place to break; gluing every 'học' moved these breaks
  // onto "ngay | sau buổi học" and "phải học vì |".
  const pages = paginate('Bài tập được gửi cho các bạn ngay sau buổi học để mọi người có thời gian làm trước khi gặp lại.');
  assert.equal(pages[0], 'Bài tập được gửi cho các bạn ngay sau buổi học');
});

test('a sentence that fits the limit is one page', () => {
  const text = 'Một câu ngắn dưới bảy mươi tám ký tự nằm gọn trên một trang phụ đề.';
  assert.ok([...text].length <= CAPTION_MAX);
  assert.deepEqual(paginate(text), [text]);
});

/**
 * npm run test:tools — chốt chặn của `--prune`.
 *
 * Đây là lệnh duy nhất trong repo xoá được dữ liệu của cả nhóm, và nó xoá trên một bucket ở xa nên không
 * có thùng rác nào để bới lại. Kiểm bằng hàm thuần vì đúng cái tình huống cần chặn — máy vừa clone về,
 * media/files/ rỗng — là tình huống không dựng lại được trên máy đang giữ bản gốc.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { pruneGuard } from './media.mjs';

test('máy vừa clone (media/files/ rỗng) thì không cho prune', () => {
  // Đúng tình huống đã suýt xảy ra: khoá R2 được gửi cho cả nhóm, còn file nặng thì .gitignore chặn.
  const refusal = pruneGuard({ local: 0, orphans: 17 });
  assert.ok(refusal, 'phải từ chối');
  assert.match(refusal, /17/, 'nói rõ sẽ mất bao nhiêu object');
});

test('thư mục có vài file nhưng không phải bản gốc cũng bị chặn', () => {
  // Dáng thường gặp thứ hai: bỏ một mẫu giọng mới vào để đẩy lên, rồi gõ kèm --prune.
  assert.ok(pruneGuard({ local: 1, orphans: 17 }));
  assert.ok(pruneGuard({ local: 8, orphans: 9 }));
});

test('xoá bớt vài file khỏi bản gốc thì vẫn chạy bình thường', () => {
  // Đây mới là công dụng thật của --prune, đừng chặn nhầm nó.
  assert.equal(pruneGuard({ local: 14, orphans: 3 }), null);
  assert.equal(pruneGuard({ local: 17, orphans: 17 - 1 }), null, 'bằng nhau thì vẫn cho, chỉ chặn khi xoá nhiều hơn giữ');
});

test('không có gì để xoá thì không có gì để chặn', () => {
  assert.equal(pruneGuard({ local: 0, orphans: 0 }), null, 'kho rỗng cả hai bên vẫn là một lượt chạy hợp lệ');
  assert.equal(pruneGuard({ local: 17, orphans: 0 }), null);
});

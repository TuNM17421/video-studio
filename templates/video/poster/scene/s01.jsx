/*
 * TUỲ CHỌN. `video.jsx` dựng SEQUENCES thẳng từ `TIMELINE`, nên KHÔNG cần một file mỗi cue.
 * File này chỉ để dùng khi một cue duy nhất cần code riêng: import nó trong `video.jsx` và thay
 * đúng phần tử tương ứng của `SEQUENCES`.
 */
import React from 'react';
import { Cue } from './shared.jsx';

export default function S01() {
  return <Cue n={1} />;
}

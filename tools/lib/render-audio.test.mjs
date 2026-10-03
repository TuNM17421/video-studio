/**
 * `stage render` chọn audio nào. Lỗi ở đây ÂM THẦM: render thẳng vào `voice.wav` khi đã trộn SFX
 * ra một MP4 hợp lệ, không gate nào đỏ, chỉ mất hết tiếng nhấn.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pickRenderAudio } from './render-audio.mjs';

/** Dựng repo giả; `mtimes` quyết định file nào "mới hơn". */
function fakeRepo({ sfx, raw } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'render-audio-'));
  const write = (rel, mtimeMs) => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '');
    fs.utimesSync(file, mtimeMs / 1000, mtimeMs / 1000);
  };
  if (raw != null) write('voice/out/v1/voice.wav', raw);
  if (sfx != null) write('projects/v1/voice-sfx.wav', sfx);
  return root;
}

test('chỉ có voice.wav → dùng voice.wav và nói rõ là KHÔNG có SFX', () => {
  const r = pickRenderAudio('v1', fakeRepo({ raw: 1_000_000 }));
  assert.equal(r.audio, 'voice/out/v1/voice.wav');
  assert.equal(r.stale, false);
  assert.match(r.note, /không có SFX/);
});

test('voice-sfx.wav MỚI HƠN → dùng bản đã trộn SFX', () => {
  const r = pickRenderAudio('v1', fakeRepo({ raw: 1_000_000, sfx: 2_000_000 }));
  assert.equal(r.audio, 'projects/v1/voice-sfx.wav');
  assert.equal(r.stale, false);
});

test('voice-sfx.wav CŨ HƠN → stale, người gọi phải dừng chứ không render bừa', () => {
  const r = pickRenderAudio('v1', fakeRepo({ raw: 2_000_000, sfx: 1_000_000 }));
  assert.equal(r.stale, true);
  assert.equal(r.audio, null, 'stale thì KHÔNG được trả về một file để render');
  assert.match(r.note, /stage\.mjs sfx/, 'thông báo phải nói đúng lệnh cần chạy lại');
  // phá: đảo lại đúng hai mốc thời gian đó thì cùng repo phải xanh — chứng minh test đang đo mtime,
  // không phải đo "có tồn tại file hay không".
  assert.equal(pickRenderAudio('v1', fakeRepo({ raw: 1_000_000, sfx: 2_000_000 })).stale, false);
});

test('chỉ có voice-sfx.wav (không có voice.wav để so mốc) → vẫn dùng nó, ghi rõ lý do', () => {
  const r = pickRenderAudio('v1', fakeRepo({ sfx: 1_000_000 }));
  assert.equal(r.audio, 'projects/v1/voice-sfx.wav');
  assert.equal(r.stale, false);
  assert.match(r.note, /để so mốc thời gian/);
});

test('không có file nào → trả đường dẫn voice.wav để lệnh render tự báo thiếu input', () => {
  const r = pickRenderAudio('v1', fakeRepo({}));
  assert.equal(r.audio, 'voice/out/v1/voice.wav');
  assert.equal(r.stale, false);
});

test('voiceRawRel: video cũ ở tts-elevenlabs/out vẫn so mốc với voice-sfx.wav đúng chỗ', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'render-audio-legacy-'));
  const put = (rel, ms) => {
    const f = path.join(root, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, '');
    fs.utimesSync(f, ms / 1000, ms / 1000);
  };
  put('tts-elevenlabs/out/v1/voice.wav', 2_000_000);
  put('projects/v1/voice-sfx.wav', 1_000_000);
  const r = pickRenderAudio('v1', root, { voiceRawRel: 'tts-elevenlabs/out/v1/voice.wav' });
  assert.equal(r.stale, true, 'voice.wav (legacy) mới hơn bản trộn ⇒ phải báo stale');
  assert.equal(r.audio, null);
});

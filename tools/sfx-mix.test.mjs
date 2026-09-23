/**
 * Kiểm phần DỄ PHÂN KỲ ÂM THẦM của luồng SFX: `sfx-mix.mjs` tính mốc frame của một beat bằng
 * `voice.cues.json[n].startFrame + spokenAt(n, cụm)`, còn HÌNH tính bằng `TIMELINE[n].start +
 * spokenAt(n, cụm)` (rồi `chapterTime()` đổi sang giây authored).
 *
 * Hai công thức đó phải cho cùng một frame toàn cục. Chúng được nuôi bởi hai file khác nhau
 * (`voice/out/<id>/voice.cues.json` do `voice-timing.mjs` sinh, `timeline.js` do `voice.js` nuôi),
 * nên nếu một ngày nào đó một bên đổi cách cộng dồn thì TIẾNG VÀ HÌNH LỆCH NHAU mà không ai thấy —
 * video vẫn render, gate vẫn xanh, chỉ tai mới bắt được. Test này là chỗ bắt.
 *
 *   node --test tools/sfx-mix.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = path.resolve(import.meta.dirname, '..');
const VIDEO = 'demo-ai-history-three-turns';
const base = path.join(REPO, 'vinuni-lesson-video-ds/ui_kits/lesson-video/videos', VIDEO);
const cuesJson = path.join(REPO, 'voice/out', VIDEO, 'voice.cues.json');

test('voice.cues.json và TIMELINE cộng dồn ra cùng một frame cho mọi cue', { skip: fs.existsSync(cuesJson) ? false : 'video demo chưa nhập giọng' }, async () => {
  const timing = JSON.parse(fs.readFileSync(cuesJson, 'utf8')).cues;
  const { TIMELINE } = await import(pathToFileURL(path.join(base, 'timeline.js')).href);
  assert.equal(TIMELINE.length, timing.length, 'số cue của hai nguồn phải bằng nhau');
  for (let i = 0; i < TIMELINE.length; i += 1) {
    assert.equal(TIMELINE[i].n, timing[i].n, `cue thứ ${i}: số câu lệch`);
    assert.equal(
      TIMELINE[i].start,
      timing[i].startFrame,
      `cue ${timing[i].n}: HÌNH bắt đầu ở frame ${TIMELINE[i].start} còn TIẾNG ở ${timing[i].startFrame}`,
    );
  }
});

test('mọi beat khai `sfx` neo được vào một frame, và cụm từ có thật trong cue', { skip: fs.existsSync(cuesJson) ? false : 'video demo chưa nhập giọng' }, async () => {
  const sb = JSON.parse(fs.readFileSync(path.join(REPO, 'projects', VIDEO, 'storyboard.json'), 'utf8'));
  const timing = new Map(JSON.parse(fs.readFileSync(cuesJson, 'utf8')).cues.map((t) => [t.n, t]));
  const { spokenAt } = await import(pathToFileURL(path.join(base, 'cues.js')).href);
  let checked = 0;
  for (const sc of sb.scenes) {
    for (const b of sc.beats || []) {
      if (!b.sfx) continue;
      const t = timing.get(Number(b.cue));
      assert.ok(t, `cảnh "${sc.id}" · "${b.anchor}": không có cue ${b.cue}`);
      const at = t.startFrame + spokenAt(t.n, String(b.anchor));
      assert.ok(Number.isFinite(at) && at >= 0, `cảnh "${sc.id}" · "${b.anchor}": frame không hợp lệ (${at})`);
      assert.ok(at < t.endFrame + 90, `cảnh "${sc.id}" · "${b.anchor}": frame ${at} rơi quá xa ngoài cue ${t.n}`);
      checked += 1;
    }
  }
  assert.ok(checked > 0, 'không có beat nào khai `sfx` — test này mất tác dụng, kiểm lại storyboard');
});

test('mọi id trong catalog có đủ số đo mà sfx-mix cần', () => {
  const cat = JSON.parse(fs.readFileSync(path.join(REPO, 'sfx.json'), 'utf8'));
  assert.ok(cat._layers && Object.keys(cat._layers).length >= 4, 'sfx.json phải khai `_layers`');
  for (const s of cat.sfx) {
    assert.ok(cat._layers[s.layer], `"${s.id}": lớp "${s.layer}" không có trong _layers`);
    assert.ok(Number.isFinite(s.peak), `"${s.id}": thiếu \`peak\` — chạy node tools/sfx-fetch.mjs --measure --write`);
    assert.ok(Number.isFinite(s.peakAtMs), `"${s.id}": thiếu \`peakAtMs\``);
    assert.ok(Number.isFinite(s.seconds) && s.seconds > 0, `"${s.id}": thiếu \`seconds\``);
    assert.ok(s.source && s.download, `"${s.id}": thiếu nguồn/link tải — assets/sfx/ không vào git, mất link là mất tiếng`);
  }
});

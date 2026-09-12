/** npm run test:tools — the catalog is what both the studio and tts.mjs pick a voice from. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { castSpeaker, defaultVoice, readVoices, resolveVoice, speedFor } from './voices.mjs';

test('every voice is complete enough to be picked and heard', () => {
  const { voices, sampleText } = readVoices();
  assert.ok(voices.length, 'voices.json is empty');
  assert.ok(sampleText.length > 150, 'the sample line must be the ~10 s one the files actually read');
  for (const v of voices) {
    assert.match(v.id, /^[A-Za-z0-9]{8,40}$/, `${v.name} has no usable id`);
    assert.ok(v.name && v.engine && v.sample, `${v.id} is missing name/engine/sample`);
  }
  assert.equal(new Set(voices.map((v) => v.id)).size, voices.length, 'duplicate voice id');
  assert.equal(voices.filter((v) => v.default).length, 1, 'exactly one voice must be the default');
});

test('resolves by id and by name, and falls back to the default', () => {
  const fallback = defaultVoice();
  assert.equal(resolveVoice(fallback.id).name, fallback.name);
  assert.equal(resolveVoice(fallback.name).id, fallback.id);
  assert.equal(resolveVoice(fallback.name.toLowerCase()).id, fallback.id, 'name lookup is case-insensitive');
});

test('an id outside the catalog passes through, a wrong name does not', () => {
  const loose = resolveVoice('ABCdef1234567890');
  assert.equal(loose.id, 'ABCdef1234567890');
  assert.equal(loose.unknown, true);
  assert.equal(resolveVoice('Không Có Ai'), null);
  assert.equal(resolveVoice(''), null);
});

test('casts only names the system actually has', () => {
  const { voices } = readVoices();
  assert.equal(castSpeaker(voices[0].name).voice.id, voices[0].id);
  assert.equal(castSpeaker(voices[0].id).voice.id, voices[0].id, 'an id casts as well as a name');
  // A character nobody recorded must stop the run, and the message must say what is available.
  assert.throws(() => castSpeaker('Lucas'), (e) => /không có nhân vật "Lucas"/.test(e.message) && e.message.includes(voices[0].name));
  assert.throws(() => castSpeaker(''), /không có nhân vật/);
});

test('reading speed multiplies the character pace by the delivery, inside the API range', () => {
  const { voices, deliveries, speedRange } = readVoices();
  const v = { speed: voices[0].speed };
  assert.equal(speedFor(v, 'nhan').speed, Number((v.speed * deliveries.nhan.speed).toFixed(3)));
  assert.equal(speedFor(v, '').speed, v.speed, 'no delivery means the character pace itself');
  assert.throws(() => speedFor(v, 'gao-thet'), /không có kiểu đọc/);
  // Out-of-range is clamped, and says so, rather than letting the API reject a paid run.
  const slow = speedFor({ speed: 0.5 }, 'nhan');
  assert.equal(slow.speed, speedRange[0]);
  assert.equal(slow.clamped, true);
});

test('a character carries its own face, side and hue, and borrows a voice', () => {
  const { characters } = readVoices();
  assert.ok(characters.length, 'voices.json has no characters');
  for (const c of characters) {
    const cast = castSpeaker(c.name);
    assert.equal(cast.name, c.name);
    assert.ok(cast.voice?.id, `${c.name} resolved to no voice`);
    assert.match(cast.side, /^(left|right)$/);
    assert.ok(cast.tone, `${c.name} has no hue`);
    // The id is an alias for the name, so a script may write either.
    assert.equal(castSpeaker(c.id).voice.id, cast.voice.id);
  }
  // Two characters must never share a voice, or the video has two people with one set of vocal cords.
  const used = characters.map((c) => castSpeaker(c.name).voice.id);
  assert.equal(new Set(used).size, used.length, 'two characters share a voice');
});

test('a bare voice still casts, for videos with one narrator', () => {
  const { voices } = readVoices();
  const cast = castSpeaker(voices[0].name);
  assert.equal(cast.voice.id, voices[0].id);
  assert.equal(cast.avatar, null);
});

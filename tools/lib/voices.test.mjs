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
  assert.throws(() => castSpeaker('Khong Ai Ca'), (e) => /không có nhân vật "Khong Ai Ca"/.test(e.message) && e.message.includes(voices[0].name));
  assert.throws(() => castSpeaker(''), /không có nhân vật/);
});

test('an alias speaks with its character voice and face, under the alias name', () => {
  const { characters } = readVoices();
  const withAlias = characters.find((c) => c.voice && (c.aliases || []).length);
  if (!withAlias) return; // no course is renaming anyone at the moment
  const alias = withAlias.aliases[0];
  const asAlias = castSpeaker(alias);
  const asSelf = castSpeaker(withAlias.name);
  assert.equal(asAlias.name, alias, 'the card shows the alias, not the catalog name');
  assert.equal(asAlias.voice.id, asSelf.voice.id, 'same voice');
  assert.equal(asAlias.avatar, asSelf.avatar, 'same face');
  assert.equal(asAlias.side, asSelf.side, 'same side of the frame');
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
  const { characters: all } = readVoices();
  assert.ok(all.length, 'voices.json has no characters');
  // A character not yet given a voice is listed, but cannot be cast (tested below).
  const characters = all.filter((c) => c.voice);
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

test('a character with no voice yet stops the cast with its name, before anything is billed', () => {
  const mute = readVoices().characters.find((c) => !c.voice);
  if (!mute) return; // every character has a voice at the moment
  assert.throws(() => castSpeaker(mute.name), (e) => e.message.includes(`"${mute.name}" chưa được gán giọng`));
});

test('a bare voice still casts, for videos with one narrator', () => {
  const { voices } = readVoices();
  const cast = castSpeaker(voices[0].name);
  assert.equal(cast.voice.id, voices[0].id);
  assert.equal(cast.avatar, null);
});

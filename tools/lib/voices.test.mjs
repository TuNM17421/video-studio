/** npm run test:tools — the catalog is what both the studio and tts.mjs pick a voice from. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultVoice, readVoices, resolveVoice } from './voices.mjs';

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

// tts.mjs reports what ElevenLabs billed per câu ("tính phí N ký tự"), and Video Studio adds those lines up
// into the video's cost. Run the real request path against a local fake server: no key, no credit.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TTS = path.join(ROOT, 'tts-elevenlabs', 'tts.mjs');

/** A stand-in for /v1/text-to-speech/<voice>/with-timestamps: half a second of silence per câu. */
function fakeElevenLabs(costFor) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const { text } = JSON.parse(body || '{}');
      requests.push({ url: req.url, text });
      const characters = [...text];
      const cost = costFor(text);
      res.writeHead(200, { 'content-type': 'application/json', ...(cost === null ? {} : { 'character-cost': String(cost) }) });
      res.end(JSON.stringify({
        audio_base64: Buffer.alloc(24000).toString('base64'),
        alignment: { characters, character_start_times_seconds: characters.map((_, i) => i * 0.01) },
      }));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, requests, base: `http://127.0.0.1:${server.address().port}` })));
}

test('mỗi câu gửi đi in "tính phí N ký tự": số ElevenLabs báo, hoặc số ký tự đã gửi khi không có header', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-billing-'));
  const cues = path.join(dir, 'video', 'cues.js');
  fs.mkdirSync(path.dirname(cues), { recursive: true });
  // A nonce keeps these texts apart from anything a real run ever cached.
  const nonce = Date.now().toString(36);
  const first = `Xin chào các bạn ${nonce}`;
  const second = `Hôm nay học AI ${nonce}`;
  fs.writeFileSync(cues, `export const CUES = [{ n: 1, text: ${JSON.stringify(first)} }, { n: 2, text: ${JSON.stringify(second)} }];\n`);
  const fake = await fakeElevenLabs((text) => (text === first ? 7 : null));
  const env = {
    ...process.env,
    ELEVENLABS_API_BASE: fake.base,
    ELEVENLABS_API_KEY: 'test-key',
    ELEVENLABS_VOICE_ID: 'abcdefghijklmnopqrst',
    ELEVENLABS_MODEL_ID: 'eleven_flash_v2_5',
    TTS_CACHE_DIR: path.join(dir, 'cache'),
  };
  const run = () => execFileP(process.execPath, [TTS, 'generate', '--cues', cues, '--out', path.join(dir, 'out')], { cwd: ROOT, env });
  try {
    const { stdout } = await run();
    assert.equal(fake.requests.length, 2);
    assert.match(stdout, /câu 01 → ElevenLabs … [\d.]+ s · tính phí 7 ký tự\n/);
    assert.match(stdout, new RegExp(`câu 02 → ElevenLabs … [\\d.]+ s · tính phí ${[...second].length} ký tự \\(ước\\)\\n`));
    assert.match(stdout, new RegExp(`ElevenLabs tính phí ${7 + [...second].length} ký tự cho 2 câu`));

    // Everything cached now: nothing is sent, nothing is billed, and no total line claims otherwise.
    const again = await run();
    assert.equal(fake.requests.length, 2);
    assert.doesNotMatch(again.stdout, /tính phí/);
  } finally {
    fake.server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

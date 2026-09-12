/**
 * Shared master-assembly for every voice source (ElevenLabs TTS, imported recordings, local models).
 *
 * The rest of the pipeline only ever sees two files — voice.wav and voice.cues.json — so the code that
 * turns per-câu audio into those two files lives here once. tts-elevenlabs/tts.mjs and
 * tools/voice-import.mjs both call `assemble()`, which guarantees a recorded voice and a generated voice
 * are timed by exactly the same rules: trim the silence around the speech, keep a little lead-in and
 * decay, add the pause, and pad every câu to a whole number of frames so scenes start on frame boundaries.
 */
import crypto from 'node:crypto';

export const FPS = 30;

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** 16-bit mono PCM → a .wav file buffer. */
export function wav(pcm, sampleRate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/** Leading/trailing near-silence in samples (16-bit mono), so boundaries follow the speech itself. */
export function speechBounds(pcm, threshold = 100) {
  const n = pcm.length / 2;
  let a = 0;
  let b = n;
  while (a < n && Math.abs(pcm.readInt16LE(a * 2)) < threshold) a++;
  while (b > a && Math.abs(pcm.readInt16LE((b - 1) * 2)) < threshold) b--;
  return { a, b };
}

/**
 * Assemble one continuous master from per-câu PCM.
 *
 *   items      [{ n, text, ttsText?, pcm, silent?, pauseAfter?, authoredFrames?, extra? }]
 *              `silent` = seconds of silence instead of speech; `pcm` is then ignored.
 *   sampleRate whole number of samples per frame at 30 fps (24000 for pcm_24000)
 *   pause      seconds of silence after each câu (a câu's own `pauseAfter` overrides it)
 *   trim       false keeps the audio as-is (silent placeholders, already-trimmed sources)
 *   onSegment  (item, offsetSeconds) → extra manifest fields; offsetSeconds is how much of the
 *              source was cut from the front, so word timestamps can be shifted onto the segment.
 *
 * Returns { wav, cues, durationInFrames, audioDurationSeconds, sampleRate } — `cues` is the manifest
 * array that voice.cues.json carries and tools/voice-timing.mjs reads.
 */
export function assemble({ items, sampleRate, pause = 1, trim = true, onSegment }) {
  if (!Number.isInteger(sampleRate) || sampleRate % FPS) {
    throw new Error(`sample rate ${sampleRate} is not a whole number of samples per frame at ${FPS} fps`);
  }
  const samplesPerFrame = sampleRate / FPS;
  const pauseSamples = Math.round(pause * sampleRate);
  const parts = [];
  const cues = [];
  let frame = 0;
  for (const c of items) {
    const raw = c.silent ? Buffer.alloc(Math.round(c.silent * sampleRate) * 2) : c.pcm;
    const { a, b } = trim && !c.silent ? speechBounds(raw) : { a: 0, b: raw.length / 2 };
    const lead = Math.min(a, Math.round(0.05 * sampleRate)); // keep ≤ 50 ms of the source's own lead-in
    const tail = Math.min(raw.length / 2 - b, Math.round(0.08 * sampleRate)); // keep ≤ 80 ms of decay
    const speech = raw.subarray((a - lead) * 2, (b + tail) * 2);
    const speechSamples = speech.length / 2;
    const after = c.silent ? 0 : c.pauseAfter != null ? Math.round(c.pauseAfter * sampleRate) : pauseSamples;
    const frames = Math.ceil((speechSamples + after) / samplesPerFrame);
    const segment = Buffer.alloc(frames * samplesPerFrame * 2);
    speech.copy(segment, 0);
    parts.push(segment);
    const ttsText = c.ttsText ?? c.text;
    cues.push({
      n: c.n,
      startFrame: frame,
      endFrame: frame + frames,
      durationInFrames: frames,
      speechFrames: c.silent ? 0 : Math.ceil(speechSamples / samplesPerFrame),
      authoredFrames: c.authoredFrames ?? null,
      seconds: +(frame / FPS).toFixed(3),
      speechDurationSeconds: +(speechSamples / sampleRate).toFixed(3),
      text: c.text,
      textSha256: sha256(c.text),
      ttsText,
      ttsTextSha256: sha256(ttsText),
      ...(c.extra || {}),
      ...(onSegment ? onSegment(c, (a - lead) / sampleRate) : {}),
    });
    frame += frames;
  }
  const master = wav(Buffer.concat(parts), sampleRate);
  return {
    wav: master,
    cues,
    durationInFrames: frame,
    audioDurationSeconds: +((master.length - 44) / 2 / sampleRate).toFixed(3),
    sampleRate,
  };
}

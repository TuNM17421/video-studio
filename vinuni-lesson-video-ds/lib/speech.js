/**
 * Beat timing from the narration, for a video's cues.js:
 *
 *   import { VOICE } from './voice.js';
 *   import { createSpeech } from '../../../../lib/speech.js';
 *   export const { spokenAt, speechEnd } = createSpeech(RAW, VOICE);
 *
 * Voice first: once tools/voice-timing.mjs has bound the recording, VOICE.cues[i].words holds the frame
 * (scene-local, 30 fps) at which every word of the sent TTS text starts — ElevenLabs character timestamps.
 * spokenAt then returns the real moment a phrase is said. Without word timings it falls back to the
 * phrase's syllable share of the measured `speech` frames, and before any recording to 3 syllables/s.
 * Dependency-free: tts-elevenlabs and tools/voice-timing.mjs import cues.js straight from disk.
 */
const FPS = 30;
const syllables = (s) => s.trim().split(/\s+/).filter(Boolean).length;

export function createSpeech(raw, voice) {
  const cue = (n) => {
    const c = raw.find((x) => x.n === n);
    if (!c) throw new Error(`no câu ${n} in cues.js`);
    return c;
  };
  const recorded = (n) => (voice ? voice.cues.find((v) => v.n === n) : null);

  /** Scene-local frame at which `phrase` starts being spoken in cue `n` (sync a beat 4–8 frames before it). */
  function spokenAt(n, phrase) {
    const c = cue(n);
    const i = c.text.indexOf(phrase);
    if (i < 0) throw new Error(`"${phrase}" is not in the narration of câu ${n}`);
    const v = recorded(n);
    if (v && v.words && v.words.length) {
      // words index into the text that was actually sent (pronunciation swaps, v3 audio tags).
      const sent = v.alignText || v.ttsText || c.text;
      let at = sent.indexOf(phrase);
      if (at < 0) at = Math.round((i / Math.max(1, c.text.length)) * sent.length);
      let frame = v.words[0][1];
      for (const [charIndex, f] of v.words) {
        if (charIndex > at) break;
        frame = f;
      }
      return frame;
    }
    const before = syllables(c.text.slice(0, i));
    if (c.speech) return Math.round((before / syllables(c.text)) * c.speech);
    return Math.round(before * (FPS / 3));
  }

  /** Scene-local frame the narration of cue `n` ends (before the trailing pause). */
  function speechEnd(n) {
    const v = recorded(n);
    if (v && v.speechFrames) return v.speechFrames;
    const c = cue(n);
    return c.speech ?? Math.round(syllables(c.text) * (FPS / 3));
  }

  return { spokenAt, speechEnd };
}

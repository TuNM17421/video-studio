#!/usr/bin/env node
/**
 * Print a video's cues as JSON (used by Video Studio, studio/): the narration list, sections, timing and
 * whether a recorded voice is bound.
 *
 *   node tools/cues-json.mjs <ui_kits/lesson-video/videos/<id>>
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = process.argv[2];
if (!dir || !fs.existsSync(path.join(dir, 'cues.js'))) {
  console.log(JSON.stringify({ exists: false }));
  process.exit(0);
}
const mod = await import(`${pathToFileURL(path.resolve(dir, 'cues.js')).href}?t=${Date.now()}`);
let voice = null;
if (fs.existsSync(path.join(dir, 'voice.js'))) {
  voice = (await import(`${pathToFileURL(path.resolve(dir, 'voice.js')).href}?t=${Date.now()}`)).VOICE;
}
const cues = (mod.CUES || []).map((c) => ({
  n: c.n,
  text: c.text,
  title: c.title || c.screen || '',
  section: c.section ?? null,
  visual: c.visual || '',
  silent: Boolean(c.silent),
  quiz: Boolean(c.quiz),
  start: c.start,
  end: c.end,
}));
console.log(
  JSON.stringify({
    exists: true,
    sections: mod.SECTIONS || [],
    duration: mod.DURATION ?? (cues.length ? cues[cues.length - 1].end : 0),
    voiced: Boolean(voice),
    voiceDuration: voice ? voice.durationInFrames : null,
    wordTimings: voice ? voice.cues.some((c) => c.words) : false,
    cues,
  }),
);

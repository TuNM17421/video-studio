#!/usr/bin/env node
/**
 * Timed transcript in the Video-studio format (transcripts/DayNN/*.txt):  "MM:SS - MM:SS: text"
 * One line per burned-in caption page, timed on the recorded narration (voice.cues.json); the last page
 * of each câu ends when the speech ends, so the pause between câu shows as a gap.
 *
 *   node tools/transcript.mjs <voice.cues.json> <out.txt>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error('usage: node tools/transcript.mjs <voice.cues.json> <out.txt>');
  process.exit(1);
}
const captionsSrc = fs.readFileSync(path.join(HERE, '../vinuni-lesson-video-ds/lib/captions.js'), 'utf8');
const { cueCaptions } = await import(`data:text/javascript;base64,${Buffer.from(captionsSrc).toString('base64')}`);

const m = JSON.parse(fs.readFileSync(src, 'utf8'));
const fps = m.fps;
const mmss = (frame) => {
  const s = Math.round(frame / fps);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const lines = [];
for (const c of m.cues) {
  if (!c.text) continue; // a silent pause cue has no caption
  const pages = cueCaptions([{ start: c.startFrame, end: c.endFrame, text: c.text, pause: c.durationInFrames - c.speechFrames }]);
  const speechEnd = c.startFrame + c.speechFrames;
  pages.forEach((p, i) => {
    const end = i === pages.length - 1 ? speechEnd : p.end;
    lines.push(`${mmss(p.start)} - ${mmss(end)}: ${p.text}`);
  });
}
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, `${lines.join('\n')}\n`);
console.log(`✓ ${out} · ${lines.length} dòng · ${mmss(m.durationInFrames)}`);

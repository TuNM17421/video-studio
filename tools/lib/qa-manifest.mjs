/**
 * Build the QA-platform manifest.json for one rendered video (spec v3 §6b of the VLearn QA platform).
 *
 * Pure functions only: they take the video's cues (cues.js `CUES` + `SECTIONS`) and its measured voice
 * timing (voice.cues.json) and return the manifest object plus a list of warnings. No file I/O, so the
 * CLI (tools/qa-manifest.mjs) and the tests share exactly the same rules.
 *
 * Timing comes from the voice, never from the script estimate: `start_sec` is the voice cue's `seconds`,
 * `end_sec` is its `endFrame / fps`. A quiz is the three-cue pattern the platform already detects:
 * (tag CÂU HỎI, spoken) → (silent > 0, no text) → (plain spoken cue). `quiz: true` in cues.js is only the
 * music-bed flag and is ignored here.
 */

export const QUIZ_TAG = 'CÂU HỎI';

const round3 = (x) => Math.round(x * 1000) / 1000;

/** Same rule as VLearn `qa_manifest.detect_questions`, so what this reports is what the platform sees. */
export function detectQuestions(cues) {
  const out = [];
  for (let i = 0; i + 2 < cues.length; i++) {
    const [q, pause, answer] = [cues[i], cues[i + 1], cues[i + 2]];
    if (q.tag !== QUIZ_TAG || !q.text) continue;
    if (!(pause.silent > 0) || pause.text) continue;
    if (!answer.text || answer.tag === QUIZ_TAG || answer.silent > 0) continue;
    out.push({ q: q.text, model_answer: answer.text, q_cue_n: q.n, a_cue_n: answer.n });
  }
  return out;
}

/**
 * @param {object} o
 * @param {Array} o.cues        cues.js CUES: {n, text, section, tag, silent}
 * @param {string[]} o.sections cues.js SECTIONS (section k is SECTIONS[k - 1])
 * @param {object} o.timing     voice.cues.json: {fps, audioDurationSeconds?, durationInFrames?, cues: [{n, text, seconds, startFrame, endFrame}]}
 * @param {object} o.meta       {item_id, title, build_no, script_hash, cues_hash, captions_burned, keep_frames}
 * @returns {{manifest: object, errors: string[], warnings: string[]}}
 */
export function buildQaManifest({ cues, sections = [], timing, meta }) {
  const errors = [];
  const warnings = [];
  const fps = Number(timing?.fps);
  if (!(fps > 0)) errors.push('voice.cues.json thiếu `fps`');
  const voice = Array.isArray(timing?.cues) ? timing.cues : [];
  if (!voice.length) errors.push('voice.cues.json không có `cues`');
  if (voice.length && voice.length !== cues.length) {
    errors.push(`voice.cues.json có ${voice.length} câu, cues.js có ${cues.length} — thu âm lại hoặc chạy lại voice-timing`);
  }
  if (!meta.item_id) errors.push('thiếu item_id (vd "10.1") — đây là mã item trong khung nội dung');
  if (errors.length) return { manifest: null, errors, warnings };

  const out = [];
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    const v = voice[i];
    const text = (c.text || '').trim();
    if (v.n !== c.n) {
      errors.push(`thứ tự câu lệch ở vị trí ${i + 1}: voice n=${v.n}, cues.js n=${c.n}`);
      continue;
    }
    if ((v.text || '').trim() !== text) {
      errors.push(`câu ${c.n}: lời trong voice.cues.json khác cues.js — bản thu đã cũ, thu lại câu này`);
      continue;
    }
    const start = Number(v.seconds ?? v.startFrame / fps);
    const end = Number.isFinite(v.endFrame) ? v.endFrame / fps : start + (v.durationInFrames ?? 0) / fps;
    const prev = out[out.length - 1];
    if (prev && start + 0.05 < prev.start_sec) errors.push(`câu ${c.n} bắt đầu (${start}s) trước câu ${prev.n}`);
    out.push({
      n: c.n,
      section: c.section ?? null,
      text,
      start_sec: round3(start),
      end_sec: round3(end),
      tag: c.tag || null,
      silent: Number(c.silent) || 0,
    });
  }
  if (errors.length) return { manifest: null, errors, warnings };

  const duration = round3(
    Number(timing.audioDurationSeconds) || (Number(timing.durationInFrames) ? timing.durationInFrames / fps : out[out.length - 1].end_sec),
  );
  if (Math.abs(duration - out[out.length - 1].end_sec) > 0.5) {
    warnings.push(`thời lượng audio ${duration}s lệch câu cuối (${out[out.length - 1].end_sec}s) quá 0.5s`);
  }

  const chapters = [];
  sections.forEach((title, idx) => {
    const k = idx + 1;
    const first = out.find((c) => c.section === k);
    if (first) chapters.push({ k, title, start_sec: first.start_sec });
    else warnings.push(`chương ${k} "${title}" không có câu nào`);
  });

  const questions = detectQuestions(out);
  const quizTagged = out.filter((c) => c.tag === QUIZ_TAG && c.text).length;
  if (questions.length === 0) {
    warnings.push('0 bộ quiz: màn hiểu bài sẽ chạy chế độ "3 ý chính". Kịch bản cần 3 bộ (CÂU HỎI → dừng → đáp án), chặn ở Giai đoạn 0');
  } else if (questions.length < 3) {
    warnings.push(`chỉ có ${questions.length}/3 bộ quiz`);
  }
  if (quizTagged > questions.length) {
    warnings.push(`${quizTagged - questions.length} câu gắn tag CÂU HỎI nhưng không theo đúng mẫu (CÂU HỎI → câu im lặng → câu đáp án) nên platform sẽ bỏ qua`);
  }
  if (meta.keep_frames) warnings.push('render.keep_frames = true: platform sẽ TỪ CHỐI bản dựng này. Render lại không dùng --keep-frames');

  const manifest = {
    item_id: String(meta.item_id),
    title: meta.title || '',
    build_no: meta.build_no ?? 1,
    script_hash: meta.script_hash ?? null,
    cues_hash: meta.cues_hash ?? null,
    duration_sec: duration,
    fps,
    captions_burned: Boolean(meta.captions_burned),
    render: { keep_frames: Boolean(meta.keep_frames) },
    chapters,
    cues: out,
  };
  return { manifest, errors, warnings, questions };
}

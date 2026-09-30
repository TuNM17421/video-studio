/**
 * Edit one câu of a cues.js by hand — a typo in the narration, a shorter on-screen title — without an agent turn.
 *
 * cues.js is code an agent wrote, so it is edited the way a person would: find the câu's object inside
 * `const RAW = [ … ]`, replace the string literal of the field, touch nothing else. A small tokenizer (strings,
 * comments, brackets) finds the spans; it does not try to understand JavaScript. What proves the edit right is
 * the check after it (tools/cue-edit.mjs): the edited file is imported, the câu must read exactly the new value,
 * and every other câu, SECTIONS and DURATION must be what they were. Anything the tokenizer cannot place — a
 * value built from an expression, a RAW that is not a plain array — is refused, never guessed.
 */

export const EDITABLE = ['text', 'title', 'visual'];

/** Tokens with their spans: `str`, `ident`, `num`, or one punctuation character. Comments and spaces dropped. */
export function tokenize(source) {
  const out = [];
  let i = 0;
  const n = source.length;
  while (i < n) {
    const c = source[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && source[i + 1] === '/') { while (i < n && source[i] !== '\n') i++; continue; }
    if (c === '/' && source[i + 1] === '*') { const end = source.indexOf('*/', i + 2); i = end < 0 ? n : end + 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const start = i;
      i++;
      while (i < n && source[i] !== c) {
        if (source[i] === '\\') i++;
        // A template with ${…} is an expression, not a literal this edit may rewrite.
        else if (c === '`' && source[i] === '$' && source[i + 1] === '{') out.push({ type: 'template-expr', start: i, end: i + 2 });
        i++;
      }
      if (i >= n) throw new Error('cues.js có một chuỗi không đóng.');
      i++;
      out.push({ type: 'str', quote: c, start, end: i });
      continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      const start = i;
      while (i < n && /[\w$]/.test(source[i])) i++;
      out.push({ type: 'ident', value: source.slice(start, i), start, end: i });
      continue;
    }
    if (/[0-9]/.test(c)) {
      const start = i;
      while (i < n && /[\w.]/.test(source[i])) i++;
      out.push({ type: 'num', value: source.slice(start, i), start, end: i });
      continue;
    }
    out.push({ type: 'punct', value: c, start: i, end: i + 1 });
    i++;
  }
  return out;
}

const OPEN = { '{': '}', '[': ']', '(': ')' };

/**
 * The câu objects of `const RAW = [ … ]`: for each, its span and its top-level properties as
 * `{ key, keyToken, valueTokens }` (valueTokens = every token of the value, up to the next top-level comma).
 */
export function rawCues(source) {
  const tokens = tokenize(source);
  const at = tokens.findIndex((t, k) => t.type === 'ident' && t.value === 'RAW' && tokens[k + 1]?.value === '=' && tokens[k + 2]?.value === '[');
  if (at < 0) throw new Error('Không tìm thấy `const RAW = [ … ]` trong cues.js.');
  const cues = [];
  const stack = [];
  let k = at + 2;
  let current = null;
  let property = null;
  for (; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.type === 'punct' && OPEN[t.value]) {
      // depth 1 = inside RAW's brackets; an object opened there is one câu
      if (stack.length === 1 && t.value === '{') current = { start: t.start, props: [] };
      else if (current && property && stack.length >= 2) property.valueTokens.push(t);
      stack.push(OPEN[t.value]);
      continue;
    }
    if (t.type === 'punct' && (t.value === '}' || t.value === ']' || t.value === ')')) {
      if (stack.pop() !== t.value) throw new Error('cues.js có ngoặc không khớp.');
      if (!stack.length) break; // end of RAW
      if (stack.length === 1 && current && t.value === '}') {
        current.end = t.end;
        current.closeToken = t;
        cues.push(current);
        current = null;
        property = null;
      } else if (current && property) property.valueTokens.push(t);
      continue;
    }
    if (!current) continue;
    if (stack.length === 2) {
      // top level of the câu object: `key: value,`
      if (t.value === ',') { if (property) property.comma = t; property = null; continue; }
      if (!property && (t.type === 'ident' || t.type === 'str') && tokens[k + 1]?.value === ':') {
        property = { key: t.type === 'ident' ? t.value : source.slice(t.start + 1, t.end - 1), keyToken: t, valueTokens: [] };
        current.props.push(property);
        k++; // the colon
        continue;
      }
    }
    if (property) property.valueTokens.push(t);
  }
  if (stack.length) throw new Error('Không đọc hết được `RAW` trong cues.js.');
  return cues;
}

/** A value as a single-quoted literal, the way the agents write cues.js. */
export function literal(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')}'`;
}

/**
 * The source with câu `n`'s fields replaced. A field the câu does not have yet is added as the last property,
 * on its own line at the câu's indentation. Throws with a reason a member can act on.
 */
export function editCueSource(source, n, changes) {
  const keys = Object.keys(changes);
  const unknown = keys.filter((key) => !EDITABLE.includes(key));
  if (unknown.length) throw new Error(`Không sửa trực tiếp được: ${unknown.join(', ')}.`);
  const cue = rawCues(source).find((c) => {
    const prop = c.props.find((p) => p.key === 'n');
    return prop && prop.valueTokens.length === 1 && prop.valueTokens[0].type === 'num' && Number(prop.valueTokens[0].value) === n;
  });
  if (!cue) throw new Error(`Không tìm thấy câu ${n} (\`n: ${n}\`) trong RAW của cues.js.`);
  const edits = [];
  const missing = [];
  for (const key of keys) {
    const prop = cue.props.find((p) => p.key === key);
    if (!prop) { missing.push(key); continue; }
    const value = prop.valueTokens;
    if (value.length !== 1 || value[0].type !== 'str') {
      throw new Error(`\`${key}\` của câu ${n} không phải một chuỗi đơn trong cues.js — nhờ agent sửa câu này.`);
    }
    edits.push({ start: value[0].start, end: value[0].end, text: literal(changes[key]) });
  }
  if (missing.length) {
    // New lines go after the last property (and its comma), at that property's indentation.
    const last = cue.props.at(-1);
    if (!last?.valueTokens.length) throw new Error(`Câu ${n} trong cues.js không có dạng { key: value, … } — nhờ agent sửa câu này.`);
    const lineStart = source.lastIndexOf('\n', last.keyToken.start) + 1;
    const indent = source.slice(lineStart, last.keyToken.start).match(/^[ \t]*/)[0];
    const at = last.comma ? last.comma.end : last.valueTokens.at(-1).end;
    const added = missing.map((key) => `\n${indent}${key}: ${literal(changes[key])},`).join('');
    edits.push({ start: at, end: at, text: `${last.comma ? '' : ','}${added}` });
  }
  let out = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, edit.start) + edit.text + out.slice(edit.end);
  return out;
}

/**
 * The script line carrying this câu's narration (`- **Lời:** …`), rewritten when the old narration appears on
 * exactly one such line — so the script, which every tool matches câu against by their words, keeps saying what
 * the video says. Anything else is left alone and reported.
 */
export function syncScriptNarration(script, oldText, newText) {
  const lines = script.split('\n');
  const re = /^(\s*[-*]\s*\*\*Lời:\*\*\s*)(.*?)(\s*)$/;
  const hits = [];
  lines.forEach((line, i) => {
    const m = line.replace(/\r$/, '').match(re);
    if (m && m[2].trim() === oldText.trim()) hits.push(i);
  });
  if (hits.length !== 1) return { script, result: hits.length ? 'ambiguous' : 'not-found' };
  const i = hits[0];
  const cr = lines[i].endsWith('\r') ? '\r' : '';
  const m = lines[i].replace(/\r$/, '').match(re);
  lines[i] = `${m[1]}${newText}${cr}`;
  return { script: lines.join('\n'), result: 'updated' };
}

/** The `spokenAt(cue, …)` calls of one scene, with the câu they anchor to and the phrase when it can be read. */
function sceneAnchors(source) {
  // Scenes write `const N = 2;` then `spokenAt(N, …)`; a number in place of the constant is also accepted.
  const numbers = new Map([...source.matchAll(/\bconst\s+([\w$]+)\s*=\s*(\d+)\s*;/g)].map((m) => [m[1], Number(m[2])]));
  // `const SAID = ['…', '…'];` — a list of plain literals, so `SAID[1]` reads as exactly one phrase.
  const lists = new Map();
  for (const m of source.matchAll(/\bconst\s+([\w$]+)\s*=\s*\[([^\]]*)\]\s*;/g)) {
    const items = [...m[2].matchAll(/(['"`])((?:\\.|(?!\1).)*?)\1/g)];
    // only when the array is nothing but literals: a list of objects says nothing about `X[0]`
    if (items.length && !m[2].replace(/(['"`])(?:\\.|(?!\1).)*?\1/g, '').replace(/[\s,]/g, '')) {
      lists.set(m[1], items.map((it) => readLiteral(it[2])));
    }
  }
  const out = [];
  for (const m of source.matchAll(/spokenAt\(\s*([\w$]+)\s*,\s*([^()]*?)\s*\)/g)) {
    const cue = /^\d+$/.test(m[1]) ? Number(m[1]) : numbers.get(m[1]);
    if (cue === undefined) continue;
    const arg = m[2];
    const literal = arg.match(/^(['"`])((?:\\.|(?!\1).)*)\1$/);
    if (literal && !(literal[1] === '`' && /\$\{/.test(literal[2]))) { out.push({ cue, phrase: readLiteral(literal[2]) }); continue; }
    const indexed = arg.match(/^([\w$]+)\s*\[\s*(\d+)\s*\]$/);
    const item = indexed ? lists.get(indexed[1])?.[Number(indexed[2])] : undefined;
    if (item !== undefined) { out.push({ cue, phrase: item }); continue; }
    // a variable, a field, a map callback's parameter: this reader cannot say which phrase it holds
    out.push({ cue, expr: arg });
  }
  return out;
}

/** A phrase literal as JavaScript reads it: the only escapes a phrase uses are quotes and backslashes. */
function readLiteral(raw) {
  return raw.replace(/\\(.)/g, '$1');
}

/**
 * Phrases the scenes anchor to câu `n`'s narration — `spokenAt(n, 'cụm từ')` places a beat on the frame that
 * phrase is said, and throws while the video loads when the phrase is gone from the text. Returns the ones the
 * new narration no longer contains, with the scene file that needs each: a hand edit must keep them, or leave
 * the câu to the agent, which fixes the scene with it.
 */
export function lostAnchors(sceneFiles, n, newText) {
  const lost = [];
  for (const { file, source } of sceneFiles) {
    for (const anchor of sceneAnchors(source)) {
      if (anchor.cue !== n || anchor.phrase === undefined) continue;
      const { phrase } = anchor;
      // one scene may time several beats to the same phrase: name it once
      if (!newText.includes(phrase) && !lost.some((l) => l.file === file && l.phrase === phrase)) lost.push({ file, phrase });
    }
  }
  return lost;
}

/**
 * Anchors of câu `n` whose phrase this reader cannot resolve — `spokenAt(N, p)` inside a `.map()`, `spokenAt(N,
 * c.say)` over a table of beats. `lostAnchors` cannot tell whether a new narration still contains them, so a
 * hand edit is refused rather than accepted on a check that never looked: the câu goes to the agent, which
 * reads the scene properly and fixes both together.
 */
export function opaqueAnchors(sceneFiles, n) {
  const out = [];
  for (const { file, source } of sceneFiles) {
    for (const anchor of sceneAnchors(source)) {
      if (anchor.cue !== n || anchor.expr === undefined) continue;
      if (!out.some((o) => o.file === file && o.expr === anchor.expr)) out.push({ file, expr: anchor.expr });
    }
  }
  return out;
}

/** What a member typed, as it goes into cues.js: one line, no stray spaces. */
export function cleanValue(value) {
  return String(value ?? '').replace(/\s*\r?\n\s*/g, ' ').trim();
}

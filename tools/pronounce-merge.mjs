#!/usr/bin/env node
/**
 * Merge verified pronunciations from pronounce-verified.json with project-specific overrides.
 * Outputs a simple { "từ": "cách đọc" } format ready for --pronounce flag in voice-export.mjs.
 *
 *   node tools/pronounce-merge.mjs --out projects/<id>/pronounce.json [--extra '{"TỪ":"cách đọc"}']
 *
 * Reads pronounce-verified.json from repo root (contains all verified pronunciations with metadata),
 * extracts only the "say" field from each entry, merges with --extra entries (if provided),
 * and writes the result to --out.
 *
 * Safety: will NOT overwrite an existing file if it differs from what we're about to write.
 * This prevents silent data loss; if you need to regenerate, delete the old file first or pass
 * --force to confirm overwrite.
 */
import fs from 'node:fs';
import path from 'node:path';

const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const VALUE_FLAGS = new Set(['out', 'extra']);
const argv = process.argv.slice(2);
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const name = argv[i].slice(2);
  flags[name] = VALUE_FLAGS.has(name) ? argv[++i] : true;
}

const outPath = flags.out ? path.resolve(flags.out) : null;
if (!outPath) fail('usage: node tools/pronounce-merge.mjs --out <path> [--extra \'{"word":"say"}\'] [--force]');

// Read verified pronunciations from repo root
const repoRoot = process.cwd();
const verifiedPath = path.join(repoRoot, 'pronounce-verified.json');
if (!fs.existsSync(verifiedPath)) {
  fail(`${verifiedPath} not found — run from repo root`);
}

let verified = {};
try {
  const content = fs.readFileSync(verifiedPath, 'utf8');
  verified = JSON.parse(content);
} catch (e) {
  fail(`Failed to parse ${verifiedPath}: ${e.message}`);
}

// Extract simple format: { "word": "say" }
const simplified = {};
for (const [word, entry] of Object.entries(verified)) {
  if (entry.say) {
    simplified[word] = entry.say;
  }
}

// Merge with --extra if provided
let extra = {};
if (flags.extra) {
  try {
    extra = JSON.parse(flags.extra);
  } catch (e) {
    fail(`Failed to parse --extra: ${e.message}`);
  }
}

const merged = { ...simplified, ...extra };

// Prepare output
const outJson = JSON.stringify(merged, null, 2);

// Safety check: don't silently overwrite if content differs
if (fs.existsSync(outPath) && !flags.force) {
  const existing = fs.readFileSync(outPath, 'utf8');
  if (existing.trim() !== outJson.trim()) {
    fail(
      `${path.relative(repoRoot, outPath)} already exists with different content. ` +
      `Pass --force to overwrite, or delete the file first.`
    );
  }
}

// Create directory if needed
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${outJson}\n`);

const extraCount = Object.keys(extra).length;
console.log(`✓ ${path.relative(repoRoot, outPath)}`);
console.log(`  ${Object.keys(simplified).length} verified + ${extraCount} extra = ${Object.keys(merged).length} total`);
if (extraCount > 0) {
  console.log(`  extra: ${Object.keys(extra).join(', ')}`);
}

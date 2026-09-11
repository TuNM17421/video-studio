#!/usr/bin/env node
/**
 * postinstall: link node_modules/vinuni-lesson-video-ds → ../vinuni-lesson-video-ds, so the design-sync
 * converter (`--node-modules ./node_modules`, cfg.tokensPkg) finds the design system as a package.
 * npm install removes unknown entries from node_modules, so this runs after every install.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const link = path.join(ROOT, 'node_modules/vinuni-lesson-video-ds');
fs.mkdirSync(path.dirname(link), { recursive: true });
fs.rmSync(link, { recursive: true, force: true });
// 'junction' lets Windows create the link without admin rights; ignored elsewhere.
fs.symlinkSync(path.join(ROOT, 'vinuni-lesson-video-ds'), link, 'junction');
console.log('✓ node_modules/vinuni-lesson-video-ds → vinuni-lesson-video-ds');

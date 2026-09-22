/**
 * Doodles for the whiteboard: Lucide line icons (ISC, approved dependency) redrawn as marker strokes.
 * An icon's elements become one path on its 24 grid; roughenPath() then walks that path, jitters it by a
 * seeded wobble and rebuilds it as a smooth hand-drawn curve in board coordinates, so the marker can draw
 * it on (drawOn) and follow it (penOnPath) like any other stroke.
 *
 * Vendored subset, like LineIcon: add a name here (import + DOODLES entry) when a lesson needs a new picture.
 */
import {
  AtSign, Banknote, BookOpen, Bot, Brain, Bug, Building2, Calendar, ChartColumn, ChartLine, ChartPie, CircleAlert,
  CircleQuestionMark, ClipboardCheck, Clock, Cloud, Cog, Coins, Cpu, Database, Eye, FileText, Flag, GitFork, Globe,
  GraduationCap, Hand, Handshake, Heart, Hourglass, House, Key, Laptop, Lightbulb, ListChecks, Lock, Mail,
  Map as MapGlyph, Megaphone, MessageCircle, MessageSquare, Network, Pencil, Puzzle, RefreshCw, Rocket, Scale,
  Search, Send, Server, ShieldCheck, Smartphone, Sparkles, Star, StickyNote, Target, ThumbsDown, ThumbsUp, TrendingUp,
  Trophy, User, Users, Workflow, Wrench, Zap,
} from 'lucide';
import { curvePath, getLength, getPointAtLength } from '../../lib/paths.js';
import { rng } from '../../lib/text.js';

export const DOODLES = Object.freeze({
  'at-sign': AtSign, banknote: Banknote, 'book-open': BookOpen, bot: Bot, brain: Brain, bug: Bug, building: Building2,
  calendar: Calendar, 'chart-bar': ChartColumn, 'chart-line': ChartLine, 'chart-pie': ChartPie, alert: CircleAlert,
  question: CircleQuestionMark, 'clipboard-check': ClipboardCheck, clock: Clock, cloud: Cloud, gear: Cog, coins: Coins,
  cpu: Cpu, database: Database, eye: Eye, document: FileText, flag: Flag, fork: GitFork, globe: Globe,
  'graduation-cap': GraduationCap, hand: Hand, handshake: Handshake, heart: Heart, hourglass: Hourglass, house: House,
  key: Key, laptop: Laptop, lightbulb: Lightbulb, checklist: ListChecks, lock: Lock, mail: Mail, map: MapGlyph,
  megaphone: Megaphone, 'speech-round': MessageCircle, 'speech-square': MessageSquare, network: Network,
  pencil: Pencil, puzzle: Puzzle, cycle: RefreshCw, rocket: Rocket, scale: Scale, search: Search,
  'paper-plane': Send, server: Server, shield: ShieldCheck, phone: Smartphone, sparkles: Sparkles, star: Star,
  note: StickyNote, target: Target, 'thumbs-down': ThumbsDown, 'thumbs-up': ThumbsUp, 'trend-up': TrendingUp,
  trophy: Trophy, user: User, users: Users, workflow: Workflow, wrench: Wrench, zap: Zap,
});

const n = (v) => Number(v) || 0;

/**
 * Lucide writes arc flags glued together ("a2 2 0 0022 17" = flags 0 0, then x 22) — valid SVG, but the
 * path parser behind getLength wants them separated. Re-emit every arc with explicit separators.
 */
function normalizeArcs(d) {
  if (!/[Aa]/.test(d)) return d;
  let i = 0;
  let out = '';
  const num = () => {
    const m = d.slice(i).match(/^[\s,]*(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/i);
    if (!m) return null;
    i += m[0].length;
    return m[1];
  };
  const flag = () => {
    const m = d.slice(i).match(/^[\s,]*([01])/);
    if (!m) return null;
    i += m[0].length;
    return m[1];
  };
  while (i < d.length) {
    const c = d[i];
    if (c === 'A' || c === 'a') {
      out += c;
      i++;
      for (;;) {
        const save = i;
        const rx = num();
        if (rx === null) break;
        const args = [rx, num(), num(), flag(), flag(), num(), num()];
        if (args.some((v) => v === null)) {
          i = save;
          break;
        }
        out += `${args.join(' ')} `;
      }
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** One Lucide element as path data on its 24 grid. */
function elementPath([tag, a]) {
  switch (tag) {
    case 'path':
      return normalizeArcs(a.d);
    case 'line':
      return `M${n(a.x1)} ${n(a.y1)}L${n(a.x2)} ${n(a.y2)}`;
    case 'polyline':
    case 'polygon': {
      const p = String(a.points).trim().split(/[\s,]+/).map(Number);
      let d = `M${p[0]} ${p[1]}`;
      for (let i = 2; i < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`;
      return tag === 'polygon' ? `${d}Z` : d;
    }
    case 'circle':
    case 'ellipse': {
      const rx = n(a.r ?? a.rx);
      const ry = n(a.r ?? a.ry);
      const cx = n(a.cx);
      const cy = n(a.cy);
      return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;
    }
    case 'rect': {
      const x = n(a.x);
      const y = n(a.y);
      const w = n(a.width);
      const h = n(a.height);
      const r = Math.min(n(a.rx ?? a.ry), w / 2, h / 2);
      if (!r) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
    }
    default:
      return '';
  }
}

/** The doodle's elements, each as its own path on the 24 grid (kept apart: each is one pen stroke). */
export function doodleParts(name) {
  const icon = DOODLES[name];
  if (!icon) throw new Error(`no doodle "${name}" — known: ${Object.keys(DOODLES).join(', ')}`);
  return icon.map(elementPath).filter(Boolean);
}

/**
 * Hand-drawn version of path `d`: sampled every `step` px after `map` (grid → board), each sample nudged by
 * up to `amp` px, rebuilt as a smooth curve. A jump between samples (a new subpath) starts a new stroke.
 */
export function roughenPath(d, seed, { map = (p) => p, amp = 1.6, step = 9, scale = 1 } = {}) {
  const r = rng(seed);
  const len = getLength(d);
  const count = Math.max(2, Math.ceil((len * scale) / step));
  const strokes = [];
  let cur = [];
  let prev = null;
  for (let i = 0; i <= count; i++) {
    const g = getPointAtLength(d, Math.min(len - 1e-3, (len * i) / count));
    if (!g) continue;
    if (prev && Math.hypot(g.x - prev.x, g.y - prev.y) * scale > step * 3) {
      strokes.push(cur);
      cur = [];
    }
    prev = g;
    const p = map(g);
    cur.push({ x: p.x + (r() * 2 - 1) * amp, y: p.y + (r() * 2 - 1) * amp });
  }
  strokes.push(cur);
  return strokes.filter((s) => s.length > 1).map((s) => curvePath(s, 'catmullRom')).join(' ');
}

/** Doodle `name` centred on (x, y), `size` px across, turned `rotate` degrees — one board-space path. */
export function sketchDoodle({ name, x, y, size = 120, rotate = 0 }, seed) {
  const k = size / 24;
  const a = (rotate * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const map = (p) => {
    const dx = (p.x - 12) * k;
    const dy = (p.y - 12) * k;
    return { x: x + dx * cos - dy * sin, y: y + dx * sin + dy * cos };
  };
  return doodleParts(name)
    .map((d, i) => roughenPath(d, seed + i * 7, { map, scale: k, amp: Math.max(0.8, size / 90), step: Math.max(6, size / 14) }))
    .join(' ');
}

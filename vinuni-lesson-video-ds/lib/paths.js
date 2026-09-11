/**
 * Path, curve, morph and graph-layout helpers (approved libraries, all pure functions):
 *   @remotion/paths (MIT) · d3-shape / d3-scale / d3-interpolate (ISC) · flubber (MIT) · @dagrejs/dagre (MIT).
 * None of them touch the DOM or the clock, so every result is a deterministic function of its inputs.
 */
import {
  evolvePath,
  getLength,
  getPointAtLength,
  getTangentAtLength,
  interpolatePath,
  reversePath,
} from '@remotion/paths';
import { line, curveBasis, curveCatmullRom, curveMonotoneX, curveLinear, curveStep } from 'd3-shape';
import { scaleLinear, scaleBand } from 'd3-scale';
import { interpolateRgb } from 'd3-interpolate';
import { interpolate as flubberInterpolate } from 'flubber';
import dagre from '@dagrejs/dagre';

export { evolvePath, getLength, getPointAtLength, getTangentAtLength, interpolatePath, reversePath, scaleLinear, scaleBand };

const CURVES = { basis: curveBasis, catmullRom: curveCatmullRom, monotoneX: curveMonotoneX, linear: curveLinear, step: curveStep };

/** Smooth SVG path through points: curvePath([{x,y},…], 'catmullRom'). */
export function curvePath(points, curve = 'catmullRom') {
  return line()
    .x((p) => p.x)
    .y((p) => p.y)
    .curve(CURVES[curve] ?? curveCatmullRom)(points);
}

/** Point + angle (degrees) at progress t (0–1) along an SVG path string — particles that turn with the curve. */
export function pointOnPath(d, t) {
  const len = getLength(d);
  const at = Math.max(0, Math.min(len, len * t));
  const p = getPointAtLength(d, at);
  const tan = getTangentAtLength(d, at);
  return { x: p.x, y: p.y, angle: (Math.atan2(tan.y, tan.x) * 180) / Math.PI };
}

/** Stroke props that draw `d` from 0 to t (0–1): <path d={d} {...drawOn(d, t)} />. */
export function drawOn(d, t) {
  const { strokeDasharray, strokeDashoffset } = evolvePath(Math.max(0, Math.min(1, t)), d);
  return { strokeDasharray, strokeDashoffset };
}

const morphCache = new Map();
/** Morph between two unrelated shapes (flubber): morphPath(squareD, circleD, t). Interpolators are memoised. */
export function morphPath(a, b, t) {
  const key = `${a}|${b}`;
  let f = morphCache.get(key);
  if (!f) {
    f = flubberInterpolate(a, b, { maxSegmentLength: 8 });
    morphCache.set(key, f);
  }
  return f(Math.max(0, Math.min(1, t)));
}

/** Color between two tokens at t (0–1), e.g. mixColor(C.dotInactive, C.red, weight). */
export function mixColor(a, b, t) {
  return interpolateRgb(a, b)(Math.max(0, Math.min(1, t)));
}

/**
 * Auto-layout a directed graph (dagre). nodes: [{id, w, h}], edges: [{from, to}].
 * Returns { nodes: {id: {x, y, w, h}} (top-left box, scene px), edges: [{from, to, points}] , width, height }.
 * Deterministic — compute once per scene (outside the frame loop is fine) and animate with appear/Flow.
 */
export function layoutGraph(nodes, edges, { rankdir = 'LR', nodesep = 60, ranksep = 120, marginx = 0, marginy = 0, x = 0, y = 0 } = {}) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir, nodesep, ranksep, marginx, marginy });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(n.id, { width: n.w, height: n.h });
  for (const e of edges) g.setEdge(e.from, e.to);
  dagre.layout(g);
  const outNodes = {};
  for (const n of nodes) {
    const v = g.node(n.id);
    outNodes[n.id] = { x: x + v.x - n.w / 2, y: y + v.y - n.h / 2, w: n.w, h: n.h };
  }
  const outEdges = edges.map((e) => ({
    from: e.from,
    to: e.to,
    points: g.edge(e.from, e.to).points.map((p) => ({ x: x + p.x, y: y + p.y })),
  }));
  const gg = g.graph();
  return { nodes: outNodes, edges: outEdges, width: gg.width, height: gg.height };
}

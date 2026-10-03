import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { Cue } from "../types";
import type { SfxPlan, SfxSpot, SfxState } from "../sfx-plan";
import { agentSpots, EMPTY_SFX_STATE, planFrom, planHasSound, pruneDecisions, SFX_FPS, suggestSpots } from "../sfx-plan";
import type { SfxCatalog } from "../sfx";
import { sfxCatalog } from "./sfx";
import { readTriage, sfxKey } from "./sfx-agent";
import { isRunning } from "./jobs";
import { exists, HttpError, projectDir, REPO, rel, voiceOut } from "./paths";
import { cuesInfo } from "./videos";

const execFileP = promisify(execFile);

/**
 * Bước "Tiếng động" của một video: đề xuất chỗ (code) → người dựng duyệt ở bước Render → trộn.
 *
 * Mọi file của bước này nằm trong `projects/<id>/sfx/`; bản trộn ra `projects/<id>/voice-sfx.wav`, đúng
 * chỗ `tools/lib/render-audio.mjs` đi tìm, nên lệnh render không phải biết gì về bước này.
 */
const dir = (id: string) => path.join(projectDir(id), "sfx");
const decisionsFile = (id: string) => path.join(dir(id), "decisions.json");
const planFile = (id: string) => path.join(dir(id), "plan.json");
export const mixPath = (id: string) => path.join(projectDir(id), "voice-sfx.wav");
const voiceWav = (id: string) => path.join(voiceOut(id), "voice.wav");

function readJson<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, "utf8")) as T; } catch { return fallback; }
}

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, file);
}

export interface SfxView {
  /** Chưa có giọng thì chưa đề xuất được gì: tiếng căn theo mốc lời thật. */
  ready: boolean;
  spots: SfxSpot[];
  state: SfxState;
  catalog: SfxCatalog;
  /** Tên các phần, để panel gọi đúng tên lúc chọn tiếng nền. */
  sections: string[];
  /** Bản trộn hiện có cũ hơn giọng hay không — render sẽ tự trộn lại. */
  mixStale: boolean;
  /** Chỗ agent đề xuất mà không qua soát, kèm lý do. */
  dropped: string[];
  hasAgentRun: boolean;
  /** Lượt agent đang chạy — panel tự hỏi lại cho tới khi xong. */
  suggesting: boolean;
}

async function cuesOf(id: string): Promise<{ cues: Cue[]; sections: string[] }> {
  const info = await cuesInfo(id);
  return { cues: info?.cues ?? [], sections: info?.sections ?? [] };
}

/**
 * Toàn bộ chỗ đề xuất: của Studio (mở màn, ranh giới phần, chỗ kịch bản khai) cộng của agent sau khi đã
 * soát. `dropped` là những chỗ agent đề xuất mà không qua soát — panel hiện ra, vì im lặng bỏ đi thì
 * người dựng tưởng agent chẳng tìm được gì.
 */
async function allSpots(id: string): Promise<{ cues: Cue[]; sections: string[]; spots: SfxSpot[]; dropped: string[] }> {
  const { cues, sections } = await cuesOf(id);
  if (!cues.length) return { cues, sections, spots: [], dropped: [] };
  const catalog = sfxCatalog();
  const { spots: fromAgent, dropped } = agentSpots(readTriage(id), cues, catalog.sounds);
  return { cues, sections, spots: suggestSpots(cues, sections, fromAgent), dropped };
}

export const readSfxState = (id: string): SfxState => ({ ...EMPTY_SFX_STATE, ...readJson<Partial<SfxState>>(decisionsFile(id), {}) });

export async function sfxView(id: string): Promise<SfxView> {
  const { cues, sections, spots: all, dropped } = await allSpots(id);
  const ready = exists(voiceWav(id)) && cues.length > 0;
  const spots = ready ? all : [];
  const state = pruneDecisions(readSfxState(id), spots);
  const mix = mixPath(id);
  const mixStale = exists(mix) && exists(voiceWav(id))
    && fs.statSync(mix).mtimeMs < fs.statSync(voiceWav(id)).mtimeMs;
  return { ready, spots, state, catalog: sfxCatalog(), sections, mixStale, dropped, hasAgentRun: spots.some((s) => s.kind === "agent"), suggesting: isRunning(sfxKey(id)) };
}

/** Lưu quyết định của người dựng. Chỗ không còn tồn tại bị bỏ ngay lúc ghi, không để rác lại. */
export async function saveSfxState(id: string, next: SfxState): Promise<SfxView> {
  const { spots } = await allSpots(id);
  const known = new Set(spots.map((s) => s.id));
  const decisions: SfxState["decisions"] = {};
  for (const [spotId, decision] of Object.entries(next.decisions ?? {})) {
    if (!known.has(spotId) || typeof decision?.use !== "boolean") continue;
    decisions[spotId] = { use: decision.use, ...(decision.soundId ? { soundId: decision.soundId } : {}) };
  }
  const sounds = new Set(sfxCatalog().sounds.map((s) => s.id));
  for (const decision of Object.values(decisions)) {
    if (decision.soundId && !sounds.has(decision.soundId)) delete decision.soundId;
  }
  const beds: SfxState["beds"] = {};
  for (const [section, soundId] of Object.entries(next.beds ?? {})) {
    if (typeof soundId === "string" && sounds.has(soundId)) beds[section] = soundId;
  }
  writeJson(decisionsFile(id), { decisions, beds });
  return sfxView(id);
}

/** Plan hiện tại của một video, dựng lại từ quyết định đã lưu. */
export async function currentPlan(id: string): Promise<SfxPlan> {
  const { cues, sections, spots } = await allSpots(id);
  return planFrom(id, spots, readSfxState(id), cues, sections);
}

interface DryHit {
  id: string;
  frame: number;
  startFrame: number;
  db: number;
  panPos: number;
  layer: string;
  why: string;
  onSpeech: boolean;
}

/** `sfx-mix --dry --json`: mốc và mức thật của từng tiếng, tính bằng chính luật của bản trộn. */
async function dryRun(id: string, plan: SfxPlan): Promise<{ hits: DryHit[]; beds: DryHit[] }> {
  if (!planHasSound(plan)) return { hits: [], beds: [] };
  const file = path.join(dir(id), "plan.dry.json");
  writeJson(file, plan);
  try {
    const { stdout } = await execFileP(process.execPath, [
      "tools/sfx-mix.mjs", "--video", id, "--plan", rel(file), "--dry", "--json",
    ], { cwd: REPO, maxBuffer: 8 * 1024 * 1024 });
    return JSON.parse(stdout) as { hits: DryHit[]; beds: DryHit[] };
  } catch (e) {
    const message = e instanceof Error && "stderr" in e ? String((e as { stderr?: string }).stderr || e.message) : String(e);
    throw new HttpError(400, message.replace(/^✗ /m, "").trim() || "Không dựng được danh sách tiếng.");
  } finally {
    fs.rmSync(file, { force: true });
  }
}

/** Danh sách tiếng đã duyệt kèm mốc và mức thật — panel hiện cùng những số mà bản trộn dùng. */
export async function sfxDryRun(id: string) {
  return dryRun(id, await currentPlan(id));
}

/** Đoạn nghe thử: 2 giây trước mốc (đủ cho tiếng có đỉnh muộn nhất) và 2,5 giây sau. */
const PREVIEW_LEAD = 2 * SFX_FPS;
const PREVIEW_TAIL = Math.round(2.5 * SFX_FPS);

/**
 * Nghe thử MỘT chỗ, bằng chính `sfx-mix` (`--window`) chứ không dựng lệnh ffmpeg riêng: mức, duck và
 * limiter phải y hệt bản trộn thật, mà hai công thức song song là hai thứ sẽ phân kỳ. Bản "không tiếng"
 * chạy cùng lệnh với plan rỗng, nên nó đi qua đúng limiter đó — khác đi thì tai nghe ra "bản không tiếng
 * nghe khác" trong khi đáng lẽ chỉ thiếu mỗi tiếng.
 */
export async function previewSpot(id: string, spotId: string, withSfx: boolean): Promise<Buffer> {
  const { cues, sections, spots } = await allSpots(id);
  const spot = spots.find((s) => s.id === spotId);
  const bedSection = spotId.startsWith("bed:") ? Number(spotId.slice(4)) : null;
  if (!spot && bedSection === null) throw new HttpError(404, "Không có chỗ này trong danh sách đề xuất.");
  if (!exists(voiceWav(id))) throw new HttpError(400, "Chưa có giọng đọc để nghe thử.");

  const state = readSfxState(id);
  let at: number;
  let plan: SfxPlan;
  if (spot) {
    at = spot.frame;
    plan = withSfx
      ? planFrom(id, [spot], { decisions: { [spot.id]: { use: true, soundId: state.decisions[spot.id]?.soundId } }, beds: {} }, cues, sections)
      : { video: id, hits: [], beds: [] };
  } else {
    const first = cues.find((c) => c.section === bedSection);
    if (!first) throw new HttpError(404, "Không có phần này.");
    at = first.start;
    plan = withSfx
      ? planFrom(id, [], { decisions: {}, beds: { [String(bedSection)]: state.beds[String(bedSection)] ?? "" } }, cues, sections)
      : { video: id, hits: [], beds: [] };
  }

  const from = Math.max(0, at - PREVIEW_LEAD);
  const to = at + PREVIEW_TAIL;
  const file = path.join(dir(id), `preview.${process.pid}.json`);
  const out = path.join(dir(id), `preview.${process.pid}.wav`);
  writeJson(file, plan);
  try {
    await execFileP(process.execPath, [
      "tools/sfx-mix.mjs", "--video", id, "--plan", rel(file), "--window", `${from}:${to}`, "--out", rel(out),
    ], { cwd: REPO, maxBuffer: 8 * 1024 * 1024 });
    return fs.readFileSync(out);
  } catch (e) {
    const message = e instanceof Error && "stderr" in e ? String((e as { stderr?: string }).stderr || e.message) : String(e);
    throw new HttpError(400, message.replace(/^✗ /m, "").trim() || "Không dựng được đoạn nghe thử.");
  } finally {
    fs.rmSync(file, { force: true });
    fs.rmSync(out, { force: true });
  }
}

/**
 * Trộn bản đã duyệt ra `projects/<id>/voice-sfx.wav`. Trả `null` khi chưa duyệt chỗ nào — lúc đó bản trộn
 * cũ (nếu có) bị xoá, vì để lại là render sẽ dùng một bản không còn ai duyệt.
 */
export async function mixApproved(id: string, onLine?: (line: string) => void): Promise<string | null> {
  const plan = await currentPlan(id);
  const out = mixPath(id);
  if (!planHasSound(plan)) {
    fs.rmSync(out, { force: true });
    fs.rmSync(planFile(id), { force: true });
    return null;
  }
  writeJson(planFile(id), plan);
  try {
    const { stdout, stderr } = await execFileP(process.execPath, [
      "tools/sfx-mix.mjs", "--video", id, "--plan", rel(planFile(id)), "--out", rel(out),
    ], { cwd: REPO, maxBuffer: 16 * 1024 * 1024 });
    for (const line of `${stdout}${stderr}`.split("\n")) if (line.trim()) onLine?.(line);
    return rel(out);
  } catch (e) {
    const message = e instanceof Error && "stderr" in e ? String((e as { stderr?: string }).stderr || e.message) : String(e);
    throw new HttpError(400, message.replace(/^✗ /m, "").trim() || "Không trộn được tiếng động.");
  }
}

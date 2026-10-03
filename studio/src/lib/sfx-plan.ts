import type { Cue } from "./types";

/**
 * Chỗ nào trong video đáng có tiếng, và người dựng đã quyết gì — phần tính toán thuần, không chạm đĩa.
 *
 * Luồng: `suggestSpots()` dựng danh sách đề xuất từ `cues.js` → người dựng duyệt từng chỗ ở bước Render
 * → `planFrom()` biến những chỗ ĐƯỢC DUYỆT thành plan cho `tools/sfx-mix.mjs --plan`.
 *
 * Hai tiếng `sfx-mix` vốn tự đặt (whoosh mở màn, whoosh mỗi phần) cũng là **đề xuất** ở đây, không phải
 * luật: chúng hiện trong panel và bỏ được. Vì vậy plan thay cho cả ba nguồn tự động của `sfx-mix` — mix
 * chỉ phát đúng những gì người dựng gật đầu.
 */

export const SFX_FPS = 30;

export type SfxSpotKind = "open" | "section" | "script" | "agent";

export interface SfxSpot {
  /** Id ổn định qua mỗi lần dựng lại đề xuất, để quyết định cũ không lạc chỗ. */
  id: string;
  kind: SfxSpotKind;
  /** Tiếng được đề xuất; người dựng đổi được sang tiếng khác cùng lớp. */
  soundId: string;
  cue: number | null;
  /** Cụm từ tiếng rơi vào; null = rơi ở đầu câu. */
  anchor: string | null;
  /** Mốc trên timeline, chỉ để hiện timecode — bản trộn tự tính lại từ `voice.cues.json`. */
  frame: number;
  why: string;
}

export interface SfxDecision {
  use: boolean;
  /** Người dựng đổi sang tiếng khác; vắng thì dùng `spot.soundId`. */
  soundId?: string;
}

export interface SfxState {
  /** Theo `spot.id`. Chỗ chưa quyết không có mặt ở đây và coi như chưa dùng. */
  decisions: Record<string, SfxDecision>;
  /** Tiếng nền của từng phần: khoá là số thứ tự phần (`cue.section`), giá trị là id tiếng. */
  beds: Record<string, string>;
}

export const EMPTY_SFX_STATE: SfxState = { decisions: {}, beds: {} };

/** `00:08.57` — cùng cách đọc với cuesheet của `sfx-mix`. */
export function timecode(frame: number, fps = SFX_FPS): string {
  const total = frame / fps;
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(Math.floor(total % 60)).padStart(2, "0");
  const cs = String(Math.round((frame % fps) * (100 / fps))).padStart(2, "0");
  return `${mm}:${ss}.${cs}`;
}

/** Câu đầu và câu cuối của một phần, theo `cue.section`. */
export function sectionRange(cues: Cue[], section: number): { from: number; to: number } | null {
  const inSection = cues.filter((c) => c.section === section);
  if (!inSection.length) return null;
  return { from: inSection[0].n, to: inSection[inSection.length - 1].n };
}

/**
 * Đề xuất của chính Studio, không cần agent: mở màn, ranh giới phần, và những chỗ kịch bản đã tự khai.
 *
 * Câu `silent` bị bỏ qua hoàn toàn — khoảng chờ quiz nằm trong số đó, và luật là không đặt tiếng vào lúc
 * người xem đang nghĩ.
 */
export function suggestSpots(cues: Cue[], sections: string[] = [], fromAgent: SfxSpot[] = []): SfxSpot[] {
  const spots: SfxSpot[] = [];
  if (!cues.length) return spots;
  spots.push({ id: "open", kind: "open", soundId: "whoosh-long", cue: null, anchor: null, frame: 0, why: "Mở màn video" });

  let lastSection: number | null = null;
  for (const cue of cues) {
    if (cue.section != null && cue.section !== lastSection) {
      // Phần đầu đã có whoosh mở màn rồi, không chồng thêm một tiếng nữa lên cùng chỗ.
      if (lastSection !== null && !cue.silent) {
        spots.push({
          id: `section:${cue.n}`,
          kind: "section",
          soundId: "whoosh",
          cue: cue.n,
          anchor: null,
          frame: cue.start,
          why: `Vào phần "${sections[cue.section - 1] ?? cue.section}"`,
        });
      }
      lastSection = cue.section;
    }
    if (cue.sfx && !cue.silent) {
      spots.push({
        id: `script:${cue.n}`,
        kind: "script",
        soundId: cue.sfx.id,
        cue: cue.n,
        anchor: cue.sfx.word,
        frame: cue.start,
        why: cue.sfx.word ? `Kịch bản khai: "${cue.sfx.word}"` : "Kịch bản khai cho câu này",
      });
    }
  }
  // Đề xuất của agent trộn vào theo mốc thời gian, không dồn xuống cuối: panel đọc theo thứ tự xem phim.
  // Chỗ agent trùng đúng cue + cụm với một chỗ kịch bản đã khai thì bỏ — bản khai của kịch bản thắng.
  const taken = new Set(spots.filter((s) => s.cue != null).map((s) => `${s.cue}\u0000${s.anchor ?? ""}`));
  for (const spot of fromAgent) if (!taken.has(`${spot.cue}\u0000${spot.anchor ?? ""}`)) spots.push(spot);
  return spots.sort((a, b) => a.frame - b.frame || a.id.localeCompare(b.id));
}

/**
 * Đề xuất của agent (`projects/<id>/sfx/triage.json`), soát bằng CODE trước khi hiện ra.
 *
 * Không tin chữ agent viết: `anchor` phải có NGUYÊN VĂN trong lời của đúng câu đó (không thì `spokenAt`
 * ném lúc trộn và hỏng cả bản trộn), `sound` phải có trong danh mục, câu lặng thì bỏ (khoảng chờ quiz nằm
 * trong số đó), và trần 4 tiếng nhấn áp ngay ở đây chứ không để agent tự hứa là đã đếm.
 *
 * Mỗi chỗ bị bỏ đều kèm lý do và panel hiện ra: người dựng cần biết agent đã đề xuất gì mà không qua.
 */
export interface AgentSpotRaw { cue?: unknown; anchor?: unknown; sound?: unknown; why?: unknown }

export const MAX_ACCENTS = 4;

export function agentSpots(
  raw: unknown,
  cues: Cue[],
  sounds: { id: string; layer: string }[],
): { spots: SfxSpot[]; dropped: string[] } {
  const list = Array.isArray((raw as { spots?: unknown })?.spots) ? (raw as { spots: AgentSpotRaw[] }).spots : [];
  const byN = new Map(cues.map((c) => [c.n, c]));
  const layerOf = new Map(sounds.map((s) => [s.id, s.layer]));
  const spots: SfxSpot[] = [];
  const dropped: string[] = [];
  const seen = new Set<string>();
  let accents = 0;

  for (const item of list) {
    const n = Number(item?.cue);
    const anchor = typeof item?.anchor === "string" ? item.anchor.trim() : "";
    const sound = typeof item?.sound === "string" ? item.sound.trim() : "";
    const label = `câu ${Number.isFinite(n) ? n : "?"}${anchor ? ` · "${anchor}"` : ""}`;
    const cue = byN.get(n);
    if (!cue) { dropped.push(`${label}: không có câu này`); continue; }
    if (cue.silent) { dropped.push(`${label}: câu lặng (khoảng chờ) — không đặt tiếng`); continue; }
    if (!layerOf.has(sound)) { dropped.push(`${label}: danh mục không có tiếng "${sound}"`); continue; }
    if (!anchor) { dropped.push(`${label}: thiếu cụm từ để neo`); continue; }
    if (!cue.text.includes(anchor)) { dropped.push(`${label}: lời câu ${n} không có nguyên văn cụm này`); continue; }
    const key = `${n}\u0000${anchor}`;
    if (seen.has(key)) { dropped.push(`${label}: trùng một chỗ đã đề xuất`); continue; }
    if (layerOf.get(sound) === "accent") {
      if (accents >= MAX_ACCENTS) { dropped.push(`${label}: quá trần ${MAX_ACCENTS} tiếng nhấn mỗi video`); continue; }
      accents += 1;
    }
    seen.add(key);
    spots.push({
      id: `agent:${n}:${anchor}`,
      kind: "agent",
      soundId: sound,
      cue: n,
      anchor,
      frame: cue.start,
      why: typeof item?.why === "string" && item.why.trim() ? item.why.trim() : `Agent đề xuất: "${anchor}"`,
    });
  }
  return { spots, dropped };
}

/** Tiếng cuối cùng của một chỗ: người dựng đổi rồi thì lấy của họ, chưa đổi thì lấy đề xuất. */
export const soundOf = (spot: SfxSpot, state: SfxState) => state.decisions[spot.id]?.soundId || spot.soundId;

export const isUsed = (spot: SfxSpot, state: SfxState) => state.decisions[spot.id]?.use === true;

export interface SfxPlan {
  video: string;
  hits: { id: string; cue?: number; anchor?: string; frame?: number; why?: string }[];
  beds: { id: string; fromCue: number; toCue: number; why?: string }[];
}

/**
 * Plan cho `sfx-mix --plan`: chỉ những chỗ đã duyệt, cộng tiếng nền của từng phần.
 * Trả plan rỗng (không `hits`, không `beds`) khi chưa duyệt gì — người gọi hiểu là "video này không trộn".
 */
export function planFrom(video: string, spots: SfxSpot[], state: SfxState, cues: Cue[], sections: string[] = []): SfxPlan {
  const hits: SfxPlan["hits"] = [];
  for (const spot of spots) {
    if (!isUsed(spot, state)) continue;
    const id = soundOf(spot, state);
    if (spot.kind === "open") hits.push({ id, frame: 0, why: spot.why });
    else if (spot.anchor) hits.push({ id, cue: spot.cue ?? undefined, anchor: spot.anchor, why: spot.why });
    else hits.push({ id, cue: spot.cue ?? undefined, why: spot.why });
  }

  const beds: SfxPlan["beds"] = [];
  for (const [key, soundId] of Object.entries(state.beds)) {
    if (!soundId) continue;
    const section = Number(key);
    const range = sectionRange(cues, section);
    if (!range) continue;
    beds.push({ id: soundId, fromCue: range.from, toCue: range.to, why: `Tiếng nền phần "${sections[section - 1] ?? section}"` });
  }
  return { video, hits, beds };
}

/** Có gì để trộn không — Studio chỉ chạy `sfx-mix` khi câu trả lời là có. */
export const planHasSound = (plan: SfxPlan) => plan.hits.length > 0 || plan.beds.length > 0;

/**
 * Quyết định cũ của những chỗ không còn tồn tại bị bỏ đi. Lời đổi thì `cues.js` đổi, và một chỗ neo vào
 * cụm từ đã mất không được âm thầm giữ "đã duyệt".
 */
export function pruneDecisions(state: SfxState, spots: SfxSpot[]): SfxState {
  const alive = new Set(spots.map((s) => s.id));
  const decisions: SfxState["decisions"] = {};
  for (const [id, decision] of Object.entries(state.decisions)) if (alive.has(id)) decisions[id] = decision;
  return { decisions, beds: state.beds };
}

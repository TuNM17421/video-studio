"use client";

import { useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { CheckCircleFilled, CheckOutlined, ClockCircleOutlined, CloseCircleFilled, CopyOutlined, ExclamationCircleFilled, ImportOutlined, InfoCircleOutlined, LoadingOutlined, LockOutlined, PauseCircleOutlined, PlayCircleOutlined, RedoOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Checkbox, Form, InputNumber, Segmented, Switch } from "antd";
import { fileUrl } from "@/lib/client";
import { countText, friendlyNote, importCounts, importVerdict, issueSpans } from "@/lib/import-report";
import type { ImportReport, ImportRow, RetakeEntry, RetakeResult, RetakeTake, SpeechIssue, VideoDetail, VoiceScript, VoiceSettings } from "@/lib/types";
import { ProductionState } from "../production-state";
import { SourcePickerField } from "../source-picker";
import { post, type StepProps } from "./shared";

/** Whether a scan still describes the folder on screen — same rule as the ElevenLabs dry-run. */
export const scanKey = (s: VoiceSettings) => JSON.stringify([s.importDir, s.pause]);

/** One decimal, Vietnamese comma — 4.86 and 22.8 should not read as different kinds of number. */
const seconds = (v: number) => `${v.toFixed(1).replace(".", ",")}s`;

/** How many takes "Sinh lại câu này" asks for — the copy says the number, so the request reads it from here too. */
export const RETAKE_TAKES = 3;

/** How each finding reads: what may be wrong, the words it concerns, and what its listen button plays. */
const ISSUE_TEXT: Record<SpeechIssue["code"], { label: string; detail: (words: string) => string; listen: string }> = {
  truncation: { label: "Có thể bị mất cuối câu", detail: (w) => `máy không nghe thấy “${w}”`, listen: "Nghe đoạn cuối" },
  dropped: { label: "Có thể thiếu vài chữ", detail: (w) => `máy không nghe thấy “${w}”`, listen: "Nghe đoạn này" },
  repeat: { label: "Có thể bị lặp chữ", detail: (w) => `“${w}” nghe như đọc hai lần`, listen: "Nghe đoạn này" },
};

/** A little before and after the suspect words, so the ear hears them in context. */
const LEAD = 0.6;
const span = (issue: SpeechIssue): [number, number | null] => [
  Math.max(0, issue.start - LEAD),
  issue.end == null ? null : issue.end + LEAD,
];

/**
 * One <audio> for the whole table: a câu, just the suspect part of it, or a regenerated take — all through
 * /api/videos/<id>/voice/clip. Clicking what is already playing stops it. The element lives in the table,
 * so leaving the tab stops the sound; folding the table or changing its filter stops it too.
 */
function useClipPlayer() {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  /** `what` names the recording in the error line ("câu 07", "bản 2 của câu 07"); `key` puts it under its row. */
  const [failed, setFailed] = useState<{ key: string; what: string } | null>(null);
  const current = useRef<{ key: string; what: string } | null>(null);

  const play = (url: string, key: string, what: string, from = 0, to: number | null = null) => {
    const el = audio.current;
    if (!el) return;
    if (playing === key) { el.pause(); return; }
    setFailed(null);
    current.current = { key, what };
    el.src = `${url}#t=${from.toFixed(2)}${to == null ? "" : `,${to.toFixed(2)}`}`;
    void el.play().then(() => setPlaying(key)).catch((error: unknown) => {
      setPlaying(null);
      // AbortError = another click replaced this source; that is not a failure worth a message.
      if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(current.current);
    });
  };
  const stop = () => { audio.current?.pause(); setFailed(null); };
  // A pause event from the source being replaced can arrive after the new one started: only a real stop
  // (the element is paused now) clears the button.
  const element = <audio ref={audio} preload="none" hidden
    onEnded={() => setPlaying(null)}
    onPause={(e) => { if (e.currentTarget.paused) setPlaying(null); }}
    onError={() => { setPlaying(null); setFailed(current.current); }} />;
  return { play, stop, playing, failed, element };
}
type Player = ReturnType<typeof useClipPlayer>;

/** Folding "Nghe từng câu" hides the table but keeps it mounted: stop whatever it is playing. */
export const pauseOnFold = (e: SyntheticEvent<HTMLDetailsElement>) => {
  if (!e.currentTarget.open) e.currentTarget.querySelectorAll("audio").forEach((a) => a.pause());
};

/** Why a take did not pass, in the table's words; empty when it did. */
function takeReasons(t: RetakeTake): string[] {
  if (t.pass) return [];
  if (t.heardText == null) return ["máy không nghe ra lời"];
  const reasons = [
    t.level === "error" ? "không giống lời câu này" : null,
    ...t.issues.map((issue) => ISSUE_TEXT[issue.code].label.toLowerCase()),
    t.level === "warn" && !t.issues.length ? "máy chỉ nghe ra một phần lời" : null,
    t.duration === "short" ? "ngắn hơn dự kiến" : t.duration === "long" ? "dài hơn dự kiến" : t.duration === "unmeasured" ? "không đo được độ dài" : null,
  ].filter((r): r is string => Boolean(r));
  return reasons.length ? reasons : ["chưa đạt"];
}

const takeName = (name: string) => (name === "orig" ? "Bản gốc" : name === "prev" ? "Bản trước" : `Bản ${name.slice(1)}`);

/** What the last retake did, in one sentence. A pick says itself in "Đang dùng …" right after. */
const DECISION: Record<RetakeResult["decision"], string> = {
  replaced: "Bản cũ có vấn đề nên đã tự đổi sang bản mới tốt nhất — nghe lại cho chắc.",
  "kept-passing": "Bản đang dùng vẫn ổn nên giữ nguyên. Thích bản mới hơn thì bấm “Dùng bản này”.",
  "none-passed": "Vẫn giữ bản cũ — nghe thử rồi chọn, hoặc sinh thêm.",
  picked: "",
};

/** One sentence the screen reader says when a retake or a pick of `entry` has just finished. */
function retakeOutcome(entry: RetakeEntry): string {
  if (entry.error) return `Câu ${entry.n}: ${entry.failed === "pick" ? "chưa đổi được bản" : "chưa sinh lại được"}.`;
  const inUse = entry.inUse && entry.inUse !== "other" ? ` Đang dùng ${takeName(entry.inUse).toLowerCase()}.` : "";
  if (entry.decision === "picked") return `Câu ${entry.n}:${inUse}`;
  const takes = entry.takes ?? [];
  return `Câu ${entry.n}: đã sinh thêm ${takes.length} bản, ${takes.filter((t) => t.pass).length} bản ổn.${inUse}`;
}

/** The tool's own failure text names places in its log ("xem nhật ký phía trên"); the table says its own. */
const retakeError = (message: string) => message
  .replace(/\s*—\s*xem nhật ký phía trên\.?/u, "")
  .replace(/\s*Các bản của lần trước vẫn còn nguyên\.?/u, "")
  .trim();

/** What a table can do about one câu besides listening: regenerate it, or put back a take the user chose. */
export interface RetakeControls {
  /** The retakes of the folder on screen, by câu number — with the run in flight and the last error. */
  results: Record<string, RetakeEntry>;
  disabled: boolean;
  /**
   * Absent when this machine has no local model (or while that is being checked): the takes can still be
   * listened to and picked. Both calls resolve to the request's error, or null once it was accepted.
   */
  run?: (n: number) => Promise<string | null>;
  /** Known for sure that this machine has no local model — only then does a row say so. */
  noModel?: boolean;
  pick: (n: number, take: string) => Promise<string | null>;
}

/** Where the voice came from decides how a câu gets fixed: regenerate it, or record the file again. */
type Source = "generated" | "recorded";

interface RowContext {
  /** Absent on a table older than the folder on screen: nothing to play, only the verdicts. */
  id?: string;
  source: Source;
  retake?: RetakeControls;
  player: Player;
  tech: boolean;
  /** The câu last listened to — a clean câu offers its fix only after it has been heard. */
  listened: number | null;
  onListen: (n: number) => void;
  /** The take being put in place from this screen, so only its button spins. */
  picking: { n: number; take: string } | null;
  onPick: (n: number, take: string) => void;
  /** The câu whose "Sinh lại" was pressed here: its button stays focusable while the request is in flight. */
  pressed: number | null;
  onRun: (n: number) => void;
  /** A retake or pick the server refused (409 busy, 400 take gone…), shown under the câu that asked. */
  refused: { n: number; text: string } | null;
  /** The button that re-checks this kind of folder. */
  recheck: string;
}

/** The takes of one retake: which passed, listen to each, use one — the original is always there to go back to. */
function RetakeList({ row, result, ctx }: { row: ImportRow; result: RetakeEntry; ctx: RowContext }) {
  const { id, retake, player, tech } = ctx;
  const fresh = result.takes ?? [];
  const takes = [result.original, result.previous, ...fresh].filter((t): t is RetakeTake => Boolean(t));
  if (!takes.length || !retake) return null;
  const passed = fresh.filter((t) => t.pass).length;
  const inUse = takes.find((t) => t.name === result.inUse);
  const picking = result.running === "pick";
  return <div className="vs-map-retake">
    <p>
      <strong>Đã sinh thêm {fresh.length} bản · {passed ? `${passed} bản ổn` : "chưa bản nào ổn"}.</strong>{" "}
      {result.decision ? DECISION[result.decision] : null}{" "}
      {inUse ? `Đang dùng ${takeName(inUse.name).toLowerCase()}.` : result.inUse === "other" ? "Tệp của câu này đã đổi sau lần sinh lại — nghe lại cho chắc." : null}
    </p>
    <ul>
      {takes.map((t) => {
        const key = `${row.n}:${t.name}`;
        const used = result.inUse === t.name;
        const label = takeName(t.name).toLowerCase();
        // The pressed take keeps its button (enabled, spinning) from the click until the take is in place, and
        // "Đang dùng" is the same button afterwards — a keyboard user's focus never falls off the list.
        const mine = ctx.picking?.n === row.n && ctx.picking.take === t.name && (picking || retake.disabled);
        return <li key={t.name} className={used ? "is-in-use" : ""}>
          <Button size="small" type="text"
            aria-label={player.playing === key ? `Dừng ${label} của câu ${row.key}` : `Nghe ${label} của câu ${row.key}`}
            icon={player.playing === key ? <PauseCircleOutlined aria-hidden /> : <PlayCircleOutlined aria-hidden />}
            onClick={() => player.play(`/api/videos/${encodeURIComponent(id ?? "")}/voice/clip?n=${row.n}&take=${t.name}&at=${encodeURIComponent(result.at ?? "")}`, key, `${label} của câu ${row.key}`)}>
            {player.playing === key ? "Dừng" : "Nghe"}
          </Button>
          <strong>{takeName(t.name)}</strong>
          <span className="vs-map-len">{t.seconds != null ? seconds(t.seconds) : "—"}</span>
          <span className={t.pass ? "is-pass" : "is-fail"}>
            {t.pass ? <CheckOutlined aria-hidden /> : <ExclamationCircleFilled aria-hidden />} {t.pass ? "Ổn" : takeReasons(t).join(" · ")}
          </span>
          {used
            ? <Button size="small" type="text" className="vs-map-retake-use" icon={<CheckOutlined aria-hidden />} aria-disabled
              aria-label={`Đang dùng ${label} cho câu ${row.key}`}>Đang dùng</Button>
            : <Button size="small" loading={mine} disabled={!mine && (retake.disabled || picking)}
              aria-label={`Dùng bản này (${label}) cho câu ${row.key}`} onClick={() => ctx.onPick(row.n, t.name)}>Dùng bản này</Button>}
          {tech && <small className="vs-map-tech">
            {t.matchRatio != null ? `máy nghe khớp ${Math.round(t.matchRatio * 100)}% lời` : "máy không nghe ra lời"}
            {t.heardText ? ` · Máy nghe được: “${t.heardText}”` : ""}
          </small>}
        </li>;
      })}
    </ul>
    {picking && <p className="vs-map-busy"><LoadingOutlined aria-hidden /> Đang đổi sang bản bạn chọn…</p>}
  </div>;
}

/** Status of a câu: an icon for the eye, a word for the screen reader. */
const LEVEL: Record<ImportRow["level"], { icon: ReactNode; word: string }> = {
  ok: { icon: <CheckOutlined className="vs-map-status" aria-hidden />, word: "Ổn" },
  warn: { icon: <ExclamationCircleFilled className="vs-map-status" aria-hidden />, word: "Nên nghe lại" },
  error: { icon: <CloseCircleFilled className="vs-map-status" aria-hidden />, word: "Cần sửa" },
};

/** The locked text with the words the machine doubts underlined, so the ear knows where to listen. */
function withMarks(text: string, issues: SpeechIssue[] | undefined): ReactNode {
  const spans = issueSpans(text, issues);
  if (!spans.length) return text;
  const out: ReactNode[] = [];
  let at = 0;
  for (const [a, b, code] of spans) {
    if (a > at) out.push(text.slice(at, a));
    out.push(<mark key={a} className={`vs-map-mark is-${code}`}>{text.slice(a, b)}</mark>);
    at = b;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

/** Why a câu is marked, from the tool's notes — the fix depends on it more than on how serious it is. */
function markCause(r: ImportRow): "missing" | "decode" | "wrong-file" | "no-speech" | "other" | "warn" {
  const says = (prefix: string) => r.notes.some((note) => note.startsWith(prefix));
  if (!r.file) return "missing";
  if (says("không giải mã được")) return "decode";
  if (says("nội dung nghe được không khớp lời")) return "wrong-file";
  if (says("không nhận diện được giọng")) return "no-speech";
  return r.level === "error" ? "other" : "warn";
}

/** The one sentence under a marked câu: whether it blocks the import, and how this kind of voice gets fixed. */
function nextStep(r: ImportRow, source: Source, noModel: boolean): string {
  const blocks = "Câu này đang chặn nút Nhập giọng";
  const cause = markCause(r);
  if (source === "recorded") {
    const recheck = "rồi bấm Kiểm tra thư mục.";
    return {
      missing: `Thêm tệp ${r.key}.wav vào thư mục ${recheck}`,
      decode: `${blocks} — xuất lại tệp ${r.file} (wav hoặc mp3) ${recheck}`,
      "wrong-file": `${blocks} — xem tệp ${r.file} có đúng là câu ${r.key} không (đổi tên hoặc thay tệp), ${recheck}`,
      "no-speech": `Nghe thử tệp ${r.file}: không có tiếng thì thu lại, ${recheck}`,
      other: `${blocks} — sửa theo lý do ở trên ${recheck}`,
      warn: `Nghe thấy ổn thì không cần làm gì; chưa ổn thì thu lại tệp ${r.file} ${recheck}`,
    }[cause];
  }
  if (cause === "missing") return "Tệp của câu này không có trong thư mục vừa sinh — sinh giọng lại, hoặc bấm Kiểm tra lại.";
  return (r.level === "error" ? `${blocks}.` : "Nghe thấy ổn thì không cần làm gì.")
    + (noModel ? " Máy này chưa có model local nên chưa sinh lại từng câu được." : "");
}

/** "2.5" → "2,5": every length in the table uses the Vietnamese comma. */
const decimal = (v: number) => String(v).replace(".", ",");

/**
 * Một câu trong bảng. Câu ổn là một dòng yên: dấu tích, số câu, lời, nút Nghe — không có chữ Whisper nghe
 * nhầm, không có nút sinh lại (nghe xong mới hiện "Nghe chưa ổn?"). Câu bị đánh dấu mở ra: chữ nghi được gạch
 * chân, lý do kèm nút nghe đúng đoạn đó, máy nghe được gì, và một việc nên làm tiếp.
 *
 * Nút "Sinh lại câu này" nằm ở đúng một chỗ trong hàng và giữ nguyên khi đang chạy (chỉ đổi sang loading),
 * để người dùng bàn phím không mất tiêu điểm.
 */
function MapRow({ r, ctx }: { r: ImportRow; ctx: RowContext }) {
  const { id, source, retake, player, tech } = ctx;
  if (r.silent) return <li className="vs-map-row is-silent">
    <ClockCircleOutlined className="vs-map-status" aria-hidden />
    <span className="vs-map-pause">Khoảng dừng {decimal(r.expectedSeconds)} giây<span className="sr-only"> — không cần tệp</span></span>
  </li>;

  const rowKey = `${r.n}`;
  const mine = player.playing === rowKey || Boolean(player.playing?.startsWith(`${r.n}:`));
  const flagged = r.level !== "ok";
  const text = r.text.normalize("NFC");
  const playable = Boolean(id && r.file);
  // The route checks the file name and length against its own report and refuses (409) when the table on
  // screen is older than the last scan — so a row never plays a different recording than it names.
  const url = `/api/videos/${encodeURIComponent(id ?? "")}/voice/clip?n=${r.n}&f=${encodeURIComponent(r.file ?? "")}&s=${r.seconds ?? ""}`;
  const result = retake?.results[String(r.n)];
  const canRun = Boolean(playable && retake?.run);
  const retaking = result?.running === "retake";
  const hasTakes = Boolean(result && (result.takes?.length || result.original));
  const notes = r.notes.map((note) => friendlyNote(note, r)).filter((note): note is string => Boolean(note));
  const failed = player.failed && (player.failed.key === rowKey || player.failed.key.startsWith(`${r.n}:`)) ? player.failed : null;
  const heard = r.heardText != null && (flagged || tech);

  // The fix line: always on a marked câu; on a clean one once it has been heard, while it regenerates, or
  // when it already has takes. Its words depend on the source; its button is the same element throughout.
  let lead: string | null = null;
  let aside: string | null = null;
  if (retaking) aside = "Có thể mất vài phút (lâu hơn nhiều nếu máy không có GPU) — trong lúc chờ, cứ nghe các câu khác.";
  else if (flagged) {
    lead = nextStep(r, source, Boolean(retake?.noModel));
    if (canRun && !hasTakes) aside = `Đọc lại ${RETAKE_TAKES} bản; có bản ổn thì tự thay, bản cũ vẫn giữ.`;
  } else if (!hasTakes && ctx.listened === r.n && playable) {
    if (source === "recorded") lead = `Nghe chưa ổn? Thu lại tệp ${r.file} rồi bấm Kiểm tra thư mục.`;
    else if (canRun) { lead = "Nghe chưa ổn?"; aside = `${RETAKE_TAKES} bản mới để bạn chọn; bản đang dùng vẫn giữ.`; }
  }
  // Pressed here and still in flight (the request, then the scan after it): spinning but not disabled, so the
  // keyboard focus stays on it. Other rows' buttons wait, disabled.
  const pending = retaking || (ctx.pressed === r.n && Boolean(retake?.disabled));
  const runLabel = retaking ? "Đang sinh lại…" : hasTakes ? `Sinh thêm ${RETAKE_TAKES} bản` : result?.error && result.failed !== "pick" ? "Thử lại" : "Sinh lại câu này";
  const retakeButton = canRun && (flagged || retaking || hasTakes || ctx.listened === r.n) && <Button size="small" icon={<RedoOutlined aria-hidden />}
    loading={pending} disabled={retake!.disabled && !pending}
    aria-label={runLabel === "Thử lại" ? `Thử lại: sinh lại câu ${r.key}` : `${runLabel.replace("…", "")} (câu ${r.key})`}
    onClick={() => ctx.onRun(r.n)}>
    {runLabel}
  </Button>;
  // A retake started elsewhere (another tab, before the model check came back) still says it is running.
  const fix = Boolean(lead || retakeButton || retaking);
  const reasons = Boolean(r.issues?.length || notes.length);
  const showTakes = Boolean(result && hasTakes && !retaking);
  const lastError = result?.error && !result.running ? retakeError(result.error) : null;
  const refused = ctx.refused?.n === r.n ? ctx.refused.text : null;

  return <li className={`vs-map-row is-${r.level}${mine ? " is-playing" : ""}`}>
    {LEVEL[r.level].icon}
    <span className="vs-map-key" title={r.file ?? undefined}><span className="sr-only">{LEVEL[r.level].word}: câu </span>{r.key}</span>
    <p className="vs-map-text">{withMarks(text, r.issues)}</p>
    <span className="vs-map-actions">
      {playable && <Button size="small" type="text"
        aria-label={player.playing === rowKey ? `Dừng câu ${r.key}` : `Nghe câu ${r.key}`}
        icon={player.playing === rowKey ? <PauseCircleOutlined aria-hidden /> : <PlayCircleOutlined aria-hidden />}
        onClick={() => { player.play(url, rowKey, `câu ${r.key}`); ctx.onListen(r.n); }}>
        {player.playing === rowKey ? "Dừng" : "Nghe"}
      </Button>}
      {r.seconds != null && <span className="vs-map-len">{seconds(r.seconds)}</span>}
    </span>
    {(reasons || heard || showTakes || lastError || refused || fix || failed || tech) && <div className="vs-map-more">
      {reasons && <ul className="vs-map-reasons">
        {r.issues?.map((issue, i) => {
          const say = ISSUE_TEXT[issue.code];
          const key = `${r.n}:i${i}`;
          const [from, to] = span(issue);
          return <li key={key}>
            <span><strong>{say.label}</strong> — {say.detail(issue.words)}.</span>
            {playable && <Button size="small" type="link"
              aria-label={player.playing === key ? `Dừng đoạn nghi vấn của câu ${r.key}` : `${say.listen} của câu ${r.key} (${say.label.toLowerCase()})`}
              icon={player.playing === key ? <PauseCircleOutlined aria-hidden /> : <PlayCircleOutlined aria-hidden />}
              onClick={() => player.play(url, key, `đoạn nghi vấn của câu ${r.key}`, from, to)}>{player.playing === key ? "Dừng" : say.listen}</Button>}
          </li>;
        })}
        {notes.map((note) => <li key={note}>{note}</li>)}
      </ul>}
      {heard && <p className="vs-map-heard"><span>Máy nghe được:</span> {r.heardText ? `“${r.heardText}”` : "không nghe ra lời nào"}</p>}
      {showTakes && <RetakeList row={r} result={result!} ctx={ctx} />}
      {lastError && <p className="vs-map-error">
        {result!.failed === "pick"
          ? `Chưa đổi được bản: ${lastError}`
          : `Chưa sinh lại được: ${lastError}${hasTakes ? " Các bản của lần trước vẫn nghe và chọn được." : ""}`}
      </p>}
      {refused && <p className="vs-map-error" role="alert">{refused}</p>}
      {fix && <p className="vs-map-next">
        {lead && <span>{lead}</span>}
        {retakeButton || (retaking && <span className="vs-map-busy"><LoadingOutlined aria-hidden /> Đang sinh lại câu này…</span>)}
        {aside && <small>{aside}</small>}
      </p>}
      {failed && <p className="vs-map-error" role="alert">
        Không phát được {failed.what}. Có thể tệp vừa đổi — bấm {ctx.recheck} rồi nghe lại.
      </p>}
      {tech && <p className="vs-map-tech">
        <span className="mono">{r.file ?? "chưa có tệp"}</span>
        {r.seconds != null && ` · dài ${seconds(r.seconds)} (dự kiến khoảng ${seconds(r.expectedSeconds)})`}
        {r.matchRatio != null && ` · máy nghe khớp ${Math.round(r.matchRatio * 100)}% lời`}
      </p>}
    </div>}
  </li>;
}

/**
 * Bảng "Nghe từng câu": dùng chung cho nguồn "Audio có sẵn" và bước nhập của model local. Lọc "Tất cả |
 * Cần xem lại" như bộ lọc ảnh QA; "Cần xem lại" giữ cả câu vừa sinh lại dù giờ đã ổn, để danh sách bản không
 * biến mất lúc đang so. Công tắc "Hiện chi tiết kỹ thuật" mới hiện tên tệp, độ dài, phần trăm khớp và chữ máy
 * nghe được ở câu ổn — chữ Whisper nghe nhầm không bao giờ được trông giống lỗi. `id` bỏ trống (bảng cũ hơn thư
 * mục) thì không có nút nghe.
 */
function ImportMap({ report, id, retake, source }: { report: ImportReport; id?: string; retake?: RetakeControls; source: Source }) {
  const player = useClipPlayer();
  const spoken = report.rows.filter((r) => !r.silent);
  const flaggedCount = spoken.filter((r) => r.level !== "ok").length;
  const attention = spoken.filter((r) => r.level !== "ok" || retake?.results[String(r.n)]);
  const [view, setView] = useState<"all" | "attention">(flaggedCount ? "attention" : "all");
  // A new scan that turns up something to hear switches to it; one that clears the last mark changes nothing.
  const [seenFlags, setSeenFlags] = useState(flaggedCount);
  if (seenFlags !== flaggedCount) {
    setSeenFlags(flaggedCount);
    if (!seenFlags && flaggedCount) setView("attention");
  }
  const [tech, setTech] = useState(false);
  const [listened, setListened] = useState<number | null>(null);
  const [picking, setPicking] = useState<{ n: number; take: string } | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);
  const [refused, setRefused] = useState<{ n: number; text: string } | null>(null);
  const shown = attention.length ? view : "all";
  const rows = shown === "all" ? report.rows : attention;
  const recheck = source === "recorded" ? "Kiểm tra thư mục" : "Kiểm tra lại";
  const ask = async (n: number, request: Promise<string | null> | undefined) => {
    setRefused(null);
    const text = await request;
    if (text) setRefused({ n, text });
  };
  const ctx: RowContext = {
    id, source, retake, player, tech, listened, onListen: setListened, picking, pressed, refused, recheck,
    onPick: (n, take) => { setPicking({ n, take }); void ask(n, retake?.pick(n, take)); },
    onRun: (n) => { setPressed(n); void ask(n, retake?.run?.(n)); },
  };

  return <>
    {/* Mounted even on a stale table: removing it mid-play would leave that row's button stuck on "Dừng". */}
    {player.element}
    <div className="vs-map-toolbar">
      <Segmented size="small" aria-label="Lọc câu" value={shown}
        onChange={(value) => { player.stop(); setView(value as "all" | "attention"); }}
        options={[
          { value: "all", label: `Tất cả (${spoken.length})` },
          { value: "attention", label: `Cần xem lại (${attention.length})`, disabled: !attention.length },
        ]} />
      <p className="vs-map-hint">
        {flaggedCount ? "Nghe các câu được đánh dấu — ổn thì cứ để nguyên."
          : report.align.used ? <><CheckCircleFilled aria-hidden /> Cả {spoken.length} câu đều ổn — muốn chắc hơn thì nghe thử vài câu.</>
            : "Máy chưa nghe lại nội dung — nghe thử vài câu trước khi nhập."}
      </p>
      <span className="vs-rs-switchline">
        <Switch size="small" checked={tech} onChange={setTech} aria-label="Hiện chi tiết kỹ thuật" /> Hiện chi tiết kỹ thuật
      </span>
    </div>
    {!id && <p className="vs-map-note">Bảng này là của lần kiểm tra trước nên chưa nghe được — bấm {recheck} để nghe từng câu.</p>}
    <ol className="vs-map">
      {rows.map((r) => <MapRow key={r.n} r={r} ctx={ctx} />)}
    </ol>
    {tech && report.align.used && <p className="vs-map-note is-foot">
      Máy nghe bằng Whisper {report.align.model} nên đôi khi nghe sai chính tả — đó không phải lỗi giọng. Chỉ cần để ý các câu được đánh dấu.
    </p>}
    {(report.extra.length > 0 || report.clashes.length > 0) && <ul className="vs-map-aside">
      {report.extra.map((e) => <li key={e.file}>Tệp không dùng tới: <span className="mono">{e.file}</span> — {e.reason}</li>)}
      {report.clashes.map((c) => <li key={c.file}>Câu {c.n} có hai tệp: đang dùng <span className="mono">{c.kept}</span>, bỏ qua <span className="mono">{c.file}</span></li>)}
    </ul>}
  </>;
}

/**
 * "Nghe từng câu", gập lại được. Mở sẵn khi có câu cần nghe; lần kiểm tra sau (vd. tự chạy sau khi sinh lại
 * một câu) không bao giờ tự gập bảng đang xem, chỉ tự mở khi vừa có câu mới cần nghe.
 */
export function CueCheck({ report, id, retake, source }: { report: ImportReport; id?: string; retake?: RetakeControls; source: Source }) {
  const counts = importCounts(report);
  const flagged = counts.warn + counts.error;
  const [open, setOpen] = useState(flagged > 0);
  const [seen, setSeen] = useState(flagged);
  if (seen !== flagged) {
    setSeen(flagged);
    if (!seen && flagged) setOpen(true);
  }
  const tone = counts.error ? "error" : counts.warn ? "warn" : "ok";

  // One live region for the table, outside the fold so it speaks even when folded: the retake that starts,
  // then how it ended — the entry that was running last, read once it stops.
  const busy = Object.values(retake?.results ?? {}).find((e) => e.running);
  const [lastBusy, setLastBusy] = useState<number | null>(null);
  if (busy && busy.n !== lastBusy) setLastBusy(busy.n);
  const ended = !busy && lastBusy != null ? retake?.results[String(lastBusy)] : undefined;
  const live = busy ? `${busy.running === "pick" ? "Đang đổi bản cho" : "Đang sinh lại"} câu ${busy.n}.` : ended ? retakeOutcome(ended) : "";

  return <>
    {retake && <p className="sr-only" aria-live="polite">{live}</p>}
    <details className="vs-flow-more vs-cue-check" open={open} onToggle={(e) => { pauseOnFold(e); setOpen(e.currentTarget.open); }}>
      <summary>Nghe từng câu <span className={`vs-map-count is-${tone}`}>{countText(counts)}</span></summary>
      <ImportMap report={report} id={id} retake={retake} source={source} />
    </details>
  </>;
}

const VERDICT_ICON = {
  ok: <CheckCircleFilled aria-hidden />,
  warn: <ExclamationCircleFilled aria-hidden />,
  error: <CloseCircleFilled aria-hidden />,
} as const;

/**
 * The verdict above the table: can this voice go in, and what to do next. `stale`: the folder changed since.
 * The status region around it is always mounted — one inserted together with its first text is often not
 * read out, and the first verdict after a scan is the one that matters.
 */
export function ImportVerdict({ report, stale = false }: { report: ImportReport | null; stale?: boolean }) {
  const v = report && importVerdict(importCounts(report));
  return <div className="vs-import-verdict" role="status">
    {v && <p className={`vs-import-summary is-${stale ? "stale" : v.tone}`}>
      {stale ? <InfoCircleOutlined aria-hidden /> : VERDICT_ICON[v.tone]}
      <strong>{v.headline}</strong>
      {v.rest && <span>· {v.rest}</span>}
      <small>{stale ? "Thư mục hoặc khoảng nghỉ đã đổi — bấm Kiểm tra thư mục để kiểm lại." : v.hint}</small>
    </p>}
  </div>;
}

/**
 * The locked narration, exported so it can be read aloud or fed to a local model. The files land in
 * projects/<id>/voice-script/; voice-batch.jsonl is already in the shape OmniVoice's batch CLI wants,
 * so its results come back named 01.wav, 02.wav … and import with no renaming.
 */
function ScriptExport({ detail, busy, act }: { detail: VideoDetail; busy: boolean; act: StepProps["act"] }) {
  const id = detail.state.id;
  const [script, setScript] = useState<VoiceScript | null>(null);
  const [copied, setCopied] = useState(false);
  const written = script !== null || detail.artifacts.voiceScript;
  const dir = `projects/${id}/voice-script`;
  const files: [string, string][] = [
    ["Bản đọc (Markdown)", "doc-thu.md"],
    ["Lời thuần (TXT)", "doc-thu.txt"],
    ["Batch cho model local (JSONL)", "voice-batch.jsonl"],
  ];
  const write = () => act(async () => setScript(await post(`/api/videos/${id}/voice`, { action: "export-script" }) as VoiceScript));
  const copy = () => act(async () => {
    const result = script ?? (await post(`/api/videos/${id}/voice`, { action: "export-script" }) as VoiceScript);
    setScript(result);
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
  });

  return <>
    <div className="vs-script-actions">
      <Button disabled={busy} icon={<CopyOutlined />} onClick={copy}>{copied ? "Đã copy" : "Copy lời đọc"}</Button>
      <Button disabled={busy} icon={<ImportOutlined />} onClick={write}>{written ? "Xuất lại ra tệp" : "Xuất ra tệp"}</Button>
    </div>
    {written && <ul className="vs-deliverables">
      {files.map(([label, file]) => <li key={file}>
        <CheckCircleFilled className="is-ok" />
        <span>{label}</span>
        <Button type="link" href={fileUrl(`${dir}/${file}`)} target="_blank">{file}</Button>
      </li>)}
      <li><CheckCircleFilled className="is-ok" /><span>Mỗi câu một tệp .txt</span><small className="mono">{dir}/cau/</small></li>
    </ul>}
    {script && <p className="vs-script-note">{script.spoken}/{script.cues} câu cần thu · đặt tên audio theo số câu: <span className="mono">01.wav, 02.wav …</span></p>}
  </>;
}

/**
 * Narration recorded by a member: one audio file per câu in one folder, in the same three steps as the
 * other sources — prepare, check, bind.
 *
 * The report is the whole point of this panel. A folder that is quietly off by one — a câu skipped
 * while recording, the rest shifted up — reaches the MP4 looking fine, so every file is shown against
 * the câu it landed on, with how much of that câu's words were actually heard in it.
 */
export function ImportPanel({ detail, settings, setSettings, busy, act }: {
  detail: VideoDetail;
  settings: VoiceSettings;
  setSettings: (v: VoiceSettings) => void;
  busy: boolean;
  act: StepProps["act"];
}) {
  const id = detail.state.id;
  const [report, setReport] = useState<ImportReport | null>(detail.importReport);
  const [scanned, setScanned] = useState(detail.importReport ? scanKey(detail.state.voice) : "");
  const [force, setForce] = useState(false);
  const fresh = !!report && scanned === scanKey(settings);
  const problems = report?.rows.filter((r) => r.level === "error").length ?? 0;

  const scan = () => act(async () => {
    const result = await post(`/api/videos/${id}/voice`, { action: "scan-import", settings }) as ImportReport;
    setReport(result);
    setScanned(scanKey(settings));
    setForce(false);
  });

  return <ol className="vs-flow">
    <li className="vs-flow-step">
      <span className="vs-flow-num">1</span>
      <div className="vs-flow-body">
        <h4>Thu lời đọc</h4>
        <p className="vs-flow-note">Gửi lời đọc cho người thu, mỗi câu một tệp đặt tên theo số câu.</p>
        <ScriptExport detail={detail} busy={busy} act={act} />
      </div>
    </li>
    <li className="vs-flow-step">
      <span className={`vs-flow-num ${fresh && !problems ? "is-done" : ""}`}>{fresh && !problems ? <CheckCircleFilled /> : 2}</span>
      <div className="vs-flow-body">
        <h4>Kiểm tra thư mục audio</h4>
        <SourcePickerField label="Thư mục audio" purpose="voice" value={settings.importDir} disabled={busy} onChange={(importDir) => setSettings({ ...settings, importDir })} />
        <div className="vs-import-run">
          <Form.Item className="field" label="Nghỉ giữa câu (giây)"><InputNumber min={0} max={5} step={0.1} value={settings.pause} onChange={(pause) => setSettings({ ...settings, pause: pause ?? 0 })} /></Form.Item>
          <div className="vs-import-action">
            <Button disabled={busy || !settings.importDir.trim()} icon={<SearchOutlined />} onClick={scan}>Kiểm tra thư mục</Button>
            <ImportVerdict report={report} stale={!fresh} />
          </div>
        </div>
        {report?.align.note && <ProductionState className="vs-production-state" status="review" title={report.align.note} detail={null} />}
        {/* A table that no longer matches the folder on screen gets no play buttons. */}
        {report && <CueCheck report={report} id={fresh ? id : undefined} source="recorded" />}
      </div>
    </li>
    <li className="vs-flow-step">
      <span className="vs-flow-num">3</span>
      <div className="vs-flow-body">
        <h4>Gắn vào video</h4>
        <p className="vs-flow-note">Ghép các tệp thành một bản thu liền rồi đo mốc từng từ.</p>
        {fresh && problems > 0 && <Checkbox className="vs-force" checked={force} onChange={(e) => setForce(e.target.checked)}>
          Vẫn nhập dù còn {problems} câu cần sửa — tôi đã nghe và chấp nhận
        </Checkbox>}
        <Button type="primary" disabled={busy || !fresh || (problems > 0 && !force)} icon={fresh && (problems === 0 || force) ? <ImportOutlined /> : <LockOutlined />}
          onClick={() => act(() => post(`/api/videos/${id}/voice`, { action: "import", force }))}>
          {!fresh ? "Kiểm tra thư mục trước" : `${detail.artifacts.voice ? "Nhập lại giọng" : "Nhập giọng"} · ${report?.matched ?? 0} câu`}
        </Button>
      </div>
    </li>
  </ol>;
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoadingOutlined, PauseCircleFilled, PlayCircleFilled, ThunderboltOutlined } from "@ant-design/icons";
import { Alert, Button, Checkbox, Collapse, Empty, Select, Tag } from "antd";
import { api } from "@/lib/client";
import type { SfxCatalog, SfxLayer } from "@/lib/sfx";
import { SFX_LAYER_LABEL } from "@/lib/sfx";
import type { SfxSpot, SfxState } from "@/lib/sfx-plan";
import { timecode } from "@/lib/sfx-plan";

interface MixHit { id: string; frame: number; db: number; layer: string; onSpeech: boolean; why: string }

interface SfxView {
  ready: boolean;
  spots: SfxSpot[];
  state: SfxState;
  catalog: SfxCatalog;
  sections: string[];
  mixStale: boolean;
  dropped: string[];
  hasAgentRun: boolean;
  suggesting: boolean;
  mix: { hits: MixHit[]; beds: MixHit[] };
}

/** Lớp nào hợp với một chỗ: đổi tiếng thì chỉ đổi trong cùng lớp, vì luật mật độ tính theo lớp. */
const layerOfSpot = (spot: SfxSpot, catalog: SfxCatalog): SfxLayer =>
  catalog.sounds.find((s) => s.id === spot.soundId)?.layer ?? "accent";

function PlayPair({ label, onPlay, playing }: { label: string; onPlay: (withSfx: boolean) => void; playing: "on" | "off" | null }) {
  return <span className="vs-sfx-play" role="group" aria-label={`Nghe thử ${label}`}>
    <button type="button" className="vs-sfx-play-btn" onClick={() => onPlay(true)} aria-label={`Nghe ${label} có tiếng`}>
      {playing === "on" ? <PauseCircleFilled /> : <PlayCircleFilled />}<span>Có tiếng</span>
    </button>
    <button type="button" className="vs-sfx-play-btn is-plain" onClick={() => onPlay(false)} aria-label={`Nghe ${label} không tiếng`}>
      {playing === "off" ? <PauseCircleFilled /> : <PlayCircleFilled />}<span>Không</span>
    </button>
  </span>;
}

/**
 * Panel "Tiếng động" ở bước Render: Studio **đề xuất** chỗ, người dựng nghe thử rồi mới duyệt — giống
 * panel ảnh tư liệu. Chưa duyệt chỗ nào thì video không có tiếng động nào, không phải mặc định bật.
 *
 * Nghe thử gọi `/sfx/preview`, phát đúng đoạn đó của video với mức y như bản trộn thật, và nghe được cả
 * bản không tiếng để so. Hai tiếng Studio tự đề xuất (mở màn, ranh giới phần) nằm trong danh sách như
 * mọi chỗ khác, nên bỏ được.
 */
export function SfxPanel({ id, enabled }: { id: string; enabled: boolean }) {
  const [view, setView] = useState<SfxView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<{ spot: string; side: "on" | "off" } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const load = useCallback(() => {
    api<SfxView>(`/api/videos/${id}/sfx`)
      .then((next) => { setView(next); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  useEffect(() => { if (enabled) load(); }, [enabled, load]);

  // Lượt agent chạy ngoài job của video, nên trang không nhận được sự kiện của nó: hỏi lại tới khi xong.
  useEffect(() => {
    if (!view?.suggesting) return;
    const timer = setInterval(load, 2500);
    return () => clearInterval(timer);
  }, [view?.suggesting, load]);

  const suggest = () => {
    setView((current) => (current ? { ...current, suggesting: true } : current));
    api(`/api/videos/${id}/sfx/suggest`, { method: "POST", json: {} })
      .then(() => setTimeout(load, 1200))
      .catch((e) => { setError(e instanceof Error ? e.message : String(e)); load(); });
  };

  const save = (next: SfxState) => {
    setView((current) => (current ? { ...current, state: next } : current));
    api<SfxView>(`/api/videos/${id}/sfx`, { method: "POST", json: next })
      .then((saved) => { setView(saved); setError(null); })
      .catch((e) => { setError(e instanceof Error ? e.message : String(e)); load(); });
  };

  const play = (spot: string, withSfx: boolean) => {
    const side = withSfx ? "on" : "off";
    if (playing?.spot === spot && playing.side === side) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    const el = new Audio(`/api/videos/${id}/sfx/preview?spot=${encodeURIComponent(spot)}&sfx=${withSfx ? 1 : 0}`);
    el.addEventListener("ended", () => setPlaying(null));
    el.addEventListener("error", () => { setError("Không dựng được đoạn nghe thử."); setPlaying(null); });
    audio.current = el;
    setPlaying({ spot, side });
    void el.play().catch(() => setPlaying(null));
  };

  useEffect(() => () => audio.current?.pause(), []);

  const byLayer = useMemo(() => {
    const out: Partial<Record<SfxLayer, { id: string; label: string }[]>> = {};
    for (const sound of view?.catalog.sounds ?? []) (out[sound.layer] ??= []).push({ id: sound.id, label: sound.id });
    return out;
  }, [view]);

  if (!enabled) return null;
  if (error && !view) return <Alert className="vs-music-note" type="error" showIcon title="Không đọc được tiếng động" description={error} />;
  if (!view) return null;
  if (!view.ready) {
    return <p className="vs-music-note">Có giọng đọc rồi Studio mới đề xuất được chỗ đặt tiếng — tiếng căn theo mốc lời thật.</p>;
  }

  const used = view.spots.filter((s) => view.state.decisions[s.id]?.use).length;
  const accents = view.mix.hits.filter((h) => h.layer === "accent").length;
  const bedCount = Object.values(view.state.beds).filter(Boolean).length;

  return <div className="vs-sfx">
    <p className="vs-music-note">
      {used}/{view.spots.length} chỗ được duyệt{bedCount ? ` · ${bedCount} phần có tiếng nền` : ""}
      {accents > 0 && <> · tiếng nhấn {accents}/4</>}
      {used === 0 && !bedCount && " — chưa duyệt chỗ nào thì video không có tiếng động."}
    </p>
    {error && <Alert className="vs-music-note" type="warning" showIcon title="Chưa lưu được" description={error} />}
    <div className="vs-sfx-actions">
      {/* Nút này tốn token nên chỉ chạy khi bạn bấm — Studio không tự gọi agent. */}
      <Button
        size="small"
        icon={view.suggesting ? <LoadingOutlined spin /> : <ThunderboltOutlined />}
        disabled={view.suggesting}
        onClick={suggest}
      >{view.suggesting ? "Agent đang đọc lời…" : view.hasAgentRun ? "Đề xuất lại bằng agent" : "Đề xuất bằng agent"}</Button>
      <small>Agent đọc lời và mô tả hình rồi chỉ ra chỗ đáng có tiếng. Tốn token; những chỗ trên vẫn giữ nguyên quyền duyệt của bạn.</small>
    </div>
    {!!view.dropped.length && <Collapse
      className="vs-sfx-dropped"
      size="small"
      items={[{
        key: "dropped",
        label: `${view.dropped.length} chỗ agent đề xuất bị soát loại`,
        children: <ul>{view.dropped.map((line) => <li key={line}>{line}</li>)}</ul>,
      }]}
    />}
    {!view.spots.length && <Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có chỗ nào đáng đặt tiếng" />}
    <ul className="vs-sfx-list">
      {view.spots.map((spot) => {
        const decision = view.state.decisions[spot.id];
        const sound = decision?.soundId || spot.soundId;
        const layer = layerOfSpot(spot, view.catalog);
        const options = byLayer[layer] ?? [];
        return <li key={spot.id} className={`vs-sfx-row ${decision?.use ? "is-on" : ""}`}>
          <Checkbox
            className="vs-sfx-use"
            checked={decision?.use === true}
            onChange={(e) => save({ ...view.state, decisions: { ...view.state.decisions, [spot.id]: { ...decision, use: e.target.checked } } })}
          >
            <span className="vs-sfx-when">{timecode(spot.frame)}</span>
          </Checkbox>
          {/* Lớp nói ra luật đang áp cho chỗ này — trần 4 chỉ tính tiếng nhấn, nên người duyệt cần thấy. */}
          <span className="vs-sfx-why"><em>{SFX_LAYER_LABEL[layer]}</em> · {spot.why}</span>
          <Select
            className="vs-sfx-sound"
            size="small"
            value={sound}
            onChange={(value) => save({ ...view.state, decisions: { ...view.state.decisions, [spot.id]: { use: decision?.use ?? true, soundId: value } } })}
            options={options.map((o) => ({ value: o.id, label: o.label }))}
            aria-label={`Tiếng cho mốc ${timecode(spot.frame)}`}
          />
          <PlayPair label={spot.why} playing={playing?.spot === spot.id ? playing.side : null} onPlay={(withSfx) => play(spot.id, withSfx)} />
        </li>;
      })}
    </ul>
    {!!view.sections.length && <div className="vs-sfx-beds">
      <div className="vs-section-title">Tiếng nền theo phần</div>
      <p className="vs-music-note">Bed rất nhỏ phủ cả một phần, có fade hai đầu. Để trống là phần đó không có tiếng nền.</p>
      <ul className="vs-sfx-list">
        {view.sections.map((name, index) => {
          const section = String(index + 1);
          const value = view.state.beds[section] || "";
          return <li key={section} className={`vs-sfx-row ${value ? "is-on" : ""}`}>
            <span className="vs-sfx-when">{index + 1}</span>
            <span className="vs-sfx-why">{name}</span>
            <Select
              className="vs-sfx-sound"
              size="small"
              allowClear
              placeholder="Không có"
              value={value || undefined}
              onChange={(next) => save({ ...view.state, beds: { ...view.state.beds, [section]: next || "" } })}
              options={(byLayer.ambience ?? []).map((o) => ({ value: o.id, label: o.label }))}
              aria-label={`Tiếng nền cho phần ${name}`}
            />
            {value
              ? <PlayPair label={`phần ${name}`} playing={playing?.spot === `bed:${section}` ? playing.side : null} onPlay={(withSfx) => play(`bed:${section}`, withSfx)} />
              : <span />}
          </li>;
        })}
      </ul>
    </div>}
    {view.mixStale && <Alert
      className="vs-music-note"
      type="info"
      showIcon
      title="Giọng đã đổi sau lần trộn trước"
      description="Render sẽ tự trộn lại theo đúng những chỗ đang duyệt ở đây."
    />}
    {view.mix.hits.some((h) => h.onSpeech) && <p className="vs-music-note">
      <Tag className="vs-sfx-tag">đè lời</Tag>
      {view.mix.hits.filter((h) => h.onSpeech).length} tiếng rơi vào lúc đang có lời — bản trộn tự hạ chúng xuống, nhưng nghe thử lại cho chắc.
    </p>}
  </div>;
}

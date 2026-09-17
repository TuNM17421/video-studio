"use client";

import { CaretRightFilled, LoadingOutlined, PauseOutlined, SoundOutlined } from "@ant-design/icons";
import { Input, Radio, Tooltip } from "antd";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { VoiceCatalog, VoiceDef } from "@/lib/types";

const OTHER = "__other__";

/**
 * One round play button per voice, driven by a single <audio> that only ever holds the voice being
 * previewed: starting another one replaces it, so two narrators can never talk at once — which is the
 * whole point of a picker. The samples are pre-recorded files on the media bucket, so listening costs no
 * ElevenLabs credit.
 */
export function usePreview() {
  const [current, setCurrent] = useState<{ id: string; url: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const toggle = (voice: VoiceDef) => {
    if (!voice.sample) return;
    setFailed(null);
    setPlaying(false);
    setCurrent(current?.id === voice.id ? null : { id: voice.id, url: voice.sample.url });
  };

  // `key` on the element: a new voice means a new <audio>, which is what makes autoPlay fire again.
  const element = current ? <audio
    key={current.id}
    src={current.url}
    autoPlay
    onPlay={() => setPlaying(true)}
    onPause={() => setPlaying(false)}
    onEnded={() => setCurrent(null)}
    onError={() => { setCurrent(null); setFailed(current.id); }}
  /> : null;

  return {
    element,
    failed,
    toggle,
    stop: () => { setCurrent(null); setPlaying(false); },
    stateOf: (id: string) => ({ playing: current?.id === id && playing, loading: current?.id === id && !playing, failed: failed === id }),
  };
}

export function PlayButton({ voice, state, onClick }: { voice: VoiceDef; state: { playing: boolean; loading: boolean; failed: boolean }; onClick: () => void }) {
  if (!voice.sample) return <Tooltip title="Chưa có file mẫu trên kho media"><span className="vs-voice-play is-empty" aria-hidden="true"><SoundOutlined /></span></Tooltip>;
  const label = `${state.playing ? "Dừng" : "Nghe thử"} giọng ${voice.name}`;
  return <Tooltip title={state.failed ? "Không tải được mẫu — kiểm tra mạng" : label}>
    <button
      type="button"
      className={`vs-voice-play ${state.playing ? "is-playing" : ""} ${state.failed ? "is-failed" : ""}`}
      aria-label={label}
      // The button sits inside a Radio label: clicking play must not also select the voice.
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
    >
      {state.loading ? <LoadingOutlined /> : state.playing ? <PauseOutlined /> : <CaretRightFilled />}
    </button>
  </Tooltip>;
}

/**
 * Pick the narrator from the committed catalog (voices.json), or paste any ElevenLabs id for a voice that
 * is not in it yet — the catalog will never cover everything you want to try.
 */
export function VoicePicker({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const [catalog, setCatalog] = useState<VoiceCatalog | null>(null);
  const preview = usePreview();

  useEffect(() => {
    let alive = true;
    void api<VoiceCatalog>("/api/voices").then((c) => { if (alive) setCatalog(c); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const voices = catalog?.voices || [];
  const known = voices.some((v) => v.id === value);
  const selection = known ? value : OTHER;

  const pick = (id: string) => {
    preview.stop();
    onChange(id === OTHER ? "" : id);
  };

  return <div className="vs-voice-picker">
    <Radio.Group value={selection} onChange={(e) => pick(e.target.value)} disabled={disabled} aria-label="Giọng đọc">
      {voices.map((v) => <Radio key={v.id} value={v.id} className={`vs-voice-option ${selection === v.id ? "is-selected" : ""}`}>
        <PlayButton voice={v} state={preview.stateOf(v.id)} onClick={() => preview.toggle(v)} />
        <span className="vs-voice-copy">
          <strong>{v.name}{v.isDefault && <em className="vs-voice-tag">mặc định</em>}</strong>
          <small>{[v.gender, v.summary].filter(Boolean).join(" · ")}</small>
        </span>
      </Radio>)}
      <Radio value={OTHER} className={`vs-voice-option is-other ${selection === OTHER ? "is-selected" : ""}`}>
        <span className="vs-voice-copy">
          <strong>ID khác</strong>
          <small>Giọng chưa có trong voices.json — dán voice id lấy từ ElevenLabs.</small>
          {/* Always visible: an input that only appears once its own card is picked is an input nobody finds. */}
          <Input
            className="vs-voice-id"
            value={selection === OTHER ? value : ""}
            onChange={(e) => onChange(e.target.value.trim())}
            disabled={disabled}
            placeholder="Ví dụ 6adFm46eyy74snVn6YrT"
            aria-label="Voice ID"
            spellCheck={false}
            autoComplete="off"
          />
        </span>
      </Radio>
    </Radio.Group>

    {preview.element}

    {catalog?.sampleText && <p className="vs-voice-note">Các mẫu đều đọc: “{catalog.sampleText}”</p>}
  </div>;
}

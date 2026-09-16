"use client";

import { useState } from "react";
import { PauseCircleFilled, PlayCircleFilled } from "@ant-design/icons";
import { Button, Select } from "antd";
import { NO_MUSIC, trackLength, type MusicTrack } from "@/lib/music";

/**
 * Pick one track, or none, from a dropdown; the button beside it auditions the selected track. The audio
 * streams straight from the media bucket, so nothing has to be downloaded to hear it. The player is the
 * rendered <audio> itself: unmounting it is what stops playback, so leaving the step cannot leave a track running.
 */
export function MusicPicker({ tracks, value, onChange, disabled, label, noneLabel, noneHint }: {
  tracks: MusicTrack[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** Accessible name of the dropdown. */
  label: string;
  noneLabel: string;
  /** Shown under the dropdown while no track is chosen. */
  noneHint: string;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const selected = tracks.find((track) => track.id === value);
  const preview = tracks.find((track) => track.id === playing);

  return <div className="vs-music-picker">
    <div className="vs-music-picker-control">
      <Select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(id) => { setPlaying(null); onChange(id); }}
        options={[
          { value: NO_MUSIC, label: noneLabel },
          ...tracks.map((track) => ({ value: track.id, label: `${track.name} · ${trackLength(track.seconds)}` })),
        ]}
      />
      <Button
        type="text"
        className="vs-music-play"
        disabled={disabled || !selected?.url}
        title={selected?.url ? "Nghe thử" : value === NO_MUSIC ? "Chọn một bản nhạc để nghe thử" : "Chưa có trên kho media"}
        aria-label={selected ? `Nghe thử ${selected.name}` : `Nghe thử — ${label}`}
        icon={playing === selected?.id ? <PauseCircleFilled /> : <PlayCircleFilled />}
        onClick={() => setPlaying(playing === selected?.id ? null : selected?.id ?? null)}
      />
    </div>
    <small>{selected ? `${trackLength(selected.seconds)}${selected.summary ? ` · ${selected.summary}` : ""}` : noneHint}</small>
    {preview?.url && <audio src={preview.url} autoPlay onEnded={() => setPlaying(null)} />}
  </div>;
}

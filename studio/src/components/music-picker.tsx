"use client";

import { useState } from "react";
import { PauseCircleFilled, PlayCircleFilled } from "@ant-design/icons";
import { Button, Radio } from "antd";
import { NO_MUSIC, trackLength, type MusicTrack } from "@/lib/music";

/**
 * Pick one track, or none. Every option can be auditioned in place — the audio streams straight from the
 * media bucket, so nothing has to be downloaded to hear it. The player is the rendered <audio> itself:
 * unmounting it is what stops playback, so leaving the step cannot leave a track running.
 */
export function MusicPicker({ tracks, value, onChange, disabled, noneLabel }: {
  tracks: MusicTrack[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  noneLabel: string;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const preview = tracks.find((t) => t.id === playing);

  return <Radio.Group className="vs-music" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as string)}>
    <Radio className="vs-music-item" value={NO_MUSIC}><strong>{noneLabel}</strong></Radio>
    {tracks.map((track) => <Radio className="vs-music-item" key={track.id} value={track.id}>
      <span className="vs-music-copy">
        <strong>{track.name}</strong>
        <small>{trackLength(track.seconds)}{track.summary ? ` · ${track.summary}` : ""}</small>
      </span>
      <Button
        type="text"
        size="small"
        className="vs-music-play"
        disabled={!track.url}
        title={track.url ? "Nghe thử" : "Chưa có trên kho media"}
        aria-label={`Nghe thử ${track.name}`}
        icon={playing === track.id ? <PauseCircleFilled /> : <PlayCircleFilled />}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPlaying(playing === track.id ? null : track.id); }}
      />
    </Radio>)}
    {preview?.url && <audio src={preview.url} autoPlay onEnded={() => setPlaying(null)} />}
  </Radio.Group>;
}

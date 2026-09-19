"use client";

import { useEffect, useState } from "react";
import { PauseCircleFilled, PlayCircleFilled } from "@ant-design/icons";
import { Alert, Button, Empty, Tag, Typography } from "antd";
import { api, dsUrl } from "@/lib/client";
import type { CharacterDef, VoiceCatalog, VoiceDef } from "@/lib/types";
import styles from "./library.module.css";

/** The design system draws the card itself, so the hue and side shown are exactly what a video gets. */
function previewUrl(c: CharacterDef) {
  const q = new URLSearchParams({
    name: c.name,
    tone: c.tone || "accent",
    side: c.side || "left",
    text: `Xin chào, mình là ${c.name}.`,
  });
  if (c.avatarUrl) q.set("avatar", c.avatarUrl);
  return dsUrl(`ui_kits/lesson-video/demos/character.html?${q}`);
}

const voiceOf = (voices: VoiceDef[], ref: string | null) => (ref ? voices.find((v) => v.id === ref || v.name.toLowerCase() === ref.toLowerCase()) : undefined);

function SampleButton({ voice, playing, onToggle }: { voice: VoiceDef; playing: boolean; onToggle: () => void }) {
  return <Button
    type="text"
    className="vs-music-play"
    disabled={!voice.sample}
    title={voice.sample ? "Nghe thử giọng" : "Chưa có file mẫu trên kho media"}
    aria-label={`Nghe thử giọng ${voice.name}`}
    icon={playing ? <PauseCircleFilled /> : <PlayCircleFilled />}
    onClick={onToggle}
  />;
}

/**
 * Library · Nhân vật: the cast in voices.json → characters, read-only. The names shown in mono are the ones
 * a script may write in `speaker`; adding a character is a dev change to voices.json.
 */
export function CharacterLibrary() {
  const [catalog, setCatalog] = useState<VoiceCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    api<VoiceCatalog>("/api/voices")
      .then(setCatalog)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const characters = catalog?.characters ?? [];
  const voices = catalog?.voices ?? [];
  const cast = new Set(characters.map((c) => voiceOf(voices, c.voice)?.id).filter(Boolean));
  const spare = voices.filter((v) => v.engine === "elevenlabs" && !cast.has(v.id));
  const sample = voices.find((v) => v.id === playing)?.sample;
  const toggle = (id: string) => setPlaying((current) => (current === id ? null : id));

  return <section className={styles.catalogPanel}>
    <header className={styles.catalogHeader}>
      <div>
        <span className={styles.sectionEyebrow}>Cast index</span>
        <h1>Nhân vật</h1>
        <p>Những vai có thể xuất hiện trong video hội thoại. Viết đúng một trong các tên ở đây vào <code>speaker</code> của từng câu.</p>
      </div>
      <span className={styles.catalogTotal}><strong>{catalog ? characters.length : "—"}</strong> nhân vật</span>
    </header>
    {error && <Alert className={styles.feedback} type="error" showIcon title="Không tải được danh mục nhân vật" description={error} />}
    {catalog && !characters.length && <Empty className={styles.empty} image={Empty.PRESENTED_IMAGE_SIMPLE} description="voices.json chưa khai nhân vật nào" />}
    {!!characters.length && <ul className={styles.characterGrid}>{characters.map((c) => {
      const voice = voiceOf(voices, c.voice);
      return <li key={c.id} className={styles.characterCard}>
        <div className={styles.characterPreview}>
          <iframe title={`Thẻ thoại của ${c.name}`} src={previewUrl(c)} loading="lazy" tabIndex={-1} />
        </div>
        <div className={styles.characterBody}>
          <div className={styles.characterName}>
            <h2>{c.name}</h2>
            <Tag className={styles.fileTag}>{c.side === "right" ? "đứng bên phải" : "đứng bên trái"}</Tag>
          </div>
          <div className={styles.characterNames} aria-label="Tên dùng được trong speaker">
            {[c.id, ...(c.aliases || [])].map((n) => <Typography.Text key={n} code copyable={{ text: n, tooltips: ["Copy", "Đã copy"] }}>{n}</Typography.Text>)}
          </div>
          <div className={styles.characterVoice}>
            {voice
              ? <><SampleButton voice={voice} playing={playing === voice.id} onToggle={() => toggle(voice.id)} />
                <span>Giọng <strong>{voice.name}</strong>{voice.gender ? ` · ${voice.gender}` : ""}</span></>
              : c.voice
                ? <span>Giọng <code>{c.voice}</code> không có trong danh mục</span>
                : <span>Chưa gán giọng — kịch bản chưa gọi được vai này</span>}
          </div>
          {c.summary && <p>{c.summary}</p>}
        </div>
      </li>;
    })}</ul>}
    {!!spare.length && <div className={styles.spareVoices}>
      <h2>Giọng chưa có nhân vật</h2>
      <ul>{spare.map((v) => <li key={v.id}>
        <SampleButton voice={v} playing={playing === v.id} onToggle={() => toggle(v.id)} />
        <span><strong>{v.name}</strong>{v.gender ? ` · ${v.gender}` : ""}</span>
      </li>)}</ul>
      <p>Cần thêm nhân vật? Dev khai trong <code>voices.json → characters</code> (tên, ảnh trên kho media, phía, màu, giọng mượn).</p>
    </div>}
    {sample && <audio src={sample.url} autoPlay onEnded={() => setPlaying(null)} />}
  </section>;
}

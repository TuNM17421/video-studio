"use client";

import { useEffect, useMemo, useState } from "react";
import { ExportOutlined, PauseCircleFilled, PlayCircleFilled } from "@ant-design/icons";
import { Alert, Button, Empty, Tag, Typography } from "antd";
import { api } from "@/lib/client";
import type { SfxCatalog, SfxSound } from "@/lib/sfx";
import { layerLimit, soundsByLayer } from "@/lib/sfx";
import styles from "./library.module.css";

/** 0,49 s → "0,49 s"; dấu phẩy thập phân vì cả Studio viết số theo tiếng Việt. */
const seconds = (value: number) => `${value.toFixed(2).replace(".", ",")} s`;

function PlayButton({ sound, playing, onToggle }: { sound: SfxSound; playing: boolean; onToggle: () => void }) {
  return <Button
    type="text"
    className="vs-music-play"
    disabled={!sound.url}
    title={sound.url ? "Nghe thử" : "Chưa có trên kho media — chủ bucket chạy `sfx-fetch --prepare` rồi `npm run media`"}
    aria-label={`Nghe thử tiếng ${sound.id}`}
    icon={playing ? <PauseCircleFilled /> : <PlayCircleFilled />}
    onClick={onToggle}
  />;
}

/**
 * Thư viện · Tiếng động: `sfx.json`, chỉ đọc. Id in bằng chữ mono là thứ kịch bản viết vào dòng
 * **Tiếng:** của một câu, nên nó copy được. Thêm một tiếng là việc của chủ bucket (đẩy file lên R2 rồi
 * thêm mục vào `sfx.json`), không phải việc của người dựng video.
 */
export function SfxLibrary() {
  const [catalog, setCatalog] = useState<SfxCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    api<SfxCatalog>("/api/sfx")
      .then(setCatalog)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const groups = useMemo(() => (catalog ? soundsByLayer(catalog) : []), [catalog]);
  const sounds = catalog?.sounds ?? [];
  const missing = sounds.filter((s) => !s.url).length;
  const playingUrl = sounds.find((s) => s.id === playing)?.url ?? null;
  const toggle = (id: string) => setPlaying((current) => (current === id ? null : id));

  return <section className={styles.catalogPanel}>
    <header className={styles.catalogHeader}>
      <div>
        <span className={styles.sectionEyebrow}>Sound index</span>
        <h1>Tiếng động</h1>
        <p>Bộ tiếng dùng được trong video. Nghe thử ở đây là nghe đúng bản mà bản render dùng — kịch bản chỉ được gọi id có trong danh sách này.</p>
      </div>
      <span className={styles.catalogTotal}><strong>{catalog ? sounds.length : "—"}</strong> tiếng</span>
    </header>
    {error && <Alert className={styles.feedback} type="error" showIcon title="Không tải được danh mục tiếng động" description={error} />}
    {catalog && !sounds.length && <Empty className={styles.empty} image={Empty.PRESENTED_IMAGE_SIMPLE} description="sfx.json chưa khai tiếng nào" />}
    {!!missing && <Alert
      className={styles.feedback}
      type="warning"
      showIcon
      title={`${missing} tiếng chưa có trên kho media`}
      description="Nghe thử và trộn đều cần file thật. Chủ bucket chạy `node tools/sfx-fetch.mjs --prepare` rồi `npm run media`."
    />}
    {groups.map(({ layer, sounds: list }) => <div key={layer.id} className={styles.sfxLayer}>
      <div className={styles.sfxLayerHead}>
        <h2>{layer.label}</h2>
        <code>{layer.id}</code>
        {layerLimit(layer) && <Tag className={styles.fileTag}>{layerLimit(layer)}</Tag>}
        <span className={styles.sfxLayerCount}>{list.length} tiếng</span>
      </div>
      {layer.why && <p className={styles.sfxLayerWhy}>{layer.why}</p>}
      <ul className={styles.sfxList}>{list.map((sound) => <li key={sound.id} className={styles.sfxRow}>
        <PlayButton sound={sound} playing={playing === sound.id} onToggle={() => toggle(sound.id)} />
        <div className={styles.sfxIdentity}>
          <Typography.Text code copyable={{ text: sound.id, tooltips: ["Copy id", "Đã copy"] }}>{sound.id}</Typography.Text>
          <span className={styles.sfxSeconds}>{seconds(sound.seconds)}</span>
        </div>
        <p className={styles.sfxUse}>{sound.use || "Chưa ghi khi nào dùng."}</p>
        {sound.source && <Button
          className={styles.sfxSource}
          type="link"
          href={sound.source}
          target="_blank"
          rel="noreferrer"
          icon={<ExportOutlined />}
          iconPlacement="end"
        >Nguồn</Button>}
      </li>)}</ul>
    </div>)}
    {catalog?.license && <p className={styles.sfxLicense}>{catalog.license}</p>}
    {/* Một thẻ audio cho cả trang: bấm tiếng thứ hai thì tiếng đầu dừng, không chồng lên nhau. */}
    {playingUrl && <audio src={playingUrl} autoPlay onEnded={() => setPlaying(null)} />}
  </section>;
}

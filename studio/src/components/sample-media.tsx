"use client";

import { ReloadOutlined } from "@ant-design/icons";
import { Button, Empty } from "antd";
import { useState } from "react";
import type { MediaAsset } from "@/lib/types";

/**
 * A sample video or audio streamed from the public R2 media bucket. The studio runs locally but the
 * browser does not, so the file comes straight from R2; without a connection the player is replaced by a
 * card saying so, and a retry re-mounts the element once the network is back.
 */
export function SampleMedia({ asset, emptyText = "Chưa có video mẫu" }: { asset: MediaAsset | null; emptyText?: string }) {
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);

  if (!asset) return <Empty className="vs-sample-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />;

  if (failed) return <Empty
    className="vs-sample-empty"
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    description={<>
      <strong>Video mẫu không khả dụng</strong>
      <small>{offline ? "Máy đang mất kết nối mạng." : "Không tải được từ kho media."} File nằm trên Cloudflare R2, không có trong repo.</small>
      <Button size="small" icon={<ReloadOutlined />} onClick={() => { setFailed(false); setAttempt((n) => n + 1); }}>Thử lại</Button>
    </>}
  />;

  const onError = () => {
    setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    setFailed(true);
  };
  // `attempt` as the key: a retry re-mounts the element, which is what actually re-requests the file.
  const props = { className: "video-player", src: asset.url, controls: true, preload: "metadata" as const, onError };
  return asset.type.startsWith("audio/") ? <audio key={attempt} {...props} /> : <video key={attempt} {...props} />;
}

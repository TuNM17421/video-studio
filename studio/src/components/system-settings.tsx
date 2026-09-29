"use client";

import { useEffect, useState } from "react";
import { CheckCircleFilled, CloseCircleFilled, ExclamationCircleFilled, MinusCircleOutlined, SettingOutlined } from "@ant-design/icons";
import { Button, Collapse, Input, Modal, Switch, Tag, Typography } from "antd";
import { api } from "@/lib/client";
import type { AgentProvider, GatewayStatus, TelemetryStatus } from "@/lib/types";
import { ProductionState } from "./production-state";

type Tone = "success" | "warning" | "error" | "default";
const DOT: Record<Tone, React.ReactNode> = {
  success: <CheckCircleFilled />,
  warning: <ExclamationCircleFilled />,
  error: <CloseCircleFilled />,
  default: <MinusCircleOutlined />,
};

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <Tag className="vs-badge" color={tone} icon={DOT[tone]}>{children}</Tag>;
}

function gatewayTone(status: GatewayStatus["status"]): Tone {
  return status === "ok" ? "success" : status === "disabled" ? "default" : "warning";
}

/**
 * Compact status + settings entry point, shown where the video's agent is picked (only Codex spends through
 * 9router, so that badge is provider-specific; the log-system badge applies to every provider). One fetch on
 * mount feeds both the badges and the modal's initial values — opening the modal never has to wait.
 */
export function SystemStatusPanel({ provider }: { provider: AgentProvider }) {
  const [loading, setLoading] = useState(true);
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryStatus | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([
      api<GatewayStatus>("/api/gateway-settings"),
      api<TelemetryStatus>("/api/telemetry-settings"),
    ]).then(([g, t]) => {
      if (cancelled) return;
      setGateway(g.status === "fulfilled" ? g.value : null);
      setTelemetry(t.status === "fulfilled" ? t.value : null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const telemetryBadge = loading
    ? <Badge tone="default">Hệ thống log: đang kiểm tra…</Badge>
    : !telemetry?.url
      ? <Badge tone="default">Hệ thống log: chưa cấu hình</Badge>
      : telemetry.ok
        ? <Badge tone="success">Hệ thống log: đã kết nối</Badge>
        : <Badge tone="error">Hệ thống log: không phản hồi</Badge>;

  return <>
    <div className="vs-system-status" aria-label="Trạng thái log & chi phí">
      {telemetryBadge}
      {provider === "codex" && gateway && <Badge tone={gatewayTone(gateway.status)}>{gateway.status === "ok" ? "9router: đã kết nối" : gateway.status === "disabled" ? "9router: đang tắt" : gateway.status === "unreachable" ? "9router: không phản hồi" : "9router: thiếu API key"}</Badge>}
      {/* The modal seeds its fields from what was fetched. Opened before that (or after a failed fetch) it would start
          empty, and Save would overwrite the real URL with "" and switch the gateway off. */}
      <Button type="link" size="small" icon={<SettingOutlined />} disabled={loading || !telemetry || !gateway} title={loading ? "Đang kiểm tra trạng thái…" : !telemetry || !gateway ? "Chưa đọc được cài đặt hiện tại — tải lại trang" : undefined} onClick={() => setOpen(true)}>Cài đặt</Button>
    </div>
    {open && <SystemSettingsModal telemetry={telemetry} gateway={gateway} onRefetched={(g, t) => { setGateway(g); setTelemetry(t); }} onClose={() => setOpen(false)} />}
  </>;
}

function SystemSettingsModal({ telemetry, gateway, onRefetched, onClose }: {
  telemetry: TelemetryStatus | null;
  gateway: GatewayStatus | null;
  onRefetched: (gateway: GatewayStatus | null, telemetry: TelemetryStatus | null) => void;
  onClose: () => void;
}) {
  return <Modal className="vs-system-modal" open title="Cài đặt log & chi phí" footer={null} width={560} onCancel={onClose}>
    <TelemetrySection initial={telemetry} onSaved={(t) => onRefetched(gateway, t)} />
    <GatewaySection initial={gateway} onSaved={(g) => onRefetched(g, telemetry)} />
  </Modal>;
}

function TelemetrySection({ initial, onSaved }: { initial: TelemetryStatus | null; onSaved: (t: TelemetryStatus) => void }) {
  const [url, setUrl] = useState(initial?.url ?? "");
  const [token, setToken] = useState("");
  const [autoSync, setAutoSync] = useState(initial?.autoSync ?? true);
  const [status, setStatus] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body: { url: string; autoSync: boolean; token?: string } = { url: url.trim(), autoSync };
      if (token.trim()) body.token = token.trim();
      const next = await api<TelemetryStatus>("/api/telemetry-settings", { method: "POST", json: body });
      setStatus(next);
      setToken("");
      onSaved(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="vs-settings-section">
    <h3>Hệ thống log (chi phí, token, thời gian theo video)</h3>
    <p className="vs-settings-hint">
      URL và token nhận từ người quản trị hệ thống log — không dán vào chat chung. Chỉ giữ trong RAM của máy chủ
      Studio này; khởi động lại Studio thì quay về giá trị trong <code>studio/.env</code>.
    </p>
    <label className="field">URL hệ thống log
      <Input placeholder="https://video-telemetry.duckdns.org" value={url} onChange={(e) => setUrl(e.target.value)} disabled={saving} autoComplete="off" />
    </label>
    <label className="field">Token
      <Input.Password placeholder={status?.hasToken ? "•••• đã lưu — để trống nếu giữ nguyên" : "Dán token được cấp"} value={token} onChange={(e) => setToken(e.target.value)} disabled={saving} autoComplete="off" />
    </label>
    <div className="vs-key-line">
      <Switch size="small" checked={autoSync} onChange={setAutoSync} disabled={saving} aria-label="Tự động gửi sau mỗi lượt chạy" />
      <span>Tự động gửi sau mỗi lượt chạy</span>
    </div>
    {error && <ProductionState status="error" title="Không lưu được" detail={error} />}
    <div className="vs-settings-actions">
      {status && (status.ok
        ? <Badge tone="success">{status.message}</Badge>
        : <Badge tone={status.url ? "error" : "default"}>{status.message}</Badge>)}
      <Button onClick={save} loading={saving} disabled={saving}>Lưu & kiểm tra</Button>
    </div>
  </section>;
}

function GatewaySection({ initial, onSaved }: { initial: GatewayStatus | null; onSaved: (g: GatewayStatus) => void }) {
  const [enabled, setEnabled] = useState(initial?.settings.enabled ?? false);
  const [keyName, setKeyName] = useState(initial?.settings.keyName ?? "video-studio");
  const [profile, setProfile] = useState(initial?.settings.profile ?? "9router");
  const [status, setStatus] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const next = await api<GatewayStatus>("/api/gateway-settings", { method: "POST", json: { enabled, keyName: keyName.trim(), profile: profile.trim() } });
      setStatus(next);
      setEnabled(next.settings.enabled);
      onSaved(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="vs-settings-section">
    <h3>Chi phí Codex qua 9router</h3>
    <p className="vs-settings-hint">
      Chỉ áp dụng cho Codex, và chỉ cho các bước Studio chạy để dựng video. Cần đã cài 9router và tạo một API key
      riêng cho Studio trước (xem <Typography.Text code>telemetry/GATEWAY-9ROUTER.md</Typography.Text>). Không bật
      thì Codex vẫn chạy bình thường, chi phí sẽ hiện &quot;không đo&quot;.
    </p>
    <p className="vs-settings-hint">
      Tên profile khớp với tệp <Typography.Text code>~/.codex/&#123;profile&#125;.config.toml</Typography.Text> trên máy này.
    </p>
    <div className="vs-key-line">
      <Switch checked={enabled} onChange={setEnabled} disabled={saving} aria-label="Đo chi phí Codex qua 9router" />
      <span>Đo chi phí Codex qua 9router</span>
    </div>
    <Collapse
      className="vs-settings-advanced"
      ghost
      items={[{
        key: "advanced",
        label: "Nâng cao",
        children: <>
          <label className="field">Tên API key trong 9router
            <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} disabled={saving} autoComplete="off" />
          </label>
          <label className="field">Tên profile Codex
            <Input value={profile} onChange={(e) => setProfile(e.target.value)} disabled={saving} autoComplete="off" />
          </label>
        </>,
      }]}
    />
    {error && <ProductionState status="error" title="Không lưu được" detail={error} />}
    <div className="vs-settings-actions">
      {status && <Badge tone={gatewayTone(status.status)}>{status.message}</Badge>}
      <Button onClick={save} loading={saving} disabled={saving}>Lưu & kiểm tra</Button>
    </div>
  </section>;
}

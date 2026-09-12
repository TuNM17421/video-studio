"use client";

import type { ReactNode } from "react";
import { ExclamationCircleFilled } from "@ant-design/icons";
import { Modal } from "antd";

interface ConfirmDialogProps {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ title, description, confirmLabel, busy = false, confirmDisabled = false, onCancel, onConfirm }: ConfirmDialogProps) {
  return <Modal
    className="vs-confirm-dialog"
    open
    centered
    closable={false}
    keyboard={!busy}
    mask={{ closable: !busy }}
    title={<span className="vs-confirm-title"><ExclamationCircleFilled />{title}</span>}
    okText={confirmLabel}
    cancelText="Huỷ"
    okButtonProps={{ danger: true, disabled: confirmDisabled }}
    cancelButtonProps={{ disabled: busy }}
    confirmLoading={busy}
    onCancel={onCancel}
    onOk={onConfirm}
  >
    <div className="vs-confirm-description">{description}</div>
  </Modal>;
}

"use client";

import { ExclamationCircleFilled } from "@ant-design/icons";
import { Modal } from "antd";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ title, description, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  return <Modal
    className="vs-confirm-dialog"
    open
    centered
    closable={false}
    keyboard
    maskClosable
    title={<span className="vs-confirm-title"><ExclamationCircleFilled />{title}</span>}
    okText={confirmLabel}
    cancelText="Huỷ"
    okButtonProps={{ danger: true }}
    onCancel={onCancel}
    onOk={onConfirm}
  >
    <p className="vs-confirm-description">{description}</p>
  </Modal>;
}

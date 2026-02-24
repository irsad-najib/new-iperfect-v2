"use client";

import { Modal, Button } from "antd";
import { MdInfo } from "react-icons/md";

interface Props {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmModal = ({
  open,
  title,
  description,
  onCancel,
  onConfirm,
}: Props) => {
  return (
    <Modal
      open={open}
      centered
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="delete" danger type="primary" onClick={onConfirm}>
          Delete
        </Button>,
      ]}
      title={
        <div className="flex items-center gap-2">
          <MdInfo className="text-red-600" size={26} />
          <span>{title}</span>
        </div>
      }>
      {description}
    </Modal>
  );
};

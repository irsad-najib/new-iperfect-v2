"use client";

import React from "react";
import { Modal } from "antd";
import { MdClose } from "react-icons/md";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title?: string;
}

const GuideModal: React.FC<GuideModalProps> = ({
  isOpen,
  onClose,
  content,
  title = "Guide",
}) => {
  return (
    <Modal
      title={
        <div className="flex items-center justify-between">
          <span className="text-20 font-semibold">{title}</span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={800}
      closeIcon={<MdClose size={24} />}>
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </Modal>
  );
};

export default GuideModal;

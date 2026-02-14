"use client";

import React, { memo } from "react";
import { Modal, Button, Form, Input } from "antd";
import { MdInfo } from "react-icons/md";

interface RevertModalProps {
  visible: boolean;
  onOk: (reasoning: string, udfId?: string) => Promise<void>;
  onCancel: () => void;
  confirmLoading?: boolean;
  title?: string;
  all: boolean;
  children?: React.ReactNode;
  udfId?: string | null;
}

// Optimized: Memoized component to prevent unnecessary re-renders
const RevertModal: React.FC<RevertModalProps> = memo(
  ({
    visible,
    onOk,
    onCancel,
    confirmLoading = false,
    title = "Revert Changes",
    children,
    all,
    udfId,
  }) => {
    const [form] = Form.useForm();

    const handleRevert = () => {
      const reasoning = form.getFieldValue("reasoning");
      if (udfId !== undefined && udfId !== null) {
        onOk(reasoning, udfId);
      } else {
        onOk(reasoning);
      }
    };

    return (
      <Modal
        open={visible}
        title={title}
        onOk={handleRevert}
        onCancel={onCancel}
        confirmLoading={confirmLoading}
        centered
        width={"37.5rem"}
        footer={[
          <Button key="back" onClick={onCancel}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={confirmLoading}
            onClick={handleRevert}>
            Revert
          </Button>,
        ]}>
        {children ||
          `${
            all ? "All Tie In" : "This"
          } UDF will be reverted to previous version before adjustment.`}
        {/* Tailwind: bg-neutral-100 flex p-1.5 items-center gap-1 rounded mt-2 */}
        <div className="bg-neutral-100 flex p-1.5 items-center gap-1 rounded mt-2">
          <MdInfo color="#F47920" size={22} />
          <span>You can&apos;t undo this process</span>
        </div>
        {/* Tailwind: mt-6, font-semibold for label */}
        <Form
          form={form}
          layout="vertical"
          className="mt-6 [&_.ant-form-item-label>label]:font-semibold"
          preserve={false}>
          <Form.Item
            name="reasoning"
            label="Reasoning"
            rules={[{ required: true, message: "Isi reasoning!" }]}>
            <Input.TextArea placeholder="Isi reasoning" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

RevertModal.displayName = "RevertModal";

export default RevertModal;

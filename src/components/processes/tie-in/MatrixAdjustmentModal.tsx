"use client";

import React, { useEffect } from "react";
import { Modal, Button, Form, InputNumber } from "antd";
import { MdClose } from "react-icons/md";

interface MatrixAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (values: { currentValue: number; newValue: number }) => void;
  currentValue: number;
  fromUnit: string;
  toUnit: string;
}

const MatrixAdjustmentModal: React.FC<MatrixAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentValue,
  fromUnit,
  toUnit,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue({ newValue: currentValue });
    }
  }, [isOpen, currentValue, form]);

  const handleConfirm = () => {
    const newValue = form.getFieldValue("newValue") || currentValue;
    onConfirm({ currentValue, newValue });
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center justify-between">
          <span className="text-20 font-semibold">Adjust Matrix Value</span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} className="customCancelButton">
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          className="customPrimaryButton">
          Confirm
        </Button>,
      ]}
      closeIcon={<MdClose size={24} />}
      centered
      width={500}>
      <div className="py-4">
        <div className="mb-4">
          <p className="text-14 text-neutral-700 mb-2">
            <span className="font-semibold">From:</span> {fromUnit}
          </p>
          <p className="text-14 text-neutral-700 mb-0">
            <span className="font-semibold">To:</span> {toUnit}
          </p>
        </div>

        <Form form={form} layout="vertical">
          <Form.Item label="Current Value" className="mb-4">
            <InputNumber
              value={currentValue}
              disabled
              className="w-full"
              precision={2}
            />
          </Form.Item>

          <Form.Item label="New Value" name="newValue" className="mb-0">
            <InputNumber className="w-full" precision={2} />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default MatrixAdjustmentModal;

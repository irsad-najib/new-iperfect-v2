import React from "react";
import { Modal, Button, Form, Input } from "antd";

interface SaveConfigModalProps {
  isVisible: boolean;
  onCancel: () => void;
  onSave: (values: { save_name: string }) => void;
  isSubmitting: boolean;
}

const SaveConfigModal: React.FC<SaveConfigModalProps> = ({
  isVisible,
  onCancel,
  onSave,
  isSubmitting,
}) => {
  const [form] = Form.useForm();

  const handleOk = () => {
    form.submit();
  };

  const handleFinish = (values: { save_name: string }) => {
    onSave(values);
    form.resetFields();
  };

  return (
    <Modal
      title="Save Fuse Formulation Config"
      open={isVisible}
      onCancel={() => {
        onCancel();
        form.resetFields();
      }}
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            onCancel();
            form.resetFields();
          }}>
          Cancel
        </Button>,
        <Button
          key="save"
          className="bg-primary-300 border-primary-300 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-100 hover:bg-primary-700 hover:border-primary-700 active:bg-neutral-900 active:border-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300"
          loading={isSubmitting}
          onClick={handleOk}>
          Save Config
        </Button>,
      ]}>
      <div className="my-6">
        <Form form={form} onFinish={handleFinish} layout="vertical">
          <Form.Item
            label={<div className="font-semibold">Configuration Name</div>}
            name="save_name"
            rules={[
              { required: true, message: "Please input configuration name" },
              {
                min: 3,
                message: "Configuration name must be at least 3 characters",
              },
            ]}>
            <Input placeholder="Enter configuration name" className="w-full" />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default SaveConfigModal;

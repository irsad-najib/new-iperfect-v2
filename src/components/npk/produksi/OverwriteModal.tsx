import React, { useEffect } from "react";
import { Modal, Button, Form, InputNumber } from "antd";
import { MdInfo } from "react-icons/md";
import { formatNumberWithoutRounding } from "@/utils/numberFormat";

interface OverwriteModalProps {
  isVisible: boolean;
  isConfirmVisible: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectedData: any;
  isSubmitting: boolean;
  overwriteValues: { newValue: number } | null;
  onCancel: () => void;
  onConfirmCancel: () => void;
  onSave: (values: { newValue: number }) => void;
  onConfirmSave: () => void;
  title: string;
}

const OverwriteModal: React.FC<OverwriteModalProps> = ({
  isVisible,
  isConfirmVisible,
  selectedData,
  isSubmitting,
  overwriteValues,
  onCancel,
  onConfirmCancel,
  onSave,
  onConfirmSave,
  title,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    // Cek jika modal terlihat DAN ada data yang dipilih
    if (isVisible && selectedData) {
      // Secara manual atur nilai form
      form.setFieldsValue({
        currentValue: selectedData.value,
        newValue: null, // Sekalian kosongkan field "New Value"
      });
    }
  }, [isVisible, selectedData, form]);

  if (!selectedData) return null;

  return (
    <>
      <Modal
        title={title}
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
            type="primary"
            loading={isSubmitting}
            onClick={() => {
              const values = form.getFieldsValue();
              if (
                form.getFieldError("newValue").length === 0 &&
                values.newValue !== undefined
              ) {
                onSave(values);
              } else {
                form.submit();
              }
            }}>
            Overwrite
          </Button>,
        ]}>
        <div className="font-16 my-6">
          <Form
            form={form}
            onFinish={onSave}
            layout="vertical"
            initialValues={{
              currentValue: selectedData.value,
            }}>
            <Form.Item
              label={
                <div>
                  <div className="font-semibold">Value before</div>
                  <div className="text-14 text-neutral-700 mt-1">
                    Data: {selectedData.original_value}
                  </div>
                </div>
              }
              name="currentValue">
              <InputNumber
                disabled
                className="w-full bg-neutral-200 font-16 text-neutral-900"
                // precision={2}
              />
            </Form.Item>

            <Form.Item
              label={<div className="font-semibold">New Value</div>}
              name="newValue"
              rules={[
                { required: true, message: "Please input the new value" },
              ]}>
              <InputNumber
                className="w-full"
                // precision={2}
                placeholder="Enter new value"
                // parser={(value) => {
                //   if (!value) return "";
                //   return convertIndonesianNumber(value as any);
                // }}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <MdInfo size={32} className="text-secondary-300" />
            <span className="text-16">Overwrite data at</span>
          </div>
        }
        open={isConfirmVisible}
        onCancel={onConfirmCancel}
        footer={[
          <Button key="cancel" onClick={onConfirmCancel}>
            Cancel
          </Button>,
          <Button
            key="confirm"
            className="bg-primary-300 border-primary-300 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-100 hover:bg-primary-700 hover:border-primary-700 active:bg-neutral-900 active:border-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300"
            loading={isSubmitting}
            onClick={onConfirmSave}>
            Yes, overwrite
          </Button>,
        ]}>
        <div className="text-16 mb-4 ml-8">
          <div className="text-neutral-900"></div>
          <div className="mt-3">
            <div>
              Value before: {formatNumberWithoutRounding(selectedData.value, 2)}
            </div>
            <div>
              New value:{" "}
              {formatNumberWithoutRounding(overwriteValues?.newValue ?? 0, 2)}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default OverwriteModal;

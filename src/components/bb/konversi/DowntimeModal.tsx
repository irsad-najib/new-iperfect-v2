import React, { useEffect, useState } from "react";
import { Modal, Form, TimePicker, Input, Select, message } from "antd";
import api from "@/utils/axios";
import dayjs from "dayjs";

interface DowntimeModalProps {
  isVisible: boolean;
  onCancel: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAdd: (values: any) => void;
  isSubmitting: boolean;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialValues?: any;
}

const DowntimeModal: React.FC<DowntimeModalProps> = ({
  isVisible,
  onCancel,
  onAdd,
  isSubmitting,
  title,
  initialValues,
}) => {
  const [form] = Form.useForm();
  const [categories, setCategories] = useState<string[]>([]);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  // Set form value saat initialValues berubah & modal dibuka
  useEffect(() => {
    if (isVisible) {
      if (initialValues) {
        form.resetFields();
        // Convert epoch times to dayjs objects for TimePicker
        const formValues = {
          ...initialValues,
          timeframe:
            initialValues.start_time && initialValues.end_time
              ? [
                  dayjs.unix(initialValues.start_time),
                  dayjs.unix(initialValues.end_time),
                ]
              : undefined,
          // Map category_name to category field if needed, or ensure initialValues uses 'category'
          category: initialValues.category_name || initialValues.category,
        };

        setTimeout(() => {
          form.setFieldsValue(formValues);
        }, 0);
      } else {
        form.resetFields();
      }
    }
  }, [isVisible, initialValues, form]);

  useEffect(() => {
    if (!isVisible) return;

    const fetchCategories = async () => {
      try {
        setIsCategoryLoading(true);
        // Use factory bb for category fetching
        const response = await api.get("/downtime_category", {
          params: { pabrik_type: "bb" },
        });

        if (Array.isArray(response?.data)) {
          const mappedCategories = response.data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => item?.category_name)
            .filter((name: unknown): name is string => Boolean(name));

          setCategories(mappedCategories);
        } else {
          setCategories([]);
        }
      } catch (error) {
        console.error("Failed to fetch downtime categories:", error);
        message.error("Gagal memuat kategori downtime");
      } finally {
        setIsCategoryLoading(false);
      }
    };

    fetchCategories();
  }, [isVisible]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onAdd(values);
      // Reset is handled by parent or effect
    } catch (err) {
      console.error("Validation failed:", err);
    }
  };

  return (
    <Modal
      title={title}
      open={isVisible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={isSubmitting}
      okText={title.includes("Edit") ? "Save" : "Add"}
      cancelText="Cancel"
      width={600}
      className="pt-6">
      <Form form={form} layout="vertical" name="downtime_form">
        <Form.Item
          name="timeframe"
          label="Choose timeframe range"
          rules={[{ required: true, message: "Please choose the timeframe!" }]}>
          <TimePicker.RangePicker
            className="w-full"
            format="HH:mm"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="factory"
          label="Factory"
          rules={[{ required: true, message: "Please select a factory!" }]}>
          <Select
            placeholder="Select Factory"
            size="large"
            options={[
              { label: "BB 1", value: "bb_1" },
              { label: "BB 2", value: "bb_2" },
              { label: "BB 1 & BB 2", value: "bb_1_&_bb_2" },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: true, message: "Please select a category!" }]}>
          <Select
            placeholder="Pilih kategori"
            loading={isCategoryLoading}
            allowClear
            size="large"
            options={categories.map((category) => ({
              label: category,
              value: category,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="cause"
          label="Cause"
          rules={[{ required: true, message: "Please input the cause!" }]}>
          <Input.TextArea rows={4} placeholder="Isi penyebab" size="large" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DowntimeModal;

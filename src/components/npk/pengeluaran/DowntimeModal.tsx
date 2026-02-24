/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import {
  Modal,
  Form,
  TimePicker,
  Input,
  Select,
  message,
  Row,
  Col,
  Typography,
  Spin,
  Tag,
} from "antd";
import api from "@/utils/axios";
import { useDateContext } from "@/context/DateContext";
interface DowntimeModalProps {
  isVisible: boolean;
  onCancel: () => void;
  onAdd: (values: any) => void;
  isSubmitting: boolean;
  title: string;
  initialValues?: any;
}

const DowntimeModal: React.FC<DowntimeModalProps> = ({
  isVisible,
  onCancel,
  onAdd,
  title,
  initialValues,
}) => {
  const [form] = Form.useForm();
  const [categories, setCategories] = useState<string[]>([]);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const { formattedDate } = useDateContext();
  const [catatanData, setCatatanData] = useState<any>(null);
  const [catatanLoading, setCatatanLoading] = useState(false);
  const [catatanError, setCatatanError] = useState<string | null>(null);

  // Set form value saat initialValues berubah & modal dibuka
  useEffect(() => {
    if (isVisible) {
      if (initialValues) {
        // Reset dulu, lalu set values setelah modal terbuka
        form.resetFields();
        setTimeout(() => {
          form.setFieldsValue(initialValues);
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
        const response = await api.get("/downtime_category", {
          params: { pabrik_type: "npk" },
        });

        if (Array.isArray(response?.data)) {
          const mappedCategories = response.data
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

  useEffect(() => {
    if (!isVisible) return;
    const fetchCatatan = async () => {
      try {
        setCatatanLoading(true);
        setCatatanError(null);
        const res = await api.get("/npk/daily/utils/catatan-operasi-npk", {
          params: { tanggal: formattedDate },
        });
        setCatatanData(res.data);
      } catch {
        setCatatanError("Gagal memuat catatan operasi NPK");
      } finally {
        setCatatanLoading(false);
      }
    };
    fetchCatatan();
  }, [isVisible, formattedDate]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onAdd(values);
      form.resetFields();
    } catch {}
  };

  return (
    <Modal
      title={title}
      open={isVisible}
      onOk={handleOk}
      onCancel={onCancel}
      okText={title.includes("Edit") ? "Save" : "Add"}
      cancelText="Cancel"
      width={900}
      classNames={{
        body: "pt-6",
      }}>
      <Row gutter={24}>
        <Col span={12}>
          <div className="pr-3 border-r border-neutral-200">
            <Typography.Title level={5} className="mt-0! mb-4!">
              Downtime Information
            </Typography.Title>
            <Form form={form} layout="vertical" name="downtime_form">
              <Form.Item
                name="timeframe"
                label="Choose timeframe range"
                rules={[
                  { required: true, message: "Please choose the timeframe!" },
                ]}>
                <TimePicker.RangePicker
                  className="w-full"
                  format="HH:mm"
                  size="large"
                />
              </Form.Item>
              <Form.Item
                name="penyebab"
                label="Penyebab"
                rules={[
                  { required: true, message: "Please input the cause!" },
                ]}>
                <Input.TextArea
                  rows={4}
                  placeholder="Isi penyebab"
                  size="large"
                />
              </Form.Item>
              <Form.Item
                name="category"
                label="Category"
                rules={[
                  { required: true, message: "Please select a category!" },
                ]}>
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
            </Form>
          </div>
        </Col>
        <Col span={12}>
          <div className="pl-3">
            <Typography.Title level={5} className="mt-0! mb-4!">
              Catatan Operasi NPK
            </Typography.Title>
            {catatanLoading && (
              <div className="flex items-center justify-center rounded-lg bg-neutral-100 p-12">
                <Spin size="large" />
              </div>
            )}
            {!catatanLoading && catatanError && (
              <div className="rounded-lg border border-danger bg-white p-4">
                <Typography.Text type="danger">{catatanError}</Typography.Text>
              </div>
            )}
            {!catatanLoading && !catatanError && (
              <div className="max-h-[380px] overflow-auto rounded-lg border border-neutral-200 bg-neutral-100 p-4">
                {Array.isArray(catatanData) && catatanData.length > 0 ? (
                  <div>
                    {catatanData.map((shift: any, shiftIndex: number) => (
                      <div key={shiftIndex}>
                        <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-3">
                          <div className="mb-3 flex items-center">
                            <Tag color="green" className="m-0 text-12">
                              {shift.shift_name || `Shift ${shift.id_shift}`}
                            </Tag>
                          </div>
                          {Array.isArray(shift.data) &&
                          shift.data.length > 0 ? (
                            shift.data.map((item: any, itemIndex: number) => (
                              <div
                                key={itemIndex}
                                className="mb-2 rounded-md border-l-4 border-primary-500 bg-neutral-100 p-2.5">
                                <div className="mb-1.5">
                                  <Tag color="blue" className="text-10">
                                    {item.KATEGORI_NAME || "No Category"}
                                  </Tag>
                                </div>
                                <Typography.Text className="block text-12 leading-relaxed text-neutral-700">
                                  {item.KETERANGAN || "Tidak ada keterangan"}
                                </Typography.Text>
                              </div>
                            ))
                          ) : (
                            <Typography.Text
                              type="secondary"
                              className="text-12">
                              Tidak ada catatan
                            </Typography.Text>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-neutral-500">
                    <Typography.Text type="secondary">
                      Tidak ada catatan operasi
                    </Typography.Text>
                  </div>
                )}
              </div>
            )}
          </div>
        </Col>
      </Row>
    </Modal>
  );
};

export default DowntimeModal;

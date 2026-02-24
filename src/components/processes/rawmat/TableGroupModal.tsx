"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Input,
  Button,
  Dropdown,
  Row,
  Col,
  Typography,
  message,
} from "antd";
import { MdAdd, MdDelete } from "react-icons/md";
import api from "@/utils/axios";

interface TableItem {
  _id: string;
  name: string;
}

interface TableGroup {
  _id?: string;
  name: string;
  table_items: TableItem[];
}

interface TableGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: TableGroup) => void;
  selectedIds: { pabrik_id: number | null; config_id: string | null };
  initialData?: TableGroup;
  loading: boolean;
}

const TableGroupModal = ({
  visible,
  onClose,
  onSubmit,
  initialData,
  loading,
}: TableGroupModalProps) => {
  const [formData, setFormData] = useState<TableGroup>(() => ({
    name: initialData?.name || "",
    table_items: initialData?.table_items || [],
  }));
  const [items, setItems] = useState<TableItem[]>([]);

  /* ================= FETCH ITEMS ================= */
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const { data } = await api.get("/rawmat/config/table_item");
        setItems(data);
      } catch (error) {
        console.error(error);
        message.error("Failed to fetch materials");
      }
    };

    fetchItems();
  }, []);

  /* ================= HANDLERS ================= */
  const handleAddItem = (item: TableItem) => {
    setFormData((prev) => ({
      ...prev,
      table_items: [...prev.table_items, item],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      table_items: prev.table_items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  //   const resetForm = () => {
  //     setFormData({
  //       name: initialData?.name || "",
  //       table_items: initialData?.table_items || [],
  //     });
  //   };

  /* ================= RENDER ================= */
  return (
    <Modal
      key={initialData?._id || "new"}
      title={initialData ? "Edit table group" : "Add new table group"}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={initialData ? "Save" : "Add"}
      width={460}
      centered
      destroyOnClose
      confirmLoading={loading}>
      {/* ===== GROUP NAME ===== */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Typography.Text strong>Group name</Typography.Text>
          <Input
            className="mt-2"
            placeholder="Isi nama group"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </Col>
      </Row>

      {/* ===== TABLE ITEMS ===== */}
      <div className="mt-6">
        <Typography.Text strong>Table items</Typography.Text>

        <div className="border border-neutral-700 p-4 rounded-lg mt-2 mb-6">
          {/* HEADER */}
          <div className="grid grid-cols-[10fr_1fr] gap-4 items-center mb-2">
            <span className="text-center font-semibold">Items</span>

            <Dropdown
              trigger={["click"]}
              placement="bottomRight"
              menu={{
                items: items
                  .filter(
                    (item) =>
                      !formData.table_items.some(
                        (selected) => selected._id === item._id,
                      ),
                  )
                  .map((item) => ({
                    key: item._id,
                    label: item.name,
                    onClick: () => handleAddItem(item),
                  })),
              }}>
              <Button
                type="primary"
                className="customPrimaryButton"
                icon={<MdAdd size={24} />}
              />
            </Dropdown>
          </div>

          {/* ITEM LIST */}
          {formData.table_items.map((item, index) => (
            <div
              key={item._id || index}
              className="grid grid-cols-[10fr_1fr] gap-4 items-center mb-2">
              <span className="px-3 py-1 bg-secondary-300 text-white font-semibold rounded text-[16.8px] w-fit mx-auto">
                {item.name}
              </span>

              <Button
                type="text"
                onClick={() => removeItem(index)}
                className="hover:text-danger"
                icon={<MdDelete size={24} />}
              />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default TableGroupModal;

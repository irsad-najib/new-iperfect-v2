"use client";

import { useEffect, useState } from "react";
import { Table, Button, message } from "antd";
import { MdDelete } from "react-icons/md";
import api from "@/utils/axios";
import { ConfirmModal } from "../ConfirmModal";

export const ConstantSection = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/constant_variable");
      setData(res.data ?? []);
    } catch {
      message.error("Failed fetch constant");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      await api.delete(`/constant_variable/${deleteTarget._id}`);
      message.success("Deleted");
      fetchData();
    } catch {
      message.error("Delete failed");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button type="primary">Add Constant</Button>
      </div>

      <Table
        rowKey="_id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: "Name", dataIndex: "name" },
          { title: "Variable", dataIndex: "variable_name" },
          { title: "Category", dataIndex: "category" },
          {
            title: "Actions",
            render: (_, record) => (
              <MdDelete
                size={22}
                className="cursor-pointer"
                onClick={() => setDeleteTarget(record)}
              />
            ),
          },
        ]}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Constant"
        description={`Delete "${deleteTarget?.name}" ?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
};

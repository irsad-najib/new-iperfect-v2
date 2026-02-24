"use client";

import { useEffect, useState } from "react";
import { Table, Button, message } from "antd";
import { MdDelete } from "react-icons/md";
import api from "@/utils/axios";
import { ConfirmModal } from "../ConfirmModal";

export const MaterialSection = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/distribution_material");
      setData(res.data ?? []);
    } catch {
      message.error("Failed fetch material");
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
      await api.delete(`/distribution_material/${deleteTarget._id}`);
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
        <Button type="primary">Add Material</Button>
      </div>

      <Table
        rowKey="_id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: "Name", dataIndex: "name" },
          { title: "Unit", dataIndex: "unit" },
          { title: "Max Tolerance", dataIndex: "max_tolerance" },
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
        title="Delete Material"
        description={`Delete "${deleteTarget?.name}" ?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
};

"use client";

import { useEffect, useState } from "react";
import { Table, Button, message } from "antd";
import { MdEditNote, MdDelete } from "react-icons/md";
import api from "@/utils/axios";
import { ConfirmModal } from "../ConfirmModal";

export const TagSection = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/tag_constant");
      setData(res.data ?? []);
    } catch {
      message.error("Failed fetch tag");
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
      await api.delete(`/tag_constant/${deleteTarget._id}`);
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
        <Button type="primary">Add New Tag</Button>
      </div>

      <Table
        rowKey="_id"
        loading={loading}
        dataSource={data}
        columns={[
          {
            title: "Alias",
            dataIndex: "name_alias",
          },
          {
            title: "Actions",
            render: (_, record) => (
              <div className="flex gap-4 justify-center">
                <MdEditNote size={26} className="cursor-pointer" />
                <MdDelete
                  size={22}
                  className="cursor-pointer"
                  onClick={() => setDeleteTarget(record)}
                />
              </div>
            ),
          },
        ]}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Tag"
        description={`Delete "${deleteTarget?.name_alias}" ?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
};

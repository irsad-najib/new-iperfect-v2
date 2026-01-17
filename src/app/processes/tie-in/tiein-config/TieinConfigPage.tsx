"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  Breadcrumb,
  DatePicker,
  Button,
  message,
  Space,
  Modal,
  Tooltip,
} from "antd";
import {
  MdArrowForwardIos,
  MdDelete,
  MdEditNote,
  MdError,
  MdInfoOutline,
} from "react-icons/md";
import Link from "next/link";
import { useDateContext } from "@/context/DateContext";
import { useRouter } from "next/navigation";
import api from "@/utils/axios";
import { HiOutlineArrowNarrowRight } from "react-icons/hi";
import type { ColumnsType } from "antd/es/table";

/* ================= TYPES ================= */

interface Product {
  _id: string;
  name: string;
  unit: string;
}

interface PabrikConfig {
  _id: string;
  pabrik_id: number;
  config_id: string;
  config_name: string;
  export_product: Product[];
  import_product: Product[];
}

interface PabrikData {
  key: number;
  pabrik_name: string;
  pabrik_id: number;
  number_of_configs: number;
  config: PabrikConfig[];
}

interface TieinConfigResponse {
  _id: string;
  name: string;
  tanggal: string;
  default: boolean;
  config: PabrikData[];
}

/* ================= PAGE ================= */

const TieinConfigPage = () => {
  const { selectedDate, formattedDate } = useDateContext();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [tieinConfig, setTieinConfig] = useState<TieinConfigResponse | null>(
    null,
  );

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<PabrikConfig | null>(
    null,
  );

  /* ================= FETCH ================= */

  const fetchData = useCallback(async () => {
    if (!formattedDate) return;

    try {
      setLoading(true);
      const res = await api.get<TieinConfigResponse>(
        "/tiein/config/get-by-args",
        { params: { tanggal: formattedDate } },
      );
      setTieinConfig(res.data);
    } catch {
      message.error("Failed to fetch tie in configuration");
    } finally {
      setLoading(false);
    }
  }, [formattedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ================= DELETE ================= */

  const openDeleteModal = (config: PabrikConfig) => {
    setConfigToDelete(config);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!tieinConfig || !configToDelete) return;

    try {
      setLoading(true);

      const updatedConfig = {
        ...tieinConfig,
        config: tieinConfig.config.map((p) =>
          p.pabrik_id === configToDelete.pabrik_id
            ? {
                ...p,
                config: p.config.filter((c) => c._id !== configToDelete._id),
              }
            : p,
        ),
      };

      await api.post("/tiein/config/save", updatedConfig);
      setTieinConfig(updatedConfig);

      message.success("Config deleted");
    } catch {
      message.error("Failed to delete config");
    } finally {
      setLoading(false);
      setIsDeleteModalOpen(false);
      setConfigToDelete(null);
    }
  };

  /* ================= COLUMNS ================= */

  // import type { ColumnsType } from "antd/es/table";

  const expandedColumns: ColumnsType<PabrikConfig> = useMemo(
    () => [
      { title: "Name", dataIndex: "config_name", align: "center" as const },
      { title: "ID", dataIndex: "config_id", align: "center" as const },
      {
        title: "Import",
        dataIndex: "import_product",
        align: "center" as const,
        render: (items: Product[]) =>
          items.map((i) => (
            <Button key={i._id} className="!bg-secondary-300 !text-white !m-1">
              {i.name}
            </Button>
          )),
      },
      {
        title: "Export",
        dataIndex: "export_product",
        align: "center" as const,
        render: (items: Product[]) =>
          items.map((i) => (
            <Button key={i._id} className="!bg-secondary-300 !text-white !m-1">
              {i.name}
            </Button>
          )),
      },
      {
        title: "Action",
        align: "center" as const,
        render: (_: unknown, record: PabrikConfig) => (
          <Space>
            <MdEditNote size={26} className="cursor-pointer" />
            <MdDelete
              size={22}
              className="cursor-pointer"
              onClick={() => openDeleteModal(record)}
            />
          </Space>
        ),
      },
    ],
    [],
  );

  const mainColumns: ColumnsType<PabrikData> = useMemo(
    () => [
      { title: "No", dataIndex: "key", align: "center" as const, width: "5%" },
      { title: "Name", dataIndex: "pabrik_name", align: "center" as const },
      { title: "ID", dataIndex: "pabrik_id", align: "center" as const },
      {
        title: "Configs",
        align: "center" as const,
        render: (_: unknown, r: PabrikData) => (
          <div className="flex items-center gap-1 justify-center">
            {r.number_of_configs}
            <Tooltip title={r.config.map((c) => c.config_id).join(", ")}>
              <MdInfoOutline color="#F47920" />
            </Tooltip>
          </div>
        ),
      },
    ],
    [],
  );

  /* ================= UI ================= */

  return (
    <div className="p-5">
      <div className="flex justify-between mb-5">
        <Breadcrumb
          separator={<MdArrowForwardIos />}
          items={[
            { title: <Link href="/processes">Processes</Link> },
            { title: <Link href="/processes/tie-in">Tie In</Link> },
            { title: "Set Config" },
          ]}
        />

        <Button
          onClick={() =>
            router.push("/processes/tie-in/ekspor-impor-before-tie-in")
          }>
          Next <HiOutlineArrowNarrowRight />
        </Button>
      </div>

      <DatePicker disabled value={selectedDate} />

      <Table
        rowKey={(r) => r.key}
        loading={loading}
        columns={mainColumns}
        dataSource={tieinConfig?.config ?? []}
        expandable={{
          expandedRowRender: (r) => (
            <Table
              rowKey="_id"
              columns={expandedColumns}
              dataSource={r.config}
              pagination={false}
            />
          ),
        }}
      />

      {/* DELETE MODAL */}
      <Modal
        open={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onOk={confirmDelete}
        okButtonProps={{ danger: true }}
        title={
          <div className="flex items-center gap-2">
            <MdError color="red" size={28} />
            Delete Config
          </div>
        }>
        Are you sure you want to delete this config?
      </Modal>
    </div>
  );
};

export default TieinConfigPage;

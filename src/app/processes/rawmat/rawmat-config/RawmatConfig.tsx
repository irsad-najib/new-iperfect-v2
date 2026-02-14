"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  Breadcrumb,
  DatePicker,
  Button,
  Dropdown,
  message,
  Space,
  Tooltip,
} from "antd";
import {
  MdArrowForwardIos,
  MdDelete,
  MdEditNote,
  MdInfoOutline,
} from "react-icons/md";
import Link from "next/link";
import { useDateContext } from "@/context/DateContext";
import { useRouter } from "next/navigation";
import api from "@/utils/axios";
import TableGroupModal from "@/components/processes/rawmat/TableGroupModal";
import DeleteTableGroupModal from "@/components/processes/rawmat/DeleteTableGroupModal";
import NextStepModal from "@/components/processes/rawmat/NextStepModal";
import { HiOutlineArrowNarrowRight } from "react-icons/hi";

/* ================= TYPES ================= */
interface TableItem {
  _id: string;
  name: string;
}
interface TableGroup {
  name: string;
  table_items: TableItem[];
}
interface PabrikConfig {
  pabrik_id: number;
  config_id: string;
  config_name: string;
  table_groups: TableGroup[];
  pabrik_name: string;
  table_groups_count: number;
}
interface RawmatConfig {
  _id: string;
  name: string;
  tanggal: string;
  default: boolean;
  config: PabrikConfig[];
}

/* ================= COMPONENT ================= */
const RawmatConfigPage = () => {
  const router = useRouter();
  const { selectedDate, formattedDate } = useDateContext();

  const [rawmatConfig, setRawmatConfig] = useState<RawmatConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const [selectedIds, setSelectedIds] = useState<{
    pabrik_id: number | null;
    config_id: string | null;
  }>({ pabrik_id: null, config_id: null });

  const [tableGroupToEdit, setTableGroupToEdit] = useState<TableGroup | null>(
    null,
  );
  const [tableGroupToDelete, setTableGroupToDelete] =
    useState<TableGroup | null>(null);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNextModal, setShowNextModal] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  /* ================= FETCH ================= */
  useEffect(() => {
    if (!formattedDate) return;

    const fetch = async () => {
      try {
        setLoadingConfig(true);
        const res = await api.get<RawmatConfig>("/rawmat/config/get-by-args", {
          params: { tanggal: formattedDate },
        });
        setRawmatConfig(res.data);
      } catch {
        message.error("Failed to fetch rawmat configuration");
      } finally {
        setLoadingConfig(false);
      }
    };

    fetch();
  }, [formattedDate]);

  /* ================= HANDLE SUBMIT ================= */
  const handleSubmitTableGroup = async (data: TableGroup) => {
    try {
      setLoadingSubmit(true);
      // Add your API call here to save the table group
      // await api.post('/rawmat/config/table-group', { ...data, ...selectedIds });
      message.success("Table group saved successfully");
      setShowGroupModal(false);
      // Refetch config data if needed
    } catch (error) {
      message.error("Failed to save table group");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleDeleteTableGroup = async () => {
    try {
      setLoadingDelete(true);
      // Add your API call here to delete the table group
      // await api.delete('/rawmat/config/table-group', { params: { ...selectedIds, name: tableGroupToDelete?.name } });
      message.success("Table group deleted successfully");
      setShowDeleteModal(false);
      // Refetch config data if needed
    } catch (error) {
      message.error("Failed to delete table group");
    } finally {
      setLoadingDelete(false);
    }
  };

  /* ================= MAIN COLUMNS ================= */
  const mainColumns = [
    { title: "No", dataIndex: "key", align: "center" as const, width: 60 },
    {
      title: "Factory ID",
      dataIndex: "pabrik_id",
      align: "center" as const,
      width: 120,
    },
    {
      title: "Config Name",
      dataIndex: "config_name",
      align: "center" as const,
    },
    {
      title: "Config ID",
      dataIndex: "config_id",
      align: "center" as const,
      width: 120,
    },
    {
      title: "Table Groups Count",
      dataIndex: "table_groups_count",
      align: "center" as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (_: any, record: PabrikConfig) => (
        <div className="flex items-center justify-center gap-1">
          <span>{record.table_groups_count}</span>
          <Tooltip
            color="#F47920"
            title={record.table_groups.map((g) => g.name).join(", ")}>
            <MdInfoOutline size={16} className="text-secondary-300" />
          </Tooltip>
        </div>
      ),
    },
  ];

  /* ================= EXPANDED ================= */
  const expandedColumns = (pabrikId: number, configId: string) => [
    { title: "Group Name", dataIndex: "name", align: "center" as const },
    {
      title: "Table Items",
      dataIndex: "table_items",
      align: "center" as const,
      render: (items: TableItem[]) => (
        <div className="flex flex-wrap justify-center gap-1">
          {items.map((item) => (
            <span
              key={item._id}
              className="px-3 py-1 bg-secondary-300 text-white text-sm font-semibold rounded">
              {item.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: "Actions",
      align: "center" as const,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (_: any, record: TableGroup) => (
        <Space>
          <MdEditNote
            size={24}
            className="cursor-pointer"
            onClick={() => {
              setSelectedIds({ pabrik_id: pabrikId, config_id: configId });
              setTableGroupToEdit(record);
              setShowGroupModal(true);
            }}
          />
          <MdDelete
            size={22}
            className="cursor-pointer"
            onClick={() => {
              setSelectedIds({ pabrik_id: pabrikId, config_id: configId });
              setTableGroupToDelete(record);
              setShowDeleteModal(true);
            }}
          />
        </Space>
      ),
    },
  ];

  const expandedRowRender = (record: PabrikConfig) => (
    <div className="p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[16.8px] font-semibold">Table Groups</h3>
        <Button
          className="customSecondaryButton btn-sm"
          onClick={() => {
            setSelectedIds({
              pabrik_id: record.pabrik_id,
              config_id: record.config_id,
            });
            setTableGroupToEdit(null);
            setShowGroupModal(true);
          }}>
          Add table groups
        </Button>
      </div>

      <Table
        columns={expandedColumns(record.pabrik_id, record.config_id)}
        dataSource={record.table_groups}
        pagination={false}
        bordered
        size="small"
      />
    </div>
  );

  /* ================= RENDER ================= */
  return (
    <div className="p-4 px-5">
      {/* ===== BREADCRUMB ===== */}
      <div className="flex justify-between items-center mb-6">
        <Breadcrumb
          separator={<MdArrowForwardIos size={16} />}
          items={[
            {
              title: (
                <Link href="/processes" className="breadcrumbLink">
                  Processes
                </Link>
              ),
            },
            {
              title: (
                <Link href="/processes/rawmat" className="breadcrumbLink">
                  RawMat
                </Link>
              ),
            },
            { title: "Set config rawmat" },
          ]}
        />
        <Button
          className="customSecondaryButton btn-md mr-12"
          onClick={() => setShowNextModal(true)}>
          <span className="font-normal">Next:</span>
          <span className="font-semibold ml-1">Set Input and Output</span>
          <HiOutlineArrowNarrowRight size={22} className="ml-1" />
        </Button>
      </div>

      {/* ===== HEADER ===== */}
      <div className="flex justify-between items-center mb-6">
        <DatePicker
          disabled
          value={selectedDate}
          format="dddd, DD MMMM YYYY"
          className="boldDatePicker"
        />

        <div className="flex items-center gap-3">
          <span className="font-semibold">Config RawMat:</span>
          <div className="min-w-[200px] px-3 py-1 bg-neutral-200 border rounded">
            {loadingConfig ? "Loading..." : rawmatConfig?.name}
          </div>

          <Dropdown
            menu={{ items: [{ key: "1", label: "Load default config" }] }}>
            <Button className="customSecondaryButton">
              Load config
              <MdArrowForwardIos
                size={16}
                style={{ transform: "rotate(90deg)" }}
              />
            </Button>
          </Dropdown>

          <Dropdown
            menu={{ items: [{ key: "1", label: "Save as new default" }] }}>
            <Button type="primary" className="customPrimaryButton">
              Save
              <MdArrowForwardIos
                size={16}
                style={{ transform: "rotate(90deg)" }}
              />
            </Button>
          </Dropdown>

          <Button>
            <MdDelete size={22} />
          </Button>
        </div>
      </div>

      {/* ===== TABLE ===== */}
      <Table
        columns={mainColumns}
        dataSource={rawmatConfig?.config}
        bordered
        expandable={{
          expandedRowRender,
          expandIcon: ({ expanded, onExpand, record }) => (
            <span
              onClick={(e) => onExpand(record, e)}
              className={`cursor-pointer inline-block transition-transform ${
                expanded ? "-rotate-90" : "rotate-90"
              }`}>
              <MdArrowForwardIos />
            </span>
          ),
        }}
        className="
          [&_.ant-table-thead>tr>th]:bg-neutral-200
          [&_.ant-table-tbody>tr>td]:bg-neutral-100
          [&_.ant-table-bordered_.ant-table-cell]:border-neutral-200
        "
      />

      {/* ===== MODALS ===== */}
      <TableGroupModal
        visible={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        selectedIds={selectedIds}
        initialData={tableGroupToEdit || undefined}
        onSubmit={handleSubmitTableGroup}
        loading={loadingSubmit}
      />

      <DeleteTableGroupModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        tableGroupToDelete={tableGroupToDelete}
        onDelete={handleDeleteTableGroup}
        loading={loadingDelete}
      />

      <NextStepModal
        visible={showNextModal}
        onClose={() => setShowNextModal(false)}
        onNext={() => router.push("/processes/rawmat/set-input-output")}
      />
    </div>
  );
};

export default RawmatConfigPage;

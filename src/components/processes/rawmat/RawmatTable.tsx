"use client";

import { useEffect, useRef, useState } from "react";
import { Table, Button, Avatar, Tooltip, Space, Progress, message } from "antd";
import {
  MdPlayArrow,
  MdOutlineStickyNote2,
  MdRestartAlt,
  MdUndo,
  MdArrowForwardIos,
} from "react-icons/md";
import { AiOutlineCheck } from "react-icons/ai";
import { useRouter } from "next/navigation";
import api from "@/utils/axios";
import { ColumnsType } from "antd/es/table";

interface ProcessRecord {
  key: string;
  status: string;
  process: string;
  version: string;
  progress: number;
  lastModified: string;
  avatarUrl: string;
}

interface RawmatData {
  _id: string;
}

interface RunResponse {
  message: string;
  job_id: string;
}

interface RawmatTableProps {
  formattedDate: string;
}

type JobStatusEvent = {
  job_id: string;
  status: "completed" | "failed";
};

const RawmatTable = ({ formattedDate }: RawmatTableProps) => {
  const router = useRouter();
  const [loadingCalculation, setLoadingCalculation] = useState(false);
  const [rawmatData, setRawmatData] = useState<RawmatData | null>(null);

  const [icTableData, setIcTableData] = useState<ProcessRecord[]>([
    {
      key: "1",
      status: "In Progress",
      process: "Set RPF and Integration",
      version: "V10.24.10:31",
      progress: 50,
      lastModified: "14/11/24, 14:31",
      avatarUrl: "",
    },
    {
      key: "2",
      status: "In Progress",
      process: "Calculate MMBTU",
      version: "V10.24.10:31",
      progress: 50,
      lastModified: "14/11/24, 14:31",
      avatarUrl: "",
    },
  ]);

  const rawmatJobIdRef = useRef<string | null>(null);

  const formatLastModified = (date: Date) =>
    date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  /* ================= SSE ================= */
  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    eventSource.onmessage = (event) => {
      const eventData: JobStatusEvent = JSON.parse(event.data);
      console.log("Received SSE event:", eventData);

      // Only react to the rawmat job triggered from this table.
      if (
        !rawmatJobIdRef.current ||
        eventData.job_id !== rawmatJobIdRef.current
      ) {
        return;
      }

      setLoadingCalculation(false);
      const nowLabel = formatLastModified(new Date());

      setIcTableData((prev) =>
        prev.map((row) => {
          // Keep everything else as-is, only update the fields you requested.
          if (eventData.status === "completed") {
            return {
              ...row,
              status: "Done",
              progress: 100,
              lastModified: nowLabel,
            };
          }

          return {
            ...row,
            status: "In Progress",
            lastModified: nowLabel,
          };
        }),
      );

      // Clear tracked job once it reaches a terminal state.
      rawmatJobIdRef.current = null;

      if (eventData.status === "completed") {
        message.success(`Job ${eventData.job_id} completed`);
      }
      if (eventData.status === "failed") {
        message.error(`Job ${eventData.job_id} failed`);
      }
    };

    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, []);

  /* ================= API ================= */
  useEffect(() => {
    const fetchRawmatData = async () => {
      if (!formattedDate) return;
      try {
        const res = await api.get<RawmatData>("/rawmat/data/get-by-args", {
          params: { tanggal: formattedDate, only_id: true },
        });
        setRawmatData(res.data);
      } catch {
        message.error("Failed to fetch rawmat data");
      }
    };

    fetchRawmatData();
  }, [formattedDate]);

  const getProgressColor = (progress: number) =>
    progress < 100 ? "#F47920" : "#1268B3";

  /* ================= COLUMN HELPERS ================= */
  const renderStatus = (status: string, record: ProcessRecord) => {
    const baseCircle =
      "w-9 h-9 rounded-full flex items-center justify-center text-[20px] font-semibold mr-3";

    if (status === "Done") {
      return (
        <div className="flex items-center ml-7">
          <div className={`${baseCircle} bg-primary-300 text-white`}>
            <AiOutlineCheck size={24} />
          </div>
          <span className="text-[20.16px]">Done</span>
        </div>
      );
    }

    if (status === "In Progress") {
      return (
        <div className="flex items-center ml-7">
          <div className={`${baseCircle} bg-neutral-100 text-secondary-300`}>
            {record.key}
          </div>
          <span className="text-[20.16px]">In Progress</span>
        </div>
      );
    }

    return (
      <div className="flex items-center ml-7 text-neutral-400">
        <div
          className={`${baseCircle} bg-neutral-200 border-2 border-neutral-400`}>
          {record.key}
        </div>
        <span className="text-[20.16px]">Unavailable</span>
      </div>
    );
  };

  const renderProcess = (process: string, record: ProcessRecord) => (
    <div className="flex flex-col items-center">
      <span
        className={`text-[20.16px] ${
          record.status === "Unavailable"
            ? "text-neutral-400"
            : "text-neutral-900"
        }`}>
        {process}
      </span>
      <span className="text-[9.72px] text-neutral-400">
        Version: {record.version}
      </span>
    </div>
  );

  const renderActions = (record: ProcessRecord, onDetail: () => void) => (
    <Space className="flex justify-center gap-1">
      {[
        <MdOutlineStickyNote2 key="note" size={28} />,
        <MdUndo key="undo" size={28} />,
        <MdRestartAlt key="restart" size={28} />,
        <MdArrowForwardIos key="arrow" size={28} />,
      ].map((icon, i) => (
        <Tooltip key={i} title="Action" color="#F47920">
          <Button
            className={`flex items-center justify-center border border-neutral-700 h-10 w-10 p-1 ${
              record.status === "Unavailable" ? "opacity-40" : ""
            }`}
            onClick={i === 3 ? onDetail : undefined}>
            {icon}
          </Button>
        </Tooltip>
      ))}
    </Space>
  );

  /* ================= COLUMNS ================= */
  const baseColumns: ColumnsType<ProcessRecord> = [
    {
      title: "Status",
      dataIndex: "status",
      width: 244,
      render: renderStatus,
    },
    {
      title: "Processes",
      dataIndex: "process",
      align: "center",
      render: renderProcess,
    },
    {
      title: "Actions",
      width: 300,
      render: (_, record) =>
        renderActions(record, () =>
          router.push("/processes/rawmat/set-input-output"),
        ),
    },
    {
      title: "Progress",
      dataIndex: "progress",
      align: "center",
      width: 280,
      render: (progress, record) =>
        record.status === "Unavailable" ? null : (
          <div className="px-4">
            <Progress
              percent={progress}
              status="normal"
              format={(p) => `${p}%`}
              strokeColor={getProgressColor(progress)}
              trailColor="#F3F4F8"
            />
          </div>
        ),
    },
    {
      title: "Last Modified",
      dataIndex: "lastModified",
      align: "center",
      width: 301,
      render: (value, record) =>
        record.status === "Unavailable" ? null : (
          <div className="flex items-center justify-center gap-2">
            <Avatar src="/images/avatar.png" size={28} />
            <span>{value}</span>
          </div>
        ),
    },
  ];

  /* ================= DATA ================= */
  const ioTableData: ProcessRecord[] = [
    {
      key: "1",
      status: "Done",
      process: "Set Input and Output",
      version: "V10.24.10:31",
      progress: 100,
      lastModified: "14/11/24, 14:31",
      avatarUrl: "",
    },
  ];

  /* ================= ACTIONS ================= */
  const handleRunCalculation = async () => {
    if (!rawmatData?._id) return;
    setLoadingCalculation(true);
    try {
      const res = await api.post<RunResponse>(
        `/rawmat/executor/${rawmatData._id}`,
      );
      rawmatJobIdRef.current = res.data.job_id;

      const nowLabel = formatLastModified(new Date());
      setIcTableData((prev) =>
        prev.map((row) => ({
          ...row,
          status: "In Progress",
          lastModified: nowLabel,
        })),
      );
    } catch {
      message.error("Failed to run calculation");
      setLoadingCalculation(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* ===== TABLE 1 ===== */}
      <div>
        <h2 className="text-[24.19px] mb-4">Initiate Inputs and Outputs</h2>
        <Table
          columns={baseColumns}
          dataSource={ioTableData}
          pagination={false}
          className="
            [&_.ant-table-thead>tr>th]:bg-neutral-200
            [&_.ant-table-thead>tr>th]:text-center
            [&_.ant-table-tbody>tr>td]:bg-neutral-100
            [&_.ant-table-tbody>tr>td]:text-center
            [&_.ant-table-cell]:text-[16.8px]
          "
        />
      </div>

      {/* ===== TABLE 2 ===== */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[24.19px]">Integration and Calculation</h2>
          <div className="flex gap-3">
            <Button className=" text-20 bg-transparent border border-neutral-700 rounded px-4 h-11 flex items-center justify-center font-semibold text-neutral-900 hover:bg-secondary-300 hover:border-secondary-300 hover:text-neutral-100 active:bg-neutral-500 active:border-neutral-500 active:text-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-[#eeeff1]">
              View Result
            </Button>
            <Button
              type="primary"
              className=" text-20 bg-primary-300 border-primary-300 rounded px-4 h-11 flex items-center justify-center font-semibold text-neutral-100 hover:bg-primary-700 hover:border-primary-700 active:bg-neutral-900 active:border-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300"
              loading={loadingCalculation}
              disabled={!rawmatData}
              onClick={handleRunCalculation}>
              <MdPlayArrow size={28} />
              Run calculation
            </Button>
          </div>
        </div>

        <Table
          columns={baseColumns}
          dataSource={icTableData}
          pagination={false}
          className="
            [&_.ant-table-thead>tr>th]:bg-neutral-200
            [&_.ant-table-thead>tr>th]:text-center
            [&_.ant-table-tbody>tr>td]:bg-neutral-100
            [&_.ant-table-tbody>tr>td]:text-center
            [&_.ant-table-cell]:text-[16.8px]
          "
        />
      </div>
    </div>
  );
};

export default RawmatTable;

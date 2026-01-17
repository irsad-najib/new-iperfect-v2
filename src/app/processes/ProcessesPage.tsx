"use client";

import React, { useEffect, useState } from "react";
import {
  Typography,
  DatePicker,
  Button,
  Table,
  Progress,
  Space,
  Avatar,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { AiOutlineCheck } from "react-icons/ai";
import {
  MdOutlineStickyNote2,
  MdUndo,
  MdRestartAlt,
  MdArrowForwardIos,
  MdCompareArrows,
} from "react-icons/md";
import { useRouter } from "next/navigation";
import { useDateContext } from "@/context/DateContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getDecodedAccess } from "@/utils/auth";
import dayjs from "dayjs";
import api from "@/utils/axios";

const { Title } = Typography;

interface ProcessRecord {
  key: string;
  status: string;
  process: string;
  version: string;
  progress: number;
  lastModified: string;
  avatarUrl: string;
}

const getProgressColor = (progress: number) => {
  if (progress < 100) return "var(--color-secondary-300)";
  return "var(--color-primary-300)";
};

const ProcessesPage: React.FC = () => {
  useRequireAuth();

  const { selectedDate, setSelectedDate } = useDateContext();
  const router = useRouter();
  const access = getDecodedAccess();
  const [loading, setLoading] = useState(false);
  console.log("Decoded Access:", access);

  useEffect(() => {
    const storedDate = localStorage.getItem("selectedDate");
    if (storedDate && setSelectedDate) setSelectedDate(dayjs(storedDate));
    {
    }
  }, [setSelectedDate]);

  const handleresyncdata = async () => {
    try {
      setLoading(true);
      await api.post("/daily_amur/utils/sync-adpro-dcs/start", null, {
        params: {
          tanggal: localStorage.getItem("selectedDate"),
        },
      });
    } catch (error) {
      console.error("Error during resync:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<ProcessRecord> = [
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      onHeaderCell: () => ({
        style: {
          fontFamily: "Outfit, sans-serif",
          fontWeight: 600,
          fontSize: "20.16px",
          lineHeight: "20.16px",
          letterSpacing: "0%",
          textAlign: "center" as const,
        },
      }),
      render: (status: string, record: ProcessRecord) => {
        const getStatusStyle = () => ({
          display: "flex",
          alignItems: "center",
          marginLeft: "29px",
        });

        const getCircleStyle = (bgColor: string, color: string) => ({
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          backgroundColor: bgColor,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginRight: "12px",
          color: color,
          fontSize: "20.16px",
          fontWeight: 600,
        });

        switch (status) {
          case "Done":
            return (
              <div style={getStatusStyle()}>
                <div
                  style={{
                    ...getCircleStyle(
                      "var(--color-primary-300)",
                      "var(--color-white)"
                    ),
                  }}>
                  <AiOutlineCheck color="var(--color-white)" size={24} />
                </div>
                <span className="text-20 font-normal">Done</span>
              </div>
            );
          case "In Progress":
            return (
              <div style={getStatusStyle()}>
                <div
                  style={getCircleStyle(
                    "var(--color-neutral-100)",
                    "var(--color-secondary-300)"
                  )}>
                  {record.key}
                </div>
                <span className="text-20 font-normal">In Progress</span>
              </div>
            );
          case "Unavailable":
            return (
              <div style={getStatusStyle()}>
                <div
                  style={{
                    ...getCircleStyle("#EEEFF1", "var(--color-neutral-300)"),
                    border: "2px solid var(--color-neutral-300)",
                  }}>
                  {record.key}
                </div>
                <span className="text-20 font-normal text-neutral-500">
                  Unavailable
                </span>
              </div>
            );
          default:
            return <span>{status}</span>;
        }
      },
    },
    {
      title: "Process",
      dataIndex: "process",
      key: "process",
      align: "center" as const,
      onHeaderCell: () => ({
        style: {
          fontFamily: "Outfit, sans-serif",
          fontWeight: 600,
          fontSize: "20.16px",
          lineHeight: "20.16px",
          letterSpacing: "0%",
          textAlign: "center" as const,
        },
      }),
      render: (process: string, record: ProcessRecord) => (
        <div className="flex flex-col">
          <span
            className={`
              text-20 font-normal 
              ${
                record.status === "Unavailable"
                  ? "text-neutral-300"
                  : "text-neutral-900"
              }
            `}>
            {process}
          </span>
          <span className="text-14 text-neutral-300 font-normal">
            Version: {record.version}
          </span>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      onHeaderCell: () => ({
        style: {
          fontFamily: "Outfit, sans-serif",
          fontWeight: 600,
          fontSize: "20.16px",
          lineHeight: "20.16px",
          letterSpacing: "0%",
          textAlign: "center" as const,
        },
      }),
      render: (_: unknown, record: ProcessRecord) => {
        return (
          <Space
            size="middle"
            className="flex justify-center gap-1.5 flex-wrap">
            <Tooltip
              title="View logs"
              placement="bottom"
              color="var(--color-secondary-300)">
              <Button
                className={`flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 p-2 sm:p-3 rounded-lg border ${
                  record.status === "Unavailable"
                    ? "bg-gray-200 text-neutral-500 cursor-not-allowed"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                <MdOutlineStickyNote2 className="text-2xl sm:text-3xl" />
              </Button>
            </Tooltip>

            <Tooltip
              title="Undo version"
              placement="bottom"
              color="var(--color-secondary-300)">
              <Button
                className={`flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 p-2 sm:p-3 rounded-lg border ${
                  record.status === "Unavailable"
                    ? "bg-gray-200 text-neutral-500 cursor-not-allowed"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                <MdUndo className="text-xl sm:text-2xl" />
              </Button>
            </Tooltip>

            <Tooltip
              title="Reset"
              placement="bottom"
              color="var(--color-secondary-300)">
              <Button
                className={`flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 p-2 sm:p-3 rounded-lg border ${
                  record.status === "Unavailable"
                    ? "bg-gray-200 text-neutral-500 cursor-not-allowed"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                <MdRestartAlt className="text-xl sm:text-2xl" />
              </Button>
            </Tooltip>

            {record.process !== "Input data" && (
              <Tooltip
                title="Compare"
                placement="bottom"
                color="var(--color-secondary-300)">
                <Button
                  className={`flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 p-2 sm:p-3 rounded-lg border ${
                    record.status === "Unavailable"
                      ? "bg-gray-200 text-neutral-500 cursor-not-allowed"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  disabled={record.progress < 100}
                  onClick={() => {
                    if (record.process === "Cleansing") {
                      router.push("/processes/cleansing/compare");
                    } else if (record.process === "Tie in") {
                      router.push("/processes/tie-in/compare");
                    } else if (record.process === "Rawmat") {
                      router.push("/processes/rawmat/compare");
                    }
                  }}>
                  <MdCompareArrows className="text-xl sm:text-2xl" />
                </Button>
              </Tooltip>
            )}

            <Tooltip
              title="Detail"
              placement="bottom"
              color="var(--color-secondary-300)">
              <Button
                className={`flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 p-2 sm:p-3 rounded-lg border ${
                  record.status === "Unavailable"
                    ? "bg-gray-200 text-neutral-500 cursor-not-allowed"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                disabled={
                  record.status === "Unavailable" ||
                  (record.process === "Input data" && !access?.external_data) ||
                  (record.process === "Cleansing" && !access?.cleansing) ||
                  (record.process === "Tie in" && !access?.tiein) ||
                  (record.process === "Rawmat" && !access?.rawmat)
                }
                onClick={() => {
                  if (record.process === "Input data") {
                    router.push("/processes/input-data");
                  } else if (record.process === "Cleansing") {
                    router.push("/processes/cleansing");
                  } else if (record.process === "Tie in") {
                    router.push("/processes/tie-in/tiein-config");
                  } else if (record.process === "Rawmat") {
                    router.push("/processes/rawmat");
                  }
                }}>
                <MdArrowForwardIos className="text-xl sm:text-2xl" />
              </Button>
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: "Progress",
      dataIndex: "progress",
      key: "progress",
      align: "center" as const,
      onHeaderCell: () => ({
        style: {
          fontFamily: "Outfit, sans-serif",
          fontWeight: 600,
          fontSize: "20.16px",
          lineHeight: "20.16px",
          letterSpacing: "0%",
          textAlign: "center" as const,
        },
      }),
      render: (progress: number, record: ProcessRecord) => {
        if (record.status === "Unavailable") {
          return null;
        }
        return (
          <div className="flex justify-center items-center">
            <div className="w-[175px] sm:w-[140px] lg:w-[175px]">
              <Progress
                percent={progress}
                strokeColor={getProgressColor(progress)}
                trailColor="#F3F4F8"
                format={(percent) => `${percent}%`}
                status="normal"
                className="[&_.ant-progress-text]:text-20 sm:[&_.ant-progress-text]:text-base [&_.ant-progress-text]:font-semibold [&_.ant-progress-text]:ml-1.5 [&_.ant-progress-text]:shrink-0 [&_.ant-progress-outer]:w-full [&_.ant-progress-inner]:w-full"
              />
            </div>
          </div>
        );
      },
    },
    {
      title: "Last Modified",
      dataIndex: "lastModified",
      key: "lastModified",
      align: "center" as const,
      onHeaderCell: () => ({
        style: {
          fontFamily: "Outfit, sans-serif",
          fontWeight: 600,
          fontSize: "20.16px",
          lineHeight: "20.16px",
          letterSpacing: "0%",
          textAlign: "center" as const,
        },
      }),
      render: (lastModified: string, record: ProcessRecord) => {
        if (record.status === "Unavailable") {
          return null;
        }
        return (
          <div className="flex items-center justify-center gap-2">
            <Avatar src={"/avatar.png"} size={28} className="sm:w-6 sm:h-6" />
            <span className="text-20 sm:text-base text-gray-900 whitespace-nowrap">
              {lastModified}
            </span>
          </div>
        );
      },
    },
  ];

  const data: ProcessRecord[] = [
    {
      key: "1",
      status: "Done",
      process: "Input data",
      version: "V10.24.10:31",
      progress: 100,
      lastModified: "14/11/24, 14:31",
      avatarUrl: "https://example.com/avatar1.jpg",
    },
    {
      key: "2",
      status: "Done",
      process: "Cleansing",
      version: "V10.24.10:31",
      progress: 100,
      lastModified: "14/11/24, 14:31",
      avatarUrl: "https://example.com/avatar2.jpg",
    },
    {
      key: "3",
      status: "Done",
      process: "Tie in",
      version: "V10.24.10:31",
      progress: 100,
      lastModified: "21/03/25, 14:31",
      avatarUrl: "https://example.com/avatar3.jpg",
    },
    {
      key: "4",
      status: "In Progress",
      process: "Rawmat",
      version: "V10.24.10:31",
      progress: 50,
      lastModified: "Today, 14:31",
      avatarUrl: "https://example.com/avatar4.jpg",
    },
  ];

  const getRowClassName = (record: ProcessRecord) => {
    return record.status === "Unavailable" ? "bg-gray-200" : "";
  };

  return (
    <div className="mx-4 my-5 lg:mx-4 md:mx-3 sm:mx-2">
      <Title level={4} className="text-2xl md:text-xl sm:text-lg">
        Processes
      </Title>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4 mt-7">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
          <span className="text-gray-700 text-base sm:text-sm whitespace-nowrap">
            Pilih tanggal:
          </span>
          <DatePicker
            value={selectedDate}
            onChange={(date) => {
              if (date) setSelectedDate(date);
            }}
            defaultValue={null}
            format="dddd, DD MMMM YYYY"
            className="boldDatePicker w-full sm:w-auto"
          />
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <Button
            type="primary"
            className="flex-1 lg:flex-none lg:w-auto h-11 text-20 sm:text-base rounded-md font-semibold"
            onClick={handleresyncdata}
            loading={loading}>
            Re-fetch Data
          </Button>
          <Button
            type="primary"
            className="flex-1 lg:flex-none bg-danger lg:w-auto h-11 text-20 sm:text-base rounded-md font-semibold">
            Reset all
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
        <Table
          columns={columns}
          dataSource={data}
          pagination={false}
          rowClassName={getRowClassName}
          scroll={{ x: 1000 }}
          className="responsive-table"
        />
      </div>
      {/* <div className="mt-11">
        <div className="flex justify-between items-center mb-4">
          <Title level={4}>Daily Report</Title>
          <Button
            type="primary"
            className="w-auto h-11 text-xl rounded-md bg-neutral-400 font-semibold">
            Generate report
          </Button>
        </div>
        <div className="bg-neutral-200 rounded-xl flex justify-center items-center h-56">
          <span className="text-gray-400 text-2xl font-normal">
            Please finish all your processes above!
          </span>
        </div>
      </div> */}
    </div>
  );
};

export default ProcessesPage;

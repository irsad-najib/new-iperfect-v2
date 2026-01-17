"use client";

import React from "react";
import {
  DatePicker,
  Button,
  Table,
  Progress,
  Space,
  Avatar,
  Tooltip,
  Breadcrumb,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { AiOutlineCheck } from "react-icons/ai";
import {
  MdOutlineStickyNote2,
  MdUndo,
  MdRestartAlt,
  MdArrowForwardIos,
  MdSettings,
} from "react-icons/md";
import { useRouter } from "next/navigation";
import { useDateContext } from "@/context/DateContext";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import Link from "next/link";

interface ProcessRecord {
  key: string;
  status: string;
  process: string;
  version: string;
  progress: number;
  lastModified: string;
  avatarUrl: string;
}

// Optimasi: Extract color logic untuk mengurangi re-calculation
const getProgressColor = (progress: number) => {
  return progress < 100 ? "#F47920" : "#1268B3";
};

const TieInPage: React.FC = () => {
  useRequireAuth();

  const { selectedDate, setSelectedDate } = useDateContext();
  const router = useRouter();

  // Optimasi: Ekstrak status rendering ke komponen terpisah untuk menghindari inline logic
  const StatusCell: React.FC<{ status: string; recordKey: string }> = ({
    status,
    recordKey,
  }) => {
    const baseContainerClasses = "flex items-center ml-[29px]";
    const baseCircleClasses =
      "w-9 h-9 rounded-full flex justify-center items-center mr-3";
    const textClasses = "text-[20.16px] font-normal";

    switch (status) {
      case "Done":
        return (
          <div className={baseContainerClasses}>
            <div className={`${baseCircleClasses} bg-primary-300`}>
              <AiOutlineCheck color="#F3F4F8" size={24} />
            </div>
            <span className={textClasses}>Done</span>
          </div>
        );
      case "In Progress":
        return (
          <div className={baseContainerClasses}>
            <div
              className={`${baseCircleClasses} bg-[#F3F4F8] text-[#F47920] text-[20.16px] font-semibold`}>
              {recordKey}
            </div>
            <span className={textClasses}>In Progress</span>
          </div>
        );
      case "Unavailable":
        return (
          <div className={baseContainerClasses}>
            <div
              className={`${baseCircleClasses} bg-[#EEEFF1] text-[#B3B5BD] text-[20.16px] font-semibold border-2 border-[#B3B5BD]`}>
              {recordKey}
            </div>
            <span className="text-[20.16px] text-[#B3B5BD]">Unavailable</span>
          </div>
        );
      default:
        return <span>{status}</span>;
    }
  };

  // Optimasi: Memoize columns untuk menghindari re-creation
  const columns: ColumnsType<ProcessRecord> = React.useMemo(
    () => [
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status: string, record: ProcessRecord) => (
          <StatusCell status={status} recordKey={record.key} />
        ),
      },
      {
        title: "Tie in Processes",
        dataIndex: "process",
        key: "process",
        align: "center" as const,
        render: (process: string, record: ProcessRecord) => (
          <div className="flex flex-col">
            <span
              className={`text-[20.16px] font-normal ${
                record.status === "Unavailable"
                  ? "text-[#B3B5BD]"
                  : "text-[#13162A]"
              }`}>
              {process}
            </span>
            <span className="text-[9.72px] text-[#B3B5BD] font-normal">
              Version: {record.version}
            </span>
          </div>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        render: (_: unknown, record: ProcessRecord) => {
          const isUnavailable = record.status === "Unavailable";
          // Optimasi: Extract navigation logic
          const handleDetailClick = () => {
            if (record.process === "Kapasitas dan Kebutuhan Ekspor - Impor") {
              router.push("/processes/tie-in/ekspor-impor-before-tie-in");
            } else if (record.process === "Distribusi Ekspor dan Impor") {
              router.push("/processes/tie-in/distribusi-ekspor-impor");
            } else if (record.process === "Generate Matrix") {
              router.push("/processes/tie-in/generate-matrix");
            }
          };

          // Base button classes untuk consistency
          const buttonBaseClasses =
            "flex items-center justify-center h-12 w-12 p-3 rounded-lg border transition-colors";
          const buttonActiveClasses = "border-gray-200 hover:border-gray-300";
          const buttonInactiveClasses =
            "bg-gray-200 text-neutral-500 cursor-not-allowed";

          return (
            <Space size="middle" className="flex justify-center gap-1.5">
              <Tooltip title="View logs" placement="bottom" color="#F47920">
                <Button
                  className={`${buttonBaseClasses} ${
                    isUnavailable ? buttonInactiveClasses : buttonActiveClasses
                  }`}>
                  <MdOutlineStickyNote2 size={28} />
                </Button>
              </Tooltip>

              <Tooltip title="Undo version" placement="bottom" color="#F47920">
                <Button
                  className={`${buttonBaseClasses} ${
                    isUnavailable ? buttonInactiveClasses : buttonActiveClasses
                  }`}>
                  <MdUndo size={28} />
                </Button>
              </Tooltip>

              <Tooltip title="Reset" placement="bottom" color="#F47920">
                <Button
                  className={`${buttonBaseClasses} ${
                    isUnavailable ? buttonInactiveClasses : buttonActiveClasses
                  }`}>
                  <MdRestartAlt size={28} />
                </Button>
              </Tooltip>

              <Tooltip title="Detail" placement="bottom" color="#F47920">
                <Button
                  className={`${buttonBaseClasses} ${
                    isUnavailable ? buttonInactiveClasses : buttonActiveClasses
                  }`}
                  onClick={handleDetailClick}>
                  <MdArrowForwardIos size={28} />
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
        render: (progress: number, record: ProcessRecord) => {
          if (record.status === "Unavailable") {
            return null;
          }
          return (
            <div className="flex justify-center items-center">
              <Progress
                percent={progress}
                strokeColor={getProgressColor(progress)}
                trailColor="#F3F4F8"
                format={(percent) => `${percent}%`}
                status="normal"
                className="[&_.ant-progress]:w-[175px] [&_.ant-progress-outer]:w-full! [&_.ant-progress-inner]:w-full! [&_.ant-progress-text]:text-sm! [&_.ant-progress-text]:font-semibold! [&_.ant-progress-text]:ml-1.5 [&_.ant-progress-text]:shrink-0"
              />
            </div>
          );
        },
      },
      {
        title: "Last Modified",
        dataIndex: "lastModified",
        key: "lastModified",
        align: "center" as const,
        render: (lastModified: string, record: ProcessRecord) => {
          if (record.status === "Unavailable") {
            return null;
          }
          return (
            <div className="flex items-center justify-center gap-[7px]">
              <Avatar src={"/images/avatar.png"} size={28} />
              <span className="text-[20.16px] text-[#333]">{lastModified}</span>
            </div>
          );
        },
      },
    ],
    [router]
  );

  // Static data - bisa dipindahkan ke file terpisah atau fetch dari API
  const data: ProcessRecord[] = [
    {
      key: "1",
      status: "Done",
      process: "Kapasitas dan Kebutuhan Ekspor - Impor",
      version: "V10.24.10:31",
      progress: 100,
      lastModified: "14/11/24, 14:31",
      avatarUrl: "https://example.com/avatar1.jpg",
    },
    {
      key: "2",
      status: "Done",
      process: "Distribusi Ekspor dan Impor",
      version: "V10.24.10:31",
      progress: 100,
      lastModified: "14/11/24, 14:31",
      avatarUrl: "https://example.com/avatar3.jpg",
    },
    {
      key: "3",
      status: "In Progress",
      process: "Generate Matrix",
      version: "V10.24.10:31",
      progress: 50,
      lastModified: "Today, 14:31",
      avatarUrl: "https://example.com/avatar3.jpg",
    },
  ];

  // Optimasi: Extract row class logic
  const getRowClassName = (record: ProcessRecord) => {
    return record.status === "Unavailable"
      ? "bg-[#EEEFF1] hover:bg-[#E8E8ED]"
      : "";
  };

  return (
    <div className="p-4 px-5">
      {/* Breadcrumb Section */}
      <Breadcrumb
        separator={<MdArrowForwardIos size={16} />}
        items={[
          {
            title: (
              <Link
                href="/processes"
                className="text-[#B3B5BD] hover:text-[#B3B5BD] transition-colors">
                <span className="text-2xl font-semibold">Processes</span>
              </Link>
            ),
          },
          {
            title: (
              <span className="text-[#101223] text-2xl font-semibold">
                Tie in
              </span>
            ),
          },
        ]}
        className="[&_.ant-breadcrumb-separator]:mx-1.5 [&_.ant-breadcrumb-separator]:flex [&_.ant-breadcrumb-separator]:items-center"
      />

      {/* Date and Action Buttons Section */}
      <div className="flex justify-between items-center mb-[18px] mt-7">
        <div>
          <DatePicker
            disabled
            value={selectedDate}
            onChange={(date) => {
              if (date) setSelectedDate(date);
            }}
            defaultValue={null}
            format="dddd, DD MMMM YYYY"
            className="[&_.ant-picker-input>input]:font-semibold"
          />
        </div>
        <div className="flex gap-3">
          <Button
            type="primary"
            className="bg-primary-300 hover:bg-primary-500! border-0 h-11 text-20 rounded-lg font-semibold flex items-center gap-2"
            onClick={() => router.push("/processes/tie-in/tiein-config")}>
            <MdSettings size={28} />
            Set tie in config
          </Button>
          <Button
            type="primary"
            className="bg-danger hover:bg-[#c70200]! border-0 h-11 text-20 rounded-lg font-semibold flex items-center gap-2">
            <MdRestartAlt size={28} />
            Reset all
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        rowClassName={getRowClassName}
        className="
          [&_.ant-table-thead>tr>th]:bg-neutral-250 
          [&_.ant-table-thead>tr>th]:text-center 
          [&_.ant-table-thead>tr>th]:text-[20.16px] 
          [&_.ant-table-thead>tr>th]:font-semibold
          [&_.ant-table-thead>tr>th::before]:hidden!
          [&_.ant-table-tbody>tr>td]:text-center
          [&_.ant-table-cell]:py-4! 
          [&_.ant-table-cell]:px-2!
        "
      />
    </div>
  );
};

export default TieInPage;

"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  DatePicker,
  Button,
  Table,
  Tooltip,
  Progress,
  Avatar,
  Modal,
} from "antd";
import {
  MdArrowForwardIos,
  MdOutlineStickyNote2,
  MdRestartAlt,
} from "react-icons/md";
import Link from "next/link";
import { useDateContext } from "@/context/DateContext";
import type { ColumnsType } from "antd/es/table";
import { AiOutlineCheck } from "react-icons/ai";
import dayjs from "dayjs";

interface ProcessRecord {
  key: string;
  status: string;
  process: string;
  progress: number;
  lastModified: string;
  avatarUrl: string;
}
const getProgressColor = (progress: number) => {
  if (progress < 100) return "#F47920";
  return "#1268B3";
};

const BbPage: React.FC = () => {
  const router = useRouter();
  const [active] = useState("");
  const { selectedDate, setSelectedDate } = useDateContext();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [confirModal, setConfirModal] = useState(false);

  // const routes = {
  //   "Amonia & Urea": "amonia-urea",
  //   NPK: "npk",
  //   Batubara: "batubara",
  // };

  // Reverse routes untuk mapping dari slug ke display name
  // const reverseRoutes = Object.fromEntries(
  //   Object.entries(routes).map(([key, value]) => [value, key])
  // );

  // Set active berdasarkan slug saat component mount
  useEffect(() => {
    const storedDate = localStorage.getItem("selectedDate");
    if (storedDate && setSelectedDate) setSelectedDate(dayjs(storedDate));
    {
    }
  }, [setSelectedDate]);

  // const menu = (
  //   <Menu
  //     onClick={(e) => {
  //       const selectedItem = e.key;
  //       setActive(selectedItem);
  //       router.push(
  //         `/daily-routines/${routes[selectedItem as keyof typeof routes]}`
  //       );
  //     }}
  //     items={[
  //       { key: "Amonia & Urea", label: "Amonia & Urea" },
  //       { key: "NPK", label: "NPK" },
  //       { key: "Batubara", label: "Batubara" },
  //     ]}
  //   />
  // );

  // Data status untuk setiap item
  // const statusData = [
  //   { name: "Item 1", status: "Done", process: "Process A" },
  //   { name: "Item 2", status: "In Progress", process: "Process B" },
  //   { name: "Item 3", status: "Unavailable", process: "Process C" },
  // ];

  const data: ProcessRecord[] = [
    {
      key: "1",
      status: "In Progress",
      process: "Counter Check Data DCS",
      progress: 50,
      lastModified: "14/11/24, 14:31",
      avatarUrl: "https://example.com/avatar1.jpg",
    },
    {
      key: "2",
      status: "In Progress",
      process: "Harga Gas, PO BB, dan CoA",
      progress: 50,
      lastModified: "14/11/24, 14:31",
      avatarUrl: "https://example.com/avatar2.jpg",
    },
    {
      key: "3",
      status: "In Progress",
      process: "Konsumsi Batubara dan Produksi Steam",
      progress: 50,
      lastModified: "21/03/25, 14:31",
      avatarUrl: "https://example.com/avatar3.jpg",
    },
    {
      key: "4",
      status: "In Progress",
      process: "RawMat",
      progress: 50,
      lastModified: "21/03/25, 14:31",
      avatarUrl: "https://example.com/avatar3.jpg",
    },
    {
      key: "5",
      status: "In Progress",
      process: "Konversi Coal-NG",
      progress: 50,
      lastModified: "21/03/25, 14:31",
      avatarUrl: "https://example.com/avatar3.jpg",
    },
    {
      key: "6",
      status: "In Progress",
      process: "Daily Summary",
      progress: 50,
      lastModified: "21/03/25, 14:31",
      avatarUrl: "https://example.com/avatar3.jpg",
    },
  ];

  const getRowClassName = (record: ProcessRecord) => {
    return record.status === "Unavailable" ? "bg-gray-200" : "";
  };

  // table colum
  const columns: ColumnsType<ProcessRecord> = [
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 264,
      render: (status: string, record: ProcessRecord) => {
        const wrapperClassName = "flex items-center ml-[29px]";
        const circleBaseClassName =
          "w-9 h-9 rounded-full flex items-center justify-center mr-3 text-20 font-semibold";
        const labelClassName = "text-20 font-normal";

        switch (status) {
          case "Done":
            return (
              <div className={wrapperClassName}>
                <div
                  className={`${circleBaseClassName} bg-primary-300 text-[#F3F4F8]`}>
                  <AiOutlineCheck color="#F3F4F8" size={24} />
                </div>
                <span className={labelClassName}>Done</span>
              </div>
            );
          case "In Progress":
            return (
              <div className={wrapperClassName}>
                <div
                  className={`${circleBaseClassName} bg-[#F3F4F8] text-[#F47920]`}>
                  {record.key}
                </div>
                <span className={labelClassName}>In Progress</span>
              </div>
            );
          case "Unavailable":
            return (
              <div className={wrapperClassName}>
                <div
                  className={`${circleBaseClassName} bg-[#EEEFF1] text-neutral-300 border-2 border-neutral-300`}>
                  {record.key}
                </div>
                <span className="text-20 font-normal text-neutral-300">
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
      width: 330,
      render: (process: string, record: ProcessRecord) => (
        <div className="flex flex-col max-w-[330px]">
          <span
            className={`text-20 font-normal ${
              record.status === "Unavailable"
                ? "text-neutral-300"
                : "text-neutral-900"
            }`}>
            {process}
          </span>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: ProcessRecord) => {
        return (
          <div className="flex justify-center gap-1.5">
            <Tooltip title="Reset" placement="bottom" color="#F47920">
              <Button
                className={`actionButton ${
                  record.status === "Unavailable" ? "inactive" : ""
                }`}>
                <MdRestartAlt size={28} />
              </Button>
            </Tooltip>

            <Tooltip title="View logs" placement="bottom" color="#F47920">
              <Button
                className={`actionButton ${
                  record.status === "Unavailable" ? "inactive" : ""
                }`}>
                <MdOutlineStickyNote2 size={28} />
              </Button>
            </Tooltip>

            <Tooltip title="Detail" placement="bottom" color="#F47920">
              <Button
                className={`actionButton ${
                  record.status === "Unavailable" ? "inactive" : ""
                }`}
                onClick={() => {
                  if (record.key === "1") {
                    router.push("/bb/counter-check");
                  } else if (record.key === "2") {
                    router.push("/bb/harga");
                  } else if (record.key === "3") {
                    router.push("/bb/konsumsi");
                  } else if (record.key === "4") {
                    router.push("/bb/rawmat");
                  } else if (record.key === "5") {
                    router.push("/bb/konversi");
                  } else if (record.key === "6") {
                    router.push("/bb/summary");
                  }
                }}>
                <MdArrowForwardIos size={28} />
              </Button>
            </Tooltip>
          </div>
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
          return null; // or return null if you want it empty
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
      render: (lastModified: string, record: ProcessRecord) => {
        if (record.status === "Unavailable") {
          return null; // or return null if you want it empty
        }
        return (
          <div className="flex items-center justify-center gap-2">
            <Avatar src={"/images/avatar.png"} size={28} />
            <span className="text-20 sm:text-base text-gray-900 whitespace-nowrap">
              {lastModified}
            </span>
          </div>
        );
      },
    },
  ];

  const handleResetAll = () => {
    setIsResetModalOpen(true);
  };

  const handleResetConfirm = () => {
    // Logic untuk reset semua data
    console.log("Resetting all data...");
    setIsResetModalOpen(false);
    // Add your reset logic here

    setConfirModal(true);
  };

  const handleResetCancel = () => {
    setIsResetModalOpen(false);
    setConfirModal(false);
  };

  const handleSuccessModalOk = () => {
    setConfirModal(false);
    // Add any additional logic after success confirmation
  };

  return (
    <div>
      <div className="p-5">
        <Breadcrumb
          separator={<MdArrowForwardIos size={16} />}
          items={[
            {
              title: (
                <Link
                  href="/bb"
                  className="text-neutral-300 hover:text-neutral-900 transition-colors">
                  <span className="text-2xl font-semibold">
                    Boiler Batubara
                  </span>
                </Link>
              ),
            },
          ]}
          className="[&_.ant-breadcrumb-separator]:mx-1.5 [&_.ant-breadcrumb-separator]:flex [&_.ant-breadcrumb-separator]:items-center"
        />

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
          <Button
            type="primary"
            className="bg-danger hover:bg-danger! border-0 h-11 text-20 rounded-lg font-semibold flex items-center gap-2"
            onClick={handleResetAll}>
            <MdRestartAlt size={28} />
            Reset all
          </Button>
        </div>
      </div>

      {/* modal1 */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <AiOutlineCheck size={24} className="text-primary-300" />
            <span className="text-20 font-semibold text-primary-300">
              Reset Successful
            </span>
          </div>
        }
        open={isResetModalOpen}
        onOk={handleResetConfirm}
        onCancel={handleResetCancel}
        okText="Continue"
        cancelButtonProps={{ className: "hidden" }}
        width={480}
        okButtonProps={{
          className:
            "bg-primary-300 hover:bg-primary-500! border-primary-300 h-10 text-16 font-semibold",
        }}>
        <div className="py-5">
          <p className="text-16 mb-4 text-neutral-900">
            All data for <strong>{active}</strong> has been successfully reset!
          </p>
          <p className="text-14 text-neutral-500 mb-0">
            All processes have been returned to their initial state and are
            ready for new data entry.
          </p>
        </div>
      </Modal>

      {/* modal 2 */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <AiOutlineCheck size={24} className="text-primary-300" />
            <span className="text-20 font-semibold text-primary-300">
              Reset Successful
            </span>
          </div>
        }
        open={confirModal}
        onOk={handleSuccessModalOk}
        onCancel={handleResetCancel}
        okText="Continue"
        cancelButtonProps={{ className: "hidden" }}
        width={480}
        okButtonProps={{
          className:
            "bg-primary-300 hover:bg-primary-500! border-primary-300 h-10 text-16 font-semibold",
        }}>
        <div className="py-5">
          <p className="text-16 mb-4 text-neutral-900">
            All data for <strong>{active}</strong> has been successfully reset!
          </p>
          <p className="text-14 text-neutral-500 mb-0">
            All processes have been returned to their initial state and are
            ready for new data entry.
          </p>
        </div>
      </Modal>

      <h1 className="text-[21px] font-semibold text-neutral-900">
        Pra-Stock Opname
      </h1>
      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        rowClassName={getRowClassName}
        className="
          [&_.ant-table-thead>tr>th]:!bg-[#e6e6e6]
          [&_.ant-table-thead>tr>th]:!py-3
          [&_.ant-table-thead>tr>th]:!px-0
          [&_.ant-table-thead>tr>th]:!text-center
          [&_.ant-table-thead>tr>th]:text-[20.16px]
          [&_.ant-table-thead>tr>th]:font-semibold
          [&_.ant-table-tbody>tr>td]:!text-center
        "
      />
    </div>
  );
};

export default BbPage;

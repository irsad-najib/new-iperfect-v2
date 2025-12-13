"use client";

import React, { useEffect, useState } from "react";
import { Table, Button, Avatar, Tooltip, Spin } from "antd";
import {
  MdPlayArrow,
  MdOutlineStickyNote2,
  MdError,
  MdRestartAlt,
} from "react-icons/md";
import {
  AiOutlineSetting,
  AiOutlineFolderView,
  AiOutlineLoading3Quarters,
} from "react-icons/ai";
import { HiCheckCircle } from "react-icons/hi";
import { useDateContext } from "@/context/DateContext";
import { useRouter } from "next/navigation";
import api from "@/utils/axios";
import LogsModal from "./LogsModal";

interface TableItem {
  _id: string;
  bagian_id: number;
  name: string;
  pabrik_id: number;
  pabrik_name: string;
  isActive?: boolean;
  lastRun?: string;
  lastDuration?: string;
  status?: string;
  version?: string;
  user_profile_picture?: string;
}

interface Lab {
  _id: string;
  lab_id: number;
  name: string;
  pabrik_id: number;
  bagian_id: number;
  jenis_lab_id: number;
  pabrik_name: string;
}

interface RunResponse {
  message: string;
  job_id: string;
}

interface CleansingTableProps {
  activeTab: string;
  data: TableItem[];
  labData: Lab[];
  onJobComplete?: (jobId: string) => void;
  getPartsForActiveFactory: () => TableItem[];
  activePart: string;
  setActivePart: (part: string) => void;
  isLabLoading: boolean;
  loadingStates: { [key: string]: boolean };
}

const CleansingTable: React.FC<CleansingTableProps> = ({
  activeTab,
  data,
  labData,
  getPartsForActiveFactory,
  activePart,
  setActivePart,
  isLabLoading,
  loadingStates,
}) => {
  const { formattedDate } = useDateContext();
  const [tableData, setTableData] = useState<TableItem[]>([]);
  const [runningJobs, setRunningJobs] = useState<{
    [key: number]: string;
  }>({});
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TableItem | null>(null);
  const router = useRouter();

  useEffect(() => {
    const filteredData = data.filter(
      (item) => item.pabrik_id.toString() === activeTab
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTableData(filteredData);
  }, [activeTab, data]);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === "undefined") return;

    const handleJobComplete = (event: CustomEvent<string>) => {
      const jobId = event.detail;

      // Clean up the runningJobs mapping
      setRunningJobs((prev) => {
        const newJobs = { ...prev };
        // Find and remove the bagian_id that maps to this job_id
        Object.entries(newJobs).forEach(([bagianId, currentJobId]) => {
          if (currentJobId === jobId) {
            delete newJobs[Number(bagianId)];
          }
        });
        return newJobs;
      });
    };

    const handleUpdateRunningJobs = (
      event: CustomEvent<{ jobs: Record<number, string> }>
    ) => {
      const { jobs } = event.detail;
      setRunningJobs((prev) => ({
        ...prev,
        ...jobs,
      }));
    };

    const tableRef = document.querySelector("table");
    if (tableRef) {
      tableRef.addEventListener(
        "jobComplete",
        handleJobComplete as EventListener
      );

      tableRef.addEventListener(
        "updateRunningJobs",
        handleUpdateRunningJobs as EventListener
      );
    }

    return () => {
      if (tableRef) {
        tableRef.removeEventListener(
          "jobComplete",
          handleJobComplete as EventListener
        );

        tableRef.removeEventListener(
          "updateRunningJobs",
          handleUpdateRunningJobs as EventListener
        );
      }
    };
  }, []);

  const handleRun = async (bagian_id: number) => {
    try {
      // Set loading state for this specific part
      const tableRef =
        typeof window !== "undefined" ? document.querySelector("table") : null;
      if (tableRef) {
        const event = new CustomEvent("setPartLoading", {
          detail: { bagianId: bagian_id, isLoading: true },
          bubbles: true,
          composed: true,
        });
        tableRef.dispatchEvent(event);
      }

      const dailyRunnerResponse = await api.get(
        `/daily_runner/get-by-args?tanggal=${formattedDate}&tipe=cleaning&bagian_id=${bagian_id}`
      );

      if (!dailyRunnerResponse.data || !dailyRunnerResponse.data._id) {
        console.error("No daily runner found for this part");

        // Clear loading state if no daily runner found
        if (tableRef) {
          const event = new CustomEvent("setPartLoading", {
            detail: { bagianId: bagian_id, isLoading: false },
          });
          tableRef.dispatchEvent(event);
        }
        return;
      }

      const dailyRunnerId = dailyRunnerResponse.data._id;
      const runResponse = await api.post<RunResponse>(
        "/daily_runner/execute/cleaning",
        {
          daily_runner_id: dailyRunnerId,
        }
      );

      const jobId = runResponse.data.job_id;

      // Store the job ID in runningJobs
      setRunningJobs((prev) => ({ ...prev, [bagian_id]: jobId }));

      // Dispatch an event to update the loading state in the parent component
      if (tableRef) {
        const event = new CustomEvent("registerJob", {
          detail: { bagianId: bagian_id, jobId: jobId },
        });
        tableRef.dispatchEvent(event);
      }
    } catch (error) {
      console.error("Error running cleansing:", error);

      // Clear loading state on error
      const tableRef =
        typeof window !== "undefined" ? document.querySelector("table") : null;
      if (tableRef) {
        const event = new CustomEvent("setPartLoading", {
          detail: { bagianId: bagian_id, isLoading: false },
        });
        tableRef.dispatchEvent(event);
      }
    }
  };

  const handleViewClick = (record: TableItem) => {
    router.push(
      `/processes/cleansing/${record.pabrik_id}/${record.bagian_id}/view?factory=${record.pabrik_name}&part=${record.name}`
    );
  };

  const handleLabViewClick = (record: Lab) => {
    router.push(
      `/processes/cleansing/${record.pabrik_id}/${record.lab_id}/view?factory=${record.pabrik_name}&part=${record.name}`
    );
  };

  const handleLogsClick = (record: TableItem) => {
    setSelectedItem(record);
    setIsLogsModalOpen(true);
  };

  const isPartLoading = (record: TableItem) => {
    // Check if there's a running job for this part
    const jobId = runningJobs[record.bagian_id];
    if (jobId && loadingStates[jobId]) {
      console.log(`Part ${record.bagian_id} is loading via job ${jobId}`);
      return true;
    }

    // Also check if there's a loading state directly for this part's bagian_id
    const isLoading = loadingStates[record.bagian_id.toString()];
    if (isLoading) {
      console.log(`Part ${record.bagian_id} is loading directly`);
    }
    return isLoading;
  };

  const columns = [
    {
      title: "Item",
      dataIndex: "name",
      key: "name",
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
      render: (text: string, record: TableItem) => (
        <div className="flex items-center gap-4 text-20">
          {/* <Switch
            className="customSwitch"
            checked={record.isActive}
            onChange={(checked) => {
              setTableData((prevData) =>
                prevData.map((item) =>
                  item._id === record._id
                    ? { ...item, isActive: checked }
                    : item
                )
              );
            }}
          /> */}
          <div className="flex-1 flex flex-col items-center text-center">
            <span>{text}</span>
            <span className="text-neutral-300 text-10">{record.version}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 450,
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
      render: (record: TableItem) => (
        <div className="flex gap-2 justify-center">
          <Tooltip title="Run item" placement="bottom" color="#F47920">
            <Button
              onClick={() => handleRun(record.bagian_id)}
              className={`actionButton ${!record.isActive ? "inactive" : ""}`}
              icon={
                isPartLoading(record) ? (
                  <AiOutlineLoading3Quarters
                    color="#F47920"
                    size={20}
                    className="animate-spin"
                  />
                ) : (
                  <MdPlayArrow size={28} />
                )
              }
            />
          </Tooltip>
          <Tooltip title="Reset item" placement="bottom" color="#F47920">
            <Button
              onClick={() => handleRun(record.bagian_id)}
              className={`actionButton ${!record.isActive ? "inactive" : ""}`}
              icon={<MdRestartAlt size={28} />}
            />
          </Tooltip>
          <Tooltip title="Config" placement="bottom" color="#F47920">
            <Button
              onClick={() => {
                router.push(
                  `/processes/cleansing/${record.pabrik_id}/${record.bagian_id}/config?factoryName=${record.pabrik_name}&partName=${record.name}`
                );
              }}
              className={`actionButton ${!record.isActive ? "inactive" : ""}`}
              icon={<AiOutlineSetting size={28} />}
            />
          </Tooltip>
          <Tooltip title="View result" placement="bottom" color="#F47920">
            <Button
              onClick={() => handleViewClick(record)}
              className={`actionButton ${!record.isActive ? "inactive" : ""}`}
              icon={<AiOutlineFolderView size={28} />}
            />
          </Tooltip>
          <Tooltip title="View logs" placement="bottom" color="#F47920">
            <Button
              onClick={() => handleLogsClick(record)}
              className={`actionButton ${!record.isActive ? "inactive" : ""}`}
              icon={<MdOutlineStickyNote2 size={28} />}
            />
          </Tooltip>
        </div>
      ),
    },
    {
      title: "Last Run",
      dataIndex: "lastRun",
      key: "lastRun",
      width: 300,
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
      render: (text: string, record: TableItem) => (
        <div className="flex items-center justify-center gap-2">
          {record.status !== "not-executed" && (
            <Avatar src={record.user_profile_picture} size={28} />
          )}
          <span className="text-20">{text}</span>
          {record.status &&
            record.status !== "not-executed" &&
            (record.status === "completed" ? (
              <HiCheckCircle size={28} color="#1268B3" />
            ) : (
              <MdError size={28} color="#E20301" />
            ))}
        </div>
      ),
    },
    {
      title: "Last Duration",
      dataIndex: "lastDuration",
      key: "lastDuration",
      width: 300,
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
      render: (text: string) => (
        <div className="text-center text-20 font-semibold">{text}</div>
      ),
    },
  ];

  const labColumns = [
    {
      title: "Item",
      dataIndex: "name",
      key: "name",
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
      render: (text: string) => (
        <div className="flex items-center gap-4 text-20">
          {/* <Switch className="customSwitch" defaultChecked={true} /> */}
          <div className="flex-1 flex flex-col items-center text-center">
            <span>{text}</span>
            <span className="text-neutral-300 text-10">Version 1.0</span>
          </div>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 450,
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
      render: (record: Lab) => (
        <div className="flex gap-2 justify-center">
          <Tooltip title="View result" placement="bottom" color="#F47920">
            <Button
              onClick={() => handleLabViewClick(record)}
              className="actionButton"
              icon={<AiOutlineFolderView size={28} />}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={false}
        className="customTable"
        rowClassName={(record) =>
          !record.isActive
            ? "!bg-neutral-100 !text-neutral-300 [&:hover_td]:!bg-neutral-100"
            : ""
        }
      />

      <div className="mt-6">
        <h2 className="text-20 mb-4">Lab Processes</h2>
        <div className="flex gap-3 flex-wrap mb-5 flex-1">
          {getPartsForActiveFactory().map((part) => (
            <Button
              key={part._id}
              className={`flex-1 text-neutral-900 lg:flex-none lg:w-auto h-9 text-16 sm:text-base rounded-md ${
                activePart === part.name ? "bg-orange-500 text-white" : ""
              }`}
              onClick={() => setActivePart(part.name)}>
              {part.name}
            </Button>
          ))}
        </div>
        {isLabLoading ? (
          <div className="flex justify-center items-center h-[50vh] flex-col gap-4">
            <Spin size="large" />
            <p className="text-base text-neutral-500 m-0">Loading...</p>
          </div>
        ) : (
          <Table
            columns={labColumns}
            dataSource={labData}
            pagination={false}
            className="customTable"
          />
        )}
      </div>

      {selectedItem && (
        <LogsModal
          isOpen={isLogsModalOpen}
          onClose={() => setIsLogsModalOpen(false)}
          bagianId={selectedItem.bagian_id}
          pabrikId={selectedItem.pabrik_id}
          jobId={runningJobs[selectedItem.bagian_id]}
          partName={selectedItem.name}
          pabrikName={selectedItem.pabrik_name}
        />
      )}
    </>
  );
};

export default CleansingTable;

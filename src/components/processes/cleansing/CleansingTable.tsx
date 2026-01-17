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
import LogsModal from "../LogsModal";
import { Part, Lab } from "@/types";

/**
 * Displays the list of cleansing parts and coordinating lab processes with per-item run actions.
 * Supports both callback props and legacy DOM events to keep parent loading state in sync.
 */

interface TableItem extends Part {
  isActive?: boolean;
  lastRun?: string;
  lastDuration?: string;
  version?: string;
  user_profile_picture?: string;
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
  onSetPartLoading?: (bagianId: number, isLoading: boolean) => void;
  onRegisterJobs?: (jobs: Record<number, string>, bagianIds: number[]) => void;
  runningJobs?: Record<number, string>;
}

const CleansingTable: React.FC<CleansingTableProps> = (props) => {
  const {
    activeTab,
    data,
    labData,
    getPartsForActiveFactory,
    activePart,
    setActivePart,
    isLabLoading,
    loadingStates,
    onSetPartLoading,
    onRegisterJobs,
    runningJobs: externalRunningJobs,
  } = props;
  const { formattedDate } = useDateContext();
  const [tableData, setTableData] = useState<TableItem[]>([]);
  const [internalRunningJobs, setInternalRunningJobs] = useState<
    Record<number, string>
  >({});
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TableItem | null>(null);
  const router = useRouter();
  const headerCellClass =
    "font-semibold text-center text-[20.16px] leading-[20.16px] bg-neutral-250";

  const setPartLoadingHandler = onSetPartLoading ?? (() => undefined);
  const registerJobsHandler = onRegisterJobs ?? (() => undefined);
  const runningJobs = externalRunningJobs ?? internalRunningJobs;

  useEffect(() => {
    const filteredData = data.filter(
      (item) => item.pabrik_id.toString() === activeTab
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTableData(filteredData);
  }, [activeTab, data]);

  useEffect(() => {
    if (externalRunningJobs !== undefined || typeof window === "undefined") {
      return;
    }

    const handleJobComplete = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const jobId = customEvent.detail;
      setInternalRunningJobs((prev) => {
        const updated: Record<number, string> = {};
        Object.entries(prev).forEach(([bagianId, currentJobId]) => {
          if (currentJobId !== jobId) {
            updated[Number(bagianId)] = currentJobId;
          }
        });
        return updated;
      });
    };

    const handleUpdateRunningJobs = (event: Event) => {
      const customEvent = event as CustomEvent<{
        jobs: Record<number, string>;
      }>;
      const { jobs } = customEvent.detail;
      setInternalRunningJobs((prev) => ({
        ...prev,
        ...jobs,
      }));
    };

    const tableRef = document.querySelector("table");

    if (!tableRef) {
      return;
    }

    tableRef.addEventListener(
      "jobComplete",
      handleJobComplete as EventListener
    );
    tableRef.addEventListener(
      "updateRunningJobs",
      handleUpdateRunningJobs as EventListener
    );

    return () => {
      tableRef.removeEventListener(
        "jobComplete",
        handleJobComplete as EventListener
      );
      tableRef.removeEventListener(
        "updateRunningJobs",
        handleUpdateRunningJobs as EventListener
      );
    };
  }, [externalRunningJobs]);

  /**
   * Trigger cleansing execution for a single part and notify the parent about loading state changes.
   */
  const handleRun = async (bagian_id: number) => {
    try {
      const tableRef =
        typeof window !== "undefined" ? document.querySelector("table") : null;

      // Set loading state for this specific part
      setPartLoadingHandler(bagian_id, true);
      if (tableRef) {
        tableRef.dispatchEvent(
          new CustomEvent("setPartLoading", {
            detail: { bagianId: bagian_id, isLoading: true },
            bubbles: true,
            composed: true,
          })
        );
      }

      const dailyRunnerResponse = await api.get(
        `/daily_runner/get-by-args?tanggal=${formattedDate}&tipe=cleaning&bagian_id=${bagian_id}`
      );

      if (!dailyRunnerResponse.data || !dailyRunnerResponse.data._id) {
        console.error("No daily runner found for this part");

        // Clear loading state if no daily runner found
        setPartLoadingHandler(bagian_id, false);
        if (tableRef) {
          tableRef.dispatchEvent(
            new CustomEvent("setPartLoading", {
              detail: { bagianId: bagian_id, isLoading: false },
              bubbles: true,
              composed: true,
            })
          );
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

      // Inform parent about job registration to transition loading state tracking
      registerJobsHandler({ [bagian_id]: jobId }, [bagian_id]);

      if (externalRunningJobs === undefined) {
        setInternalRunningJobs((prev) => ({ ...prev, [bagian_id]: jobId }));
      }

      if (tableRef) {
        tableRef.dispatchEvent(
          new CustomEvent("registerJob", {
            detail: { bagianId: bagian_id, jobId },
            bubbles: true,
            composed: true,
          })
        );
      }
    } catch (error) {
      console.error("Error running cleansing:", error);

      // Clear loading state on error
      setPartLoadingHandler(bagian_id, false);
      const tableRef =
        typeof window !== "undefined" ? document.querySelector("table") : null;
      if (tableRef) {
        tableRef.dispatchEvent(
          new CustomEvent("setPartLoading", {
            detail: { bagianId: bagian_id, isLoading: false },
            bubbles: true,
            composed: true,
          })
        );
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
      return true;
    }

    // Also check if there's a loading state directly for this part's bagian_id
    return loadingStates[record.bagian_id.toString()];
  };

  const columns = [
    {
      title: "Item",
      dataIndex: "name",
      key: "name",
      onHeaderCell: () => ({
        className: headerCellClass,
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
        className: headerCellClass,
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
        className: headerCellClass,
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
        className: headerCellClass,
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
        className: headerCellClass,
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
        className: headerCellClass,
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

"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Breadcrumb,
  DatePicker,
  Button,
  Tabs,
  Dropdown,
  message,
  Spin,
} from "antd";
import { MdArrowForwardIos, MdPlayArrow, MdError } from "react-icons/md";
import { HiCheckCircle } from "react-icons/hi";
import Link from "next/link";
import CleansingTable from "@/components/processes/cleansing/CleansingTable";
import { useDateContext } from "@/context/DateContext";
import api from "@/utils/axios";
import axios from "axios";
import Image from "next/image";
import { HiHome } from "react-icons/hi";
import { Factory, Lab, Part, CleansingStatus } from "@/types";

type JobStatusEvent = {
  job_id: string;
  status: "completed" | "failed";
};

interface RunResponse {
  message: string;
  job_id: string[];
}

/**
 * Main page for monitoring and controlling cleansing processes across factories.
 * Fetches metadata, subscribes to job status updates, and keeps UI state in sync with child tables.
 */
const CleansingPage: React.FC = () => {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [partsData, setPartsData] = useState<Part[]>([]);
  const [labData, setLabData] = useState<Lab[]>([]);
  const [isLabLoading, setIsLabLoading] = useState(false);
  const [cleansingStatus, setCleansingStatus] = useState<CleansingStatus[]>([]);
  const [loadingStates, setLoadingStates] = useState<{
    [key: string]: boolean;
  }>({});
  const [runningJobs, setRunningJobs] = useState<Record<number, string>>({});
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const { selectedDate, formattedDate } = useDateContext();
  const [activeTab, setActiveTab] = useState("1");
  const factoriesRef = useRef<Factory[]>([]);
  const partsRef = useRef<Part[]>([]);
  const isFirstMount = useRef(true);
  const [activePart, setActivePart] = useState<string>("");

  const updatePartsLoadingState = useCallback(
    (bagianIds: number[], isLoading: boolean) => {
      setLoadingStates((prev) => {
        const next = { ...prev };
        bagianIds.forEach((id) => {
          const key = id.toString();
          if (isLoading) {
            next[key] = true;
          } else {
            delete next[key];
          }
        });
        return next;
      });
    },
    []
  );

  const setPartLoadingState = useCallback(
    (bagianId: number, isLoading: boolean) => {
      updatePartsLoadingState([bagianId], isLoading);
    },
    [updatePartsLoadingState]
  );

  const registerJobsForParts = useCallback(
    (jobs: Record<number, string>, bagianIds: number[]) => {
      const previousJobIds = bagianIds
        .map((id) => runningJobs[id])
        .filter((jobId): jobId is string => Boolean(jobId));

      setLoadingStates((prev) => {
        const next = { ...prev };
        bagianIds.forEach((id) => {
          delete next[id.toString()];
        });
        previousJobIds.forEach((jobId) => {
          delete next[jobId];
        });
        Object.values(jobs).forEach((jobId) => {
          next[jobId] = true;
        });
        return next;
      });

      setRunningJobs((prev) => {
        const next = { ...prev };
        bagianIds.forEach((id) => {
          if (!jobs[id]) {
            delete next[id];
          }
        });
        Object.entries(jobs).forEach(([bagianId, jobId]) => {
          next[Number(bagianId)] = jobId;
        });
        return next;
      });
    },
    [runningJobs]
  );

  const clearJobByJobId = useCallback((jobId: string) => {
    setLoadingStates((prev) => {
      const next = { ...prev };
      delete next[jobId];
      return next;
    });

    setRunningJobs((prev) => {
      const updatedEntries = Object.entries(prev).filter(
        ([, currentJobId]) => currentJobId !== jobId
      );

      return updatedEntries.reduce<Record<number, string>>(
        (acc, [bagianId, currentJobId]) => {
          acc[Number(bagianId)] = currentJobId;
          return acc;
        },
        {}
      );
    });
  }, []);

  // Initialize activeTab from localStorage on client-side only
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("cleansingActiveTab");
      if (savedTab) {
        setActiveTab(savedTab);
      }
    }
  }, []);

  const updatePartsData = useCallback(
    (parts: Part[], factories: Factory[], statusData: CleansingStatus[]) => {
      const updatedPartsData = parts.map((item: Part) => {
        const matchingFactory = factories.find(
          (factory: Factory) => factory.pabrik_id === item.pabrik_id
        );

        const matchingStatus = statusData.find(
          (status: CleansingStatus) =>
            status.pabrik_name === matchingFactory?.name &&
            status.bagian_name === item.name
        );

        return {
          ...item,
          key: item._id,
          pabrik_name: matchingFactory?.name || `Pabrik ${item.pabrik_id}`,
          isActive: true,
          version: "Version 1.0",
          lastRun:
            matchingStatus && matchingStatus.last_run
              ? new Date(matchingStatus.last_run * 1000).toLocaleString(
                  "en-GB",
                  {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }
                )
              : "-",
          lastDuration:
            matchingStatus && matchingStatus.time_taken !== null
              ? `${matchingStatus.time_taken} seconds`
              : "-",
          status: matchingStatus?.status || "pending",
          user_profile_picture: matchingStatus?.user_profile_picture || "",
        };
      });

      setPartsData(updatedPartsData);
    },
    []
  );

  const updateLabData = useCallback(
    (
      labs: Lab[],
      factories: Factory[]
      // Hapus parameter activeFactoryId
    ) => {
      // Jangan filter berdasarkan activeFactoryId
      // API sudah mengembalikan lab yang sesuai dengan bagian_id
      const updatedLabData = labs.map((item: Lab) => {
        const matchingFactory = factories.find(
          (factory: Factory) => factory.pabrik_id === item.pabrik_id
        );

        return {
          ...item,
          key: item._id,
          pabrik_name: matchingFactory?.name || `Pabrik ${item.pabrik_id}`,
          isActive: true,
          version: "Version 1.0",
        };
      });

      setLabData(updatedLabData);
    },
    []
  );

  /**
   * Retrieve cleansing execution status for a specific date to hydrate table metadata and badges.
   */
  const fetchCleansingStatus = useCallback(async (date: string) => {
    try {
      // Only show loading state on first mount
      if (isFirstMount.current) {
        setIsStatusLoading(true);
      }

      const response = await api.get("/utils/cleansing-status/all", {
        params: {
          tanggal: date,
        },
      });
      setCleansingStatus(response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.log(error.response.data.error);
      } else {
        console.log(error);
      }
      setCleansingStatus([]);
      return [];
    } finally {
      if (isFirstMount.current) {
        setIsStatusLoading(false);
        isFirstMount.current = false;
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Always show loading on first mount
        if (isFirstMount.current) {
          setIsStatusLoading(true);
        }

        const [factoriesResponse, partsResponse] = await Promise.all([
          api.get("/pabrik"),
          api.get("/bagian"),
        ]);

        const fetchedFactories = factoriesResponse.data;
        setFactories(fetchedFactories);
        factoriesRef.current = fetchedFactories;
        partsRef.current = partsResponse.data;

        const statusData = await fetchCleansingStatus(formattedDate);
        updatePartsData(partsResponse.data, fetchedFactories, statusData);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          console.log(error.response.data.error);
        } else {
          console.log(error);
        }
      } finally {
        if (isFirstMount.current) {
          setIsStatusLoading(false);
          isFirstMount.current = false;
        }
      }
    };

    fetchData();
  }, [formattedDate, fetchCleansingStatus, updatePartsData]);

  const fetchLabsByBagian = useCallback(
    /**
     * Fetch labs associated with the currently selected part to populate the lab table.
     */
    async (bagianId: number) => {
      setIsLabLoading(true);
      try {
        const response = await api.get(`/bagian/${bagianId}/lab`, {
          params: {
            stream: false,
          },
        });
        // Hapus parameter activeTab
        updateLabData(response.data, factories);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          console.log(error.response.data.error);
          message.error("Failed to fetch lab data");
        } else {
          console.log(error);
          message.error("An error occurred while fetching lab data");
        }
        setLabData([]);
        return [];
      } finally {
        setIsLabLoading(false);
      }
    },
    [factories, updateLabData]
  );

  useEffect(() => {
    if (factoriesRef.current.length > 0) {
      updatePartsData(partsRef.current, factoriesRef.current, cleansingStatus);
    }
  }, [cleansingStatus, updatePartsData]);

  useEffect(() => {
    if (partsData.length === 0) {
      setActivePart("");
      return;
    }

    setActivePart((currentActive) => {
      const partsForActiveTab = partsData.filter(
        (part) => part.pabrik_id.toString() === activeTab
      );

      if (partsForActiveTab.length === 0) {
        return "";
      }

      if (
        currentActive &&
        partsForActiveTab.some((part) => part.name === currentActive)
      ) {
        return currentActive;
      }

      return partsForActiveTab[0].name;
    });
  }, [partsData, activeTab]);

  useEffect(() => {
    if (!activePart || partsData.length === 0) return;

    // Filter parts berdasarkan activeTab terlebih dahulu
    // untuk memastikan kita mendapatkan part dari pabrik yang aktif
    const filteredParts = partsData.filter(
      (part) => part.pabrik_id.toString() === activeTab
    );

    // Kemudian cari part yang sesuai dengan activePart
    const activePartObj = filteredParts.find(
      (part) => part.name === activePart
    );

    if (activePartObj) {
      fetchLabsByBagian(activePartObj.bagian_id);
    } else {
      // Jika part tidak ditemukan di pabrik aktif, reset lab data
      setLabData([]);
    }
  }, [activePart, partsData, fetchLabsByBagian, activeTab]); // Tambahkan activeTab ke dependency

  const handleJobComplete = useCallback(
    (jobId: string) => {
      clearJobByJobId(jobId);
    },
    [clearJobByJobId]
  );
  useEffect(() => {
    const eventSource = new EventSource(
      "https://iperfect.479067.my.id/api/sse"
    );

    eventSource.onmessage = async (event) => {
      console.log("SSE event received:", event.data);
      const eventData: JobStatusEvent = JSON.parse(event.data);
      if (eventData.status) {
        console.log(
          `Cleansing SSE job status update: Job ${eventData.job_id} status: ${eventData.status}`
        );

        // Fetch updated status data without setting the flag
        await fetchCleansingStatus(formattedDate);

        // Clear the loading state for this specific job
        handleJobComplete(eventData.job_id);

        // Show a notification based on job status
        if (eventData.status === "completed") {
          message.success(`Job ${eventData.job_id} completed successfully`);
        } else if (eventData.status === "failed") {
          message.error(`Job ${eventData.job_id} failed`);
        }
      }
    };

    eventSource.onerror = (error) => {
      console.error("Error with SSE connection:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [formattedDate, fetchCleansingStatus, handleJobComplete]);

  const handleTabChange = async (key: string) => {
    setActiveTab(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("cleansingActiveTab", key);
    }

    const partsForFactory = partsData.filter(
      (part) => part.pabrik_id.toString() === key
    );

    // Clear lab data first
    setLabData([]);

    // If we have parts for this factory, set the active part and fetch lab data
    if (partsForFactory.length > 0) {
      const newActivePart = partsForFactory[0].name;
      // Set the active part
      setActivePart(newActivePart);

      // Bagian_id akan diambil dari useEffect yang memantau activePart
    } else {
      setActivePart("");
    }
  };

  /**
   * Trigger the cleansing workflow for every part in a single factory and map job IDs for UI feedback.
   */
  const handleRunFactory = async (factoryId: string) => {
    const factoryParts = partsData.filter(
      (part) => part.pabrik_id.toString() === factoryId
    );

    if (factoryParts.length === 0) {
      message.error("No parts found for this factory");
      return;
    }

    const bagianIds = factoryParts.map((part) => part.bagian_id);
    updatePartsLoadingState(bagianIds, true);

    try {
      const dailyRunnerResponses = await Promise.all(
        factoryParts.map((part) =>
          api.get(
            `/daily_runner/get-by-args?tanggal=${formattedDate}&tipe=cleaning&bagian_id=${part.bagian_id}`
          )
        )
      );

      const partsWithRunner = factoryParts.reduce((acc, part, index) => {
        const runnerId = dailyRunnerResponses[index]?.data?._id;
        if (runnerId) {
          acc.push({ bagianId: part.bagian_id, dailyRunnerId: runnerId });
        }
        return acc;
      }, [] as Array<{ bagianId: number; dailyRunnerId: string }>);

      if (partsWithRunner.length === 0) {
        updatePartsLoadingState(bagianIds, false);
        message.error("No daily runners found for this factory");
        return;
      }

      const response = await api.post<RunResponse>(
        "/daily_runner/execute/cleaning",
        {
          daily_runner_id: partsWithRunner.map((item) => item.dailyRunnerId),
        }
      );

      message.success(
        `${
          factories.find(
            (factory) => factory.pabrik_id.toString() === factoryId
          )?.name || `Pabrik ${factoryId}`
        } cleaning process started`
      );

      const jobs = response.data.job_id || [];
      if (jobs.length > 0) {
        const jobMapping = partsWithRunner.reduce((acc, item, index) => {
          const jobId = jobs[index];
          if (jobId) {
            acc[item.bagianId] = jobId;
          }
          return acc;
        }, {} as Record<number, string>);

        registerJobsForParts(jobMapping, bagianIds);
      } else {
        updatePartsLoadingState(bagianIds, false);
      }
    } catch (error) {
      updatePartsLoadingState(bagianIds, false);

      if (axios.isAxiosError(error) && error.response) {
        message.error(
          error.response.data.error || "Failed to start cleaning process"
        );
        console.log(error.response.data.error);
      } else {
        message.error("Failed to start cleaning process");
        console.log(error);
      }
    }
  };

  /**
   * Run the cleansing workflow for all factories at once and keep the combined loading state consistent.
   */
  const handleRunAllFactories = async () => {
    if (partsData.length === 0) {
      message.error("No parts available to run");
      return;
    }

    const bagianIds = partsData.map((part) => part.bagian_id);
    updatePartsLoadingState(bagianIds, true);

    try {
      const dailyRunnerResponses = await Promise.all(
        partsData.map((part) =>
          api.get(
            `/daily_runner/get-by-args?tanggal=${formattedDate}&tipe=cleaning&bagian_id=${part.bagian_id}`
          )
        )
      );

      const partsWithRunner = partsData.reduce((acc, part, index) => {
        const runnerId = dailyRunnerResponses[index]?.data?._id;
        if (runnerId) {
          acc.push({ bagianId: part.bagian_id, dailyRunnerId: runnerId });
        }
        return acc;
      }, [] as Array<{ bagianId: number; dailyRunnerId: string }>);

      if (partsWithRunner.length === 0) {
        updatePartsLoadingState(bagianIds, false);
        message.error("No daily runners found");
        return;
      }

      const response = await api.post<RunResponse>(
        "/daily_runner/execute/cleaning",
        {
          daily_runner_id: partsWithRunner.map((item) => item.dailyRunnerId),
        }
      );

      message.success("All factories cleaning process started");

      const jobs = response.data.job_id || [];
      if (jobs.length > 0) {
        const jobMapping = partsWithRunner.reduce((acc, item, index) => {
          const jobId = jobs[index];
          if (jobId) {
            acc[item.bagianId] = jobId;
          }
          return acc;
        }, {} as Record<number, string>);

        registerJobsForParts(jobMapping, bagianIds);
      } else {
        updatePartsLoadingState(bagianIds, false);
      }
    } catch (error) {
      updatePartsLoadingState(bagianIds, false);

      if (axios.isAxiosError(error) && error.response) {
        message.error(
          error.response.data.error || "Failed to start cleaning process"
        );
        console.log(error.response.data.error);
      } else {
        message.error("Failed to start cleaning process");
        console.log(error);
      }
    }
  };

  const isFactoryLoading = (factoryId: string) => {
    // Get all parts for this factory
    const factoryParts = partsData.filter(
      (part) => part.pabrik_id.toString() === factoryId
    );

    if (factoryParts.length === 0) return false;

    return factoryParts.some((part) => {
      if (loadingStates[part.bagian_id.toString()]) {
        return true;
      }

      const jobId = runningJobs[part.bagian_id];
      return jobId ? Boolean(loadingStates[jobId]) : false;
    });
  };

  const getFactoryStatus = (factoryId: string) => {
    // First check if the factory is loading
    if (isFactoryLoading(factoryId)) return "loading";

    const factoryParts = partsData.filter(
      (part) => part.pabrik_id.toString() === factoryId
    );

    if (factoryParts.length === 0) return null;

    const hasFailedPart = factoryParts.some((part) => part.status === "failed");
    if (hasFailedPart) return "failed";

    const allCompleted = factoryParts.every(
      (part) => part.status === "completed"
    );
    if (allCompleted) return "completed";

    return null;
  };

  const items = factories
    .filter((factory) => factory.pabrik_id !== 0)
    .map((item) => ({
      label: (
        <span className="flex items-center gap-2">
          {getFactoryStatus(item.pabrik_id.toString()) === "loading" && (
            <Image
              src="/images/breathing.gif"
              alt="Loading"
              width={20}
              height={20}
              className="mr-1.5"
            />
          )}
          {getFactoryStatus(item.pabrik_id.toString()) === "completed" && (
            <HiCheckCircle size={20} color="#1268B3" />
          )}
          {getFactoryStatus(item.pabrik_id.toString()) === "failed" && (
            <MdError size={20} color="#E20301" />
          )}
          {item.name}
        </span>
      ),
      key: item.pabrik_id.toString(),
    }));

  const getPartsForActiveFactory = () => {
    return partsData.filter((part) => part.pabrik_id.toString() === activeTab);
  };

  return (
    <div className="p-4 sm:px-5 sm:py-4">
      <Breadcrumb
        separator={
          <MdArrowForwardIos size={16} className="inline-block align-middle" />
        }
        items={[
          {
            title: (
              <Link href="/daily-routines" className="breadcrumbLink">
                <span className="text-neutral-300 text-20 font-semibold">
                  <HiHome className="inline-block mr-1 mb-0.5" />
                </span>
              </Link>
            ),
          },
          {
            title: (
              <Link href="/processes" className="breadcrumbLink">
                <span className="text-neutral-300 text-20 font-semibold">
                  Processes
                </span>
              </Link>
            ),
          },
          {
            title: (
              <span className="text-neutral-900 text-20 font-semibold">
                Cleansing
              </span>
            ),
          },
        ]}
        className="customBreadcrumb separatorSpacing mb-4"
      />
      <div className="flex items-center mt-7 mb-6">
        <DatePicker
          disabled
          value={selectedDate}
          format="dddd, DD MMMM YYYY"
          className="boldDatePicker"
        />
      </div>

      <div className="flex justify-between items-start">
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={items}
          className="w-full text-20 [&_.ant-tabs-nav::before]:h-1 [&_.ant-tabs-nav::before]:bg-neutral-250 [&_.ant-tabs-tab]:text-center [&_.ant-tabs-tab]:items-center [&_.ant-tabs-tab]:justify-center [&_.ant-tabs-tab]:py-2 [&_.ant-tabs-tab]:px-4 [&_.ant-tabs-tab]:mx-1 [&_.ant-tabs-tab]:text-neutral-300 [&_.ant-tabs-tab]:font-semibold [&_.ant-tabs-tab-active]:rounded [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:text-black [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:font-semibold [&_.ant-tabs-ink-bar]:bg-orange-500 [&_.ant-tabs-ink-bar]:h-1"
        />

        <div className="flex gap-2 ml-2.5">
          <Dropdown
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: "1",
                  label: "Reset all factories",
                },
                {
                  key: "2",
                  label: `Reset ${
                    factories.find(
                      (factory) => factory.pabrik_id.toString() === activeTab
                    )?.name || `Pabrik ${activeTab}`
                  } only`,
                },
              ],
            }}>
            <Button
              type="primary"
              className="flex-1 text-white lg:flex-none bg-danger lg:w-auto h-11 text-20 sm:text-base rounded-md font-semibold">
              Reset all
              <MdArrowForwardIos size={18} className="rotate-90" />
            </Button>
          </Dropdown>
          <Dropdown
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: "1",
                  label: "Run all factories",
                  onClick: () => handleRunAllFactories(),
                },
                {
                  key: "2",
                  label: `Run ${
                    factories.find(
                      (factory) => factory.pabrik_id.toString() === activeTab
                    )?.name || `Pabrik ${activeTab}`
                  } only`,
                  onClick: () => handleRunFactory(activeTab),
                },
              ],
            }}>
            <Button
              type="primary"
              className="flex-1 text-white lg:flex-none lg:w-auto h-11 text-20 sm:text-base rounded-md font-semibold"
              icon={<MdPlayArrow size={28} />}>
              Run all
              <MdArrowForwardIos size={18} className="rotate-90" />
            </Button>
          </Dropdown>
        </div>
      </div>

      {isStatusLoading ? (
        <div className="flex justify-center items-center h-[50vh] flex-col gap-4">
          <Spin size="large" />
          <p className="text-base text-neutral-500 m-0">Loading...</p>
        </div>
      ) : (
        <CleansingTable
          activeTab={activeTab}
          data={partsData}
          labData={labData}
          getPartsForActiveFactory={getPartsForActiveFactory}
          activePart={activePart}
          setActivePart={setActivePart}
          isLabLoading={isLabLoading}
          loadingStates={loadingStates}
          onSetPartLoading={setPartLoadingState}
          onRegisterJobs={registerJobsForParts}
          runningJobs={runningJobs}
        />
      )}
    </div>
  );
};

export default CleansingPage;

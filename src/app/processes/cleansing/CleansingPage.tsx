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
import CleansingTable from "@/component/processes/CleansingTable";
import { useDateContext } from "@/context/DateContext";
import api from "@/utils/axios";
import axios from "axios";
import Image from "next/image";

type JobStatusEvent = {
  job_id: string;
  status: "completed" | "failed";
};

interface Factory {
  _id: string;
  pabrik_id: number;
  name: string;
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

interface Part {
  _id: string;
  bagian_id: number;
  name: string;
  pabrik_id: number;
  pabrik_name: string;
  status?: string;
}

interface CleansingStatus {
  pabrik_name: string;
  bagian_name: string;
  tanggal: string;
  time_taken: number;
  last_run: number;
  status: string;
  user_profile_picture: string;
}

interface RunResponse {
  message: string;
  job_id: string[];
}

const CleansingPage: React.FC = () => {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [partsData, setPartsData] = useState<Part[]>([]);
  const [labData, setLabData] = useState<Lab[]>([]);
  const [isLabLoading, setIsLabLoading] = useState(false);
  const [cleansingStatus, setCleansingStatus] = useState<CleansingStatus[]>([]);
  const [loadingStates, setLoadingStates] = useState<{
    [key: string]: boolean;
  }>({});
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const { selectedDate, formattedDate } = useDateContext();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("cleansingActiveTab") || "1";
  });
  const factoriesRef = useRef<Factory[]>([]);
  const partsRef = useRef<Part[]>([]);
  const isFirstMount = useRef(true);
  const [activePart, setActivePart] = useState<string>("");

  const updatePartsData = (
    parts: Part[],
    factories: Factory[],
    statusData: CleansingStatus[]
  ) => {
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
            ? new Date(matchingStatus.last_run * 1000).toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
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

    if (updatedPartsData.length > 0) {
      setActivePart(updatedPartsData[0].name);
    }
  };

  const updateLabData = (
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
  };

  const fetchCleansingStatus = async (date: string) => {
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
  };

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
  }, [formattedDate]);

  const fetchLabsByBagian = useCallback(
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
    [factories] // Hapus activeTab dari dependency array
  ); // Tambahkan factories ke dependency array

  useEffect(() => {
    if (factoriesRef.current.length > 0) {
      updatePartsData(partsRef.current, factoriesRef.current, cleansingStatus);
    }
  }, [cleansingStatus]);

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
  }, [formattedDate]);

  useEffect(() => {
    const handleSetPartLoading = (
      event: CustomEvent<{ bagianId: number; isLoading: boolean }>
    ) => {
      const { bagianId, isLoading } = event.detail;
      setLoadingStates((prev) => ({
        ...prev,
        [bagianId.toString()]: isLoading,
      }));
    };

    const handleRegisterJob = (
      event: CustomEvent<{ bagianId: number; jobId: string }>
    ) => {
      const { bagianId, jobId } = event.detail;
      setLoadingStates((prev) => {
        const newState = { ...prev };
        delete newState[bagianId.toString()];
        newState[jobId] = true;
        return newState;
      });
    };

    const observer = new MutationObserver(() => {
      const table = document.querySelector("table");
      if (table) {
        table.addEventListener(
          "setPartLoading",
          handleSetPartLoading as EventListener
        );
        table.addEventListener(
          "registerJob",
          handleRegisterJob as EventListener
        );
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      const table = document.querySelector("table");
      if (table) {
        table.removeEventListener(
          "setPartLoading",
          handleSetPartLoading as EventListener
        );
        table.removeEventListener(
          "registerJob",
          handleRegisterJob as EventListener
        );
      }
    };
  }, []);

  const handleTabChange = async (key: string) => {
    setActiveTab(key);
    localStorage.setItem("cleansingActiveTab", key);

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

  const handleJobComplete = (jobId: string) => {
    // Remove the job from loading states
    setLoadingStates((prev) => {
      const newState = { ...prev };
      delete newState[jobId];
      return newState;
    });

    // Dispatch event to the table component
    const tableRef = document.querySelector("table");
    if (tableRef) {
      const event = new CustomEvent("jobComplete", { detail: jobId });
      tableRef.dispatchEvent(event);
    }
  };

  const handleRunFactory = async (factoryId: string) => {
    try {
      const factoryParts = partsData.filter(
        (part) => part.pabrik_id.toString() === factoryId
      );

      if (factoryParts.length === 0) {
        message.error("No parts found for this factory");
        return;
      }

      // Set temporary loading states for UI feedback during API calls
      const updatedLoadingStates = { ...loadingStates };
      factoryParts.forEach((part) => {
        updatedLoadingStates[part.bagian_id.toString()] = true;
      });
      setLoadingStates(updatedLoadingStates);

      const dailyRunnerPromises = factoryParts.map((part) =>
        api.get(
          `/daily_runner/get-by-args?tanggal=${formattedDate}&tipe=cleaning&bagian_id=${part.bagian_id}`
        )
      );

      const dailyRunnerResponses = await Promise.all(dailyRunnerPromises);
      const dailyRunnerIds = dailyRunnerResponses
        .map((response) => response.data?._id)
        .filter((id) => id);

      if (dailyRunnerIds.length === 0) {
        // Clear temporary loading states if no daily runners found
        const clearedLoadingStates = { ...loadingStates };
        factoryParts.forEach((part) => {
          delete clearedLoadingStates[part.bagian_id.toString()];
        });
        setLoadingStates(clearedLoadingStates);

        message.error("No daily runners found for this factory");
        return;
      }

      const response = await api.post<RunResponse>(
        "/daily_runner/execute/cleaning",
        {
          daily_runner_id: dailyRunnerIds,
        }
      );

      message.success(
        `${
          factories.find(
            (factory) => factory.pabrik_id.toString() === factoryId
          )?.name || `Pabrik ${factoryId}`
        } cleaning process started`
      );

      if (response.data.job_id && response.data.job_id.length > 0) {
        // Update loading states with job IDs and keep them active until SSE events
        const newLoadingStates = { ...loadingStates };

        // First, remove the temporary part-based loading states
        factoryParts.forEach((part) => {
          delete newLoadingStates[part.bagian_id.toString()];
        });

        // Then add the job-based loading states
        response.data.job_id.forEach((jobId) => {
          newLoadingStates[jobId] = true;
        });

        setLoadingStates(newLoadingStates);

        // Create a mapping between parts and jobs for the table component
        const partsToJobs = factoryParts.reduce((acc, part, index) => {
          if (index < response.data.job_id.length) {
            acc[part.bagian_id] = response.data.job_id[index];
          }
          return acc;
        }, {} as Record<number, string>);

        // Update the runningJobs state in the table component
        const tableRef = document.querySelector("table");
        if (tableRef) {
          const event = new CustomEvent("updateRunningJobs", {
            detail: { jobs: partsToJobs },
          });
          tableRef.dispatchEvent(event);
        }
      }
    } catch (error) {
      // Clear temporary loading states on error
      const clearedLoadingStates = { ...loadingStates };
      partsData
        .filter((part) => part.pabrik_id.toString() === factoryId)
        .forEach((part) => {
          delete clearedLoadingStates[part.bagian_id.toString()];
        });
      setLoadingStates(clearedLoadingStates);

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

  const handleRunAllFactories = async () => {
    try {
      // Set temporary loading states for UI feedback
      const updatedLoadingStates = { ...loadingStates };
      partsData.forEach((part) => {
        updatedLoadingStates[part.bagian_id.toString()] = true;
      });
      setLoadingStates(updatedLoadingStates);

      const dailyRunnerPromises = partsData.map((part) =>
        api.get(
          `/daily_runner/get-by-args?tanggal=${formattedDate}&tipe=cleaning&bagian_id=${part.bagian_id}`
        )
      );

      const dailyRunnerResponses = await Promise.all(dailyRunnerPromises);
      const dailyRunnerIds = dailyRunnerResponses
        .map((response) => response.data?._id)
        .filter((id) => id);

      if (dailyRunnerIds.length === 0) {
        // Clear all loading states if no daily runners found
        setLoadingStates({});
        message.error("No daily runners found");
        return;
      }

      const response = await api.post<RunResponse>(
        "/daily_runner/execute/cleaning",
        {
          daily_runner_id: dailyRunnerIds,
        }
      );

      message.success("All factories cleaning process started");

      if (response.data.job_id && response.data.job_id.length > 0) {
        // Update loading states with job IDs and keep them active until SSE events
        const newLoadingStates = { ...loadingStates };

        // First, remove the temporary part-based loading states
        partsData.forEach((part) => {
          delete newLoadingStates[part.bagian_id.toString()];
        });

        // Then add the job-based loading states
        response.data.job_id.forEach((jobId) => {
          newLoadingStates[jobId] = true;
        });

        setLoadingStates(newLoadingStates);

        // Create a mapping between parts and jobs for the table component
        const partsToJobs = partsData.reduce((acc, part, index) => {
          if (index < response.data.job_id.length) {
            acc[part.bagian_id] = response.data.job_id[index];
          }
          return acc;
        }, {} as Record<number, string>);

        // Update the runningJobs state in the table component
        const tableRef = document.querySelector("table");
        if (tableRef) {
          const event = new CustomEvent("updateRunningJobs", {
            detail: { jobs: partsToJobs },
          });
          tableRef.dispatchEvent(event);
        }
      }
    } catch (error) {
      // Clear all loading states on error
      setLoadingStates({});

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

    // Check if any part in this factory has a direct loading state
    for (const part of factoryParts) {
      if (loadingStates[part.bagian_id.toString()]) {
        return true;
      }
    }

    // If we have any loading states at all, log them for debugging
    if (Object.keys(loadingStates).length > 0) {
      if (factoryId === activeTab) {
        return Object.keys(loadingStates).length > 0;
      }
    }

    return false;
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
              style={{ marginRight: "5px" }}
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
        separator={<MdArrowForwardIos size={16} />}
        items={[
          {
            title: (
              <Link href="/processes" className="breadcrumbLink">
                <span className="linkText">Processes</span>
              </Link>
            ),
          },
          {
            title: <span className="lastBreadcrumbItem">Cleansing</span>,
          },
        ]}
        className="customBreadcrumb separatorSpacing"
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
          className="customTabs"
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
            <Button type="default" className="customDangerButton btn-lg">
              Reset all
              <MdArrowForwardIos
                size={18}
                style={{ transform: "rotate(90deg)" }}
              />
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
              className="customPrimaryButton btn-lg"
              icon={<MdPlayArrow size={28} />}>
              Run all
              <MdArrowForwardIos
                size={18}
                style={{ transform: "rotate(90deg)" }}
              />
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
          onJobComplete={handleJobComplete}
          getPartsForActiveFactory={getPartsForActiveFactory}
          activePart={activePart}
          setActivePart={setActivePart}
          isLabLoading={isLabLoading}
          loadingStates={loadingStates}
        />
      )}
    </div>
  );
};

export default CleansingPage;

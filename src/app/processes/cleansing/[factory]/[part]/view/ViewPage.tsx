"use client";

/**
 * View Page - Data viewing and editing interface for cleansing process
 *
 * This comprehensive component provides multi-tab data viewing with capabilities for:
 * - Viewing raw data (DCS, Adpro, Lab)
 * - Viewing cleansed data
 * - Viewing overwritten/modified data
 * - Editing individual cell values (overwrite functionality)
 * - Reverting modifications back to original values
 * - Downloading cleansed data as Excel
 * - Viewing modification logs
 * - Filtering affected data only
 * - Search by alias name
 *
 * Data Flow:
 * Raw Data (DCS/Adpro/Lab) → Cleansed Data → Overwritten Data (if modified)
 *
 * Color Coding:
 * - Orange (#F47920): Affected cells (tie-in modifications)
 * - Green (#00AD17): Overwritten/modified cells (user edits)
 * - Gray (#f1f2f3): Default/unchanged cells
 *
 * @component
 * @responsive - Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
 */

import { useState, useEffect } from "react";
import {
  Breadcrumb,
  DatePicker,
  Tabs,
  Button,
  Avatar,
  Input,
  Radio,
  Spin,
  Form,
} from "antd";
import {
  MdArrowForwardIos,
  MdOutlineStickyNote2,
  MdDateRange,
} from "react-icons/md";
import Link from "next/link";
import { HiCheckCircle } from "react-icons/hi";
import { useParams, useSearchParams } from "next/navigation";
import { useDateContext } from "@/context/DateContext";
import api from "@/utils/axios";
import LogsModal from "@/components/processes/LogsModal";
import DataTable from "./components/DataTable";
import LabDataTable from "./components/LabDataTable";
import OverwriteModal from "./components/OverwriteModal";
import RevertModal from "./components/RevertModal";
import { HiDownload, HiHome } from "react-icons/hi";
import { saveAs } from "file-saver";
import type { CleanData, RawData, RawLabData } from "@/types";

const { TabPane } = Tabs;

const ViewPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();

  // Factory and part identification
  const [factoryName, setFactoryName] = useState("");
  const [partName, setPartName] = useState("");

  // Search and filter
  const [searchText, setSearchText] = useState("");

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRawDataLoading, setIsRawDataLoading] = useState(true);
  const [isCleanDataLoading, setIsCleanDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date context
  const { formattedDate, selectedDate } = useDateContext();

  // Data states
  const [rawDCSData, setRawDCSData] = useState<RawData[]>([]);
  const [rawAdproData, setRawAdproData] = useState<RawData[]>([]);
  const [cleanedData, setCleanedData] = useState<CleanData[]>([]);
  const [modifiedData, setModifiedData] = useState<CleanData[]>([]);
  const [rawLabData, setRawLabData] = useState<RawLabData[]>([]);
  const [cleanLabData, setCleanLabData] = useState<RawLabData[]>([]);

  // Active tab and filter
  const [activeTab, setActiveTab] = useState("rawAdpro");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filterOption, setFilterOption] = useState<"all" | "affected">("all");

  // Overwrite modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCellData, setSelectedCellData] = useState<{
    alias: string;
    hour: number | string;
    value: number | null;
    is_same: boolean;
    fieldType?: string;
  } | null>(null);
  const [form] = Form.useForm();

  // Revert modal state
  const [isRevertModalVisible, setIsRevertModalVisible] = useState(false);
  const [selectedRevertData, setSelectedRevertData] = useState<{
    alias: string;
    hour: number | string;
    currentValue: number | null;
    originalValue: number | null;
    data_id: string;
    fieldType?: string;
  } | null>(null);
  const [revertForm] = Form.useForm();

  // Logs modal state
  const [isLogsModalVisible, setIsLogsModalVisible] = useState(false);
  const [selectedLogData, setSelectedLogData] = useState<{
    alias: string;
    bagianId: number;
  } | null>(null);
  const [loadingDownload, setLoadingDownload] = useState(false);

  /**
   * Extract factory and part names from URL search params
   */
  useEffect(() => {
    const factory = searchParams.get("factory");
    const part = searchParams.get("part");

    if (factory) setFactoryName(factory);
    if (part) setPartName(part);
  }, [searchParams]);

  /**
   * Auto-switch tab when overwritten tab becomes empty
   * Falls back to cleaned → rawAdpro → rawDcs in order
   */
  useEffect(() => {
    if (
      activeTab === "cleanedModified" &&
      modifiedData.length === 0 &&
      !isCleanDataLoading
    ) {
      if (cleanedData.length > 0) {
        setActiveTab("cleaned");
      } else if (rawAdproData.length > 0) {
        setActiveTab("rawAdpro");
      } else if (rawDCSData.length > 0) {
        setActiveTab("rawDcs");
      }
    }
  }, [
    activeTab,
    modifiedData,
    cleanedData,
    rawAdproData,
    rawDCSData,
    isCleanDataLoading,
  ]);

  /**
   * Load all data for selected part and date
   * Handles both lab data and part data differently
   */
  useEffect(() => {
    if (!partName) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setIsRawDataLoading(true);
        setIsCleanDataLoading(true);
        const bagian_id = params.part;
        const lab_id = params.part;
        const isLabData = partName.toLowerCase().includes("lab");

        try {
          if (isLabData) {
            // Load lab data
            try {
              const rawLabResponse = await api.get(
                `/daily_data/lab/raw/${lab_id}/${formattedDate}`
              );
              setRawLabData(rawLabResponse.data);
              setRawDCSData([]);
              setRawAdproData([]);
              setIsRawDataLoading(false);
              setActiveTab("rawLab");
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (rawLabError: any) {
              if (rawLabError.response?.status === 404) {
                setRawLabData([]);
                setError("No raw lab data available for this date");
              } else {
                throw rawLabError;
              }
            } finally {
              setIsRawDataLoading(false);
            }

            // Load clean lab data separately
            try {
              const cleanLabResponse = await api.get(
                `/daily_data/lab/clean/${lab_id}/${formattedDate}`
              );
              setCleanLabData(cleanLabResponse.data);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (cleanLabError: any) {
              if (cleanLabError.response?.status === 404) {
                setCleanLabData([]);
              } else {
                throw cleanLabError;
              }
            } finally {
              setIsCleanDataLoading(false);
            }

            // Clear part data
            setCleanedData([]);
            setModifiedData([]);
          } else {
            // Load part data (DCS and Adpro)
            const [dcsResponse, adproResponse] = await Promise.all([
              api.get(
                `/daily_data/raw/bagian/${bagian_id}/${formattedDate}?tipe=dcs`
              ),
              api.get(
                `/daily_data/raw/bagian/${bagian_id}/${formattedDate}?tipe=adpro`
              ),
            ]);

            setRawDCSData(dcsResponse.data);
            setRawAdproData(adproResponse.data);
            setRawLabData([]);
            setCleanLabData([]);
            setIsRawDataLoading(false);

            // Fetch clean and modified data
            const [cleanedResponse, modifiedResponse] = await Promise.all([
              api.get(
                `/daily_data/clean/bagian/${bagian_id}/${formattedDate}?modified=false`
              ),
              api.get(
                `/daily_data/clean/bagian/${bagian_id}/${formattedDate}?modified=true`
              ),
            ]).catch((error) => {
              if (error.response?.status === 404) {
                return [{ data: [] }, { data: [] }];
              }
              throw error;
            });

            setCleanedData(cleanedResponse.data);
            setModifiedData(modifiedResponse.data);
            setIsCleanDataLoading(false);
          }
        } catch (rawError: unknown) {
          const error = rawError as { response?: { status?: number } };
          if (error.response?.status === 404) {
            setRawDCSData([]);
            setRawAdproData([]);
            setRawLabData([]);
            setCleanLabData([]);
            setCleanedData([]);
            setModifiedData([]);
            setError("No data available for this date");
            setIsRawDataLoading(false);
            setIsCleanDataLoading(false);
          } else {
            throw rawError;
          }
        }
      } catch (err: unknown) {
        console.error(err);
        const error = err as {
          response?: { data?: { detail?: string } };
          message?: string;
        };
        setError(
          error.response?.data?.detail || error.message || "Failed to load data"
        );
        setIsRawDataLoading(false);
        setIsCleanDataLoading(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [params.part, formattedDate, partName]);

  /**
   * Downloads cleaned data as Excel file
   * API endpoint: GET /daily_data/clean/bagian/{bagian_id}/{date}/download_excel
   */
  const handleDownloadData = async () => {
    const bagian_id = params.part;
    if (bagian_id) {
      setLoadingDownload(true);
      try {
        const response = await api.get(
          `/daily_data/clean/bagian/${bagian_id}/${formattedDate}/download_excel`
        );
        const contentDisposition =
          response.headers["content-disposition"]?.trim();
        let filename = "defaultDownload.xlsx";
        if (contentDisposition) {
          const matches = /filename\s*=\s*"?([^";]+)"?/i.exec(
            contentDisposition
          );
          if (matches && matches[1]) {
            filename = matches[1];
          }
        }
        saveAs(response.data, filename);
      } catch (error) {
        console.error("Error downloading data:", error);
      } finally {
        setLoadingDownload(false);
      }
    }
  };

  /**
   * Handles cell click in cleaned tab to open overwrite modal
   * Supports both time columns (hourly) and summary columns (total, difference, average, tda)
   *
   * @param record - Table row data
   * @param hour - Either hour number (0-24) or field name string
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCellClick = (record: any, hour: number | string) => {
    if (activeTab === "cleaned") {
      let value: number | null = null;
      let fieldType: string = "";

      if (typeof hour === "number") {
        // Time column
        value = record[`time_${hour}`];
        fieldType = "time";
      } else {
        // Summary column
        value = record[hour];
        fieldType = hour;
      }

      setSelectedCellData({
        alias: record.name_alias,
        hour: typeof hour === "number" ? hour : hour,
        value: value,
        is_same:
          typeof hour === "number" ? record[`time_${hour}_is_same`] : true,
        fieldType: fieldType,
      });

      form.setFieldsValue({
        currentValue: value,
      });
      setIsModalVisible(true);
    }
  };

  /**
   * Handles revert button click in modified tab
   * Fetches original value from API before showing revert modal
   *
   * @param record - Table row data
   * @param hour - Either hour number or field name
   */
  const handleRevertClick = async (
    record: CleanData,
    hour: number | string
  ) => {
    const modifiedRecord = modifiedData.find(
      (modRecord) => modRecord.name_alias === record.name_alias
    );

    try {
      let currentValue: number | null = null;
      let originalValue: number | null = null;
      let fieldType: string = "";

      if (typeof hour === "number") {
        // Individual time column revert
        const dataPoint = record.data.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (d: any) => d.time === `${String(hour).padStart(2, "0")}:00`
        );
        currentValue = dataPoint ? dataPoint.value : null;
        fieldType = "time";

        // Fetch original value via API
        const params = {
          name_alias: record.name_alias,
          tanggal: formattedDate,
          time: `${String(hour).padStart(2, "0")}:00`,
        };

        const response = await api.get(
          "/daily_data/clean/revert/value-before",
          {
            params: params,
          }
        );
        originalValue = response.data.value;
      } else {
        // Summary field revert
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentValue = (record as any)[hour];
        fieldType = hour;

        // Get original value from cleanedData
        const originalRecord = cleanedData.find(
          (cleanRecord) => cleanRecord.name_alias === record.name_alias
        );

        if (originalRecord) {
          originalValue = originalRecord[hour as keyof CleanData] as number;
        } else {
          console.error("Could not find original data for comparison");
          return;
        }
      }

      setSelectedRevertData({
        alias: record.name_alias,
        hour,
        currentValue: currentValue,
        originalValue: originalValue,
        data_id: modifiedRecord?._id || "",
        fieldType: fieldType,
      });

      revertForm.setFieldsValue({
        currentValue: currentValue,
        originalValue: originalValue,
      });
      setIsRevertModalVisible(true);
    } catch (error) {
      console.error("Error preparing revert data:", error);
    }
  };

  /**
   * Opens logs modal for specific alias
   *
   * @param alias - Tag alias name
   */
  const handleViewLogs = (alias: string) => {
    setSelectedLogData({
      alias,
      bagianId: Number(params.part),
    });
    setIsLogsModalVisible(true);
  };

  /**
   * Renders appropriate table component based on part type
   * Lab parts use LabDataTable, others use DataTable
   */
  const renderTable = () => {
    if (partName.toLowerCase().includes("lab")) {
      return (
        <LabDataTable
          rawLabData={rawLabData}
          isRawDataLoading={isRawDataLoading}
          error={error}
          filterOption={filterOption}
          currentPage={currentPage}
          pageSize={pageSize}
          factoryName={factoryName}
          partName={partName}
          onViewLogs={handleViewLogs}
          onPageChange={(page: number, size: number) => {
            setCurrentPage(page);
            setPageSize(size);
          }}
        />
      );
    }

    return (
      <DataTable
        rawDCSData={rawDCSData}
        rawAdproData={rawAdproData}
        cleanedData={cleanedData}
        modifiedData={modifiedData}
        isRawDataLoading={isRawDataLoading}
        isCleanDataLoading={isCleanDataLoading}
        error={error}
        searchText={searchText}
        filterOption={filterOption}
        currentPage={currentPage}
        pageSize={pageSize}
        factoryName={factoryName}
        partName={partName}
        onCellClick={handleCellClick}
        onRevertClick={handleRevertClick}
        onViewLogs={handleViewLogs}
        onPageChange={(page: number, size: number) => {
          setCurrentPage(page);
          setPageSize(size);
        }}
      />
    );
  };

  const renderModal = () => {
    if (!selectedCellData) return null;

    const field =
      typeof selectedCellData.hour === "number"
        ? `${String(selectedCellData.hour).padStart(2, "0")}:00`
        : selectedCellData.hour;

    return (
      <OverwriteModal
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onConfirm={async (newValue: number) => {
          try {
            const cleanRecord = cleanedData.find(
              (cleanRecord) => cleanRecord.name_alias === selectedCellData.alias
            );

            if (!cleanRecord) {
              throw new Error("Could not find clean data record");
            }

            const requestBody: {
              data_id: string;
              new_value: number;
              time?: string;
            } = {
              data_id: cleanRecord._id,
              new_value: newValue,
            };

            if (selectedCellData.fieldType === "time") {
              const timeString = `${String(selectedCellData.hour).padStart(
                2,
                "0"
              )}:00`;
              requestBody.time = timeString;
            } else {
              requestBody.time = selectedCellData.fieldType;
            }

            await api.post<CleanData>("/daily_data/clean/edit", requestBody);

            const bagian_id = params.part;

            // Refresh data
            const [cleanedResponse, modifiedResponse] = await Promise.all([
              api.get(
                `/daily_data/clean/bagian/${bagian_id}/${formattedDate}?modified=false`
              ),
              api.get(
                `/daily_data/clean/bagian/${bagian_id}/${formattedDate}?modified=true`
              ),
            ]);

            setCleanedData(cleanedResponse.data);
            setModifiedData(modifiedResponse.data);
            return true;
          } catch (error) {
            console.error("Error saving data:", error);
            return false;
          }
        }}
        tag={selectedCellData.alias}
        field={field}
        currentValue={selectedCellData.value || 0}
      />
    );
  };

  const renderRevertModal = () => {
    if (!selectedRevertData) return null;

    const field =
      typeof selectedRevertData.hour === "number"
        ? `${String(selectedRevertData.hour).padStart(2, "0")}:00`
        : selectedRevertData.hour;

    return (
      <RevertModal
        visible={isRevertModalVisible}
        onClose={() => {
          setIsRevertModalVisible(false);
          revertForm.resetFields();
        }}
        onConfirm={async () => {
          try {
            if (!selectedRevertData) return false;

            const requestBody: {
              data_id: string;
              time?: string;
            } = {
              data_id: selectedRevertData.data_id,
            };

            if (selectedRevertData.fieldType === "time") {
              const timeString = `${String(selectedRevertData.hour).padStart(
                2,
                "0"
              )}:00`;
              requestBody.time = timeString;
            } else {
              requestBody.time = selectedRevertData.fieldType;
            }

            await api.post("/daily_data/clean/revert", requestBody);

            const bagian_id = params.part;

            // Refresh data
            const [cleanedResponse, modifiedResponse] = await Promise.all([
              api.get(
                `/daily_data/clean/bagian/${bagian_id}/${formattedDate}?modified=false`
              ),
              api.get(
                `/daily_data/clean/bagian/${bagian_id}/${formattedDate}?modified=true`
              ),
            ]);

            setCleanedData(cleanedResponse.data);
            setModifiedData(modifiedResponse.data);
            return true;
          } catch (error) {
            console.error("Error reverting data:", error);
            return false;
          }
        }}
        tag={selectedRevertData.alias}
        field={field}
        valueBefore={selectedRevertData.originalValue || 0}
        valueAfter={selectedRevertData.currentValue || 0}
      />
    );
  };

  if ((isLoading && isRawDataLoading && isCleanDataLoading) || !partName) {
    return (
      <div className="flex justify-center items-center h-[50vh] flex-col gap-4">
        <Spin size="large" />
        <p className="text-base text-neutral-500 m-0">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:px-5 sm:py-4">
      {/* Breadcrumb Navigation */}
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
              <Link href="/processes/cleansing" className="breadcrumbLink">
                <span className="text-neutral-300 text-20 font-semibold">
                  Cleansing
                </span>
              </Link>
            ),
          },
          {
            title: (
              <span className="text-neutral-300 text-20 font-semibold">
                {factoryName || `Pabrik ${params.factory}`}
              </span>
            ),
          },
          {
            title: (
              <span className="text-neutral-300 text-20 font-semibold">
                {partName}
              </span>
            ),
          },
          {
            title: (
              <span className="text-neutral-900 text-20 font-semibold">
                View
              </span>
            ),
          },
        ]}
        className="customBreadcrumb separatorSpacing mb-4"
      />

      {/* Date Picker Section - Responsive */}
      <div className="flex items-center my-7 mb-6">
        <DatePicker
          disabled
          value={selectedDate}
          format="dddd, DD MMMM YYYY"
          className="boldDatePicker"
        />
      </div>

      {/* Top Header - Tabs and Last Run Info */}
      <div className="flex items-start gap-4">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="w-full text-20 [&_.ant-tabs-nav::before]:h-1 [&_.ant-tabs-nav::before]:bg-neutral-250 [&_.ant-tabs-tab]:text-center [&_.ant-tabs-tab]:items-center [&_.ant-tabs-tab]:justify-center [&_.ant-tabs-tab]:py-2 [&_.ant-tabs-tab]:px-4 [&_.ant-tabs-tab]:mx-1 [&_.ant-tabs-tab]:text-neutral-300 [&_.ant-tabs-tab]:font-semibold [&_.ant-tabs-tab-active]:rounded [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:text-black [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:font-semibold [&_.ant-tabs-ink-bar]:bg-orange-500 [&_.ant-tabs-ink-bar]:h-1">
          {partName?.toLowerCase().includes("lab") ? (
            // Lab data tabs
            <>
              <TabPane
                tab={isRawDataLoading ? "Raw (Loading...)" : "Raw"}
                key="rawLab"
                disabled={rawLabData.length === 0 && !isRawDataLoading}
              />
              <TabPane
                tab={isCleanDataLoading ? "Cleansed (Loading...)" : "Cleansed"}
                key="cleanedLab"
                disabled={cleanLabData.length === 0 && !isCleanDataLoading}
              />
            </>
          ) : (
            // Part data tabs
            <>
              <TabPane
                tab={isRawDataLoading ? "Raw DCS (Loading...)" : "Raw DCS"}
                key="rawDcs"
                disabled={rawDCSData.length === 0 && !isRawDataLoading}
              />
              <TabPane
                tab={isRawDataLoading ? "Raw Adpro (Loading...)" : "Raw Adpro"}
                key="rawAdpro"
                disabled={rawAdproData.length === 0 && !isRawDataLoading}
              />
              <TabPane
                tab={isCleanDataLoading ? "Cleansed (Loading...)" : "Cleansed"}
                key="cleaned"
                disabled={
                  (cleanedData.length === 0 && !isCleanDataLoading) ||
                  isRawDataLoading
                }
              />
              {(modifiedData.length > 0 || isCleanDataLoading) && (
                <TabPane
                  tab={
                    isCleanDataLoading
                      ? "Overwrited (Loading...)"
                      : "Overwrited"
                  }
                  key="cleanedModified"
                  disabled={
                    (modifiedData.length === 0 && !isCleanDataLoading) ||
                    isRawDataLoading
                  }
                />
              )}
            </>
          )}
        </Tabs>

        {/* Action buttons - Stack on mobile */}
        <div className="flex items-center gap-2">
          <span className="text-16 font-semibold whitespace-nowrap">
            Last run:{" "}
          </span>
          <div className="w-54 px-4 py-2 border border-[#d9d9d9] rounded-md bg-[#e6e6e6] flex items-center justify-center gap-[7px] text-16 font-semibold">
            <Avatar src="/images/avatar.png" size={28} />
            14/11/24, 14:31
            <HiCheckCircle size={28} color="#1268B3" />
          </div>
          <Button
            icon={<MdOutlineStickyNote2 size={28} />}
            className="w-11 h-11"
          />
          <Button icon={<MdDateRange size={28} />} className="w-11 h-11" />
        </div>
      </div>

      {/* Search and Filter Controls - Responsive */}
      <div className="flex justify-between items-center w-full flex-wrap gap-4 mt-4">
        <div className="flex-1 min-w-[200px] max-w-[300px]">
          <Input.Search
            placeholder="Search by alias name..."
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            className="[&_.ant-input]:h-10 [&_.ant-input]:rounded-md [&_.ant-input-search-button]:h-10 [&_.ant-input-search-button]:rounded-r-md"
          />
        </div>
        {activeTab === "cleaned" && (
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              type="default"
              icon={<HiDownload size={22} />}
              className="customSecondaryButton"
              onClick={handleDownloadData}
              loading={loadingDownload}>
              <span className="hidden sm:inline">Download Data</span>
              <span className="sm:hidden">Download</span>
            </Button>
            <Radio.Group
              value={filterOption}
              onChange={(e) => setFilterOption(e.target.value)}
              className="flex gap-6">
              <Radio value="all" className="text-[20.16px]">
                All
              </Radio>
              <Radio value="affected" className="text-[20.16px]">
                Affected Only
              </Radio>
            </Radio.Group>
          </div>
        )}
      </div>

      {/* Data Table */}
      {renderTable()}

      {/* Modals */}
      {renderModal()}
      {renderRevertModal()}

      {/* Logs Modal */}
      {selectedLogData && (
        <LogsModal
          isOpen={isLogsModalVisible}
          onClose={() => setIsLogsModalVisible(false)}
          bagianId={selectedLogData.bagianId}
          pabrikId={Number(params.factory)}
          partName={partName}
          pabrikName={factoryName}
          name_alias={selectedLogData.alias}
          customTitle={
            <>
              View log:{" "}
              <span className="font-normal">{selectedLogData.alias}</span>
            </>
          }
        />
      )}
    </div>
  );
};

export default ViewPage;

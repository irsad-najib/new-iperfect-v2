"use client";

import Link from "next/link";
import { formatNumber } from "@/utils/numberFormat";
import {
  Breadcrumb,
  Button,
  DatePicker,
  Dropdown,
  Modal,
  Table,
  Tooltip,
} from "antd";
import {
  MdDelete,
  MdArrowForwardIos,
  MdAddCircle,
  MdError,
  MdSettings,
  MdFilterList,
  MdOutlineStickyNote2,
} from "react-icons/md";
import { useDateContext } from "@/context/DateContext";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  HiLockClosed,
  HiOutlineAdjustments,
  HiOutlineArrowNarrowRight,
} from "react-icons/hi";
import api from "@/utils/axios";
import { message } from "antd";
import { useRouter } from "next/navigation";
import TieinUdfModal from "./components/TieinUdfModal";
import RevertModal from "./components/RevertModal";
import TieinLogModal from "./components/TieinLogModal";
import UdfAdjustmentModal from "./components/UdfAdjustmentModal";

// Interfaces
interface CellData {
  udf_id: string | null;
  value: number | null;
  adjusted: boolean;
  adjustment_history: number | null;
  error: string | null;
}

interface RowData {
  [key: string]: CellData;
}

interface TableHeader {
  key: string;
  title: string;
  dataIndex: string;
  unit: string;
}

interface ResponseRow {
  key: string;
  rowIndex: string;
  data: RowData;
  hidden: boolean;
}

interface MaterialData {
  _id: string;
  name: string;
  unit: string;
  max_tolerance: number | null;
}

interface ApiResponse {
  _id: string;
  tanggal: string;
  column: TableHeader[];
  row: ResponseRow[];
  type: string;
  default: boolean;
  adjusted: boolean;
  completed: boolean;
}

const EksporImporBeforeTieInPage: React.FC = () => {
  const { selectedDate, formattedDate } = useDateContext();
  const router = useRouter();

  // State management
  const [loading, setLoading] = useState(false);
  const [revertAllLoading, setRevertAllLoading] = useState(false);
  const [revertLoading, setRevertLoading] = useState(false);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState("default_configuration");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [config, setConfig] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dailyRunner, setDailyRunner] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("before");
  const [isTieinUDFModalOpen, setIsTieinUDFModalOpen] = useState(false);
  const [isUDFAdjustmentModalOpen, setIsUDFAdjustmentModalOpen] =
    useState(false);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [isAdjustConfirmationOpen, setIsAdjustConfirmationOpen] =
    useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    value: number | null;
    location: string;
    udfId: string | null;
    unit: string;
    unbalance: number | null | undefined;
    max: number | null | undefined;
  } | null>(null);
  const [headers, setHeaders] = useState<TableHeader[]>([]);
  const [isAdjusted, setIsAdjusted] = useState(false);
  const [defaultTableData, setDefaultTableData] = useState<ResponseRow[]>([]);
  const [adjustedTableData, setAdjustedTableData] = useState<ResponseRow[]>([]);
  const [materialData, setMaterialData] = useState<MaterialData[]>([]);
  const [errorModalData, setErrorModalData] = useState<{
    visible: boolean;
    message: string | null;
  }>({ visible: false, message: null });
  const [udfUpdateLoading, setUdfUpdateLoading] = useState(false);
  const [isTienLogModalOpen, setIsTieinLogModalOpen] = useState(false);
  const [reasoning, setReasoning] = useState<string>("");

  // Optimized data fetching with parallel API calls where possible
  const fetchData = useCallback(async () => {
    if (!formattedDate) return;

    setLoading(true);
    try {
      // Parallel fetch of adjusted and default data
      const [adjustedResponse, defaultResponse] = await Promise.allSettled([
        api.get<ApiResponse>(
          `/tiein/kapasitas-tiein/get-by-args?tanggal=${formattedDate}&adjusted=true`,
        ),
        api.get<ApiResponse>(
          `/tiein/kapasitas-tiein/get-by-args?tanggal=${formattedDate}&adjusted=false`,
        ),
      ]);

      // Handle adjusted data
      if (
        adjustedResponse.status === "fulfilled" &&
        adjustedResponse.value.data
      ) {
        setHeaders(adjustedResponse.value.data.column);
        setAdjustedTableData(adjustedResponse.value.data.row);
        setIsAdjusted(true);
      } else {
        setIsAdjusted(false);
        setActiveTab("before");
      }

      // Handle default data
      if (
        defaultResponse.status === "fulfilled" &&
        defaultResponse.value.data
      ) {
        const data = defaultResponse.value.data;
        setHeaders(data.column);
        setConfig(data);
        setSelectedConfig("default_configuration");
        setDailyRunner({
          _id: data._id,
          tanggal: data.tanggal,
          type: data.type,
        });
        setDefaultTableData(data.row);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      message.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [formattedDate]);

  const fetchMaterialData = useCallback(async () => {
    try {
      const response = await api.get("/distribution_material");
      setMaterialData(response.data);
    } catch (error) {
      console.error("Error fetching materials:", error);
      message.error("Failed to fetch materials");
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
    fetchMaterialData();
  }, [formattedDate, fetchData, fetchMaterialData]);

  // Add Max Tolerance row (optimized to avoid duplicate rows)
  useEffect(() => {
    if (headers.length === 0 || materialData.length === 0) return;

    const toleranceMap: Record<string, number | null> = {};
    materialData.forEach((item) => {
      toleranceMap[item.name] = item.max_tolerance;
    });

    const newRow: ResponseRow = {
      key: "max_tolerance",
      rowIndex: "Max Tolerance",
      data: {},
      hidden: false,
    };

    headers.forEach((col) => {
      newRow.data[col.key] = {
        udf_id: "CUSTOM_MAX_TOLERANCE",
        value: toleranceMap[col.title] ?? null,
        adjusted: false,
        adjustment_history: null,
        error: null,
      };
    });

    setDefaultTableData((prev) => {
      // Prevent duplicate rows
      if (prev.some((row) => row.key === "max_tolerance")) return prev;
      return [...prev, newRow];
    });
    setAdjustedTableData((prev) => {
      if (prev.some((row) => row.key === "max_tolerance")) return prev;
      return [...prev, JSON.parse(JSON.stringify(newRow))];
    });
  }, [headers, materialData]);

  // Add UDF Adjustment row (optimized to avoid duplicate rows)
  useEffect(() => {
    if (headers.length === 0) return;

    const newRow: ResponseRow = {
      key: "udf_adjustment",
      rowIndex: "UDF Adjustment",
      data: {},
      hidden: false,
    };

    headers.forEach((col) => {
      newRow.data[col.key] = {
        udf_id: "123456789",
        value: null,
        adjusted: false,
        adjustment_history: null,
        error: null,
      };
    });

    setDefaultTableData((prev) => {
      if (prev.some((row) => row.key === "udf_adjustment")) return prev;
      return [...prev, newRow];
    });
    setAdjustedTableData((prev) => {
      if (prev.some((row) => row.key === "udf_adjustment")) return prev;
      return [...prev, JSON.parse(JSON.stringify(newRow))];
    });
  }, [headers]);

  // Ensure activeTab is "before" if isAdjusted is false
  useEffect(() => {
    if (!isAdjusted && activeTab === "adjusted") {
      setActiveTab("before");
    }
  }, [isAdjusted, activeTab]);

  const currentTableData = useMemo(
    () => (activeTab === "adjusted" ? adjustedTableData : defaultTableData),
    [activeTab, adjustedTableData, defaultTableData],
  );

  // Optimized cell update handler
  const handleUpdateCellUDF = useCallback(
    async (udfId: string) => {
      if (!selectedCell || !dailyRunner?._id) return;

      const [rowName, columnName] = selectedCell.location.split("-");
      const header = headers.find((h) => h.title === columnName);
      if (!header) return;

      const updatedData = currentTableData.map((row) => {
        if (row.rowIndex === rowName) {
          return {
            ...row,
            data: {
              ...row.data,
              [header.key]: {
                ...row.data[header.key],
                udf_id: udfId,
              },
            },
          };
        }
        return row;
      });

      try {
        const requestBody = {
          tiein_profile: {
            _id: dailyRunner._id,
            tanggal: dailyRunner.tanggal,
            type: dailyRunner.type,
            column: headers,
            row: updatedData,
          },
          last_edited_udf_id: udfId,
        };

        const response = await api.post(
          `/tiein/kapasitas-tiein/save`,
          requestBody,
        );
        if (response.data) {
          setDefaultTableData(response.data.row);
          setIsTieinUDFModalOpen(false);
          fetchData();
        }
      } catch (error) {
        console.error("Error updating tie-in data:", error);
        message.error("Failed to update tie-in data");
      }
    },
    [selectedCell, dailyRunner, headers, currentTableData, fetchData],
  );

  const handleAdjustConfirm = useCallback(async () => {
    try {
      setAdjustLoading(true);
      const requestBody = {
        tiein_profile: {
          _id: dailyRunner._id,
          tanggal: dailyRunner.tanggal,
          type: dailyRunner.type,
          column: headers,
          row: currentTableData,
        },
      };

      await api.post("/tiein/kapasitas-tiein/adjustment", requestBody);
      setIsAdjustConfirmationOpen(false);

      // Refetch adjusted data
      setLoading(true);
      try {
        const adjustedResponse = await api.get<ApiResponse>(
          `/tiein/kapasitas-tiein/get-by-args?tanggal=${formattedDate}&adjusted=true`,
        );

        if (adjustedResponse?.data) {
          setHeaders(adjustedResponse.data.column);
          setAdjustedTableData(adjustedResponse.data.row);
          setIsAdjusted(true);
        }
      } catch (error) {
        console.error("Error fetching adjusted data:", error);
        message.error("Failed to fetch adjusted data");
      } finally {
        setLoading(false);
      }

      setActiveTab("adjusted");
      message.success("Data adjusted successfully");
    } catch (error) {
      console.error("Error adjusting data:", error);
      message.error("Failed to adjust data");
    } finally {
      setAdjustLoading(false);
    }
  }, [dailyRunner, headers, currentTableData, formattedDate]);

  const handleRevertAll = useCallback(
    async (reasoning: string) => {
      setRevertAllLoading(true);
      try {
        await api.post(
          `/tiein/kapasitas-tiein/adjustment/revert/all?tanggal=${formattedDate}&reason=${reasoning}`,
        );
        setActiveTab("before");
        fetchData();
        message.success("Changes reverted successfully");
      } catch (error) {
        console.error("Error reverting adjustment:", error);
        message.error("Failed to revert adjustment");
      } finally {
        setRevertAllLoading(false);
        setIsRevertModalOpen(false);
      }
    },
    [formattedDate, fetchData],
  );

  const handleRevert = useCallback(
    async (reasoning: string, udfId: string) => {
      setRevertLoading(true);
      try {
        const requestBody = {
          tiein_profile: {
            _id: dailyRunner._id,
            tanggal: dailyRunner.tanggal,
            type: dailyRunner.type,
            column: headers,
            row: currentTableData,
          },
          last_edited_udf_id: udfId,
          reason: reasoning,
        };

        await api.post(`/tiein/kapasitas-tiein/adjustment/revert`, requestBody);
        fetchData();
        message.success("UDF reverted successfully");
      } catch (error) {
        console.error("Error reverting UDF:", error);
        message.error("Failed to revert UDF");
      } finally {
        setRevertLoading(false);
        setIsRevertModalOpen(false);
      }
    },
    [dailyRunner, headers, currentTableData, fetchData],
  );

  // Memoized columns configuration
  const columns = useMemo(
    () =>
      headers.map((header) => ({
        title: (
          <div className="flex justify-center items-center w-full gap-2">
            {header.title === "Adjust" ? (
              <div>
                <span>Kegiatan</span>
              </div>
            ) : (
              <span>{header.title}</span>
            )}
          </div>
        ),
        children: [
          {
            title: (
              <div className="flex flex-col items-center gap-1">
                {header.unit}
              </div>
            ),
            dataIndex: header.dataIndex,
            key: header.key,
            ...(header.dataIndex !== "rowIndex" && {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onCell: (record: any) => {
                const cellData = record.data?.[header.key];
                const udfId = cellData?.udf_id || null;
                const isNonClickableUdf = [
                  "AUTO_UNBALANCE",
                  "NO_EXPORT",
                  "NO_IMPORT",
                  "CUSTOM_MAX_TOLERANCE",
                ].includes(udfId || "");

                const isUdfAdjustmentRow = record.rowIndex === "UDF Adjustment";
                const isNonClickable =
                  isNonClickableUdf ||
                  (activeTab === "before" && isUdfAdjustmentRow);

                let cellClass = "";
                const isUnbalanceOrMaxTolerance =
                  record.rowIndex === "Unbalance" ||
                  record.rowIndex === "Max Tolerance";
                const isUdfAdjustment = record.rowIndex === "UDF Adjustment";

                const unbalanceRow = currentTableData.find(
                  (row) => row.rowIndex === "Unbalance",
                );
                const maxToleranceRow = currentTableData.find(
                  (row) => row.rowIndex === "Max Tolerance",
                );
                const unbalanceValue = unbalanceRow?.data[header.key]?.value;
                const maxToleranceValue =
                  maxToleranceRow?.data[header.key]?.value;

                if (isUnbalanceOrMaxTolerance) {
                  if (
                    typeof unbalanceValue === "number" &&
                    typeof maxToleranceValue === "number"
                  ) {
                    cellClass =
                      Math.abs(unbalanceValue) <= maxToleranceValue
                        ? "unbalance-cell-balanced"
                        : "unbalance-cell-unbalanced";
                  } else {
                    cellClass = "unbalance-cell-unbalanced";
                  }
                } else if (isUdfAdjustment) {
                  cellClass =
                    "!bg-secondary-300 !text-white font-normal text-center p-2";
                } else if (cellData?.adjusted) {
                  cellClass =
                    "!bg-secondary-300 !text-white text-center hover:!bg-secondary-500 cursor-pointer";
                } else if (isNonClickable) {
                  cellClass = "non-clickable";
                } else {
                  cellClass = "default-bg";
                }

                const handleCellClick = () => {
                  if (isNonClickable) return;

                  const cellValue = cellData?.value;
                  const cellLocation = `${record.rowIndex}-${header.title}`;
                  const cellUnit = header.unit;

                  setSelectedCell({
                    value: cellValue,
                    location: cellLocation,
                    udfId,
                    unit: cellUnit,
                    unbalance: unbalanceValue,
                    max: maxToleranceValue,
                  });

                  if (record.rowIndex === "UDF Adjustment") {
                    setIsUDFAdjustmentModalOpen(true);
                  } else {
                    setIsTieinUDFModalOpen(true);
                  }
                };

                return {
                  className: cellClass,
                  onClick: handleCellClick,
                };
              },
            }),
            render:
              header.dataIndex === "rowIndex"
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (text: string, record: any) => (
                    <div className="flex justify-center items-center w-full gap-2">
                      <span>{text}</span>
                      {record.rowIndex === "Max Tolerance" && (
                        <MdSettings
                          size={24}
                          color="#F3F4F8"
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push("/global-config?tab=Material");
                          }}
                        />
                      )}
                    </div>
                  )
                : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (record: any) => {
                    const cellData = record.data?.[header.key];
                    const cellValue = cellData?.value;

                    if (record.rowIndex === "UDF Adjustment") {
                      return (
                        <div className="w-full text-center font-normal tabular-nums tracking-tight whitespace-nowrap">
                          <HiOutlineAdjustments size={22} color="#FFF" />
                        </div>
                      );
                    }

                    return cellValue === null || cellValue === undefined ? (
                      <Button
                        type="text"
                        className="w-8 h-8 p-0 flex items-center justify-center text-primary-300 mx-auto"
                        icon={
                          cellData?.error ? (
                            <Tooltip
                              title="Show the error message"
                              placement="bottom"
                              color="#F47920">
                              <MdError size={24} color="#ff4d4f" />
                            </Tooltip>
                          ) : (
                            <MdAddCircle size={24} color="#1268b3" />
                          )
                        }
                        onClick={() => {
                          if (cellData?.error) {
                            setErrorModalData({
                              visible: true,
                              message: cellData.error,
                            });
                            return;
                          }

                          const udfId = cellData?.udf_id || null;
                          const cellLocation = `${record.rowIndex}-${header.title}`;
                          const cellUnit = header.unit;
                          const unbalanceRow = currentTableData.find(
                            (row) => row.rowIndex === "Unbalance",
                          );
                          const maxToleranceRow = currentTableData.find(
                            (row) => row.rowIndex === "Max Tolerance",
                          );
                          const unbalanceValue =
                            unbalanceRow?.data[header.key]?.value;
                          const maxToleranceValue =
                            maxToleranceRow?.data[header.key]?.value;

                          setSelectedCell({
                            value: null,
                            location: cellLocation,
                            udfId,
                            unit: cellUnit,
                            unbalance: unbalanceValue,
                            max: maxToleranceValue,
                          });
                          setIsTieinUDFModalOpen(true);
                        }}
                      />
                    ) : (
                      <div className="w-full text-center font-normal tabular-nums tracking-tight whitespace-nowrap">
                        {typeof cellValue === "number"
                          ? formatNumber(cellValue, {
                              decimals: 2,
                              locale: "id-ID",
                            })
                          : cellValue === null || cellValue === undefined
                            ? "-"
                            : cellValue}
                      </div>
                    );
                  },
          },
        ],
      })),
    [headers, currentTableData, activeTab, router],
  );

  const handleLoadConfig = async () => {};
  const handleDeleteConfig = async () => {};
  const handleRedirect = () =>
    router.push("/processes/tie-in/distribusi-ekspor-impor");

  // const items = useMemo(() => {
  //   const tabs = [{ key: "before", label: "Before", children: <div>{}</div> }];
  //   if (isAdjusted) {
  //     tabs.push({
  //       key: "adjusted",
  //       label: "Adjusted",
  //       children: <div>{}</div>,
  //     });
  //   }
  //   return tabs;
  // }, [isAdjusted]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="p-4 px-5">
      {/* Breadcrumb & Next Button */}
      <div className="flex items-center justify-between">
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
              title: (
                <Link href="/processes/tie-in" className="breadcrumbLink">
                  <span className="linkText">Tie in</span>
                </Link>
              ),
            },
            {
              title: (
                <span className="lastBreadcrumbItem">
                  Kapasitas dan Kebutuhan Ekspor - Impor
                </span>
              ),
            },
          ]}
          className="customBreadcrumb separatorSpacing"
        />
        <Button
          type="default"
          className="customSecondaryButton btn-md mr-12"
          onClick={handleRedirect}
          disabled={!isAdjusted}>
          <span className="font-normal">Next: </span>
          <span className="font-semibold">Distribusi Ekspor dan Impor</span>
          <HiOutlineArrowNarrowRight size={24} className="ml-1" />
        </Button>
      </div>

      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3 mb-[18px] mt-[34px]">
          <span></span>
          <DatePicker
            disabled
            value={selectedDate}
            format="dddd, DD MMMM YYYY"
            className="boldDatePicker"
          />
        </div>
        <div className="flex items-center gap-3 py-4 rounded-lg shrink-0">
          <span className="font-semibold">Config:</span>
          <div className="w-fit min-w-[200px] py-1 px-[11px] border border-[#d9d9d9] rounded-md bg-neutral-250">
            {loading ? "Loading..." : config?.name || selectedConfig}
          </div>
          <Dropdown
            menu={{
              items: [
                { key: "1", label: "Load default config" },
                { key: "2", label: "Load other config" },
              ],
            }}>
            <Button
              type="default"
              loading={loading}
              onClick={handleLoadConfig}
              className="customSecondaryButton">
              Load config
              <MdArrowForwardIos
                size={18}
                style={{ transform: "rotate(90deg)" }}
              />
            </Button>
          </Dropdown>
          <Dropdown
            menu={{
              items: [
                { key: "1", label: "Save as new default" },
                { key: "2", label: "Save as new Tie in config" },
              ],
            }}>
            <Button type="primary" className="customPrimaryButton">
              Save{" "}
              <MdArrowForwardIos
                size={18}
                style={{ transform: "rotate(90deg)" }}
              />
            </Button>
          </Dropdown>
          <Button type="default" loading={loading} onClick={handleDeleteConfig}>
            <MdDelete size={24} />
          </Button>
        </div>
      </div>

      {/* Tabs & Actions Section */}
      <div className="flex justify-between items-center gap-4 mb-[13px]">
        <Button className="customSecondaryButton">
          <MdFilterList />
          Filter
        </Button>
        <div className="flex items-center gap-2">
          {isAdjusted ? (
            <div className="flex gap-6">
              <div className="flex gap-2.5 items-center">
                <span className="text-black text-[16.8px] font-semibold">
                  Select version:
                </span>
                <div className="flex">
                  <Button
                    className={`customSecondaryButton ${
                      activeTab === "before" ? "activeButton" : ""
                    }`}
                    onClick={() => setActiveTab("before")}>
                    <HiLockClosed size={18} />
                    Before
                  </Button>
                  <Button
                    className={`customSecondaryButton ${
                      activeTab === "adjusted" ? "activeButton" : ""
                    }`}
                    onClick={() => setActiveTab("adjusted")}>
                    <HiOutlineAdjustments size={18} />
                    Adjustment
                  </Button>
                </div>
              </div>
              <div className="flex gap-2.5 items-center">
                <Button
                  className="customOtherButton"
                  onClick={() => setIsRevertModalOpen(true)}>
                  Revert all
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className="customOtherButton"
              onClick={() => setIsAdjustConfirmationOpen(true)}>
              <HiOutlineAdjustments />
              Adjust
              <MdArrowForwardIos />
            </Button>
          )}
          <Tooltip title="View logs" placement="bottom" color="#F47920">
            <Button
              onClick={() => setIsTieinLogModalOpen(true)}
              className="customOtherButton btn-sm"
              icon={<MdOutlineStickyNote2 size={28} />}
            />
          </Tooltip>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex flex-col items-center w-full max-h-[calc(100vh-270px)] overflow-hidden relative">
        <div className="w-full flex items-stretch overflow-hidden relative">
          <Table
            dataSource={currentTableData
              .filter((row) => !row.hidden)
              .map((row) => ({
                ...row,
                key:
                  row.rowIndex === "Unbalance"
                    ? "unbalance"
                    : row.rowIndex === "Max Tolerance"
                      ? "max_tolerance"
                      : row.rowIndex === "UDF Adjustment"
                        ? "udf_adjustment"
                        : row.key,
              }))}
            columns={columns}
            pagination={false}
            bordered
            size="middle"
            className="w-full overflow-auto [&_.ant-table-wrapper]:max-h-full [&_.ant-table]:bg-white [&_.ant-table-container]:flex [&_.ant-table-container]:flex-col [&_.ant-table-container]:h-[calc(100vh-270px)] [&_.ant-table-body]:overflow-auto [&_.ant-table-body]:!max-h-none [&_.ant-table-body]:!h-full [&_.ant-table-cell[class*='ant-table-cell-row']:first-child]:!bg-neutral-250 [&_.ant-table-tbody>tr>td:first-child]:!bg-neutral-250 [&_.ant-table-tbody>tr>td:first-child]:font-semibold [&_.ant-table-tbody>tr>td:first-child]:!text-center [&_.ant-table-thead>tr>th:first-child_.columnHeaderContainer]:!justify-center [&_.ant-table-thead>tr>th:first-child_.columnHeaderContainer_span]:text-center [&_.ant-table-thead>tr>th:first-child_.columnHeaderContainer_span]:mr-0 [&_.ant-table-thead>tr>th:first-child]:!max-w-[200px] [&_.ant-table-thead>tr>th:first-child]:!w-[200px] [&_.ant-table-thead>tr>th:first-child]:!sticky [&_.ant-table-thead>tr>th:first-child]:!left-0 [&_.ant-table-thead>tr>th:first-child]:!z-[2] [&_.ant-table-tbody>tr>td:first-child]:!max-w-[200px] [&_.ant-table-tbody>tr>td:first-child]:!w-[200px] [&_.ant-table-tbody>tr>td:first-child]:!sticky [&_.ant-table-tbody>tr>td:first-child]:!left-0 [&_.ant-table-tbody>tr>td:first-child]:!z-[2] [&_.ant-table-tbody>tr>td:first-child]:after:content-[''] [&_.ant-table-tbody>tr>td:first-child]:after:absolute [&_.ant-table-tbody>tr>td:first-child]:after:top-0 [&_.ant-table-tbody>tr>td:first-child]:after:right-0 [&_.ant-table-tbody>tr>td:first-child]:after:bottom-0 [&_.ant-table-tbody>tr>td:first-child]:after:w-1 [&_.ant-table-tbody>tr>td:first-child]:after:bg-gradient-to-r [&_.ant-table-tbody>tr>td:first-child]:after:from-black/10 [&_.ant-table-tbody>tr>td:first-child]:after:to-transparent [&_.ant-table-tbody>tr>td:first-child]:after:pointer-events-none [&_.ant-table-thead>tr>th]:!sticky [&_.ant-table-thead>tr>th]:!top-0 [&_.ant-table-thead>tr>th]:!z-[2] [&_.ant-table-thead>tr>th]:!bg-neutral-250 [&_.ant-table-thead>tr>th.adjust-column]:!bg-primary-300 [&_.ant-table-thead>tr>th.adjust-column]:!text-neutral-100 [&_.ant-table-thead>tr>th:first-child]:!z-[3] [&_.ant-table-body]:scrollbar-none [&_.ant-table-body]:[-ms-overflow-style:none] [&_.ant-table-body::-webkit-scrollbar]:hidden [&_.ant-table-tbody>tr[data-row-key='unbalance']]:!sticky [&_.ant-table-tbody>tr[data-row-key='unbalance']]:!bottom-[104px] [&_.ant-table-tbody>tr[data-row-key='unbalance']]:!z-[11] [&_.ant-table-tbody>tr[data-row-key='unbalance']]:!bg-neutral-250 [&_.ant-table-tbody>tr[data-row-key='unbalance']]:font-semibold [&_.ant-table-tbody>tr[data-row-key='unbalance']>td]:!sticky [&_.ant-table-tbody>tr[data-row-key='unbalance']>td]:!bottom-10 [&_.ant-table-tbody>tr[data-row-key='unbalance']>td]:!z-[11] [&_.ant-table-tbody>tr[data-row-key='unbalance']>td]:!bg-neutral-250 [&_.ant-table-tbody>tr[data-row-key='unbalance']>td]:font-semibold [&_.ant-table-tbody>tr[data-row-key='unbalance']>td]:border-t-2 [&_.ant-table-tbody>tr[data-row-key='unbalance']>td]:border-[#d9d9d9] [&_.ant-table-tbody>tr[data-row-key='unbalance']>td:first-child]:!sticky [&_.ant-table-tbody>tr[data-row-key='unbalance']>td:first-child]:!left-0 [&_.ant-table-tbody>tr[data-row-key='unbalance']>td:first-child]:!z-[12] [&_.ant-table-tbody>tr[data-row-key='unbalance']>td:first-child]:!bg-neutral-700 [&_.ant-table-tbody>tr[data-row-key='unbalance']>td:first-child]:!text-neutral-100 [&_.ant-table-tbody>tr[data-row-key='unbalance']:hover>td]:!bg-neutral-250 [&_.ant-table-tbody>tr[data-row-key='unbalance']:hover>td:first-child]:!bg-neutral-700 [&_.ant-table-tbody>tr[data-row-key='unbalance']:hover>td:first-child]:!text-neutral-100 [&_.ant-table-tbody>tr[data-row-key='max_tolerance']]:!sticky [&_.ant-table-tbody>tr[data-row-key='max_tolerance']]:!bottom-[54px] [&_.ant-table-tbody>tr[data-row-key='max_tolerance']]:!z-[12] [&_.ant-table-tbody>tr[data-row-key='max_tolerance']]:!bg-neutral-250 [&_.ant-table-tbody>tr[data-row-key='max_tolerance']]:font-semibold [&_.ant-table-tbody>tr[data-row-key='max_tolerance']>td]:!sticky [&_.ant-table-tbody>tr[data-row-key='max_tolerance']>td]:!bottom-0 [&_.ant-table-tbody>tr[data-row-key='max_tolerance']>td]:!z-[12] [&_.ant-table-tbody>tr[data-row-key='max_tolerance']>td]:!bg-neutral-250 [&_.ant-table-tbody>tr[data-row-key='max_tolerance']>td:first-child]:!sticky [&_.ant-table-tbody>tr[data-row-key='max_tolerance']>td:first-child]:!left-0 [&_.ant-table-tbody>tr[data-row-key='max_tolerance']>td:first-child]:!z-[11] [&_.ant-table-tbody>tr[data-row-key='max_tolerance']>td:first-child]:!bg-neutral-700 [&_.ant-table-tbody>tr[data-row-key='max_tolerance']>td:first-child]:!text-neutral-100 [&_.ant-table-tbody>tr[data-row-key='max_tolerance']:hover>td]:!bg-neutral-250 [&_.ant-table-tbody>tr[data-row-key='max_tolerance']:hover>td:first-child]:!bg-neutral-700 [&_.ant-table-tbody>tr[data-row-key='max_tolerance']:hover>td:first-child]:!text-neutral-100 [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']]:!sticky [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']]:!bottom-0 [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']]:!z-[12] [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']]:!bg-neutral-250 [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']]:font-semibold [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']>td]:!sticky [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']>td]:!bottom-0 [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']>td]:!z-[12] [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']>td]:!bg-neutral-700 [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']>td:first-child]:!sticky [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']>td:first-child]:!left-0 [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']>td:first-child]:!z-[12] [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']>td:first-child]:!bg-neutral-700 [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']>td:first-child]:!text-neutral-100 [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']:hover>td]:!bg-neutral-700 [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']:hover>td:first-child]:!bg-neutral-700 [&_.ant-table-tbody>tr[data-row-key='udf_adjustment']:hover>td:first-child]:!text-neutral-100 [&_.ant-table-tbody>tr.unbalance-row]:font-semibold [&_.ant-table-tbody>tr>td.unbalance-cell]:!text-center [&_.ant-table-tbody>tr>td.unbalance-cell]:transition-[background] [&_.ant-table-tbody>tr>td.unbalance-cell]:duration-200 [&_.ant-table-tbody>tr>td.unbalance-cell]:p-2 [&_.ant-table-tbody>tr>td.unbalance-cell-balanced]:!bg-success [&_.ant-table-tbody>tr>td.unbalance-cell-balanced]:!text-white [&_.ant-table-tbody>tr>td.unbalance-cell-balanced]:font-normal [&_.ant-table-tbody>tr>td.unbalance-cell-balanced]:!text-center [&_.ant-table-tbody>tr>td.unbalance-cell-balanced]:p-2 [&_.ant-table-tbody>tr>td.unbalance-cell-unbalanced]:!bg-danger [&_.ant-table-tbody>tr>td.unbalance-cell-unbalanced]:!text-white [&_.ant-table-tbody>tr>td.unbalance-cell-unbalanced]:font-normal [&_.ant-table-tbody>tr>td.unbalance-cell-unbalanced]:!text-center [&_.ant-table-tbody>tr>td.unbalance-cell-unbalanced]:p-2 [&_.ant-table-tbody>tr>td.unbalance-cell-balanced>div]:!text-white [&_.ant-table-tbody>tr>td.unbalance-cell-balanced>div]:font-normal [&_.ant-table-tbody>tr>td.unbalance-cell-balanced>div]:!text-center [&_.ant-table-tbody>tr>td.unbalance-cell-balanced>div]:w-full [&_.ant-table-tbody>tr>td.unbalance-cell-unbalanced>div]:!text-white [&_.ant-table-tbody>tr>td.unbalance-cell-unbalanced>div]:font-normal [&_.ant-table-tbody>tr>td.unbalance-cell-unbalanced>div]:!text-center [&_.ant-table-tbody>tr>td.unbalance-cell-unbalanced>div]:w-full [&_.ant-table-tbody>tr:hover>td.unbalance-cell-balanced]:!bg-success [&_.ant-table-tbody>tr:hover>td.unbalance-cell-balanced]:!text-white [&_.ant-table-tbody>tr>td.udf-adjustment]:!bg-neutral-700 [&_.ant-table-tbody>tr>td.udf-adjustment]:!text-white [&_.ant-table-tbody>tr>td.udf-adjustment]:font-normal [&_.ant-table-tbody>tr>td.udf-adjustment]:!text-center [&_.ant-table-tbody>tr>td.udf-adjustment]:p-2 [&_.ant-table-tbody>tr:hover>td.unbalance-cell-unbalanced]:!bg-danger [&_.ant-table-tbody>tr:hover>td.unbalance-cell-unbalanced]:!text-white [&_.ant-table-tbody>tr>td.default-bg]:!bg-[#eeeff1] [&_.ant-table-tbody>tr>td.default-bg]:cursor-pointer [&_.ant-table-tbody>tr>td.default-bg]:!text-center [&_.ant-table-tbody>tr>td.non-clickable]:!bg-[#eeeff1] [&_.ant-table-tbody>tr>td.non-clickable]:!text-center [&_tr.odd>td:not(:first-child):not(.adjustedCell)]:!bg-[#f1f2f3] [&_tr.odd>td:not(:first-child):not(.adjustedCell):hover]:!bg-neutral-250 [&_tr.even>td:not(:first-child):not(.adjustedCell)]:!bg-[#ebebeb] [&_tr.even>td:not(:first-child):not(.adjustedCell):hover]:!bg-neutral-250"
            sticky={{
              offsetHeader: 0,
              offsetScroll: 0,
              getContainer:
                typeof window !== "undefined"
                  ? () =>
                      document.querySelector(
                        ".w-full.flex.items-stretch",
                      ) as HTMLElement
                  : undefined,
            }}
            scroll={{
              x: "max-content",
              y: "100%",
              scrollToFirstRowOnChange: false,
            }}
            rowClassName={(record, index) => {
              if (
                record.rowIndex === "Unbalance" ||
                record.rowIndex === "Max Tolerance"
              ) {
                return "unbalance-row";
              }
              return index % 2 === 0 ? "even" : "odd";
            }}
          />
        </div>
      </div>

      {/* Modals */}
      <TieinUdfModal
        isOpen={isTieinUDFModalOpen}
        onClose={() => {
          setIsTieinUDFModalOpen(false);
          setSelectedCell(null);
        }}
        udfCell={selectedCell?.value}
        unbalance={selectedCell?.unbalance}
        max={selectedCell?.max}
        cellLocation={selectedCell?.location || ""}
        cellUnit={selectedCell?.unit}
        udfId={selectedCell?.udfId || null}
        headers={headers}
        rows={currentTableData}
        onUpdateUDF={handleUpdateCellUDF}
        activeTab={activeTab}
        tieinProfileId={dailyRunner?._id}
        adjusted={isAdjusted}
        setAdjustedTableData={setAdjustedTableData}
        loading={udfUpdateLoading}
        setLoading={setUdfUpdateLoading}
        handleRevert={(reasoning, udfId) => handleRevert(reasoning, udfId)}
        revertLoading={revertLoading}
        reasoning={reasoning}
        setReasoning={setReasoning}
      />

      <UdfAdjustmentModal
        isOpen={isUDFAdjustmentModalOpen}
        onClose={() => {
          setIsUDFAdjustmentModalOpen(false);
          setSelectedCell(null);
        }}
        udfCell={selectedCell?.value}
        unbalance={selectedCell?.unbalance}
        max={selectedCell?.max}
        cellLocation={selectedCell?.location || ""}
        cellUnit={selectedCell?.unit}
        udfId={selectedCell?.udfId || null}
        headers={headers}
        rows={currentTableData}
        onUpdateUDF={handleUpdateCellUDF}
        activeTab={activeTab}
        tieinProfileId={dailyRunner?._id}
        adjusted={isAdjusted}
        setAdjustedTableData={setAdjustedTableData}
        loading={udfUpdateLoading}
        setLoading={setUdfUpdateLoading}
        handleRevert={(reasoning, udfId) => handleRevert(reasoning, udfId)}
        revertLoading={revertLoading}
        reasoning={reasoning}
        setReasoning={setReasoning}
      />

      {/* Adjustment Confirmation Modal - Placeholder */}
      <Modal
        title="Confirm Adjustment"
        open={isAdjustConfirmationOpen}
        onOk={handleAdjustConfirm}
        onCancel={() => setIsAdjustConfirmationOpen(false)}
        confirmLoading={adjustLoading}>
        <p>Are you sure you want to adjust the data?</p>
      </Modal>

      <RevertModal
        visible={isRevertModalOpen}
        onOk={(reasoning) => handleRevertAll(reasoning)}
        onCancel={() => setIsRevertModalOpen(false)}
        confirmLoading={revertAllLoading}
        title="Revert All UDF"
        all={true}
      />

      <TieinLogModal
        isOpen={isTienLogModalOpen}
        onClose={() => setIsTieinLogModalOpen(false)}
      />

      <Modal
        title="Error"
        open={errorModalData.visible}
        onCancel={() => setErrorModalData({ visible: false, message: null })}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() =>
              setErrorModalData({ visible: false, message: null })
            }>
            Close
          </Button>,
        ]}>
        <p>{errorModalData.message}</p>
      </Modal>
    </div>
  );
};

export default EksporImporBeforeTieInPage;

"use client";

import Link from "next/link";
import { Breadcrumb, Button, DatePicker, Tabs, Table, message } from "antd";
import { MdArrowForwardIos, MdRestartAlt } from "react-icons/md";
import { useDateContext } from "@/context/DateContext";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { ColumnsType } from "antd/es/table";
import api from "@/utils/axios";
import { HiOutlineAdjustments, HiDownload } from "react-icons/hi";
import AdjustmentConfirmationModal from "@/components/processes/tie-in/AdjustmentConfirmationModal";
import MatrixAdjustmentModal from "@/components/processes/tie-in/MatrixAdjustmentModal";
import LoadingSpinner from "@/components/processes/tie-in/LoadingSpinner";
import { formatNumber } from "@/utils/numberFormat";

const { TabPane } = Tabs;

interface DataValue {
  value: number;
  adjusted: boolean;
}

interface DataType {
  key: string;
  unit: string;
  [key: string]: string | DataValue | null;
}

interface ColumnType {
  key: string;
  title: string;
}

interface MaterialData {
  material: string;
  column: ColumnType[];
  data: DataType[];
}

interface MatrixTieInResponse {
  profile_id: string;
  data_id: string;
  tanggal: string;
  material_data: MaterialData[];
}

const GenerateMatrixPage: React.FC = () => {
  const { selectedDate, formattedDate } = useDateContext();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("before");
  const [activeMaterial, setActiveMaterial] = useState("steam");
  const [beforeData, setBeforeData] = useState<MatrixTieInResponse | null>(
    null
  );
  const [adjustedData, setAdjustedData] = useState<MatrixTieInResponse | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isAdjusted, setIsAdjusted] = useState(false);
  const [isAdjustConfirmationOpen, setIsAdjustConfirmationOpen] =
    useState(false);
  const [isMatrixAdjustmentModalOpen, setIsMatrixAdjustmentModalOpen] =
    useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    fromUnit: string;
    toUnit: string;
    currentValue: number;
    fromKey: string;
    rowKey: string;
  } | null>(null);

  // Optimized: Parallel fetch with useCallback
  const fetchMatrixData = useCallback(async () => {
    if (!formattedDate) return;

    setLoading(true);
    setError(null);
    try {
      // Parallel API calls for better performance
      const [beforeResponse, adjustedResponse] = await Promise.allSettled([
        api.get<MatrixTieInResponse>("/tiein/matrix-tiein/get-by-args", {
          params: { tanggal: formattedDate, adjusted: false },
        }),
        api.get<MatrixTieInResponse>("/tiein/matrix-tiein/get-by-args", {
          params: { tanggal: formattedDate, adjusted: true },
        }),
      ]);

      if (beforeResponse.status === "fulfilled") {
        setBeforeData(beforeResponse.value.data);
      } else {
        throw new Error("Failed to fetch non-adjusted data");
      }

      if (adjustedResponse.status === "fulfilled") {
        setAdjustedData(adjustedResponse.value.data);
        setIsAdjusted(true);
      } else {
        setActiveTab("before");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Error fetching matrix tie-in data:", err);
      setError("Failed to fetch matrix data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [formattedDate]);

  useEffect(() => {
    fetchMatrixData();
  }, [fetchMatrixData]);

  // Optimized: Memoized callbacks
  const handleAdjustConfirm = useCallback(async () => {
    setActiveTab("adjusted");
    setIsAdjustConfirmationOpen(false);
  }, []);

  const handleRevertAdjustment = useCallback(async () => {
    try {
      if (!adjustedData) {
        message.error("No adjusted data to revert");
        return;
      }

      const response = await api.post<MatrixTieInResponse>(
        "/tiein/matrix-tiein/adjustment/revert/all",
        null,
        {
          params: {
            tanggal: adjustedData.tanggal,
            profile_id: adjustedData.profile_id,
            data_id: adjustedData.data_id,
          },
        }
      );

      setAdjustedData(response.data);
      setActiveTab("before");
      message.success("Changes reverted successfully");
      setIsAdjustConfirmationOpen(false);
    } catch (error) {
      console.error("Error reverting adjustment:", error);
      message.error("Failed to revert adjustment");
    }
  }, [adjustedData]);

  const getUnit = useCallback(() => {
    switch (activeMaterial) {
      case "steam":
        return "ton/h";
      case "listrik":
        return "mwh";
      case "rc":
      case "dw":
      case "demin":
      case "amoniak":
      case "co2":
        return "ton/h";
      default:
        return "";
    }
  }, [activeMaterial]);

  // Optimized: Memoized material data
  const getCurrentMaterialData = useMemo((): MaterialData | null => {
    const currentData = activeTab === "before" ? beforeData : adjustedData;
    const dataToUse =
      activeTab === "adjusted" && (!currentData || !currentData.material_data)
        ? beforeData
        : currentData;

    if (!dataToUse || !dataToUse.material_data) return null;

    return (
      dataToUse.material_data.find((m) => m.material === activeMaterial) || null
    );
  }, [activeTab, beforeData, adjustedData, activeMaterial]);

  // Optimized: Memoized columns generation
  const generateColumns = useMemo((): ColumnsType<DataType> => {
    const materialData = getCurrentMaterialData;
    if (!materialData) return [];

    return [
      {
        title: (
          <div className="flex justify-center items-center w-full gap-2">
            <div
              className={`flex items-center gap-1 w-fit ${
                activeTab === "before" && isAdjusted
                  ? "cursor-not-allowed"
                  : "cursor-pointer"
              }`}
              onClick={() => {
                if (activeTab === "before" && isAdjusted) return;
                setIsAdjustConfirmationOpen(true);
              }}>
              <span>{activeTab === "before" ? "Adjust" : "Revert"}</span>
              {activeTab === "before" ? (
                <HiOutlineAdjustments size={18} color="#F3F4F8" />
              ) : (
                <MdRestartAlt size={18} color="#F3F4F8" />
              )}
            </div>
          </div>
        ),
        className: "adjust-column",
        children: [
          {
            title: "",
            dataIndex: "unit",
            key: "unit",
            width: 10,
            render: (_, __, index) => {
              if (index === 0) {
                return {
                  children: "Import",
                  props: { rowSpan: materialData.data.length },
                };
              }
              return { props: { rowSpan: 0 } };
            },
          },
          {
            title: getUnit(),
            dataIndex: "unit",
            key: "unit_label",
            width: 100,
            className: "unit-label-column",
          },
        ],
        fixed: "left",
      },
      {
        title: "Export",
        children: materialData.column.map((col) => {
          const isUnbalanceColumn = col.key === "unbalance_ekspor";
          const isTotalColumn = col.key === "total_ekspor";

          return {
            title: isUnbalanceColumn ? (
              <div className="text-white font-semibold w-full text-center">
                {col.title}
              </div>
            ) : (
              col.title
            ),
            dataIndex: col.key,
            key: col.key,
            width: 100,
            className: isUnbalanceColumn ? "unbalance-column-header" : "",
            ...(isTotalColumn ? { key: "total_ekspor" } : {}),
            onCell: (record) => {
              const isUnbalanceRow = record.key === "unbalance_impor";
              const isTotalRow = record.key === "total_impor";

              if (record.key === col.key) {
                return { className: "diagonal-cell" };
              }

              if (isUnbalanceRow || isTotalRow) {
                return {};
              }

              if (isUnbalanceColumn && !isTotalColumn) {
                const value = record[col.key] as DataValue;

                if (value?.value === 0) {
                  return { className: "unbalance-cell-balanced" };
                } else if (
                  value?.value !== null &&
                  value?.value !== undefined
                ) {
                  return { className: "unbalance-cell-unbalanced" };
                } else {
                  return {
                    className: "unbalance-column",
                    style: {
                      backgroundColor: "#e6e6e6",
                      fontWeight: 600,
                      borderLeft: "2px solid #d9d9d9",
                    },
                  };
                }
              }

              if (activeTab === "adjusted" && !isUnbalanceRow && !isTotalRow) {
                const value = record[col.key] as DataValue;
                if (isTotalColumn) return {};

                return {
                  className: value?.adjusted
                    ? "adjusted-cell"
                    : "clickable-cell",
                  onClick: () => {
                    setSelectedCell({
                      fromUnit: col.title,
                      toUnit: record.unit,
                      currentValue: value?.value || 0,
                      fromKey: col.key,
                      rowKey: record.key,
                    });
                    setIsMatrixAdjustmentModalOpen(true);
                  },
                };
              }

              return {};
            },
            render: (value: DataValue | null, record: DataType) => {
              const isUnbalanceRow = record.key === "unbalance_impor";
              const isTotalColumn = col.key === "total_ekspor";

              if (record.key === col.key) {
                return { props: { className: "diagonal-cell" }, children: "" };
              }

              if (isTotalColumn) {
                return {
                  props: {
                    className: "total_ekspor-column",
                    "data-column": "total_ekspor",
                  },
                  children: (
                    <div className="w-full text-center font-normal tabular-nums tracking-tight whitespace-nowrap">
                      {value?.value !== undefined
                        ? typeof value.value === "number"
                          ? formatNumber(value.value)
                          : value.value
                        : "0"}
                    </div>
                  ),
                };
              }

              if (isUnbalanceRow) {
                if (isTotalColumn) {
                  return {
                    props: {
                      className: "total_ekspor-column",
                      "data-column": "total_ekspor",
                    },
                    children: (
                      <div className="w-full text-center font-normal tabular-nums tracking-tight whitespace-nowrap">
                        {value?.value !== undefined
                          ? typeof value.value === "number"
                            ? formatNumber(value.value)
                            : value.value
                          : "0"}
                      </div>
                    ),
                  };
                }

                let cellClassName = "unbalance-cell";
                if (value?.value === 0) {
                  cellClassName = "unbalance-cell-balanced";
                } else if (
                  value?.value !== null &&
                  value?.value !== undefined
                ) {
                  cellClassName = "unbalance-cell-unbalanced";
                }

                return {
                  props: { className: cellClassName },
                  children: (
                    <div className="w-full text-center font-normal tabular-nums tracking-tight whitespace-nowrap">
                      {value?.value !== undefined
                        ? typeof value.value === "number"
                          ? formatNumber(value.value)
                          : value.value
                        : "0"}
                    </div>
                  ),
                };
              }

              return (
                <div className="w-full text-center font-normal tabular-nums tracking-tight whitespace-nowrap">
                  {value?.value !== undefined
                    ? typeof value.value === "number"
                      ? formatNumber(value.value)
                      : value.value
                    : "0"}
                </div>
              );
            },
          };
        }),
      },
    ];
  }, [getCurrentMaterialData, activeTab, isAdjusted, getUnit]);

  const getCurrentData = useMemo(() => {
    return getCurrentMaterialData ? getCurrentMaterialData.data : [];
  }, [getCurrentMaterialData]);

  const handleMatrixAdjustment = useCallback(
    async (values: { currentValue: number; newValue: number }) => {
      try {
        const currentData = activeTab === "before" ? beforeData : adjustedData;
        if (!currentData || !selectedCell) return;

        const requestBody = {
          profile_id: currentData.profile_id,
          data_id: currentData.data_id,
          tanggal: currentData.tanggal,
          adjustment_items: [
            {
              material: activeMaterial,
              col_key: selectedCell.fromKey,
              row_key: selectedCell.rowKey,
              value: values.newValue,
            },
          ],
        };

        const response = await api.post<MatrixTieInResponse>(
          "/tiein/matrix-tiein/adjustment",
          requestBody
        );
        setAdjustedData(response.data);
        message.success("Matrix value adjusted successfully");
        setIsMatrixAdjustmentModalOpen(false);
      } catch (error) {
        console.error("Error adjusting matrix value:", error);
        message.error("Failed to adjust matrix value");
      }
    },
    [activeTab, beforeData, adjustedData, selectedCell, activeMaterial]
  );

  const handleDownload = useCallback(async () => {
    try {
      const response = await api.get("/tiein/matrix-tiein/download_excel", {
        params: { tanggal: formattedDate },
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const contentDisposition = response.headers["content-disposition"];
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1].replace(/"/g, "")
        : `matrix_tiein_${formattedDate}.xlsx`;

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success("Matrix downloaded successfully");
    } catch (error) {
      console.error("Error downloading matrix:", error);
      message.error("Failed to download matrix");
    }
  }, [formattedDate]);

  const renderTable = () => {
    const noDataMessage = () => (
      <div className="text-center p-5">No data available for this date</div>
    );

    if (loading) {
      return <div className="text-center p-5">Loading data...</div>;
    }

    if (error) {
      return <div className="text-center p-5 text-danger">{error}</div>;
    }

    const data = getCurrentData;
    if (!data || data.length === 0) {
      return noDataMessage();
    }

    return (
      <div className="mt-5 rounded-lg overflow-hidden">
        <Table
          columns={generateColumns}
          dataSource={data}
          pagination={false}
          bordered
          className="[&_.ant-table-thead>tr>th]:!bg-neutral-250 [&_.ant-table-thead>tr>th]:!text-neutral-900 [&_.ant-table-thead>tr>th]:!font-semibold [&_.ant-table-thead>tr>th]:!text-center [&_.ant-table-thead>tr>th]:!p-3 [&_.ant-table-thead>tr>th.ant-table-cell-fix-left]:!bg-neutral-250 [&_.ant-table-thead>tr>th.ant-table-cell-fix-left]:!font-semibold [&_.ant-table-tbody>tr>td]:!text-center [&_.ant-table-tbody>tr>td]:!bg-[#f1f2f3] [&_.ant-table-tbody>tr>td]:!p-3 [&_.ant-table-tbody>tr>td.ant-table-cell-fix-left]:!bg-neutral-250 [&_.ant-table-tbody>tr>td.ant-table-cell-fix-left]:!font-semibold [&_.ant-table-tbody>tr:last-child>td]:!bg-neutral-250 [&_.ant-table-tbody>tr:hover>td]:!bg-[#f1f2f3] [&_.ant-table-tbody>tr:last-child:hover>td]:!bg-neutral-250 [&_.ant-table-cell]:!text-14 [&_.ant-table-thead>tr>th:last-child]:!bg-neutral-250 [&_.ant-table-tbody>tr>td:last-child]:!bg-neutral-250 [&_.ant-table-thead>tr:first-child>th:first-child]:capitalize [&_.ant-table-thead>tr:last-child>th:nth-child(2)]:italic [&_.ant-table-thead>tr:last-child>th:nth-child(2)]:font-normal [&_.ant-table-thead>tr:last-child>th:nth-child(2)]:!text-[#666] [&_.ant-table-tbody>tr>td[rowspan]]:align-middle [&_.ant-table-tbody>tr>td[rowspan]]:!bg-neutral-250 [&_.ant-table-tbody>tr>td[rowspan]]:!font-medium [&_.ant-table-tbody>tr:hover>td[rowspan]]:!bg-neutral-250 [&_.diagonal-cell]:!bg-[#ebebeb] [&_.ant-table-tbody>tr>td.diagonal-cell]:!bg-[#ebebeb] [&_.ant-table-tbody>tr:hover>td.diagonal-cell]:!bg-[#ebebeb] [&_.unit-label-column]:!font-semibold [&_.ant-table-tbody>tr>td.unit-label-column]:!font-semibold [&_.ant-table-tbody>tr>td[data-column='unit_label']]:!font-semibold [&_.ant-table-thead>tr>th.adjust-column]:!bg-primary-300 [&_.ant-table-thead>tr>th.adjust-column]:!text-white [&_.ant-table-tbody>tr>td.clickable-cell]:!cursor-pointer [&_.ant-table-tbody>tr>td.clickable-cell]:!bg-[#f1f2f3] [&_.ant-table-tbody>tr>td.clickable-cell:hover]:!bg-[#e0e0e0] [&_.ant-table-tbody>tr>td.adjusted-cell]:!bg-secondary-300 [&_.ant-table-tbody>tr>td.adjusted-cell]:!text-white [&_.ant-table-tbody>tr>td.adjusted-cell:hover]:!bg-secondary-500 [&_.row-unbalance_impor]:!font-semibold [&_.row-unbalance_impor]:sticky [&_.row-unbalance_impor]:!bottom-0 [&_.row-unbalance_impor]:!z-[11] [&_.row-unbalance_impor]:!bg-neutral-250 [&_.row-unbalance_impor>td]:sticky [&_.row-unbalance_impor>td]:!bottom-0 [&_.row-unbalance_impor>td]:!z-[11] [&_.row-unbalance_impor>td]:!bg-neutral-250 [&_.row-unbalance_impor>td]:!font-semibold [&_.row-unbalance_impor>td]:!border-t-2 [&_.row-unbalance_impor>td]:!border-[#d9d9d9] [&_.row-unbalance_impor>td:first-child]:sticky [&_.row-unbalance_impor>td:first-child]:!left-0 [&_.row-unbalance_impor>td:first-child]:!z-[12] [&_.row-unbalance_impor>td:first-child]:!bg-neutral-700 [&_.row-unbalance_impor>td:first-child]:!text-white [&_.row-unbalance_impor:hover>td]:!bg-neutral-250 [&_.row-unbalance_impor:hover>td:first-child]:!bg-neutral-700 [&_.row-unbalance_impor:hover>td:first-child]:!text-white [&_.row-total_impor]:!font-semibold [&_.row-total_impor]:!bg-neutral-250 [&_.row-total_impor>td]:!bg-neutral-250 [&_.row-total_impor>td]:!font-semibold [&_.row-total_impor>td]:!border-t [&_.row-total_impor>td]:!border-[#d9d9d9] [&_.row-total_impor>td:first-child]:!bg-neutral-250 [&_.row-total_impor>td:first-child]:!font-semibold [&_.ant-table-tbody>tr>td.unbalance-cell]:!text-center [&_.ant-table-tbody>tr>td.unbalance-cell-balanced]:!bg-success [&_.ant-table-tbody>tr>td.unbalance-cell-balanced]:!text-white [&_.ant-table-tbody>tr>td.unbalance-cell-balanced]:!font-normal [&_.ant-table-tbody>tr>td.unbalance-cell-unbalanced]:!bg-danger [&_.ant-table-tbody>tr>td.unbalance-cell-unbalanced]:!text-white [&_.ant-table-tbody>tr>td.unbalance-cell-unbalanced]:!font-normal [&_.ant-table-tbody>tr:hover>td.unbalance-cell-balanced]:!bg-success [&_.ant-table-tbody>tr:hover>td.unbalance-cell-unbalanced]:!bg-danger [&_.ant-table-tbody>tr>td.unbalance-column]:!bg-neutral-250 [&_.ant-table-tbody>tr>td.unbalance-column]:!font-semibold [&_.ant-table-tbody>tr>td.unbalance-column]:!border-l-2 [&_.ant-table-tbody>tr>td.unbalance-column]:!border-[#d9d9d9] [&_.ant-table-tbody>tr>td.unbalance-column]:!text-neutral-700 [&_.ant-table-tbody>tr:hover>td.unbalance-column]:!bg-neutral-250 [&_.ant-table-thead>tr>th.unbalance-column-header]:!bg-neutral-700 [&_.ant-table-thead>tr>th.unbalance-column-header]:!text-white [&_.ant-table-thead>tr>th.unbalance-column-header]:sticky [&_.ant-table-thead>tr>th.unbalance-column-header]:!top-0 [&_.ant-table-thead>tr>th.unbalance-column-header]:!z-[2] [&_.ant-table-thead>tr>th[key='total_ekspor']]:!bg-neutral-250 [&_.ant-table-thead>tr>th[key='total_ekspor']]:!text-neutral-900 [&_.ant-table-thead>tr>th[key='total_ekspor']]:!font-semibold [&_.ant-table-thead>tr>th[key='total_ekspor']]:!text-center [&_.ant-table-tbody>tr>td[data-column='total_ekspor']]:!bg-neutral-250 [&_.ant-table-tbody>tr>td[data-column='total_ekspor']]:!font-semibold [&_.ant-table-tbody>tr>td[data-column='total_ekspor']]:!border-l [&_.ant-table-tbody>tr>td[data-column='total_ekspor']]:!border-[#d9d9d9] [&_.ant-table-tbody>tr>td[data-column='total_ekspor']]:!text-neutral-700 [&_.ant-table-tbody>tr:hover>td[data-column='total_ekspor']]:!bg-neutral-250"
          scroll={{ x: "max-content" }}
          onRow={(record) => ({
            className: `row-${record.key}`,
          })}
        />
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner text="Loading data..." />;
  }

  return (
    <div className="p-4 px-5">
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
            title: <span className="lastBreadcrumbItem">Generate Matrix</span>,
          },
        ]}
        className="customBreadcrumb separatorSpacing"
      />

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3 mb-[18px] mt-[34px]">
          <span></span>
          <DatePicker
            disabled
            value={selectedDate}
            format="dddd, DD MMMM YYYY"
            className="boldDatePicker"
          />
        </div>
        <Button
          type="default"
          className="customSecondaryButton btn-md"
          onClick={handleDownload}>
          <span className="font-normal">Download all matrix</span>
          <HiDownload size={24} className="ml-1" />
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap mt-0 mb-5">
        {beforeData?.material_data.map((tab) => (
          <Button
            key={tab.material}
            className={`customSecondaryButton ${
              activeMaterial === tab.material ? "activeButton" : ""
            }`}
            onClick={() => setActiveMaterial(tab.material)}>
            {tab.material}
          </Button>
        ))}
      </div>

      <div className="rounded-lg p-4">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-center gap-4">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              className="customTabs flex-1">
              <TabPane tab="Before" key="before" />
              <TabPane
                tab="Adjusted"
                key="adjusted"
                disabled={!adjustedData || !adjustedData.material_data}
              />
            </Tabs>
          </div>
        </div>
        {renderTable()}
      </div>

      <AdjustmentConfirmationModal
        isOpen={isAdjustConfirmationOpen}
        isRevert={activeTab === "adjusted"}
        onClose={() => setIsAdjustConfirmationOpen(false)}
        onConfirm={handleAdjustConfirm}
        onRevert={handleRevertAdjustment}
      />

      <MatrixAdjustmentModal
        isOpen={isMatrixAdjustmentModalOpen}
        onClose={() => setIsMatrixAdjustmentModalOpen(false)}
        onConfirm={handleMatrixAdjustment}
        currentValue={selectedCell?.currentValue || 0}
        fromUnit={selectedCell?.fromUnit || ""}
        toUnit={selectedCell?.toUnit || ""}
      />
    </div>
  );
};

export default GenerateMatrixPage;

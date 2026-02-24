"use client";

/**
 * Compare Page - Data comparison interface for cleansing validation
 *
 * This component provides a comprehensive data comparison tool that allows users to:
 * - Upload Excel files containing reference data (PKT)
 * - Compare uploaded data against system data (UGM) for a specific date
 * - View hourly comparisons and TDA (Time Default Average) comparisons
 * - Filter to show only different values
 * - Edit and save comparison results
 * - Navigate between factories and parts
 *
 * Color coding:
 * - Red (#E20301): UGM values that differ from PKT
 * - Green (#00AD17): PKT values that differ from UGM
 * - Gray (#eeeff1): Values that match (is_same = true)
 *
 * @component
 * @responsive - Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
 */

import { useState, useEffect } from "react";
import {
  DatePicker,
  Button,
  Upload,
  Switch,
  message,
  Breadcrumb,
  Tabs,
  Table,
} from "antd";
import { UploadOutlined, DeleteOutlined } from "@ant-design/icons";
import { MdArrowForwardIos, MdOutlineUndo, MdRestartAlt } from "react-icons/md";
import Link from "next/link";
import type { UploadFile, UploadProps } from "antd/es/upload/interface";
import { useDateContext } from "@/context/DateContext";
import api from "@/utils/axios";
import axios from "axios";
import type { ColumnType } from "antd/es/table";
import { formatNumber } from "@/utils/numberFormat";

/**
 * Factory/Pabrik entity
 */
interface Factory {
  _id: string;
  pabrik_id: number;
  name: string;
}

/**
 * Part/Bagian entity - section within a factory
 */
interface Part {
  _id: string;
  bagian_id: number;
  name: string;
  pabrik_id: number;
  pabrik_name: string;
}

/**
 * Comparison data for a single time point
 */
interface ComparisonData {
  ugm: number | null; // System data value
  pkt: number | null; // Reference/uploaded data value
  is_same: boolean; // Whether values match
}

/**
 * Tag data containing all time-based comparisons
 */
interface TagData {
  alias: string;
  tag_found: boolean;
  data: {
    [timeKey: string]: ComparisonData; // Hourly data (e.g., "00:00", "01:00")
  };
  tda_default: ComparisonData; // Time Default Average comparison
}

/**
 * Complete comparison result for a factory/part combination
 */
interface ComparisonResult {
  pabrik_name: string;
  bagian_name: string;
  pabrik_id: number;
  bagian_id: number;
  data: TagData[];
  data_found: boolean;
}

export default function ComparePage() {
  // File upload state
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Edit mode toggle
  const [editMode, setEditMode] = useState(false);

  // Date context
  const { selectedDate, formattedDate } = useDateContext();

  // Factory and parts data
  const [factories, setFactories] = useState<Factory[]>([]);
  const [partsData, setPartsData] = useState<Part[]>([]);

  // Active selections
  const [activeTab, setActiveTab] = useState<string>("1");
  const [activePart, setActivePart] = useState<string>("");

  // Comparison results and UI state
  const [showButtonTabs, setShowButtonTabs] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<
    ComparisonResult[]
  >([]);

  // Table pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Loading and filter states
  const [isComparing, setIsComparing] = useState(false);
  const [showOnlyDifferent, setShowOnlyDifferent] = useState(true);

  /**
   * Fetch factories and parts data on mount
   * Sets up initial active part selection
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const factoriesResponse = await api.get("/pabrik");
        const fetchedFactories = factoriesResponse.data;
        setFactories(fetchedFactories);

        const partsResponse = await api.get("/bagian");
        const partsWithFactoryNames = partsResponse.data.map((item: Part) => {
          const matchingFactory = fetchedFactories.find(
            (factory: Factory) => factory.pabrik_id === item.pabrik_id,
          );

          return {
            ...item,
            pabrik_name: matchingFactory?.name || `Pabrik ${item.pabrik_id}`,
          };
        });

        setPartsData(partsWithFactoryNames);

        // Set initial active part if available
        if (partsWithFactoryNames.length > 0) {
          setActivePart(partsWithFactoryNames[0].name);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          console.log(error.response.data.error);
        } else {
          console.log(error);
        }
      }
    };

    fetchData();
  }, []);

  /**
   * Handles file upload change events
   * Updates file list and shows progress
   *
   * @param info - Upload change info from Ant Design
   */
  const handleUpload: UploadProps["onChange"] = (info) => {
    const { status, percent } = info.file;

    const newFileList = [...info.fileList];
    newFileList[0] = {
      ...newFileList[0],
      percent,
    };
    setFileList(newFileList);

    if (status === "done") {
      message.success(`${info.file.name} file uploaded successfully.`);
    } else if (status === "error") {
      message.error(`${info.file.name} file upload failed.`);
    }
  };

  /**
   * Handles comparison operation
   * Uploads Excel file and compares with system data for selected date
   *
   * API Endpoint: POST /utils/compare
   * Payload: FormData with reference_date and excel_file
   */
  const handleCompare = async () => {
    if (!fileList.length) {
      message.warning("Please upload a file first");
      return;
    }

    setIsComparing(true);

    try {
      const file = fileList[0].originFileObj;
      if (!file) {
        message.error("File not found");
        return;
      }

      const formData = new FormData();
      formData.append("reference_date", formattedDate);
      formData.append("excel_file", file);

      try {
        const response = await api.post("/utils/compare", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        setComparisonResults(response.data);
        setShowButtonTabs(true);
        message.success("Comparison completed successfully");
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          message.error(error.response.data.error || "Failed to compare data");
        } else {
          message.error("An error occurred during comparison");
        }
      }
    } catch (err) {
      console.error("Error during comparison:", err);
      message.error("Failed to process file");
    } finally {
      setIsComparing(false);
    }
  };

  /**
   * Handles save operation in edit mode
   * TODO: Implement actual save logic
   */
  const handleSave = () => {
    if (editMode) {
      message.success("Data saved successfully");
      setEditMode(false);
    }
  };

  /**
   * Removes uploaded file from file list
   */
  const handleDelete = () => {
    setFileList([]);
  };

  /**
   * Generate tab items for factory navigation
   */
  const items = factories.map((factory) => ({
    label: factory.name,
    key: factory.pabrik_id.toString(),
  }));

  /**
   * Gets parts filtered by currently active factory
   *
   * @returns Array of parts for active factory
   */
  const getPartsForActiveFactory = () => {
    return partsData.filter((part) => part.pabrik_id.toString() === activeTab);
  };

  /**
   * Generates content for a specific part
   * Creates comparison table with hourly and TDA columns
   *
   * @returns JSX element or message string
   */
  const getPartContent = () => {
    if (!showButtonTabs) {
      return "Please click compare button to see results";
    }

    const activeFactoryId = parseInt(activeTab);
    const activeResult = comparisonResults.find(
      (result) =>
        result.pabrik_id === activeFactoryId &&
        result.bagian_name === activePart,
    );

    if (!activeResult?.data_found) {
      return "No data found for this section";
    }

    // Filter out tags where tag_found is false
    let filteredData = activeResult.data.filter((tag) => tag.tag_found);

    // Apply filter based on showOnlyDifferent state
    if (showOnlyDifferent) {
      // Filter to only show tags that have at least one comparison with is_same = false
      filteredData = filteredData.filter((tag) => {
        // Check hourly data
        for (const timeKey in tag.data) {
          if (tag.data[timeKey]?.is_same === false) {
            return true;
          }
        }

        // Check TDA default data
        if (tag.tda_default?.is_same === false) {
          return true;
        }

        // If no comparison data has is_same = false, filter out this tag
        return false;
      });
    }

    /**
     * Table columns configuration
     * - Fixed left: Alias column
     * - Middle: 25 hourly pairs (UGM/PKT) from 00:00 to 24:00
     * - Fixed right: TDA UGM/PKT columns
     *
     * Color coding in onCell:
     * - Red background (#E20301) with white text for UGM when is_same=false
     * - Green background (#00AD17) with white text for PKT when is_same=false
     * - Gray background (#eeeff1) when is_same=true
     */
    const columns: ColumnType<TagData>[] = [
      {
        title: "Alias",
        dataIndex: "alias",
        key: "alias",
        fixed: "left" as const,
        width: 150,
        align: "center",
        onCell: () => ({
          className: "default-bg",
          style: {
            textAlign: "center",
          },
        }),
      },
      // Generate 25 hourly columns (00:00 to 24:00)
      ...Array.from({ length: 25 }, (_, i) => {
        const hour = i.toString().padStart(2, "0") + ":00";
        return [
          // UGM column for this hour
          {
            title: `${hour} UGM`,
            dataIndex: ["data", hour, "ugm"],
            key: `${hour}_ugm`,
            width: 120,
            align: "center",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render: (value: any) =>
              typeof value === "number"
                ? formatNumber(value, { decimals: 2, locale: "id-ID" })
                : "-",
            onCell: (record: TagData) => ({
              className:
                record.data[hour]?.is_same === false ? undefined : "default-bg",
              style: {
                backgroundColor:
                  record.data[hour]?.is_same === false ? "#E20301" : undefined,
                color:
                  record.data[hour]?.is_same === false ? "#fff" : undefined,
                textAlign: "center",
              },
            }),
          } as ColumnType<TagData>,
          // PKT column for this hour
          {
            title: `${hour} PKT`,
            dataIndex: ["data", hour, "pkt"],
            key: `${hour}_pkt`,
            width: 120,
            align: "center",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            render: (value: any) =>
              typeof value === "number"
                ? formatNumber(value, { decimals: 2, locale: "id-ID" })
                : "-",
            onCell: (record: TagData) => ({
              className:
                record.data[hour]?.is_same === false ? undefined : "default-bg",
              style: {
                backgroundColor:
                  record.data[hour]?.is_same === false ? "#00AD17" : undefined,
                color:
                  record.data[hour]?.is_same === false ? "#fff" : undefined,
                textAlign: "center",
              },
            }),
          } as ColumnType<TagData>,
        ];
      }).flat(),
      // TDA columns (fixed right)
      {
        title: "TDA UGM",
        dataIndex: ["tda_default", "ugm"],
        key: "tda_ugm",
        width: 120,
        align: "center",
        fixed: "right" as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render: (value: any) =>
          typeof value === "number"
            ? formatNumber(value, { decimals: 2, locale: "id-ID" })
            : "-",
        onCell: (record: TagData) => ({
          className:
            record.tda_default?.is_same === false ? undefined : "default-bg",
          style: {
            backgroundColor:
              record.tda_default?.is_same === false ? "#E20301" : undefined,
            color: record.tda_default?.is_same === false ? "#fff" : undefined,
            textAlign: "center",
          },
        }),
      } as ColumnType<TagData>,
      {
        title: "TDA PKT",
        dataIndex: ["tda_default", "pkt"],
        key: "tda_pkt",
        width: 120,
        align: "center",
        fixed: "right" as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render: (value: any) =>
          typeof value === "number"
            ? formatNumber(value, { decimals: 2, locale: "id-ID" })
            : "-",
        onCell: (record: TagData) => ({
          className:
            record.tda_default?.is_same === false ? undefined : "default-bg",
          style: {
            backgroundColor:
              record.tda_default?.is_same === false ? "#00AD17" : undefined,
            color: record.tda_default?.is_same === false ? "#fff" : undefined,
            textAlign: "center",
          },
        }),
      } as ColumnType<TagData>,
    ];

    return (
      <div className="overflow-x-auto">
        <Table
          // Custom table styling using global CSS classes (defined in globals.css)
          className="[&_.ant-table-thead>tr>th]:bg-neutral-250 [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-thead>tr>th]:text-center [&_.ant-table-thead>tr>th>.ant-table-cell-content]:justify-center [&_.ant-table-tbody>tr>td]:text-center [&_.ant-table-tbody>tr>td.default-bg]:bg-[#eeeff1] [&_.ant-table-cell]:text-[16.8px]"
          columns={columns}
          dataSource={filteredData}
          rowKey="alias"
          scroll={{ x: "max-content" }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: filteredData.length,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items`,
            pageSizeOptions: ["10", "15", "20", "50", "100"],
            position: ["bottomRight"],
            // Pagination styling with Tailwind classes
            className:
              "my-4 [&_.ant-pagination-item-active]:bg-primary-300 [&_.ant-pagination-item-active]:border-primary-300 [&_.ant-pagination-item-active_a]:text-white [&_.ant-select-selector]:rounded [&_.ant-pagination-options]:ml-4",
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
          size="middle"
        />
      </div>
    );
  };

  return (
    <div className="px-4 py-4 sm:px-5 md:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        separator={
          <MdArrowForwardIos size={16} className="inline-block align-middle" />
        }
        items={[
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
              <span className="text-neutral-900 text-20 font-semibold">
                Compare
              </span>
            ),
          },
        ]}
        className="customBreadcrumb separatorSpacing mb-4"
      />

      {/* Date Picker Section - Responsive */}
      <div className="flex items-center mt-7 mb-6">
        <span className="text-neutral-500 mr-3"></span>
        <DatePicker
          disabled
          value={selectedDate}
          format="dddd, DD MMMM YYYY"
          className="boldDatePicker"
        />
      </div>

      {/* Upload and Compare Controls - Responsive flex layout */}
      <div className="flex flex-col sm:flex-row gap-4 items-start mb-6">
        {/* Upload Section */}
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <Upload
            accept=".xlsx"
            maxCount={1}
            fileList={fileList}
            onChange={handleUpload}
            showUploadList={false}
            progress={{
              strokeColor: {
                "0%": "#F47920",
                "100%": "#1268B3",
              },
              strokeWidth: 3,
              format: (percent) =>
                percent ? `${parseFloat(percent.toFixed(2))}%` : "0%",
              style: { width: "100%" },
            }}>
            <Button
              icon={<UploadOutlined />}
              className="h-11 text-[20.16px] flex items-center gap-2">
              <span className="hidden sm:inline">Upload .xlsx only</span>
              <span className="sm:hidden">Upload</span>
            </Button>
          </Upload>

          {/* File info display - only show when file is uploaded */}
          {fileList.length > 0 && (
            <div className="flex items-center gap-2 text-red-500 ml-2 text-[16.8px]">
              <span className="truncate max-w-[200px] sm:max-w-none">
                {fileList[0]?.name}
              </span>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
              />
            </div>
          )}
        </div>

        {/* Compare Button */}
        <Button
          type="primary"
          onClick={handleCompare}
          className="bg-primary-300 border-primary-300 rounded px-4 h-11 text-xl flex items-center justify-center font-semibold text-neutral-100 hover:bg-primary-700 hover:border-primary-700 active:bg-neutral-900 active:border-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300 w-full sm:w-auto"
          loading={isComparing}>
          Compare
        </Button>
      </div>

      {/* Factory Tabs and Edit Controls - Responsive layout */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            const partsForFactory = partsData.filter(
              (part) => part.pabrik_id.toString() === key,
            );
            if (partsForFactory.length > 0) {
              setActivePart(partsForFactory[0].name);
            }
          }}
          items={items}
          className="customTabs flex-1 min-w-0"
        />

        {/* Edit Section - Stack on mobile, row on desktop */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4 rounded-lg w-full lg:w-auto lg:shrink-0">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span>Edit data</span>
            <Switch
              checked={editMode}
              onChange={setEditMode}
              className="customSwitch"
            />
            <Button
              type="default"
              icon={<MdOutlineUndo size={24} />}
              className="w-11 h-11 border border-neutral-700 flex items-center justify-center p-1 bg-transparent"
            />
            <Button
              type="default"
              icon={<MdRestartAlt size={24} />}
              className="w-11 h-11 border border-neutral-700 flex items-center justify-center p-1 bg-transparent"
            />
          </div>
          <Button
            type="primary"
            onClick={handleSave}
            disabled={!editMode}
            className="bg-primary-300 border-primary-300 rounded px-4 h-11 text-xl flex items-center justify-center font-semibold text-neutral-100 hover:bg-primary-700 hover:border-primary-700 active:bg-neutral-900 active:border-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300 w-full sm:w-auto">
            Save
          </Button>
        </div>
      </div>

      {/* Part Selection Buttons and Filter - Only show after comparison */}
      {showButtonTabs && (
        <>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-5 flex-wrap gap-4">
            {/* Part selection buttons - Responsive flex wrap */}
            <div className="flex gap-3 flex-wrap flex-1">
              {getPartsForActiveFactory().map((part) => (
                <Button
                  key={part._id}
                  className={`bg-transparent border rounded px-4 h-9 flex items-center justify-center font-semibold hover:bg-secondary-300 hover:border-secondary-300 hover:text-neutral-100 active:bg-neutral-500 active:border-neutral-500 disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-[#eeeff1] ${
                    activePart === part.name
                      ? "bg-secondary-300 border-secondary-300 border-2 text-neutral-100"
                      : "border-neutral-700 text-neutral-900"
                  }`}
                  onClick={() => setActivePart(part.name)}>
                  {part.name}
                </Button>
              ))}
            </div>

            {/* Filter toggle - Align right on desktop, full width on mobile */}
            <div className="flex items-center justify-end text-[16.8px] whitespace-nowrap w-full lg:w-auto">
              <span className="mr-2 text-neutral-700">
                Show only different data
              </span>
              <Switch
                checked={showOnlyDifferent}
                onChange={setShowOnlyDifferent}
                className="customSwitch"
              />
            </div>
          </div>
        </>
      )}

      {/* Main Content Area - Comparison table or message */}
      <div className="flex-1 bg-[#eeeff1] rounded-lg p-4 sm:p-6 mb-6">
        {typeof getPartContent() === "string" ? (
          <div className="text-center text-neutral-300 py-12 text-[20.16px] font-normal">
            {getPartContent()}
          </div>
        ) : (
          getPartContent()
        )}
      </div>
    </div>
  );
}

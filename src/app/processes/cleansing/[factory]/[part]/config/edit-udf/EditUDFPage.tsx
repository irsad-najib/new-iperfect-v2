"use client";

/**
 * Edit UDF Page - User-Defined Function editor with testing capabilities
 *
 * This component provides a comprehensive UDF editing interface with:
 * - Live code editing in CodeMirror editor
 * - Test execution with selectable input tags
 * - Test results visualization in table format
 * - STDOUT and debugging logs display
 * - UDF name editing
 * - Update confirmation workflow
 * - Recent tested tag tracking
 *
 * Testing Flow:
 * 1. Select a tag from available inputs
 * 2. Run test against selected tag
 * 3. View results in table
 * 4. Check STDOUT and logs for debugging
 * 5. Update UDF when satisfied
 *
 * @component
 * @responsive - Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
 */

import React, { useState } from "react";
import {
  Breadcrumb,
  DatePicker,
  Button,
  Table,
  message,
  Input,
  Modal,
  Select,
} from "antd";
import type { ColumnType } from "antd/es/table";
import { MdArrowForwardIos, MdInfo } from "react-icons/md";
import Link from "next/link";
import CodeEditor from "@/components/processes/cleansing/CodeEditor";
import { useDateContext } from "@/context/DateContext";
import { useParams, useSearchParams } from "next/navigation";
import api from "@/utils/axios";
import { useRouter } from "next/navigation";

/**
 * Test execution result for a single time point
 */
interface TestResult {
  value: number;
  time: string;
}

/**
 * Debug log entry from UDF execution
 */
interface LogData {
  level: string;
  message: string;
  code: string;
}

/**
 * Table row structure for test results display
 */
interface TableDataType {
  label: string;
  [key: string]: string | number; // Dynamic time columns
}

const EditUDFPage: React.FC = () => {
  const { selectedDate, formattedDate } = useDateContext();
  const params = useParams() as {
    factory: string;
    part: string;
  };
  const searchParams = useSearchParams()!;

  // Code and name editing state
  const [editedCode, setEditedCode] = useState("");
  const [editedName, setEditedName] = useState("");

  // Test execution state
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [hasRunTest, setHasRunTest] = useState(false);
  const [stdoutMessage, setStdoutMessage] = useState<string>("");
  const [logData, setLogData] = useState<LogData[]>([]);

  // Available inputs and tag selection
  const [availableInputs, setAvailableInputs] = useState<string[]>([]);
  const [isTestModalVisible, setIsTestModalVisible] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [lastTestedTag, setLastTestedTag] = useState<string>("");

  // URL params
  const factory = params.factory;
  const part = params.part;
  const factoryName =
    searchParams.get("factoryName") || `Pabrik ${params.factory}`;
  const partName = searchParams.get("partName") || params.part;
  const udfName = searchParams.get("udfName") || "";
  const udfId = searchParams.get("udfId") || "";
  const pipelineId = searchParams.get("pipelineId") || "";
  const groupId = searchParams.get("groupId") || "";
  const idsName = searchParams.get("idsName") || "";

  // Update confirmation
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [storedUDFCode, setStoredUDFCode] = useState("");
  const router = useRouter();

  /**
   * Initialize UDF name and code from URL params and sessionStorage
   * Fetch available input tags for testing
   */
  React.useEffect(() => {
    setEditedName(udfName);

    // Get UDF code from sessionStorage (set by config page)
    const tempUDFCode = sessionStorage.getItem("temp_udf_code");
    if (tempUDFCode) {
      setEditedCode(tempUDFCode);
      setStoredUDFCode(tempUDFCode);
      sessionStorage.removeItem("temp_udf_code");
    }

    // Fetch available input tags
    const fetchAvailableInputs = async () => {
      try {
        const response = await api.get(
          `/udf/utils/available-input-cleaning-test?bagian_id=${part}`
        );
        if (Array.isArray(response.data)) {
          setAvailableInputs(response.data);
        }
      } catch (error) {
        console.error("Error fetching available inputs:", error);
        message.error("Failed to fetch available inputs");
      }
    };

    fetchAvailableInputs();
  }, [part, udfName]);

  const handleCodeChange = (code: string) => {
    setEditedCode(code);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  /**
   * Opens tag selection modal for test execution
   */
  const handleRunTestClick = () => {
    if (!editedName.trim()) {
      message.error("UDF name cannot be empty");
      return;
    }
    setIsTestModalVisible(true);
  };

  const handleTestModalCancel = () => {
    setIsTestModalVisible(false);
    setSelectedTag("");
  };

  /**
   * Executes UDF test against selected tag
   * API endpoint: POST /udf/execute/cleaning
   */
  const handleRunTest = async () => {
    if (!selectedTag) {
      message.error("Please select a tag for testing");
      return;
    }

    setIsTestModalVisible(false);
    setIsTestLoading(true);
    try {
      const payload = {
        pipeline_id: pipelineId,
        udf_id: udfId,
        tanggal: formattedDate,
        udf_data: {
          udf: {
            _id: udfId,
            name: editedName.trim(),
            code: editedCode || storedUDFCode || "",
          },
          inputs: [],
        },
        test_data: selectedTag,
      };

      const response = await api.post("/udf/execute/cleaning", payload);
      const result = response.data?.result?.value;
      const stdout =
        response.data?.stdout || "No output message from the process.";
      const logs = response.data?.log || [];

      setStdoutMessage(stdout);
      setLogData(logs);

      if (result) {
        const testData = Array.isArray(result) ? result : result.data;

        if (Array.isArray(testData)) {
          setTestResults(testData);
          setHasRunTest(true);
          setLastTestedTag(selectedTag);
          message.success("Test executed successfully");
        } else {
          message.warning("Test executed but no valid results returned");
        }
      } else {
        message.warning("Test executed but no results returned");
      }
    } catch (error) {
      console.error("Error running test:", error);
      message.error("Failed to run test");
      setStdoutMessage("Error occurred while running the test.");
      setLogData([]);
    } finally {
      setIsTestLoading(false);
      setSelectedTag("");
    }
  };

  /**
   * Shows update confirmation modal
   */
  const showUpdateConfirmation = () => {
    if (!editedName.trim()) {
      message.error("UDF name cannot be empty");
      return;
    }
    setIsUpdateModalVisible(true);
  };

  const handleUpdateCancel = () => {
    setIsUpdateModalVisible(false);
  };

  /**
   * Updates UDF in pipeline
   * API endpoint: PUT /pipeline/{pipelineId}/group/{groupId}/udf/{idsName}/{udfId}
   */
  const handleUpdateUDF = async () => {
    setIsUpdateModalVisible(false);
    try {
      const payload = {
        tanggal: formattedDate,
        udf: {
          _id: udfId,
          name: editedName.trim(),
          code: editedCode || storedUDFCode || "",
        },
        inputs: [],
      };

      await api.put(
        `/pipeline/${pipelineId}/group/${groupId}/udf/${idsName}/${udfId}`,
        payload
      );

      message.success("UDF updated successfully");
      router.push(
        `/processes/cleansing/${factory}/${part}/config?factoryName=${factoryName}&partName=${partName}`
      );
    } catch (error) {
      console.error("Error updating UDF:", error);
      message.error("Failed to update UDF");
    }
  };

  /**
   * Transforms test results into table format
   * Creates single row with dynamic time columns
   */
  const transformTestResults = () => {
    if (!testResults.length) return [];

    return [
      {
        label: "Value",
        ...testResults.reduce((acc, curr) => {
          acc[curr.time] = curr.value;
          return acc;
        }, {} as Record<string, number>),
      },
    ];
  };

  /**
   * Generates table columns from test results
   * First column is fixed label, rest are time-based
   */
  const columns: ColumnType<TableDataType>[] = [
    {
      title: "Time",
      dataIndex: "label",
      key: "label",
      width: "80px",
      fixed: "left" as const,
    },
    ...testResults.map((result) => ({
      title: result.time,
      dataIndex: result.time,
      key: result.time,
      width: "100px",
    })),
  ];

  const breadcrumbItems = [
    {
      title: (
        <Link className="breadcrumbLink" href="/processes">
          <span className="linkText">Processes</span>
        </Link>
      ),
    },
    {
      title: (
        <Link className="breadcrumbLink" href="/processes/cleansing">
          <span className="linkText">Cleansing</span>
        </Link>
      ),
    },
    { title: <span>{factoryName}</span> },
    { title: <span className="lastBreadcrumbItem">{partName}</span> },
    {
      title: (
        <Link
          className="breadcrumbLink"
          href={`/processes/cleansing/${factory}/${part}/config?factoryName=${factoryName}&partName=${partName}`}>
          <span className="linkText lastBreadcrumbItem ">Configuration</span>
        </Link>
      ),
    },
    { title: <span className="lastBreadcrumbItem">Edit UDF</span> },
  ];

  return (
    <div className="px-4 py-4 sm:px-5 md:px-6 lg:px-8 min-h-screen">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        separator={<MdArrowForwardIos size={16} />}
        items={breadcrumbItems}
        className="customBreadcrumb separatorSpacing"
      />

      {/* Header Section - Responsive flex layout */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center my-7 gap-4">
        {/* Date Picker */}
        <div className="flex items-center gap-3">
          <span></span>
          <DatePicker
            disabled
            value={selectedDate}
            format="dddd, DD MMMM YYYY"
            className="boldDatePicker"
          />
        </div>

        {/* UDF Controls - Stack on mobile */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto flex-wrap">
          <span className="whitespace-nowrap">UDF Name:</span>
          <Input
            value={editedName}
            onChange={handleNameChange}
            placeholder="Enter UDF name"
            className="w-full sm:w-[200px]"
          />
          <Button
            type="default"
            className="bg-neutral-100 border-neutral-700 w-full sm:w-auto"
            onClick={handleRunTestClick}
            loading={isTestLoading}>
            Run test
          </Button>
          <Button
            type="primary"
            onClick={showUpdateConfirmation}
            className="w-full sm:w-auto">
            Update UDF
          </Button>
        </div>
      </div>

      {/* Tag Selection Modal */}
      <Modal
        title="Choose a tag for testing"
        open={isTestModalVisible}
        onCancel={handleTestModalCancel}
        footer={[
          <Button key="cancel" onClick={handleTestModalCancel}>
            Cancel
          </Button>,
          <Button
            key="run"
            type="primary"
            onClick={handleRunTest}
            loading={isTestLoading}>
            Run test
          </Button>,
        ]}>
        <div className="mb-5">
          <div className="mb-2">Tag</div>
          <Select
            placeholder="Pilih tag"
            className="w-full"
            value={selectedTag}
            showSearch
            onChange={(value) => setSelectedTag(value)}>
            {availableInputs.map((input) => (
              <Select.Option key={input} value={input}>
                {input}
              </Select.Option>
            ))}
          </Select>
        </div>
      </Modal>

      {/* Update Confirmation Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <MdInfo className="text-secondary-300" size={32} />
            <span>You are about to update the current UDF</span>
          </div>
        }
        open={isUpdateModalVisible}
        onCancel={handleUpdateCancel}
        footer={[
          <Button key="cancel" onClick={handleUpdateCancel}>
            Cancel
          </Button>,
          <Button key="update" type="primary" onClick={handleUpdateUDF}>
            Update UDF
          </Button>,
        ]}
        centered>
        <p>Update &quot;{editedName}&quot; UDF</p>
      </Modal>

      {/* Divider */}
      <hr className="my-5 border-none border-t border-[#d9d9d9]" />

      {/* Main Content */}
      <div className="flex flex-col gap-5 mt-6 h-[calc(100vh-200px)]">
        {/* Editor Section */}
        <div className="w-full h-full max-h-[calc(100vh-250px)]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h2 className="m-0 text-[20.16px] font-semibold">
              Edit User Defined Function
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Recent tested tag:</span>
              <div className="bg-neutral-250 px-4 py-2 rounded-lg text-sm">
                {lastTestedTag || "none"}
              </div>
            </div>
          </div>
          <CodeEditor
            selectedUDF={storedUDFCode || ""}
            onCodeChange={handleCodeChange}
          />
        </div>

        {/* Test Results Section - Only show after test */}
        {hasRunTest && (
          <div className="mt-2.5 rounded-lg">
            <span className="text-[20.16px] font-semibold">Test Result</span>
            <Table
              className="bg-white mt-[13px] [&_.ant-table-thead>tr>th]:bg-neutral-250 [&_.ant-table-thead>tr>th]:text-center [&_.ant-table-thead>tr>th]:p-2 [&_.ant-table-thead>tr>th]:text-[16.8px] [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-tbody>tr>td]:text-center [&_.ant-table-tbody>tr>td]:p-2 [&_.ant-table-tbody>tr>td]:text-[16.8px] [&_.ant-table-tbody>tr>td]:bg-[#eeeff1] [&_.ant-table-measure-row]:hidden"
              columns={columns}
              dataSource={transformTestResults()}
              pagination={false}
              scroll={{ x: "max-content" }}
            />
          </div>
        )}

        {/* Debugging Section */}
        <div className="mt-2.5 rounded-lg">
          <div className="text-[20px] font-semibold mb-4">Debugging</div>

          {/* STDOUT Section */}
          <div className="rounded overflow-hidden mb-4">
            <div className="bg-neutral-250 px-4 py-2 text-[16.8px] font-semibold text-center">
              STDOUT
            </div>
            <div className="bg-[#eeeff1] p-4">
              <div className="text-[#333] text-[16.8px] text-start whitespace-pre-wrap">
                {stdoutMessage || "No output message from the process."}
              </div>
            </div>
          </div>

          {/* Debug Logs Table */}
          <Table
            className="bg-white [&_.ant-table-thead>tr>th]:bg-neutral-250 [&_.ant-table-thead>tr>th]:text-center [&_.ant-table-thead>tr>th]:p-2 [&_.ant-table-thead>tr>th]:text-[16.8px] [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-tbody>tr>td]:text-center [&_.ant-table-tbody>tr>td]:p-2 [&_.ant-table-tbody>tr>td]:text-[16.8px] [&_.ant-table-tbody>tr>td]:bg-[#eeeff1]"
            columns={[
              {
                title: "Level",
                dataIndex: "level",
                key: "level",
              },
              {
                title: "Message",
                dataIndex: "message",
                key: "message",
              },
              {
                title: "Code",
                dataIndex: "code",
                key: "code",
              },
            ]}
            dataSource={logData}
            pagination={false}
          />
        </div>
      </div>
    </div>
  );
};

export default EditUDFPage;

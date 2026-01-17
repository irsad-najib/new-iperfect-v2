"use client";

import React, { useEffect, useState } from "react";
import {
  Button,
  Modal,
  Tabs,
  message,
  Dropdown,
  Collapse,
  CollapseProps,
  Tooltip, // Add this import
} from "antd";
import {
  MdClose,
  MdInfo,
  MdArrowForwardIos,
  MdContentCopy,
  MdPlayArrow,
  MdLibraryBooks,
} from "react-icons/md";
import { HiCheckCircle } from "react-icons/hi";
import api from "@/utils/axios";
import { useDateContext } from "@/context/DateContext";
import { formatNumber } from "@/utils/numberFormat";
import { UdfResult } from "@/utils/udfUtils";
import RevertModal from "./RevertModal";
import { CodeEditor } from "@/components/processes/tie-in/CodeEditor";
import { toSnakeCase } from "@/utils/stringUtils";

interface UDFInput {
  _id: string;
  var_name: string;
  ref_name: string;
  default_value: number;
  timeframe_selection: string | null;
  udf_id: string;
  value?: number | null;
  tie_in_adjustment_value?: number | null;
}

interface UDFOutput {
  _id: string;
  var_name: string;
  ref_name: string;
  default_value: number;
  timeframe_selection: string | null;
  udf_id: string;
  value?: number | null;
  tie_in_adjustment_value?: number | null;
}

interface UDF {
  _id: string;
  name: string;
  code: string;
  createdAt: number;
}

interface UDFResponse {
  udf: UDF;
  inputs: UDFInput[];
}

interface UDFInputOutput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any;
  _id: string;
  var_name: string;
  ref_name: string;
  default_value: number;
  timeframe_selection: string;
  udf_id: string;
  value: number;
  tie_in_adjustment_value: number;
}

interface GrouppedInputs {
  [key: string]: {
    name: string;
    input: UDFInput;
    output: UDFOutput;
  };
}

interface UDFSchema {
  udf: {
    _id: string;
    name: string;
    code: string;
    createdAt: number; // Unix timestamp
    bagian_id: number;
    default: boolean;
  };
  log:
    | {
        level: string;
        message: string;
        code: string;
      }[]
    | {
        level: string;
        message: string;
        code: string;
      }; // Bisa array atau object tunggal
  std_out: string;
  inputs_ekspor: UDFInputOutput[];
  inputs_impor: UDFInputOutput[];
  outputs_ekspor: UDFInputOutput[];
  outputs_impor: UDFInputOutput[];
  groupped_inputs: GrouppedInputs;
}

interface UdfAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  udfCell: number | null | undefined;
  unbalance: number | null | undefined;
  max: number | null | undefined;
  cellLocation: string;
  cellUnit: string | undefined;
  udfId: string | null;
  headers?: { key: string; title: string }[];
  rows?: { key: string; rowIndex: string }[];
  onUpdateUDF?: (udfId: string) => void;
  activeTab: string;
  tieinProfileId?: string;
  adjusted?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setAdjustedTableData?: (data: any) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  handleRevert: (reasoning: string, udfId: string) => Promise<void>;
  revertLoading: boolean;
  reasoning: string;
  setReasoning: (r: string) => void;
}

const UdfAdjustmentModal = ({
  isOpen,
  onClose,
  udfCell,
  unbalance,
  max,
  cellLocation,
  cellUnit,
  udfId,
  onUpdateUDF,
  activeTab,
  adjusted = false,
  loading,
  setLoading,
  handleRevert,
  revertLoading,
}: UdfAdjustmentModalProps) => {
  const { formattedDate } = useDateContext();
  const [showAddUDFModal, setShowAddUDFModal] = useState(false);
  const [editingInput, setEditingInput] = useState<UDFInput | null>(null);
  const [codeValue, setCodeValue] = useState("");
  // const [selectedTag, setSelectedTag] = useState<string>("");
  const [testResult, setTestResult] = useState<UdfResult | null>(null);
  const [udfLoading, setUdfLoading] = useState(false);
  const [udfData, setUdfData] = useState<UDFSchema | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availableInputs, setAvailableInputs] = useState<any[]>([]);
  const [activeTestTab, setActiveTestTab] = useState("code");
  // const [localTab, setLocalTab] = useState<"before" | "adjusted">("adjusted");
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [highlightWords, setHighlightWords] = useState<string[]>([]);
  const [activeCollapseKeys, setActiveCollapseKeys] = useState<string[]>([]);

  const [rowName, material] = cellLocation.split("-");
  const word = rowName.split(" ");
  const factory = word.slice(1).join(" ");

  useEffect(() => {
    const fetchAvailableInputs = async () => {
      if (!formattedDate || !isOpen) return;

      try {
        const response = await api.get(
          `/udf/utils/available-inputs?tanggal=${formattedDate}`,
        );
        if (response.data) {
          setAvailableInputs(response.data);
        }
      } catch (error) {
        console.error("Error fetching available inputs:", error);
        message.error("Failed to fetch available inputs");
      }
    };

    fetchAvailableInputs();
  }, [formattedDate, isOpen]);

  useEffect(() => {
    const fetchUDFData = async () => {
      if (!material || !isOpen) return;

      setUdfLoading(true);
      try {
        const response = await api.get<UDFSchema>(
          `/tiein/kapasitas-tiein/udf-adjustment`,
          {
            params: {
              tanggal: formattedDate,
              material: toSnakeCase(material),
            },
          },
        );
        if (response.data) {
          setUdfData(response.data);
          setCodeValue(response.data.udf.code);
          const inputName = response.data?.inputs_ekspor?.map(
            (input) => input.var_name,
          );
          setHighlightWords(inputName);
        }
      } catch (error) {
        console.error("Error fetching UDF data:", error);
        message.error("Failed to fetch UDF data");
      } finally {
        setUdfLoading(false);
      }
    };

    // Reset states when udfId changes
    if (!udfId) {
      setUdfData(null);
      setCodeValue("");
    } else {
      fetchUDFData();
    }
  }, [udfId, isOpen, formattedDate, material]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUdfData(null);
      setCodeValue("");
      // setSelectedTag("");
      setTestResult(null);
      setAvailableInputs([]);
      setEditingInput(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoadTemplate = () => {
    setShowAddUDFModal(true);
  };
  const handleUpdateClick = async (execute: boolean) => {
    if (!udfData?.udf) return;

    try {
      setLoading(true);
      const payload = {
        ...udfData,
        udf: {
          ...udfData.udf,
          code: codeValue,
        },
      };

      const response = await api.post(
        "/tiein/kapasitas-tiein/udf-adjustment",
        payload,
        {
          params: {
            tanggal: formattedDate,
            material: toSnakeCase(material),
            execute: execute,
          },
        },
      );
      console.log("UDF updated successfully:", response.data.log);

      if (response.status === 200) {
        if (execute) {
          // For "Run adjustment" - update data but keep modal open
          message.success("UDF Adjustment executed successfully");
          setUdfData(response.data);
          // Don't close modal, let user see the results
        } else {
          // For "Update UDF" - close modal after update
          message.success("UDF updated successfully");
          setUdfData(response.data);
          onClose();
        }
      }
    } catch (error) {
      console.error("Error updating UDF:", error);
      message.error("Failed to update UDF");
    } finally {
      setLoading(false);
    }
  };

  // const handleResetUdf = () => {};

  const handleRevertClick = () => {
    setIsRevertModalOpen(true);
  };

  const handleCopy = (
    value: string | number | undefined | null,
    event?: React.MouseEvent,
  ) => {
    // Stop event propagation to prevent collapse toggle
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (value === null || value === undefined) {
      console.warn("Nothing to copy");
      return;
    }

    const textValue = value.toString();

    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(textValue)
        .then(() => {
          message.success("Copied to clipboard");
        })
        .catch(() => {
          // Fallback to legacy method
          fallbackCopy(textValue);
        });
    } else {
      // Use fallback method for older browsers or non-secure contexts
      fallbackCopy(textValue);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        message.success("Copied to clipboard");
      } else {
        message.error("Failed to copy to clipboard");
      }
    } catch (err) {
      console.error("Fallback copy failed:", err);
      message.error("Failed to copy to clipboard");
    }
  };

  // Calculate total of ALL inputs for % calculation (tidak difilter)
  const totalInputsValue = Object.values(udfData?.groupped_inputs || {}).reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, group: any) => sum + (group.input?.value || 0),
    0,
  );

  // Filtered data hanya untuk tampilan
  const filteredGroupedInputs = Object.entries(
    udfData?.groupped_inputs || {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ).filter(([groupName, groupData]) => {
    const name = groupName.startsWith("Impor-") ? groupName.slice(6) : null;
    return name && name.trim() !== "";
  });

  const handleCollapseChange = (keys: string | string[]) => {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    setActiveCollapseKeys(keysArray);
  };

  const collapseItems: CollapseProps["items"] = filteredGroupedInputs.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    ([groupName, groupData]: [string, any], index) => {
      const inputs = groupData.input;
      const name = groupName.startsWith("Impor-") ? groupName.slice(6) : null;

      // Cari corresponding output dari Ekspor- dengan nama yang sama
      const eksporGroupName = `Ekspor-${name}`;
      const eksporGroupData = udfData?.groupped_inputs?.[eksporGroupName];
      const outputs = eksporGroupData?.input;

      // Calculate percentage menggunakan totalInputsValue dari SEMUA data
      const inputPercentage =
        totalInputsValue > 0
          ? ((inputs.value || 0) / totalInputsValue) * 100
          : 0;

      const outputPercentage =
        outputs?.value && totalInputsValue > 0
          ? (outputs.value / totalInputsValue) * 100
          : 0;

      // Table row as collapse header
      const tableRowHeader = (
        <div className="grid grid-cols-[160px_160px_65px_110px_160px_65px_110px] items-center w-full px-4 py-3 [className={styles.tableRowHeader}_span]:font-semibold [className={styles.tableRowHeader}_span]:text-sm [className={styles.tableRowHeader}_span]:text-[#13162a] [className={styles.tableRowHeader}_span]:text-center">
          <span>{name}</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "0 10px",
            }}
            onClick={(event) => event.stopPropagation()}>
            {formatNumber(inputs.value)}
            <MdContentCopy
              size={18}
              style={{ cursor: "pointer" }}
              onMouseDown={(event) => handleCopy(inputs.var_name, event)}
            />
          </div>
          <span>{formatNumber(inputPercentage)}%</span>
          <span>
            {inputs.tie_in_adjustment_value != null
              ? formatNumber(
                  (inputs.value || 0) + inputs.tie_in_adjustment_value,
                )
              : "-"}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "0 10px",
            }}
            onClick={(event) => event.stopPropagation()}>
            {outputs?.value ? formatNumber(outputs.value) : "-"}
            <MdContentCopy
              size={18}
              style={{ cursor: "pointer" }}
              onMouseDown={(event) => handleCopy(outputs?.var_name, event)}
            />
          </div>
          <span>{formatNumber(outputPercentage)}%</span>
          <span>
            {outputs?.tie_in_adjustment_value != null && outputs?.value != null
              ? formatNumber(outputs.value + outputs.tie_in_adjustment_value)
              : "-"}
          </span>
        </div>
      );

      // Get outputs for import and export based on ref_name matching
      const importOutputs =
        udfData?.outputs_impor?.filter(
          (output) => output.ref_name === groupName,
        ) || [];

      const exportOutputs =
        udfData?.outputs_ekspor?.filter(
          (output) => output.ref_name === eksporGroupName,
        ) || [];

      return {
        key: groupName,
        label: tableRowHeader,
        children: (
          <div className="grid grid-cols-2 gap-4 w-full max-h-[34rem] overflow-x-auto overflow-y-auto rounded-lg p-4 bg-[#fafafa] [className={styles.tableContainer}_table]:w-full [className={styles.tableContainer}_table]:border-collapse [className={styles.tableContainer}_table]:rounded-lg [className={styles.tableContainer}_table]:overflow-hidden [className={styles.tableContainer}_table]:shadow-[0_2px_4px_rgba(0,0,0,0.1)] [className={styles.tableContainer}_th]:p-2 [className={styles.tableContainer}_th]:text-center [className={styles.tableContainer}_th]:border [className={styles.tableContainer}_th]:border-[#e6e6e6] [className={styles.tableContainer}_td]:p-2 [className={styles.tableContainer}_td]:text-center [className={styles.tableContainer}_td]:border [className={styles.tableContainer}_td]:border-[#e6e6e6]">
            <div style={{ flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        backgroundColor: "#f0f0f0",
                        padding: "8px",
                        textAlign: "center",
                      }}>
                      Import Variable
                    </th>
                    <th
                      style={{
                        backgroundColor: "#f0f0f0",
                        padding: "8px",
                        textAlign: "center",
                      }}>
                      Before
                    </th>
                    <th
                      style={{
                        backgroundColor: "#f0f0f0",
                        padding: "8px",
                        textAlign: "center",
                      }}>
                      Adjusted
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {importOutputs.length > 0 ? (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    importOutputs.map((output: any, outputIndex: number) => (
                      <tr key={output._id || outputIndex}>
                        <td className="bg-[#f47920] text-white font-semibold flex items-center justify-between px-3 min-w-0">
                          <Tooltip title={output.var_name} placement="topLeft">
                            <span className="max-w-[100px] whitespace-nowrap overflow-hidden text-ellipsis inline-block align-middle">
                              {output.var_name}
                            </span>
                          </Tooltip>
                          <MdContentCopy
                            size={18}
                            style={{ cursor: "pointer" }}
                            onMouseDown={(event) =>
                              handleCopy(output.var_name, event)
                            }
                          />
                        </td>
                        <td className="">{formatNumber(output.value)}</td>
                        <td className="">
                          {output.tie_in_adjustment_value != null
                            ? formatNumber(
                                (output.value || 0) +
                                  output.tie_in_adjustment_value,
                              )
                            : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          textAlign: "center",
                          padding: "8px",
                          color: "#999",
                        }}>
                        No import variables
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        backgroundColor: "#f0f0f0",
                        padding: "8px",
                        textAlign: "center",
                      }}>
                      Export Variable
                    </th>
                    <th
                      style={{
                        backgroundColor: "#f0f0f0",
                        padding: "8px",
                        textAlign: "center",
                      }}>
                      Before
                    </th>
                    <th
                      style={{
                        backgroundColor: "#f0f0f0",
                        padding: "8px",
                        textAlign: "center",
                      }}>
                      Adjusted
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exportOutputs.length > 0 ? (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    exportOutputs.map((output: any, outputIndex: number) => (
                      <tr key={output._id || outputIndex}>
                        <td className="bg-[#1268b3] text-white font-semibold p-2 px-3 flex items-center justify-between min-w-0">
                          <Tooltip title={output.var_name} placement="topLeft">
                            <span className="max-w-[100px] whitespace-nowrap overflow-hidden text-ellipsis inline-block align-middle">
                              {output.var_name}
                            </span>
                          </Tooltip>
                          <MdContentCopy
                            size={18}
                            style={{ cursor: "pointer" }}
                            onMouseDown={(event) =>
                              handleCopy(output.var_name, event)
                            }
                          />
                        </td>
                        <td className="">{formatNumber(output.value)}</td>
                        <td className="">
                          {output.tie_in_adjustment_value != null
                            ? formatNumber(
                                (output.value || 0) +
                                  output.tie_in_adjustment_value,
                              )
                            : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          textAlign: "center",
                          padding: "8px",
                          color: "#999",
                        }}>
                        No export variables
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ),
      };
    },
  );

  return (
    <>
      <Modal
        title={
          <div className="flex justify-between items-center">
            <div className="flex flex-col items-start">
              <span>UDF Adjustment</span>
            </div>
            <MdClose
              size={36}
              color="#000000"
              className="cursor-pointer"
              onClick={onClose}
            />
          </div>
        }
        open={isOpen}
        width={"120rem"}
        centered
        destroyOnClose={true}
        maskClosable={false}
        confirmLoading={loading}
        footer={null}
        closable={false}>
        {udfLoading ? (
          <div>Loading UDF data...</div>
        ) : (
          <>
            <div className="flex flex-col items-start gap-[18px] mt-7">
              <div className="flex items-center justify-between w-full">
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}>
                  <div>
                    <span className="text-black text-[16.8px] font-semibold">
                      Material: {""}
                    </span>
                    <span className="bg-[#e6e6e6] px-3 py-1 ml-2 rounded-md text-[#13162a] text-[16.8px] font-normal">
                      {material}
                    </span>
                  </div>
                  <div>
                    <span className="text-black text-[16.8px] font-semibold">
                      Total Imports:{""}
                    </span>
                    <span className="bg-[#e6e6e6] px-3 py-1 ml-2 rounded-md text-[#13162a] text-[16.8px] font-normal">
                      {cellUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-black text-[16.8px] font-semibold">
                      Total Exports:{""}
                    </span>
                    <span className="bg-[#e6e6e6] px-3 py-1 ml-2 rounded-md text-[#13162a] text-[16.8px] font-normal">
                      {factory}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div style={{ display: "flex", gap: "6px" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        alignItems: "center",
                      }}></div>
                    <Button
                      type="default"
                      // loading={guideLoading}
                      // onClick={handleGuide}
                      className="customOtherButton">
                      <MdLibraryBooks size={24} />
                      Guide
                    </Button>
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: "1",
                            label: "Load default UDF",
                            // disabled: !config,
                          },
                          {
                            key: "2",
                            label: "Load from template",
                            // disabled: !config,
                          },
                        ],
                      }}>
                      <Button
                        type="default"
                        loading={loading}
                        // onClick={handleLoadConfig}
                        className="customOtherButton"
                        // disabled={!dailyRunner?.pipeline_id}
                      >
                        Load
                        <MdArrowForwardIos
                          size={18}
                          style={{ transform: "rotate(90deg)" }}
                        />
                      </Button>
                    </Dropdown>
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: "1",
                            label: "Save as new default",
                            // disabled: !config,
                          },
                          {
                            key: "2",
                            label: "Save as new UDF Adjustment",
                            // disabled: !config,
                          },
                        ],
                      }}>
                      <Button
                        type="default"
                        loading={loading}
                        // onClick={handleLoadConfig}
                        className="customOtherButton"
                        // disabled={!dailyRunner?.pipeline_id}
                      >
                        Save as
                        <MdArrowForwardIos
                          size={18}
                          style={{ transform: "rotate(90deg)" }}
                        />
                      </Button>
                    </Dropdown>
                    <Button
                      className="customOtherButton"
                      onClick={handleRevertClick}>
                      Revert
                    </Button>
                  </div>
                  <Button
                    type="primary"
                    onClick={() => handleUpdateClick(true)}
                    loading={loading}
                    className="customPrimaryButton"
                    disabled={adjusted && activeTab === "before"}>
                    <MdPlayArrow size={22} />
                    Run adjustment
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => handleUpdateClick(false)}
                    loading={loading}
                    className="customPrimaryButton"
                    disabled={adjusted && activeTab === "before"}>
                    Update UDF
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between w-full">
                <div
                  style={{
                    display: "flex",
                    gap: "18px",
                    alignItems: "center",
                  }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                    }}>
                    <span className="text-black text-[16.8px] font-semibold">
                      Unbalance: {""}
                    </span>
                    <span
                      className={
                        unbalance && max
                          ? unbalance <= max
                            ? styles.resourceDataValueBalance
                            : styles.resourceDataValueUnbalance
                          : styles.resourceDataValue
                      }>
                      {formatNumber(unbalance)}
                      {unbalance && max && unbalance > max ? (
                        <MdInfo
                          size={18}
                          style={{
                            marginLeft: "5px",
                          }}
                        />
                      ) : (
                        <HiCheckCircle
                          size={18}
                          style={{
                            marginLeft: "5px",
                          }}
                        />
                      )}
                    </span>
                    <Button
                      type="default"
                      // loading={guideLoading}
                      // onClick={handleGuide}
                      className="customOtherButton">
                      <MdContentCopy
                        size={18}
                        style={{ cursor: "pointer" }}
                        onMouseDown={(event) => handleCopy(unbalance, event)}
                      />
                    </Button>
                  </div>
                  <div>
                    <span className="text-black text-[16.8px] font-semibold">
                      Max tolerance: {""}
                    </span>
                    <span
                      className={
                        unbalance && max
                          ? unbalance <= max
                            ? styles.resourceDataValueBalance
                            : styles.resourceDataValueUnbalance
                          : styles.resourceDataValue
                      }>
                      {formatNumber(max)}
                      {unbalance && max && unbalance > max ? (
                        <MdInfo
                          size={18}
                          style={{
                            marginLeft: "5px",
                          }}
                        />
                      ) : (
                        <HiCheckCircle
                          size={18}
                          style={{
                            marginLeft: "5px",
                          }}
                        />
                      )}
                    </span>
                  </div>
                </div>
                <span className="bg-[#e6e6e6] px-3 py-1 ml-2 rounded-md text-[#13162a] text-[16.8px] font-normal">
                  Last saved:{" "}
                  <span className="font-semibold">2 minutes ago</span>
                </span>
              </div>
            </div>
            <div className="flex gap-6 w-full mt-[18px]">
              <div className="flex-1 min-w-0 max-h-[43rem] overflow-y-auto [className={styles.leftSection}_.ant-collapse>.ant-collapse-item>.ant-collapse-header]:flex [className={styles.leftSection}_.ant-collapse>.ant-collapse-item>.ant-collapse-header]:items-center">
                {/* Table header */}
                <div className="grid grid-cols-[190px_160px_65px_110px_160px_64px_110px] items-center w-full px-4 py-3 bg-[#f1f2f3] border-b border-[#e6e6e6] [className={styles.tableHeader}_span]:font-semibold [className={styles.tableHeader}_span]:text-sm [className={styles.tableHeader}_span]:text-[#13162a] [className={styles.tableHeader}_span]:text-center">
                  <span>Fac.</span>
                  <span>Impor Needs</span>
                  <span>%</span>
                  <span>Adjusted</span>
                  <span>Export Capacity</span>
                  <span>%</span>
                  <span>Adjusted</span>
                </div>

                {/* Collapse with table-like rows */}
                <div className="max-h-[43rem] overflow-y-auto">
                  <Collapse
                    items={collapseItems}
                    className="[className={styles.customTableCollapse}_.ant-collapse-item]:border [className={styles.customTableCollapse}_.ant-collapse-item]:border-[#e6e6e6] [className={styles.customTableCollapse}_.ant-collapse-item]:mb-2 [className={styles.customTableCollapse}_.ant-collapse-item]:rounded-lg [className={styles.customTableCollapse}_.ant-collapse-header]:p-0 [className={styles.customTableCollapse}_.ant-collapse-header]:bg-[#fafafa] [className={styles.customTableCollapse}_.ant-collapse-header]:rounded-t-lg [className={styles.customTableCollapse}_.ant-collapse-content]:border-t [className={styles.customTableCollapse}_.ant-collapse-content]:border-[#e6e6e6] [className={styles.customTableCollapse}_.ant-collapse-content-box]:p-0"
                    ghost
                    activeKey={activeCollapseKeys}
                    onChange={handleCollapseChange}
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex justify-between items-start gap-4 [className={styles.testHeader}_.ant-tabs]:flex-1">
                  <Tabs
                    defaultActiveKey="code"
                    className="customTabs"
                    items={[
                      {
                        key: "code",
                        label: "Code",
                      },
                      {
                        key: "test",
                        label: "Test result",
                      },
                      {
                        key: "debug",
                        label: "Debugging",
                      },
                    ]}
                    onChange={(key) => setActiveTestTab(key)}
                  />
                  {/* <Button
                    onClick={handleRunTest}
                    type="primary"
                    className="customSecondaryButton btn-md"
                    loading={testLoading}
                  >
                    Run test
                  </Button> */}
                </div>
                {activeTestTab === "code" && (
                  <div className="bg-white rounded-md p-4">
                    {/* <ReactCodeMirror
                      value={codeValue}
                      height="38rem"
                      theme={vscodeDark}
                      extensions={[python(), hideScrollbarTheme]}
                      onChange={(value) => {
                        setCodeValue(value);
                      }}
                      editable={true}
                    /> */}
                    <CodeEditor
                      value={codeValue}
                      onChange={setCodeValue}
                      highlightTerms={highlightWords}
                    />
                  </div>
                )}

                {/* <div className={styles.testSection}> */}
                {activeTestTab === "test" && (
                  <div className="flex flex-col gap-2 rounded-lg flex-grow py-1">
                    <div className="flex justify-start items-start bg-[#eeeff1] rounded-md h-[38rem]">
                      <div className="text-sm text-[#111827] font-medium p-4 flex items-start justify-start h-full w-full bg-[#eeeff1] rounded-md">
                        {udfData !== null ? udfData.std_out : "-"}
                      </div>
                    </div>
                  </div>
                )}

                {activeTestTab === "debug" && (
                  <div className="flex flex-col gap-2 rounded-lg flex-grow py-1">
                    <div className="rounded overflow-hidden">
                      <div className="bg-[#e6e6e6] px-4 py-2 text-[16.8px] font-semibold text-center">
                        STDOUT
                      </div>
                      <div className="bg-[#eeeff1] p-4 h-[36rem] overflow-auto [className={styles.stdoutContent}_table]:w-full [className={styles.stdoutContent}_table]:border-collapse [className={styles.stdoutContent}_table]:mt-2.5 [className={styles.stdoutContent}_th]:border [className={styles.stdoutContent}_th]:border-[#ddd] [className={styles.stdoutContent}_th]:p-2 [className={styles.stdoutContent}_th]:text-left [className={styles.stdoutContent}_th]:bg-[#f5f5f5] [className={styles.stdoutContent}_th]:font-semibold [className={styles.stdoutContent}_td]:border [className={styles.stdoutContent}_td]:border-[#ddd] [className={styles.stdoutContent}_td]:p-2 [className={styles.stdoutContent}_td]:text-left [className={styles.stdoutContent}_td]:break-words [className={styles.stdoutContent}_tr:nth-child(even)]:bg-[#f9f9f9]">
                        {/* <div className={styles.stdoutMessage}>
                          {udfData !== null
                            ? `${udfData?.log}\nlog:\n${JSON.stringify(
                                udfData.log,
                                null,
                                4
                              )}`
                            : "No output message from the process."}
                        </div> */}
                        <table>
                          <thead>
                            <tr>
                              <th>Level</th>
                              <th>Message</th>
                              <th>Code</th>
                            </tr>
                          </thead>
                          <tbody>
                            {udfData !== null && Array.isArray(udfData.log) ? (
                              udfData.log.map((logItem, index) => (
                                <tr key={index}>
                                  <td>{logItem.level}</td>
                                  <td>{logItem.message}</td>
                                  <td>{logItem.code}</td>
                                </tr>
                              ))
                            ) : udfData !== null && udfData.log ? (
                              // Jika log bukan array tapi object tunggal
                              <tr>
                                <td>
                                  {!Array.isArray(udfData.log)
                                    ? udfData.log.level
                                    : ""}
                                </td>
                                <td>
                                  {!Array.isArray(udfData.log)
                                    ? udfData.log.message
                                    : ""}
                                </td>
                                <td>
                                  {!Array.isArray(udfData.log)
                                    ? udfData.log.code
                                    : ""}
                                </td>
                              </tr>
                            ) : (
                              <tr>
                                <td colSpan={3}>
                                  No output message from process
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                {/* </div> */}
              </div>
            </div>
          </>
        )}
      </Modal>

      <RevertModal
        visible={isRevertModalOpen}
        onOk={(reasoning) => handleRevert(reasoning, udfId || "")}
        onCancel={() => setIsRevertModalOpen(false)}
        confirmLoading={revertLoading}
        title="Revert UDF"
        all={false}
        udfId={udfId}
      />
    </>
  );
};

export default UdfAdjustmentModal;

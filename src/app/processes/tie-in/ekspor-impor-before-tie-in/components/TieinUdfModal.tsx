"use client";

import { useEffect, useState } from "react";
import { Button, Modal, Tabs, message } from "antd";
import { MdClose, MdDelete, MdEditNote, MdInfo } from "react-icons/md";
import {
  HiLockClosed,
  HiOutlineAdjustments,
  HiCheckCircle,
} from "react-icons/hi";
import api from "@/utils/axios";
import { useDateContext } from "@/context/DateContext";
import AddInputModal from "@/components/processes/tie-in/AddInputModal";
import { formatNumber } from "@/utils/numberFormat";
// TODO: Create AddUDFModal component
import AddUDFModal from "@/components/processes/cleansing/AddUDFModal";
import { executeUdf, UdfResult } from "@/utils/udfUtils";
import RevertModal from "./RevertModal";
import { getDataSource } from "@/utils/dataSourceUtils";
import { CodeEditor } from "@/components/processes/tie-in/CodeEditor";

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

interface TieinUdfModalProps {
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

const TieinUdfModal = ({
  isOpen,
  onClose,
  udfCell,
  unbalance,
  max,
  cellLocation,
  cellUnit,
  udfId,
  headers = [],
  rows = [],
  onUpdateUDF,
  activeTab,
  tieinProfileId,
  adjusted = false,
  setAdjustedTableData,
  loading,
  setLoading,
  handleRevert,
  revertLoading,
}: TieinUdfModalProps) => {
  const { formattedDate } = useDateContext();
  const [showAddUDFModal, setShowAddUDFModal] = useState(false);
  const [showAddInputModal, setShowAddInputModal] = useState(false);
  const [editingInput, setEditingInput] = useState<UDFInput | null>(null);
  const [codeValue, setCodeValue] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [testResult, setTestResult] = useState<UdfResult | null>(null);
  const [udfLoading, setUdfLoading] = useState(false);
  const [udfData, setUdfData] = useState<UDFResponse | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availableInputs, setAvailableInputs] = useState<any[]>([]);
  const [activeTestTab, setActiveTestTab] = useState("code");
  const [localTab, setLocalTab] = useState<"before" | "adjusted">("adjusted");
  const [testLoading, setTestLoading] = useState(false);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [highlightWords, setHighlightWords] = useState<string[]>([]);

  const [rowName, columnName] = cellLocation.split("-");
  const word = rowName.split(" ");
  const activity = word[0];
  const factory = word.slice(1).join(" ");

  useEffect(() => {
    const fetchAvailableInputs = async () => {
      if (!formattedDate || !isOpen) return;

      try {
        const response = await api.get(
          `/udf/utils/available-inputs?tanggal=${formattedDate}`
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
      if (!udfId || !isOpen) return;

      setUdfLoading(true);
      try {
        const response = await api.get<UDFResponse>(`/udf/${udfId}`, {
          params: {
            tanggal: formattedDate,
          },
        });
        if (response.data) {
          setUdfData(response.data);
          setCodeValue(response.data.udf.code);
          const inputName = response.data?.inputs?.map(
            (input) => input.var_name
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
  }, [udfId, isOpen, formattedDate]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUdfData(null);
      setCodeValue("");
      setSelectedTag("");
      setTestResult(null);
      setAvailableInputs([]);
      setEditingInput(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoadTemplate = () => {
    setShowAddUDFModal(true);
  };

  const handleRunTest = async () => {
    if (udfData && codeValue) {
      setTestLoading(true);
      const testResult: UdfResult = await executeUdf({
        inputs: udfData.inputs.map(
          ({ var_name, ref_name, timeframe_selection }) => ({
            var_name,
            ref_name,
            timeframe_selection,
          })
        ),
        code: codeValue,
        tanggal: formattedDate,
      });
      setTestLoading(false);
      setTestResult(testResult);
    }
  };

  const handleUpdateUDF = async (name: string, template: string) => {
    // If it's from template, the template string will be "template" and we'll get the UDF ID
    if (onUpdateUDF) {
      onUpdateUDF(name);

      // Fetch and display the template UDF data immediately
      setLoading(true);
      try {
        const response = await api.get<UDFResponse>(`/udf/${name}`);
        if (response.data) {
          setUdfData(response.data);
          setCodeValue(response.data.udf.code);
        }
      } catch (error) {
        console.error("Error fetching UDF template data:", error);
        message.error("Failed to fetch UDF template data");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpdateClick = async () => {
    if (!udfData?.udf) return;

    try {
      setLoading(true);
      const payload = {
        udf: {
          _id: udfData.udf._id,
          name: udfData.udf.name,
          code: codeValue,
          createdAt: udfData.udf.createdAt,
        },
        inputs: udfData.inputs,
      };

      const response = await api.post("/udf", payload);

      if (response.status === 200) {
        message.success("UDF updated successfully");
        setUdfData(response.data);
        // Await the parent's update
        if (onUpdateUDF && response.data.udf._id) {
          await onUpdateUDF(response.data.udf._id);
        }
      }
    } catch (error) {
      console.error("Error updating UDF:", error);
      message.error("Failed to update UDF");
    } finally {
      setLoading(false);
    }
  };

  const handleEditInput = (input: UDFInput) => {
    setEditingInput(input);
    setShowAddInputModal(true);
  };

  const handleInputSubmit = (input: {
    var_name: string;
    ref_name: string;
    default_value: number;
    timeframe_selection: string | null;
  }) => {
    if (!udfId) return;

    const processedInput = {
      ...input,
      timeframe_selection: input.timeframe_selection || null,
    };

    if (editingInput) {
      // Update existing input
      setUdfData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          inputs: prev.inputs.map((item) =>
            item._id === editingInput._id
              ? { ...item, ...processedInput }
              : item
          ),
        };
      });
      message.success("Input updated");
    } else {
      // Add new input
      const newInput: UDFInput = {
        _id: Date.now().toString(),
        udf_id: udfId,
        ...processedInput,
      };

      setUdfData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          inputs: [...prev.inputs, newInput],
        };
      });
      message.success("Input added");
    }

    setShowAddInputModal(false);
    setEditingInput(null);
  };

  const handleDeleteInput = (inputId: string) => {
    if (!udfId || !udfData) return;

    // Update local state only
    setUdfData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        inputs: prev.inputs.filter((input) => input._id !== inputId),
      };
    });

    message.success("Input deleted");
  };

  const handleResetUdf = () => {};

  const handleRevertClick = () => {
    setIsRevertModalOpen(true);
  };

  return (
    <>
      <Modal
        title={
          <div className="flex justify-between items-center">
            <div className="flex flex-col items-start">
              <span>Edit Tie In UDF</span>
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
        width={"112rem"}
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
                <div>
                  <span className="text-black text-[16.8px] font-semibold">
                    Material: {""}
                  </span>
                  <span className="bg-[#e6e6e6] px-3 py-1 ml-2 mr-[18px] rounded-md text-[#13162a] text-[16.8px] font-normal">
                    {columnName}
                  </span>
                  <span className="text-black text-[16.8px] font-semibold">
                    Unit:{""}
                  </span>
                  <span className="bg-[#e6e6e6] px-3 py-1 ml-2 mr-[18px] rounded-md text-[#13162a] text-[16.8px] font-normal">
                    {cellUnit}
                  </span>
                  <span className="text-black text-[16.8px] font-semibold">
                    Factory:{""}
                  </span>
                  <span className="bg-[#e6e6e6] px-3 py-1 ml-2 mr-[18px] rounded-md text-[#13162a] text-[16.8px] font-normal">
                    {factory}
                  </span>
                  <span className="text-black text-[16.8px] font-semibold">
                    Activity:{""}
                  </span>
                  <span className="bg-[#e6e6e6] px-3 py-1 ml-2 mr-[18px] rounded-md text-[#13162a] text-[16.8px] font-normal">
                    {activity}
                  </span>
                  <span className="text-black text-[16.8px] font-semibold">
                    Cell result:{""}
                  </span>
                  <span className="bg-[#e6e6e6] px-3 py-1 ml-2 mr-[18px] rounded-md text-[#13162a] text-[16.8px] font-normal">
                    {typeof udfCell === "number"
                      ? formatNumber(udfCell, { decimals: 2, locale: "id-ID" })
                      : udfCell}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {activeTab === "before" ? (
                    <>
                      <Button
                        onClick={handleResetUdf}
                        className="customSecondaryButton">
                        Reset UDF
                      </Button>
                      <Button
                        onClick={handleLoadTemplate}
                        className="customSecondaryButton">
                        Load template
                      </Button>
                    </>
                  ) : (
                    <div style={{ display: "flex", gap: "24px" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                        }}>
                        <span className="text-black text-[16.8px] font-semibold">
                          Select version:{""}
                        </span>
                        <div style={{ display: "flex" }}>
                          <Button
                            className={`customSecondaryButton ${
                              localTab === "before" ? "activeButton" : ""
                            }`}
                            onClick={() => setLocalTab("before")}>
                            <HiLockClosed size={18} />
                            Before
                          </Button>
                          <Button
                            className={`customSecondaryButton ${
                              localTab === "adjusted" ? "activeButton" : ""
                            }`}
                            onClick={() => setLocalTab("adjusted")}>
                            <HiOutlineAdjustments size={18} />
                            Adjustment
                          </Button>
                        </div>
                      </div>
                      <Button
                        className="customOtherButton"
                        onClick={handleRevertClick}>
                        Revert UDF
                      </Button>
                    </div>
                  )}
                  <Button
                    type="primary"
                    onClick={handleUpdateClick}
                    loading={loading}
                    className="customPrimaryButton"
                    disabled={adjusted && activeTab === "before"}>
                    Update UDF
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className="text-black text-[16.8px] font-semibold">
                    Unbalance: {""}
                  </span>
                  <span
                    className={
                      unbalance && max
                        ? unbalance <= max
                          ? "bg-success-100 text-white p-2 ml-2 mr-4 rounded-md text-16 font-semibold"
                          : "bg-danger-100 text-white p-2 ml-2 mr-4 rounded-md text-16 font-semibold"
                        : "bg-neutral-250 text-black p-2 ml-2 mr-4 rounded-md text-16 font-semibold"
                    }>
                    {unbalance != null ? formatNumber(unbalance) : "-"}
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
                  <span className="text-black text-[16.8px] font-semibold">
                    Max tolerance (material): {""}
                  </span>
                  <span
                    className={
                      unbalance && max
                        ? unbalance <= max
                          ? "bg-success-100 text-white p-2 ml-2 mr-4 rounded-md text-16 font-semibold"
                          : "bg-danger-100 text-white p-2 ml-2 mr-4 rounded-md text-16 font-semibold"
                        : "bg-neutral-250 text-black p-2 ml-2 mr-4 rounded-md text-16 font-semibold"
                    }>
                    {max != null ? formatNumber(max) : "-"}
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
                <span className="bg-[#e6e6e6] px-3 py-1 ml-2 mr-[18px] rounded-md text-[#13162a] text-[16.8px] font-normal">
                  Last saved:{" "}
                  <span className="font-semibold">2 minutes ago</span>
                </span>
              </div>
            </div>
            <div className="flex gap-6 w-full mt-[18px]">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h3>Inputs</h3>
                    <Button
                      onClick={() => setShowAddInputModal(true)}
                      className="customSecondaryButton btn-md"
                      disabled={adjusted && activeTab === "before"}>
                      Add input
                    </Button>
                  </div>
                  <div className="bg-white border border-[#b3b5bd] rounded-lg p-4 h-[600px] max-h-max overflow-hidden">
                    <div className="flex flex-col gap-0.5 h-full overflow-y-auto [className={styles.inputList}::-webkit-scrollbar]:w-2 [className={styles.inputList}::-webkit-scrollbar-track]:bg-[#f1f1f1] [className={styles.inputList}::-webkit-scrollbar-track]:rounded [className={styles.inputList}::-webkit-scrollbar-thumb]:bg-[#b3b5bd] [className={styles.inputList}::-webkit-scrollbar-thumb]:rounded [className={styles.inputList}::-webkit-scrollbar-thumb:hover]:bg-[#9598a1]">
                      <div className="grid grid-cols-[150px_150px_minmax(0,2fr)_70px_120px_70px] gap-1.5 pb-2.5 sticky top-0 bg-white z-10">
                        <span>Nama</span>
                        <span>Data Path</span>
                        <span>Timeframe</span>
                        <span>
                          {activeTab === "adjusted" ? "Before" : "Default"}
                        </span>
                        <span>
                          {activeTab === "adjusted" ? "Adjusted" : "Value"}
                        </span>
                        <span></span>
                      </div>
                      {udfData?.inputs?.map((input, index) => (
                        <div
                          key={input._id || index}
                          className="grid grid-cols-[150px_150px_minmax(0,2fr)_70px_120px_70px] gap-1.5 rounded-md">
                          <span title={input.var_name}>{input.var_name}</span>
                          <span
                            title={input.ref_name}
                            className="direction-rtl">
                            {input.ref_name}
                          </span>
                          <span title={getDataSource(input.ref_name)}>
                            {input.ref_name !== undefined &&
                            input.ref_name !== null
                              ? getDataSource(input.ref_name)
                              : "-"}
                          </span>
                          <span>
                            {activeTab === "adjusted"
                              ? input.value !== undefined &&
                                input.value !== null
                                ? input.value?.toFixed(2)
                                : "-"
                              : input.default_value}
                          </span>
                          <span>
                            {activeTab === "adjusted"
                              ? input.tie_in_adjustment_value !== undefined &&
                                input.tie_in_adjustment_value !== null
                                ? input.tie_in_adjustment_value?.toFixed(2)
                                : "-"
                              : input.value !== undefined &&
                                input.value !== null
                              ? input.value?.toFixed(2)
                              : "-"}
                          </span>
                          <div className="flex justify-center items-center min-w-[70px] border-none p-0">
                            <MdEditNote
                              size={28}
                              className={`text-[#13162a] cursor-pointer hover:opacity-70 mt-0.5 ${
                                adjusted && activeTab === "before"
                                  ? "opacity-70"
                                  : ""
                              }`}
                              onClick={() =>
                                adjusted && activeTab === "before"
                                  ? null
                                  : handleEditInput(input)
                              }
                            />
                            <MdDelete
                              size={24}
                              className={`text-[#13162a] cursor-pointer hover:opacity-70 ${
                                adjusted && activeTab === "before"
                                  ? "opacity-70"
                                  : ""
                              }`}
                              onClick={() =>
                                adjusted && activeTab === "before"
                                  ? null
                                  : handleDeleteInput(input._id)
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
                  <Button
                    onClick={handleRunTest}
                    type="primary"
                    className="customSecondaryButton btn-md"
                    loading={testLoading}>
                    Run test
                  </Button>
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
                        {testResult !== null ? testResult.result_output : "-"}
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
                      <div className="bg-[#eeeff1] p-4 h-[36rem] overflow-auto">
                        <div className="text-[#333] text-[16.8px] text-start whitespace-pre-wrap">
                          {testResult !== null
                            ? `${testResult?.std_out}\nlog:\n${JSON.stringify(
                                testResult.log,
                                null,
                                4
                              )}`
                            : "No output message from the process."}
                        </div>
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

      {showAddUDFModal && (
        <AddUDFModal
          visible={showAddUDFModal}
          onClose={() => setShowAddUDFModal(false)}
          onAddUDF={handleUpdateUDF}
          pipelineId="example-id"
          tanggal="2024-01-01"
          childId="child-id"
          type="tie-in"
        />
      )}
      {showAddInputModal && (
        <AddInputModal
          isOpen={showAddInputModal}
          onClose={() => {
            setShowAddInputModal(false);
            setEditingInput(null);
          }}
          onAdd={handleInputSubmit}
          availableInputs={availableInputs}
          editingInput={editingInput}
          activeTab={activeTab}
          tieinProfileId={tieinProfileId}
          headers={headers}
          rows={rows}
          setAdjustedTableData={setAdjustedTableData}
          unbalance={unbalance}
          max={max}
        />
      )}

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

export default TieinUdfModal;

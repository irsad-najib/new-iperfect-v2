import { useEffect, useState, useCallback } from "react";
import { Button, Modal, Tabs, message } from "antd";
import { MdClose, MdDelete, MdEditNote, MdInfo } from "react-icons/md";
import { HiCheckCircle } from "react-icons/hi";
import api from "@/utils/axios";
import { useDateContext } from "@/context/DateContext";
import AddInputModal from "@/components/processes/AddInputModal";
import { formatNumber } from "@/utils/numberFormat";
import { executeUdf, UdfResult } from "@/utils/udfUtils";
import { getDataSource } from "@/utils/dataSourceUtils";
import { CodeEditor } from "@/components/processes/CodeEditor";

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

interface TieinDistribusiUdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  unbalance: number | null | undefined;
  exporter: string;
  udfId: string | null;
  onUpdateUDF?: (
    value: string,
    limit: number | null,
    limit_udf_id: string | null,
  ) => void;
  material: string;
  unit: string;
  row: string | undefined;
  importer: string | undefined;
  maxValue?: number | null;
  modifyLoading: boolean;
}

const TieinDistribusiUdfModal = ({
  isOpen,
  onClose,
  unbalance,
  exporter,
  udfId,
  onUpdateUDF,
  material,
  unit,
  row,
  importer,
  maxValue,
  modifyLoading,
}: TieinDistribusiUdfModalProps) => {
  const { formattedDate } = useDateContext();
  const [showAddInputModal, setShowAddInputModal] = useState(false);
  const [editingInput, setEditingInput] = useState<UDFInput | null>(null);
  const [codeValue, setCodeValue] = useState("");
  const [testResult, setTestResult] = useState<UdfResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [udfLoading, setUdfLoading] = useState(false);
  const [udfData, setUdfData] = useState<UDFResponse>({
    udf: {
      _id: "",
      name: "",
      code: "",
      createdAt: 0,
    },
    inputs: [],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availableInputs, setAvailableInputs] = useState<any[]>([]);
  const [activeTestTab, setActiveTestTab] = useState("code");
  const [testLoading, setTestLoading] = useState(false);
  const [highlightWords, setHighlightWords] = useState<string[]>([]);

  // Optimized: Memoized fetch available inputs
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
      setUdfData({
        udf: {
          _id: "",
          name: "",
          code: "",
          createdAt: 0,
        },
        inputs: [],
      });
      setCodeValue("");
    } else {
      fetchUDFData();
    }
  }, [udfId, isOpen, formattedDate]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUdfData({
        udf: {
          _id: "",
          name: "",
          code: "",
          createdAt: 0,
        },
        inputs: [],
      });
      setCodeValue("");
      setTestResult(null);
      setAvailableInputs([]);
      setEditingInput(null);
    }
  }, [isOpen]);

  const handleLoadTemplate = () => {
    // TODO: Implement load template functionality
  };

  // Optimized: useCallback for run test
  const handleRunTest = useCallback(async () => {
    if (udfData && codeValue) {
      setTestLoading(true);
      const testResult: UdfResult = await executeUdf({
        inputs: udfData.inputs.map(
          ({ var_name, ref_name, timeframe_selection }) => ({
            var_name,
            ref_name,
            timeframe_selection,
          }),
        ),
        code: codeValue,
        tanggal: formattedDate,
      });
      setTestLoading(false);
      setTestResult(testResult);
    }
  }, [udfData, codeValue, formattedDate]);

  // Optimized: useCallback for finish click
  const handleFinishOrUpdateClick = useCallback(async () => {
    try {
      setLoading(true);
      const payload = {
        udf: {
          name: `${material}-${row}-${importer}-${exporter}-limit-${formattedDate}`,
          code: codeValue,
        },
        inputs: udfData.inputs,
      };

      const response = await api.post<UDFResponse>("/udf", payload);

      if (response.status === 200) {
        message.success("UDF created successfully");

        // Execute the UDF after creation
        const execResult = await executeUdf({
          inputs: udfData.inputs.map(
            ({ var_name, ref_name, timeframe_selection }) => ({
              var_name,
              ref_name,
              timeframe_selection,
            }),
          ),
          code: codeValue,
          tanggal: formattedDate,
        });
        if (onUpdateUDF && response.data.udf._id) {
          onUpdateUDF(
            exporter,
            execResult.result_output,
            response.data.udf._id,
          );
        }
      }
    } catch (error) {
      console.error("Error updating UDF:", error);
      message.error("Failed to update UDF");
    } finally {
      setLoading(false);
    }
  }, [
    material,
    row,
    importer,
    exporter,
    formattedDate,
    codeValue,
    udfData,
    onUpdateUDF,
  ]);

  const handleEditInput = useCallback((input: UDFInput) => {
    setEditingInput(input);
    setShowAddInputModal(true);
  }, []);

  const handleInputSubmit = useCallback(
    (input: {
      var_name: string;
      ref_name: string;
      default_value: number;
      timeframe_selection: string | null;
    }) => {
      const processedInput = {
        ...input,
        timeframe_selection: input.timeframe_selection || null,
      };

      if (editingInput) {
        // Update existing input
        setUdfData((prev) => {
          if (!prev)
            return {
              udf: {
                _id: "",
                name: "",
                code: "",
                createdAt: 0,
              },
              inputs: [],
            };
          return {
            ...prev,
            inputs: prev.inputs.map((item) =>
              item._id === editingInput._id
                ? { ...item, ...processedInput }
                : item,
            ),
          };
        });
        message.success("Input updated");
      } else {
        // Add new input
        const newInput: UDFInput = {
          _id: Date.now().toString(),
          udf_id: udfId || "",
          ...processedInput,
        };

        setUdfData((prev) => {
          if (!prev)
            return {
              udf: {
                _id: "",
                name: "",
                code: "",
                createdAt: 0,
              },
              inputs: [],
            };
          return {
            ...prev,
            inputs: [...prev.inputs, newInput],
          };
        });
        message.success("Input added");
      }

      setShowAddInputModal(false);
      setEditingInput(null);
    },
    [editingInput, udfId],
  );

  const handleDeleteInput = useCallback(
    (inputId: string) => {
      if (!udfId || !udfData) return;

      // Update local state only
      setUdfData((prev) => {
        if (!prev)
          return {
            udf: {
              _id: "",
              name: "",
              code: "",
              createdAt: 0,
            },
            inputs: [],
          };
        return {
          ...prev,
          inputs: prev.inputs.filter((input) => input._id !== inputId),
        };
      });

      message.success("Input deleted");
    },
    [udfId, udfData],
  );

  const handleResetUdf = () => {};

  if (!isOpen) return null;

  return (
    <>
      <Modal
        title={
          <div className="flex justify-between items-center">
            <div className="flex flex-col items-start">
              <span className="text-neutral-500 text-[16.8px] font-semibold">
                Edit Tie In Distribusi UDF
              </span>
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
                    Material:{" "}
                  </span>
                  <span className="bg-neutral-250 py-1 px-3 ml-[9px] mr-[18px] rounded-md text-neutral-900 text-[16.8px] font-normal">
                    {material}
                  </span>
                  <span className="text-black text-[16.8px] font-semibold">
                    Unit:
                  </span>
                  <span className="bg-neutral-250 py-1 px-3 ml-[9px] mr-[18px] rounded-md text-neutral-900 text-[16.8px] font-normal">
                    {unit}
                  </span>
                  <span className="text-black text-[16.8px] font-semibold">
                    Row:
                  </span>
                  <span className="bg-neutral-250 py-1 px-3 ml-[9px] mr-[18px] rounded-md text-neutral-900 text-[16.8px] font-normal">
                    {row}
                  </span>
                  <span className="text-black text-[16.8px] font-semibold">
                    Importer:
                  </span>
                  <span className="bg-neutral-250 py-1 px-3 ml-[9px] mr-[18px] rounded-md text-neutral-900 text-[16.8px] font-normal">
                    {importer}
                  </span>
                  <span className="text-black text-[16.8px] font-semibold">
                    Exporter:
                  </span>
                  <span className="bg-neutral-250 py-1 px-3 ml-[9px] mr-[18px] rounded-md text-neutral-900 text-[16.8px] font-normal">
                    {exporter}
                  </span>
                  <span className="text-black text-[16.8px] font-semibold">
                    Max value result:
                  </span>
                  <span className="bg-neutral-250 py-1 px-3 ml-[9px] mr-[18px] rounded-md text-neutral-900 text-[16.8px] font-normal">
                    {maxValue ? maxValue : "-"}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    onClick={handleResetUdf}
                    className="bg-transparent border border-neutral-700 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-900 hover:bg-secondary-300 hover:border-secondary-300 hover:text-neutral-100 active:bg-neutral-500 active:border-neutral-500 active:text-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-[#eeeff1]">
                    Reset UDF
                  </Button>
                  <Button
                    onClick={handleLoadTemplate}
                    className="bg-transparent border border-neutral-700 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-900 hover:bg-secondary-300 hover:border-secondary-300 hover:text-neutral-100 active:bg-neutral-500 active:border-neutral-500 active:text-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-[#eeeff1]">
                    Load template
                  </Button>

                  <Button
                    type="primary"
                    onClick={handleFinishOrUpdateClick}
                    loading={loading || modifyLoading}
                    className="bg-primary-300 border-primary-300 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-100 hover:bg-primary-700 hover:border-primary-700 active:bg-neutral-900 active:border-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300">
                    Finish
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className="text-black text-[16.8px] font-semibold">
                    Unbalance (material):
                  </span>
                  <span
                    className={`py-1 px-3 ml-[9px] mr-[18px] rounded-md text-[16.8px] font-normal ${
                      unbalance
                        ? unbalance > 0
                          ? "bg-success text-white"
                          : "bg-danger text-white justify-center"
                        : "bg-neutral-250 text-neutral-900"
                    }`}>
                    {unbalance !== null && unbalance !== undefined
                      ? formatNumber(unbalance, {
                          decimals: 3,
                          locale: "id-ID",
                        })
                      : "-"}
                    {unbalance && unbalance > 0 ? (
                      <MdInfo size={18} className="ml-[5px] inline" />
                    ) : unbalance && unbalance < 0 ? (
                      <HiCheckCircle size={18} className="ml-[5px] inline" />
                    ) : null}
                  </span>
                </div>
                <span className="bg-neutral-250 py-1 px-3 ml-[9px] mr-[18px] rounded-md text-neutral-900 text-[16.8px] font-normal">
                  Last saved:{" "}
                  <span className="font-semibold">2 minutes ago</span>
                </span>
              </div>
            </div>
            <div className="flex gap-6 w-full mt-[18px]">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[16.8px] font-semibold m-0 text-black">
                      Inputs
                    </h3>
                    <Button
                      onClick={() => setShowAddInputModal(true)}
                      className="bg-transparent border border-neutral-700 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-900 hover:bg-secondary-300 hover:border-secondary-300 hover:text-neutral-100 active:bg-neutral-500 active:border-neutral-500 active:text-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-[#eeeff1]">
                      Add input
                    </Button>
                  </div>
                  <div className="bg-white border border-neutral-300 rounded-lg p-4 h-[600px] max-h-max overflow-hidden">
                    <div className="flex flex-col gap-0.5 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-[#b3b5bd] scrollbar-track-[#f1f1f1] hover:scrollbar-thumb-[#9598a1] scrollbar-thumb-rounded">
                      <div className="grid grid-cols-[150px_150px_minmax(0,2fr)_70px_120px_70px] gap-1.5 pb-2.5 sticky top-0 bg-white z-[1]">
                        <span className="text-14 font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Nama
                        </span>
                        <span className="text-14 font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Data Source
                        </span>
                        <span className="text-14 font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Data Path
                        </span>
                        <span className="text-14 font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Default
                        </span>
                        <span className="text-14 font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Value
                        </span>
                        <span className="text-14 font-semibold text-neutral-900 text-center"></span>
                      </div>
                      {udfData?.inputs?.map((input, index) => (
                        <div
                          key={input._id || index}
                          className="grid grid-cols-[150px_150px_minmax(0,2fr)_70px_120px_70px] gap-1.5 border-b border-neutral-300 rounded-md">
                          <span
                            title={input.var_name}
                            className="text-14 text-neutral-900 font-normal block p-2 min-h-[38px] border border-neutral-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px] bg-secondary-300 text-white !border-secondary-300 !font-semibold">
                            {input.var_name}
                          </span>
                          <span
                            title={getDataSource(input.ref_name)}
                            className="text-14 text-neutral-900 font-normal block p-2 min-h-[38px] border border-neutral-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px]">
                            {input.ref_name !== undefined &&
                            input.ref_name !== null
                              ? getDataSource(input.ref_name)
                              : "-"}
                          </span>
                          <span
                            title={input.ref_name}
                            className="text-14 text-neutral-900 font-normal block p-2 min-h-[38px] border border-neutral-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px] rtl">
                            {input.ref_name}
                          </span>
                          <span className="text-14 text-neutral-900 font-normal block p-2 min-h-[38px] border border-neutral-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px]">
                            {input.default_value !== undefined
                              ? input.default_value
                              : "-"}
                          </span>
                          <span
                            title={
                              input.value !== null && input.value !== undefined
                                ? input.value.toString()
                                : undefined
                            }
                            className="text-14 text-neutral-900 font-normal block p-2 min-h-[38px] border border-neutral-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px]">
                            {input.value
                              ? formatNumber(input.value, {
                                  decimals: 2,
                                  locale: "id-ID",
                                })
                              : ""}
                          </span>
                          <div className="flex justify-center items-center min-w-[70px] !border-none !p-0">
                            <MdEditNote
                              size={28}
                              className="text-[18px] cursor-pointer text-neutral-900 hover:opacity-70 mt-0.5"
                              onClick={() => handleEditInput(input)}
                            />
                            <MdDelete
                              size={24}
                              className="text-[18px] cursor-pointer text-neutral-900 hover:opacity-70"
                              onClick={() => handleDeleteInput(input._id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex justify-between items-start gap-4">
                  <Tabs
                    defaultActiveKey="code"
                    className="customTabs flex-1"
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
                    loading={testLoading}
                    className="bg-transparent border border-neutral-700 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-900 hover:bg-secondary-300 hover:border-secondary-300 hover:text-neutral-100 active:bg-neutral-500 active:border-neutral-500 active:text-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-[#eeeff1]">
                    Run test
                  </Button>
                </div>

                {activeTestTab === "code" && (
                  <div className="bg-white rounded-md p-4">
                    <CodeEditor
                      value={codeValue}
                      onChange={setCodeValue}
                      highlightTerms={highlightWords}
                    />
                  </div>
                )}

                {activeTestTab === "test" && (
                  <div className="flex flex-col gap-2 rounded-lg flex-grow py-1">
                    <div className="flex justify-start items-start bg-[#eeeff1] rounded-md h-[38rem]">
                      <div className="text-14 text-[#111827] font-medium p-4 flex items-start justify-start h-full w-full bg-[#eeeff1] rounded-md">
                        {testResult !== null ? testResult.result_output : "-"}
                      </div>
                    </div>
                  </div>
                )}

                {activeTestTab === "debug" && (
                  <div className="flex flex-col gap-2 rounded-lg flex-grow py-1">
                    <div className="rounded overflow-hidden">
                      <div className="bg-neutral-250 p-2 px-4 text-[16.8px] font-semibold text-center">
                        STDOUT
                      </div>
                      <div className="bg-[#eeeff1] p-4 h-[36rem] overflow-auto">
                        <div className="text-[#333] text-[16.8px] text-start whitespace-pre-wrap">
                          {testResult !== null
                            ? `${testResult?.std_out}\nlog:\n${JSON.stringify(
                                testResult.log,
                                null,
                                4,
                              )}`
                            : "No output message from the process."}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>

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
          unbalance={unbalance}
        />
      )}
    </>
  );
};

export default TieinDistribusiUdfModal;

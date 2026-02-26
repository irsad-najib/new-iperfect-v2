import { useEffect, useState } from "react";
import { Button, Modal, Form, Tabs, message } from "antd";
import { MdDelete, MdEditNote } from "react-icons/md";
import { HiOutlineRefresh } from "react-icons/hi";
import api from "@/utils/axios";
import { useDateContext } from "@/context/DateContext";
import AddInputModal from "@/components/processes/AddInputModal";
import { executeUdf, UdfResult } from "@/utils/udfUtils";
import { getDataSource } from "@/utils/dataSourceUtils";
import { formatNumberWithoutRounding } from "@/utils/numberFormat";
import { CodeEditor } from "@/components/processes/CodeEditor";

interface ResourceRowData {
  key: string;
  index: number;
  input?: string;
  output?: string;
  quantity: number;
  mmbtu: number;
  udf_id: string | null;
  unit: string;
}

interface UDF {
  _id: string;
  name: string;
  code: string;
  createdAt: number;
}

interface UDFInput {
  _id: string;
  var_name: string;
  ref_name: string;
  default_value: number;
  timeframe_selection: string | null;
  udf_id: string | undefined;
  value?: number | null;
  tie_in_adjustment_value?: number | null;
}

interface UDFResponse {
  udf: UDF;
  inputs: UDFInput[];
}

interface InputOutputSubmitData {
  resource_name: string | undefined;
  unit: string | undefined;
  udf_id: string | null;
  type: "input" | "output";
}

interface MmbtuModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: InputOutputSubmitData) => void;
  initialValues?: ResourceRowData | null;
  udfId?: string | null;
  activeDataGroup: string | undefined;
  activeTableGroup: string | undefined;
  activeTableItemName: string | undefined;
  resourceType: "input" | "output" | null;
  isSubmitting?: boolean;
}

const MmbtuModal = ({
  open,
  onCancel,
  onSubmit,
  initialValues,
  udfId,
  resourceType,
  isSubmitting,
}: MmbtuModalProps) => {
  const [form] = Form.useForm();
  const [udfData, setUdfData] = useState<UDFResponse | null>(null);
  const [udfLoading, setUdfLoading] = useState(false);
  const { formattedDate } = useDateContext();
  const [udfCode, setUdfCode] = useState("");
  const [showAddInputModal, setShowAddInputModal] = useState(false);
  const [editingInput, setEditingInput] = useState<UDFInput | null>(null);
  const [activeTestTab, setActiveTestTab] = useState("code");
  const [testResult, setTestResult] = useState<UdfResult | null>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availableInputs, setAvailableInputs] = useState<any[]>([]);
  const [isSavingUdf, setIsSavingUdf] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [highlightWords, setHighlightWords] = useState<string[]>([]);

  useEffect(() => {
    const fetchAvailableInputs = async () => {
      if (!formattedDate || !open) return;

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
  }, [formattedDate, open]);

  useEffect(() => {
    const fetchOrSetUDFData = async () => {
      if (udfData?.udf._id === udfId) {
        return;
      }

      if (udfId && open) {
        setUdfLoading(true);
        try {
          const response = await api.get<UDFResponse>(`/udf/${udfId}`, {
            params: { tanggal: formattedDate },
          });
          setUdfData(response.data);
          setUdfCode(response.data.udf.code);
          const inputName = response.data?.inputs?.map(
            (input) => input.var_name,
          );
          setHighlightWords(inputName);
        } catch (error) {
          console.error("Error fetching UDF:", error);
          message.error("Failed to load UDF");
        } finally {
          setUdfLoading(false);
        }
      }
    };

    fetchOrSetUDFData();
  }, [udfId, open, formattedDate, udfData?.udf._id]);

  // Reset states when modal closes
  useEffect(() => {
    if (!open) {
      form.resetFields();
      setUdfData(null);
      setUdfCode("");
      setTestResult(null);
      setAvailableInputs([]);
      setEditingInput(null);
    } else {
      if (initialValues) {
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form]);

  const saveUdfChanges = async (): Promise<boolean> => {
    if (!udfData) {
      message.error("No UDF data available to save.");
      return false;
    }

    setIsSavingUdf(true);
    try {
      const payload: UDFResponse = {
        udf: {
          ...udfData.udf,
          code: udfCode,
        },
        inputs: udfData.inputs.map((input) => ({
          ...input,
          udf_id: udfData.udf._id,
        })),
      };

      await api.put(`/udf/${udfData.udf._id}`, payload);
      message.success("UDF changes saved succesfully.");
      return true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log("Error saving UDF changes:", error);
      message.error(
        `Failed to save UDF changes: ${
          error.response?.data?.message || error.message
        }`,
      );
      return false;
    } finally {
      setIsSavingUdf(false);
    }
  };

  const handleNext = async () => {
    try {
      if (!resourceType || !udfData?.udf._id) {
        message.error("Missing required information");
        return;
      }

      const saveSuccess = await saveUdfChanges();

      if (!saveSuccess) {
        return;
      }

      onSubmit({
        resource_name: initialValues?.input || initialValues?.output,
        unit: initialValues?.unit,
        udf_id: udfData.udf._id,
        type: resourceType,
      });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const handleEditInput = (input: UDFInput) => {
    setEditingInput(input);
    setShowAddInputModal(true);
  };

  const handleDeleteInput = (inputId: string) => {
    if (!udfId || !udfData) return;

    setUdfData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        inputs: prev.inputs.filter((input) => input._id !== inputId),
      };
    });

    message.success("Input deleted");
  };

  const handleRunTest = async () => {
    if (udfData && udfCode) {
      setTestLoading(true);
      const testResult: UdfResult = await executeUdf({
        inputs: udfData.inputs.map(
          ({ var_name, ref_name, timeframe_selection }) => ({
            var_name,
            ref_name,
            timeframe_selection,
          }),
        ),
        code: udfCode,
        tanggal: formattedDate,
      });
      setTestLoading(false);
      setTestResult(testResult);
    }
  };

  const handleInputSubmit = (input: {
    var_name: string;
    ref_name: string;
    default_value: number;
    timeframe_selection: string | null;
  }) => {
    if (!udfId && !udfData?.udf._id) {
      console.error("UDF ID not found!");
      return;
    }

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
              : item,
          ),
        };
      });
      message.success("Input updated");
    } else {
      // Add new input
      const newInput: UDFInput = {
        _id: Date.now().toString(),
        udf_id: udfId || udfData?.udf._id,
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

  const isFinishing = isSavingUdf || isSubmitting;

  return (
    <>
      <Modal
        title={
          <div className="flex justify-between items-center">
            <div className="flex flex-col items-start">
              <span>Set MMBTU UDF</span>
            </div>
            <div>
              <Button onClick={handleCancel} className="mr-2">
                Cancel
              </Button>
              <Button type="primary" onClick={handleNext} loading={isFinishing}>
                Finish
              </Button>
            </div>
          </div>
        }
        open={open}
        onOk={handleNext}
        okText="Finish"
        onCancel={onCancel}
        width={1830}
        centered
        destroyOnClose={true}
        maskClosable={false}
        confirmLoading={isFinishing}
        footer={null}
        closable={false}>
        {udfLoading ? (
          <div>Loading UDF data...</div>
        ) : (
          <>
            <div className="flex flex-col items-start gap-4 mt-7">
              <div className="flex items-center">
                <span className="text-black text-[16.8px] font-semibold">
                  Resource {resourceType} Name: {""}
                </span>
                <span className="bg-[#e6e6e6] px-3 py-1 ml-[9px] mr-[18px] rounded-md text-[#13162a] text-[16.8px] font-normal">
                  {initialValues?.input || initialValues?.output}
                </span>
                <span className="text-black text-[16.8px] font-semibold">
                  Unit:{""}
                </span>
                <span className="bg-[#e6e6e6] px-3 py-1 ml-[9px] mr-[18px] rounded-md text-[#13162a] text-[16.8px] font-normal">
                  {initialValues?.unit}
                </span>
                <span className="text-black text-[16.8px] font-semibold">
                  Quantity:{""}
                </span>
                <span className="bg-[#e6e6e6] px-3 py-1 ml-[9px] mr-[18px] rounded-md text-[#13162a] text-[16.8px] font-normal">
                  {initialValues?.quantity !== null &&
                  initialValues?.quantity !== undefined
                    ? initialValues.quantity
                    : "-"}
                </span>
                <span className="text-black text-[16.8px] font-semibold">
                  Result MMBTU:{""}
                </span>
                <span className="bg-[#e6e6e6] px-3 py-1 ml-[9px] mr-[18px] rounded-md text-[#13162a] text-[16.8px] font-normal">
                  {testResult !== null && testResult !== undefined
                    ? testResult.result_output
                    : "-"}
                </span>
                <Button
                  icon={<HiOutlineRefresh size={24} />}
                  type="primary"
                  className="customPrimaryButton"
                  onClick={() => {}}
                />
              </div>
            </div>
            <div className="flex gap-6 w-full">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-3 mt-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[16.8px] font-semibold m-0 text-black">
                      Inputs
                    </h3>
                    <Button
                      onClick={() => setShowAddInputModal(true)}
                      className="customSecondaryButton btn-md">
                      Add input
                    </Button>
                  </div>
                  <div className="bg-white border border-[#b3b5bd] rounded-lg p-4 h-[600px] max-h-max overflow-hidden">
                    <div className="flex flex-col gap-0.5 h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-[#b3b5bd] [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-[#9598a1]">
                      <div className="grid grid-cols-[150px_150px_minmax(0,2fr)_70px_120px_70px] gap-1.5 pb-2.5 sticky top-0 bg-white z-1">
                        <span>Nama</span>
                        <span>Data Source</span>
                        <span>Data Path</span>
                        <span>Default</span>
                        <span>Value</span>
                        <span></span>
                      </div>
                      {udfData?.inputs?.map((input, index) => (
                        <div
                          key={input._id || index}
                          className="grid grid-cols-[150px_150px_minmax(0,2fr)_70px_120px_70px] gap-1.5 rounded-md">
                          <span
                            title={input.var_name}
                            className="text-sm text-white font-semibold block p-2 min-h-[38px] border border-[#f47920] bg-[#f47920] rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px]">
                            {input.var_name}
                          </span>
                          <span
                            title={getDataSource(input.ref_name)}
                            className="text-sm text-[#13162a] font-normal block p-2 min-h-[38px] border border-[#b3b5bd] rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px]">
                            {input.ref_name !== undefined &&
                            input.ref_name !== null
                              ? getDataSource(input.ref_name)
                              : "-"}
                          </span>
                          <span
                            title={input.ref_name}
                            className="text-sm text-[#13162a] font-normal block p-2 min-h-[38px] border border-[#b3b5bd] rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px] [direction:rtl]">
                            {input.ref_name}
                          </span>
                          <span className="text-sm text-[#13162a] font-normal block p-2 min-h-[38px] border border-[#b3b5bd] rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px]">
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
                            className="text-sm text-[#13162a] font-normal block p-2 min-h-[38px] border border-[#b3b5bd] rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px]">
                            {input.value
                              ? formatNumberWithoutRounding(input.value)
                              : ""}
                          </span>
                          <div className="flex justify-center items-center min-w-[70px] border-none! p-0!">
                            <MdEditNote
                              size={28}
                              className="text-[#13162a] cursor-pointer mt-0.5 hover:opacity-70"
                              onClick={() => handleEditInput(input)}
                            />
                            <MdDelete
                              size={24}
                              className="text-[#13162a] cursor-pointer hover:opacity-70"
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
                    className="text-20 [&_.ant-tabs-nav::before]:h-1 [&_.ant-tabs-nav::before]:bg-neutral-250 [&_.ant-tabs-tab]:text-center [&_.ant-tabs-tab]:items-center [&_.ant-tabs-tab]:justify-center [&_.ant-tabs-tab]:py-2 [&_.ant-tabs-tab]:px-4 [&_.ant-tabs-tab]:mx-1 [&_.ant-tabs-tab]:text-neutral-300 [&_.ant-tabs-tab]:font-semibold [&_.ant-tabs-tab-active]:rounded [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:text-black [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:font-semibold [&_.ant-tabs-ink-bar]:bg-orange-500 [&_.ant-tabs-ink-bar]:h-1"
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
                  <div className="bg-white rounded-md p-4 my-4">
                    {/* <ReactCodeMirror
                      value={udfCode}
                      height="38rem"
                      theme={vscodeDark}
                      extensions={[python(), hideScrollbarTheme]}
                      onChange={(value) => {
                        setUdfCode(value);
                      }}
                      editable={true}
                    /> */}
                    <CodeEditor
                      value={udfCode}
                      onChange={setUdfCode}
                      highlightTerms={highlightWords}
                    />
                  </div>
                )}

                {activeTestTab === "test" && (
                  <div className="flex flex-col gap-2 rounded-lg grow pt-1">
                    <div className="flex justify-start items-start bg-[#eeeff1] rounded-md h-152">
                      <div className="text-sm text-gray-900 font-medium p-4 flex items-start justify-start h-full w-full bg-[#eeeff1] rounded-md">
                        {testResult !== null ? testResult?.result_output : "-"}
                      </div>
                    </div>
                  </div>
                )}

                {activeTestTab === "debug" && (
                  <div className="flex flex-col gap-2 rounded-lg grow pt-1">
                    <div className="rounded overflow-hidden">
                      <div className="bg-[#e6e6e6] px-4 py-2 text-[16.8px] font-semibold text-center">
                        STDOUT
                      </div>
                      <div className="bg-[#eeeff1] p-4 h-144 overflow-auto">
                        <div className="text-[#333] text-[16.8px] text-start whitespace-pre-wrap">
                          {testResult !== null
                            ? `${testResult?.std_out}\nlog:\n${JSON.stringify(
                                testResult?.log,
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

      <AddInputModal
        isOpen={showAddInputModal}
        onClose={() => {
          setShowAddInputModal(false);
          setEditingInput(null);
        }}
        onAdd={handleInputSubmit}
        availableInputs={availableInputs}
        editingInput={editingInput}
      />
    </>
  );
};

export default MmbtuModal;

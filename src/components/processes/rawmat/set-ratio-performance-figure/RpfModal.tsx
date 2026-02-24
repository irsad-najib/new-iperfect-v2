import { useEffect, useState } from "react";
import { Button, Input, Modal, Form, Tabs, message } from "antd";
import { MdDelete, MdEditNote } from "react-icons/md";
import { HiOutlineRefresh } from "react-icons/hi";
import api from "@/utils/axios";
import { useDateContext } from "@/context/DateContext";
import AddInputModal from "@/components/processes/AddInputModal";
import { executeUdf, UdfResult } from "@/utils/udfUtils";
import { getDataSource } from "@/utils/dataSourceUtils";
import { formatNumberWithoutRounding } from "@/utils/numberFormat";
import { CodeEditor } from "@/components/processes/CodeEditor";

interface FormValues {
  rpf_name: string;
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
  rpf_name: string;
  rpf_udf_id: string | undefined;
  integration_udf_id: string | undefined;
  unit: string;
}

interface RpfModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: InputOutputSubmitData) => void;
  initialValues?: FormValues;
  rpfUdfId?: string | null;
  integrationUdfId?: string | null;
  activeDataGroup: string | undefined;
  activeTableGroup: string | undefined;
  isSubmitting?: boolean;
}

const RpfModal = ({
  open,
  onCancel,
  onSubmit,
  initialValues,
  rpfUdfId,
  integrationUdfId,
  activeDataGroup,
  activeTableGroup,
  isSubmitting,
}: RpfModalProps) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Values, setStep1Values] = useState<FormValues | null>(null);
  const [rpfUdfData, setRpfUdfData] = useState<UDFResponse | null>(null);
  const [rpfUdfCode, setRpfUdfCode] = useState("");
  const [integrationUdfData, setIntegrationUdfData] =
    useState<UDFResponse | null>(null);
  const [integrationUdfCode, setIntegrationUdfCode] = useState("");
  const [udfLoading, setUdfLoading] = useState(false);
  const [createUdfLoading, setCreateUdfLoading] = useState(false);
  const { formattedDate } = useDateContext();
  const [showAddInputModal, setShowAddInputModal] = useState(false);
  const [editingInput, setEditingInput] = useState<UDFInput | null>(null);
  const [activeTestTab, setActiveTestTab] = useState("code");
  const [testResult, setTestResult] = useState<UdfResult | null>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availableInputs, setAvailableInputs] = useState<any[]>([]);
  const [isSavingUdf, setIsSavingUdf] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [RpfHighlightWords, setRpfHighlightWords] = useState<string[]>([]);
  const [IntegrationHighlightWords, setIntegrationHighlightWords] = useState<
    string[]
  >([]);

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
      const currentRpfUdfId = rpfUdfData?.udf._id || rpfUdfId;
      const currentIntegrationUdfId =
        integrationUdfData?.udf._id || integrationUdfId;

      if (!open) {
        if (!rpfUdfId) {
          setRpfUdfData(null);
          setRpfUdfCode("");
        }
        if (!integrationUdfId) {
          setIntegrationUdfData(null);
          setIntegrationUdfCode("");
        }
        return;
      }

      setUdfLoading(true);
      try {
        const [rpfResponse, integrationResponse] = await Promise.all([
          currentRpfUdfId
            ? api.get<UDFResponse>(`/udf/${currentRpfUdfId}`, {
                params: { tanggal: formattedDate },
              })
            : Promise.resolve(null),
          currentIntegrationUdfId
            ? api.get<UDFResponse>(`/udf/${currentIntegrationUdfId}`, {
                params: { tanggal: formattedDate },
              })
            : Promise.resolve(null),
        ]);

        if (rpfResponse?.data) {
          setRpfUdfData(rpfResponse.data);
          setRpfUdfCode(rpfResponse.data.udf.code);
          const inputName = rpfResponse.data?.inputs?.map(
            (input) => input.var_name,
          );
          setRpfHighlightWords(inputName);
        } else if (currentRpfUdfId) {
          message.error(`RPF UDF with ID ${currentRpfUdfId} not found.`);
          setRpfUdfData(null);
          setRpfUdfCode("");
        }

        if (integrationResponse?.data) {
          setIntegrationUdfData(integrationResponse.data);
          setIntegrationUdfCode(integrationResponse.data.udf.code);
          const inputName = integrationResponse.data?.inputs?.map(
            (input) => input.var_name,
          );
          setIntegrationHighlightWords(inputName);
        } else if (currentIntegrationUdfId) {
          message.error(
            `Integration UDF with ID ${currentIntegrationUdfId} not found.`,
          );
          setIntegrationUdfData(null);
          setIntegrationUdfCode("");
        }
      } catch (error) {
        console.error("Error fetching UDF data:", error);
        message.error("Failed to fetch UDF data");
        setRpfUdfData(null);
        setRpfUdfCode("");
        setIntegrationUdfData(null);
        setIntegrationUdfCode("");
      } finally {
        setUdfLoading(false);
      }
    };

    fetchOrSetUDFData();
  }, [
    rpfUdfId,
    open,
    formattedDate,
    integrationUdfData?.udf._id,
    integrationUdfId,
    rpfUdfData?.udf._id,
  ]);

  // Reset states when modal closes
  useEffect(() => {
    if (!open) {
      form.resetFields();
      setCurrentStep(1);
      setStep1Values(null);
      setRpfUdfData(null);
      setRpfUdfCode("");
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

  const createNewUDF = async () => {
    const currentFormValues = form.getFieldsValue();
    if (!currentFormValues.rpf_name) {
      message.error("Rpf name is required before creating UDF.");
      throw new Error("Rpf name required");
    }

    try {
      setCreateUdfLoading(true);
      const rpfPayload = {
        udf: {
          name: `${activeDataGroup}-${activeTableGroup}-${currentFormValues.rpf_name}-value-${formattedDate}`,
          code: "# Start coding your RPF UDF here",
        },
        inputs: [],
      };

      const integrationPayload = {
        udf: {
          name: `${activeDataGroup}-${activeTableGroup}-${currentFormValues.rpf_name}-integration-${formattedDate}`,
          code: "# Start coding your Integration UDF here",
        },
        inputs: [],
      };

      const [rpfResponse, integrationResponse] = await Promise.all([
        api.post<UDFResponse>("/udf", rpfPayload),
        api.post<UDFResponse>("/udf", integrationPayload),
      ]);

      if (
        rpfResponse.status === 200 &&
        rpfResponse.data &&
        integrationResponse.status === 200 &&
        integrationResponse.data
      ) {
        message.success("Both UDFs created successfully");

        setRpfUdfData(rpfResponse.data);
        setRpfUdfCode(rpfResponse.data.udf.code);
        setIntegrationUdfData(integrationResponse.data);
        setIntegrationUdfCode(integrationResponse.data.udf.code);

        setCurrentStep(2);
      } else {
        message.error(`Failed to create one or both UDFs`);
        console.error("RPF UDF response:", rpfResponse);
        console.error("Integration UDF response:", integrationResponse);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error creating UDFs:", error);
      message.error(
        `Failed to create UDFs: ${
          error.response?.data?.message || error.message
        }`,
      );
      throw error;
    } finally {
      setCreateUdfLoading(false);
    }
  };

  const saveBothUdFs = async (): Promise<boolean> => {
    if (!rpfUdfData || !integrationUdfData) {
      message.error("Missing UDF data");
      return false;
    }

    setIsSavingUdf(true);
    try {
      await Promise.all([
        api.put(`/udf/${rpfUdfData.udf._id}`, {
          udf: { ...rpfUdfData.udf, code: rpfUdfCode },
          inputs: rpfUdfData.inputs.map((input) => ({
            ...input,
            udf_id: rpfUdfData.udf._id,
          })),
        }),

        api.put(`/udf/${integrationUdfData.udf._id}`, {
          udf: { ...integrationUdfData.udf, code: integrationUdfCode },
          inputs: integrationUdfData.inputs.map((input) => ({
            ...input,
            udf_id: integrationUdfData.udf._id,
          })),
        }),
      ]);

      message.success("All changes saved!");
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
      if (currentStep === 1) {
        const values = await form.validateFields();
        setStep1Values(values);
        if (rpfUdfId) {
          if (!rpfUdfData && !udfLoading) {
            message.warning("UDF data not yet loaded. Trying again...");
          }
          setCurrentStep(2);
        } else {
          createNewUDF();
        }
      } else if (currentStep === 2) {
        setCurrentStep(3);
      } else {
        if (!step1Values) {
          message.error("Cannot submit. Step 1 data or UDF data is missing.");
          console.error("Missing data for submission:", {
            step1Values,
            rpfUdfData: rpfUdfData,
            integrationUdfData: integrationUdfData,
          });
          return;
        }
        const saveSuccess = await saveBothUdFs();
        if (saveSuccess) {
          onSubmit({
            ...step1Values,
            rpf_udf_id: rpfUdfData?.udf._id,
            integration_udf_id: integrationUdfData?.udf._id,
          });
        } else {
          message.error("Could not save UDF changes.");
        }
      }
    } catch (error) {
      console.error("Step transition or UDF creation failed:", error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setCurrentStep(1);
    setStep1Values(null);
    onCancel();
  };

  const handleEditInput = (input: UDFInput) => {
    setEditingInput(input);
    setShowAddInputModal(true);
  };

  const handleDeleteInputRpf = (inputId: string) => {
    if (!rpfUdfId || !rpfUdfData) {
      console.error("Rpf Udf Id or data not found!");
    }

    setRpfUdfData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        inputs: prev.inputs.filter((input) => input._id !== inputId),
      };
    });

    message.success("Input deleted");
  };

  const handleDeleteInputIntegration = (inputId: string) => {
    if (!rpfUdfId || !rpfUdfData) {
      console.error("Rpf Udf Id or data not found!");
    }

    setIntegrationUdfData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        inputs: prev.inputs.filter((input) => input._id !== inputId),
      };
    });

    message.success("Input deleted");
  };

  const handleRunTest = async (
    udfData: UDFResponse | null,
    udfCode: string,
  ) => {
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

  const handleRunRpfTest = () => {
    handleRunTest(rpfUdfData, rpfUdfCode);
  };

  const handleRunIntegrationTest = () => {
    handleRunTest(integrationUdfData, integrationUdfCode);
  };

  const handleInputSubmit = (input: {
    var_name: string;
    ref_name: string;
    default_value: number;
    timeframe_selection: string | null;
  }) => {
    const isIntegrationUdf = currentStep === 3;

    const udfId = isIntegrationUdf
      ? integrationUdfId || integrationUdfData?.udf._id
      : rpfUdfId || rpfUdfData?.udf._id;

    if (!udfId) {
      console.error("UDF ID not found!");
      return;
    }

    const processedInput = {
      ...input,
      timeframe_selection: input.timeframe_selection || null,
    };

    if (editingInput) {
      if (isIntegrationUdf) {
        setIntegrationUdfData((prev) => {
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
      } else {
        setRpfUdfData((prev) => {
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
      }
      message.success("Input updated");
    } else {
      const newInput: UDFInput = {
        _id: Date.now().toString(),
        udf_id: udfId,
        ...processedInput,
      };

      if (isIntegrationUdf) {
        setIntegrationUdfData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            inputs: [...prev.inputs, newInput],
          };
        });
      } else {
        setRpfUdfData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            inputs: [...prev.inputs, newInput],
          };
        });
      }
      message.success("Input added");
    }

    setShowAddInputModal(false);
    setEditingInput(null);
  };

  const isFinishing = isSavingUdf || isSubmitting;

  return (
    <>
      <Modal
        title={`Add new ratio performance figure`}
        open={open && currentStep === 1}
        onOk={handleNext}
        okText="Next"
        onCancel={onCancel}
        width={600}
        centered
        forceRender
        maskClosable={false}
        confirmLoading={createUdfLoading}
        footer={
          <div className="flex justify-between items-center mt-6">
            <span className="text-neutral-500 text-[16.8px] font-semibold">
              Step 1 of 3
            </span>
            <div>
              <Button onClick={handleCancel} className="mr-2">
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={handleNext}
                loading={createUdfLoading}>
                Next
              </Button>
            </div>
          </div>
        }>
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          className="mt-6 [&_.ant-form-item-label>label]:font-semibold"
          preserve={false}>
          <Form.Item
            name="rpf_name"
            label="RPF Name"
            rules={[{ required: true, message: "Isi nama resource!" }]}>
            <Input placeholder="Isi nama resource" />
          </Form.Item>
          <Form.Item
            name="unit"
            label="Unit"
            rules={[{ required: true, message: "Isi unit!" }]}>
            <Input placeholder="Isi unit" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex justify-between items-center">
            <div className="flex flex-col items-start">
              <span className="text-neutral-500 text-[16.8px] font-semibold">
                Step 2 of 3
              </span>
              <span className="text-neutral-900 text-[24.19px] font-semibold">
                Set Ratio Performance Figure UDF
              </span>
            </div>
            <div>
              <Button onClick={handleCancel} className="mr-2">
                Cancel
              </Button>
              <Button type="primary" onClick={handleNext} loading={isFinishing}>
                Next
              </Button>
            </div>
          </div>
        }
        open={open && currentStep === 2}
        onOk={handleNext}
        okText="Next"
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
            <div className="flex flex-col items-start gap-[18px] mt-7">
              <div className="flex items-center flex-wrap gap-y-3">
                <span className="text-black text-[16.8px] font-semibold">
                  RPF Name: {""}
                </span>
                <span className="bg-neutral-200 px-3 py-1 ml-[9px] mr-[18px] rounded-md text-neutral-900 text-[16.8px] font-normal">
                  {step1Values?.rpf_name}
                </span>

                <span className="text-black text-[16.8px] font-semibold">
                  Unit:{""}
                </span>
                <span className="bg-neutral-200 px-3 py-1 ml-[9px] mr-[18px] rounded-md text-neutral-900 text-[16.8px] font-normal">
                  {step1Values?.unit}
                </span>

                <span className="text-black text-[16.8px] font-semibold">
                  Quantity result:{""}
                </span>
                <span className="bg-neutral-200 px-3 py-1 ml-[9px] mr-[18px] rounded-md text-neutral-900 text-[16.8px] font-normal">
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
              <div className="flex items-center"></div>
            </div>

            <div className="flex gap-6 w-full">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-3">
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

                  <div className="bg-white border border-neutral-300 rounded-lg p-4 h-[600px] overflow-hidden">
                    <div className="flex flex-col gap-0.5 h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-neutral-100 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-neutral-300 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-neutral-400">
                      <div className="grid grid-cols-[150px_150px_minmax(0,2fr)_70px_120px_70px] gap-1.5 pb-2.5 sticky top-0 bg-white z-10">
                        <span className="text-sm font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Nama
                        </span>
                        <span className="text-sm font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Data Source
                        </span>
                        <span className="text-sm font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Data Path
                        </span>
                        <span className="text-sm font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Default
                        </span>
                        <span className="text-sm font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Value
                        </span>
                        <span className="text-sm font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2"></span>
                      </div>

                      {rpfUdfData?.inputs?.map((input, index) => (
                        <div
                          key={input._id || index}
                          className="grid grid-cols-[150px_150px_minmax(0,2fr)_70px_120px_70px] gap-1.5 rounded-md">
                          <span
                            title={input.var_name}
                            className="text-sm text-white font-semibold block p-2 min-h-[38px] border border-secondary-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px] bg-secondary-300">
                            {input.var_name}
                          </span>

                          <span
                            title={getDataSource(input.ref_name)}
                            className="text-sm text-neutral-900 font-normal block p-2 min-h-[38px] border border-neutral-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px]">
                            {input.ref_name !== undefined &&
                            input.ref_name !== null
                              ? getDataSource(input.ref_name)
                              : "-"}
                          </span>

                          <span
                            title={input.ref_name}
                            className="text-sm text-neutral-900 font-normal block p-2 min-h-[38px] border border-neutral-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px] [direction:rtl]">
                            {input.ref_name}
                          </span>

                          <span className="text-sm text-neutral-900 font-normal block p-2 min-h-[38px] border border-neutral-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px]">
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
                            className="text-sm text-neutral-900 font-normal block p-2 min-h-[38px] border border-neutral-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px]">
                            {input.value
                              ? formatNumberWithoutRounding(input.value)
                              : ""}
                          </span>

                          <div className="flex justify-center items-center min-w-[70px] border-0 p-0">
                            <MdEditNote
                              size={28}
                              className="cursor-pointer text-neutral-900 hover:opacity-70 mt-0.5"
                              onClick={() => handleEditInput(input)}
                            />
                            <MdDelete
                              size={24}
                              className="cursor-pointer text-neutral-900 hover:opacity-70"
                              onClick={() => handleDeleteInputRpf(input._id)}
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
                  <div className="flex-1">
                    <Tabs
                      defaultActiveKey="code"
                      className="customTabs"
                      items={[
                        { key: "code", label: "Code" },
                        { key: "test", label: "Test result" },
                        { key: "debug", label: "Debugging" },
                      ]}
                      onChange={(key) => setActiveTestTab(key)}
                    />
                  </div>
                  <Button
                    onClick={handleRunRpfTest}
                    type="primary"
                    className="customSecondaryButton btn-md"
                    loading={testLoading}>
                    Run test
                  </Button>
                </div>

                {activeTestTab === "code" && (
                  <div className="bg-white rounded-md p-4">
                    <CodeEditor
                      value={rpfUdfCode}
                      onChange={setRpfUdfCode}
                      highlightTerms={RpfHighlightWords}
                    />
                  </div>
                )}

                {activeTestTab === "test" && (
                  <div className="flex flex-col gap-2 rounded-lg flex-grow py-1">
                    <div className="flex justify-start items-start bg-neutral-200 rounded-md h-[38rem]">
                      <div className="text-sm text-neutral-900 font-medium p-4 flex items-start justify-start h-full w-full bg-neutral-200 rounded-md">
                        {testResult !== null ? testResult?.result_output : "-"}
                      </div>
                    </div>
                  </div>
                )}

                {activeTestTab === "debug" && (
                  <div className="flex flex-col gap-2 rounded-lg flex-grow py-1">
                    <div className="rounded overflow-hidden">
                      <div className="bg-neutral-200 px-4 py-2 text-[16.8px] font-semibold text-center">
                        STDOUT
                      </div>
                      <div className="bg-neutral-100 p-4 h-[36rem] overflow-auto">
                        <div className="text-neutral-700 text-[16.8px] text-left whitespace-pre-wrap">
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

      <Modal
        title={
          <div className="flex justify-between items-center">
            <div className="flex flex-col items-start">
              <span className="text-neutral-500 text-[16.8px] font-semibold">
                Step 3 of 3
              </span>
              <span className="text-neutral-900 text-[24.19px] font-semibold">
                Set RPF Integration UDF
              </span>
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
        open={open && currentStep === 3}
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
            <div className="flex flex-col items-start gap-[18px] mt-7">
              <div className="flex items-center flex-wrap gap-y-3">
                <span className="text-black text-[16.8px] font-semibold">
                  RPF Name: {""}
                </span>
                <span className="bg-neutral-200 px-3 py-1 ml-[9px] mr-[18px] rounded-md text-neutral-900 text-[16.8px] font-normal">
                  {step1Values?.rpf_name}
                </span>

                <span className="text-black text-[16.8px] font-semibold">
                  Unit:{""}
                </span>
                <span className="bg-neutral-200 px-3 py-1 ml-[9px] mr-[18px] rounded-md text-neutral-900 text-[16.8px] font-normal">
                  {step1Values?.unit}
                </span>

                <span className="text-black text-[16.8px] font-semibold">
                  Quantity result:{""}
                </span>
                <span className="bg-neutral-200 px-3 py-1 ml-[9px] mr-[18px] rounded-md text-neutral-900 text-[16.8px] font-normal">
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
              <div className="flex items-center"></div>
            </div>

            <div className="flex gap-6 w-full">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-3">
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

                  <div className="bg-white border border-neutral-300 rounded-lg p-4 h-[600px] overflow-hidden">
                    <div className="flex flex-col gap-0.5 h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-neutral-100 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-neutral-300 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-neutral-400">
                      <div className="grid grid-cols-[150px_150px_minmax(0,2fr)_70px_120px_70px] gap-1.5 pb-2.5 sticky top-0 bg-white z-10">
                        <span className="text-sm font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Nama
                        </span>
                        <span className="text-sm font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Data Source
                        </span>
                        <span className="text-sm font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Data Path
                        </span>
                        <span className="text-sm font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Default
                        </span>
                        <span className="text-sm font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Value
                        </span>
                        <span className="text-sm font-semibold text-neutral-900 text-center whitespace-nowrap overflow-hidden text-ellipsis px-2"></span>
                      </div>

                      {integrationUdfData?.inputs?.map((input, index) => (
                        <div
                          key={input._id || index}
                          className="grid grid-cols-[150px_150px_minmax(0,2fr)_70px_120px_70px] gap-1.5 rounded-md">
                          <span
                            title={input.var_name}
                            className="text-sm text-white font-semibold block p-2 min-h-[38px] border border-secondary-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px] bg-secondary-300">
                            {input.var_name}
                          </span>

                          <span
                            title={getDataSource(input.ref_name)}
                            className="text-sm text-neutral-900 font-normal block p-2 min-h-[38px] border border-neutral-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px]">
                            {input.ref_name !== undefined &&
                            input.ref_name !== null
                              ? getDataSource(input.ref_name)
                              : "-"}
                          </span>

                          <span
                            title={input.ref_name}
                            className="text-sm text-neutral-900 font-normal block p-2 min-h-[38px] border border-neutral-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px] [direction:rtl]">
                            {input.ref_name}
                          </span>

                          <span className="text-sm text-neutral-900 font-normal block p-2 min-h-[38px] border border-neutral-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px]">
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
                            className="text-sm text-neutral-900 font-normal block p-2 min-h-[38px] border border-neutral-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px]">
                            {input.value
                              ? formatNumberWithoutRounding(input.value)
                              : ""}
                          </span>

                          <div className="flex justify-center items-center min-w-[70px] border-0 p-0">
                            <MdEditNote
                              size={28}
                              className="cursor-pointer text-neutral-900 hover:opacity-70 mt-0.5"
                              onClick={() => handleEditInput(input)}
                            />
                            <MdDelete
                              size={24}
                              className="cursor-pointer text-neutral-900 hover:opacity-70"
                              onClick={() =>
                                handleDeleteInputIntegration(input._id)
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
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <Tabs
                      defaultActiveKey="code"
                      className="customTabs"
                      items={[
                        { key: "code", label: "Code" },
                        { key: "test", label: "Test result" },
                        { key: "debug", label: "Debugging" },
                      ]}
                      onChange={(key) => setActiveTestTab(key)}
                    />
                  </div>
                  <Button
                    onClick={handleRunIntegrationTest}
                    type="primary"
                    className="customSecondaryButton btn-md"
                    loading={testLoading}>
                    Run test
                  </Button>
                </div>

                {activeTestTab === "code" && (
                  <div className="bg-white rounded-md p-4">
                    <CodeEditor
                      value={integrationUdfCode}
                      onChange={setIntegrationUdfCode}
                      highlightTerms={IntegrationHighlightWords}
                    />
                  </div>
                )}

                {activeTestTab === "test" && (
                  <div className="flex flex-col gap-2 rounded-lg flex-grow py-1">
                    <div className="flex justify-start items-start bg-neutral-200 rounded-md h-[38rem]">
                      <div className="text-sm text-neutral-900 font-medium p-4 flex items-start justify-start h-full w-full bg-neutral-200 rounded-md">
                        {testResult !== null ? testResult?.result_output : "-"}
                      </div>
                    </div>
                  </div>
                )}

                {activeTestTab === "debug" && (
                  <div className="flex flex-col gap-2 rounded-lg flex-grow py-1">
                    <div className="rounded overflow-hidden">
                      <div className="bg-neutral-200 px-4 py-2 text-[16.8px] font-semibold text-center">
                        STDOUT
                      </div>
                      <div className="bg-neutral-100 p-4 h-[36rem] overflow-auto">
                        <div className="text-neutral-700 text-[16.8px] text-left whitespace-pre-wrap">
                          {testResult !== null
                            ? testResult?.std_out
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

export default RpfModal;

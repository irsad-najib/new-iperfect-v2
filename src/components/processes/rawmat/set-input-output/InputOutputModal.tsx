import { useEffect, useState } from "react";
import { Button, Input, Modal, Form, Tabs, message, List } from "antd";
import { MdClose, MdDelete, MdEditNote, MdSearch } from "react-icons/md";
import { HiOutlineRefresh } from "react-icons/hi";
import api from "@/utils/axios";
import { useDateContext } from "@/context/DateContext";
import AddInputModal from "@/components/processes/AddInputModal";
import Image from "next/image";
import { executeUdf, UdfResult } from "@/utils/udfUtils";
import { formatNumberWithoutRounding } from "@/utils/numberFormat";
import { getDataSource } from "@/utils/dataSourceUtils";
import { CodeEditor } from "@/components/processes/CodeEditor";

interface FormValues {
  resource_name: string;
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
  resource_name: string;
  unit: string;
  udf_id: string | null;
  type: "input" | "output";
}

interface UDFTemplate {
  udf_id: string;
  name: string;
  display_name: string;
}

interface InputOutputModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: InputOutputSubmitData) => void;
  initialValues?: FormValues;
  udfId?: string | null;
  activeDataGroup: string | undefined;
  activeTableGroup: string | undefined;
  activeTableItemName: string | undefined;
  resourceType: "input" | "output" | null;
  isSubmitting?: boolean;
}

const InputOutputModal = ({
  open,
  onCancel,
  onSubmit,
  initialValues,
  udfId,
  activeDataGroup,
  activeTableGroup,
  activeTableItemName,
  resourceType,
  isSubmitting,
}: InputOutputModalProps) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Values, setStep1Values] = useState<FormValues | null>(null);
  const [udfData, setUdfData] = useState<UDFResponse | null>(null);
  const [udfLoading, setUdfLoading] = useState(false);
  const [createUdfLoading, setCreateUdfLoading] = useState(false);
  const { formattedDate } = useDateContext();
  const [udfCode, setUdfCode] = useState("");
  const [showAddInputModal, setShowAddInputModal] = useState(false);
  const [editingInput, setEditingInput] = useState<UDFInput | null>(null);
  const [activeTestTab, setActiveTestTab] = useState("code");
  const [testResult, setTestResult] = useState<UdfResult | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availableInputs, setAvailableInputs] = useState<any[]>([]);
  const [isSavingUdf, setIsSavingUdf] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUdfTemplateLoading, setIsUdfTemplateLoading] = useState(false);
  const [templates, setTemplates] = useState<UDFTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
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
      const currentUdfId = udfData?.udf._id || udfId;

      if (!currentUdfId || !open) {
        if (!udfId) {
          setUdfData(null);
          setUdfCode("");
        }
        return;
      }

      if (udfData?.udf._id === currentUdfId && udfId === currentUdfId) {
        return;
      }

      setUdfLoading(true);
      try {
        const response = await api.get<UDFResponse>(`/udf/${currentUdfId}`, {
          params: {
            tanggal: formattedDate,
          },
        });
        if (response.data) {
          setUdfData(response.data);
          setUdfCode(response.data.udf.code);
          const inputName = response.data?.inputs?.map(
            (input) => input.var_name,
          );
          setHighlightWords(inputName);
        } else {
          message.error(`UDF with ID ${currentUdfId} not found.`);
          setUdfData(null);
          setUdfCode("");
        }
      } catch (error) {
        console.error("Error fetching UDF data:", error);
        message.error("Failed to fetch UDF data");
        setUdfData(null);
        setUdfCode("");
      } finally {
        setUdfLoading(false);
      }
    };

    fetchOrSetUDFData();
  }, [udfId, open, formattedDate, udfData?.udf._id]);

  useEffect(() => {
    const fetchTemplates = async () => {
      setIsUdfTemplateLoading(true);
      try {
        const response = await api.get<UDFTemplate[]>(
          `/pipeline/utils/available-udf?query=quantity`,
        );
        setTemplates(response.data);
      } catch (error) {
        console.error("Error fetching templates:", error);
      } finally {
        setIsUdfTemplateLoading(false);
      }
    };

    if (open) {
      fetchTemplates();
    }
  }, [open]);

  // Reset states when modal closes
  useEffect(() => {
    if (!open) {
      form.resetFields();
      setCurrentStep(1);
      setStep1Values(null);
      setSearchTerm("");
      setSelectedTemplate(null);
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

  const createNewUDF = async () => {
    // const currentFormValues = form.getFieldsValue();
    if (!step1Values?.resource_name) {
      message.error("Resource name is required before creating UDF.");
      throw new Error("Resource name required");
    }

    try {
      setCreateUdfLoading(true);
      const payload = {
        udf: {
          name: `${activeDataGroup}-${activeTableGroup}-${activeTableItemName}-${resourceType}-${step1Values.resource_name}-quantity-${formattedDate}`,
          code: "# Start coding your UDF here",
        },
        inputs: [],
      };

      const response = await api.post<UDFResponse>("/udf", payload);

      if (response.status === 200 && response.data) {
        message.success("UDF created successfully. Configure inputs and code.");
        setUdfData(response.data);
        setUdfCode(response.data.udf.code);
        setCurrentStep(3);
      } else {
        message.error(`Failed to create UDF (${response.status})`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error creating UDF:", error);
      message.error(
        `Failed to create UDF: ${
          error.response?.data?.message || error.message
        }`,
      );
      throw error;
    } finally {
      setCreateUdfLoading(false);
    }
  };

  const saveUdfChanges = async (): Promise<{
    success: boolean;
    newUdfData?: UDFResponse;
  }> => {
    if (!udfData) {
      message.error("No UDF data available to save.");
      return { success: false };
    }

    setIsSavingUdf(true);
    try {
      if (!selectedTemplate) {
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
        const response = await api.put(`/udf/${udfData.udf._id}`, payload);
        message.success("UDF changes saved succesfully.");
        return { success: true, newUdfData: response.data };
      } else {
        const payload = {
          udf: {
            name: `${activeDataGroup}-${activeTableGroup}-${activeTableItemName}-${resourceType}-${step1Values?.resource_name}-quantity-${formattedDate}`,
            code: udfCode,
          },
          inputs: udfData.inputs.map((input) => ({
            ...input,
            udf_id: "",
          })),
        };
        const response = await api.post(`/udf`, payload);
        message.success("UDF added succesfully.");
        return { success: true, newUdfData: response.data };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log("Error saving or adding UDF:", error);
      message.error(
        `Failed to save or add UDF: ${
          error.response?.data?.message || error.message
        }`,
      );
      return { success: false };
    } finally {
      setIsSavingUdf(false);
    }
  };

  const handleNext = async () => {
    try {
      if (currentStep === 1) {
        const values = await form.validateFields();
        setStep1Values(values);
        if (udfId) {
          if (!udfData && !udfLoading) {
            message.warning("UDF data not yet loaded. Trying again...");
          }
          setCurrentStep(3);
        } else {
          setCurrentStep(2);
        }
      } else {
        if (!resourceType || !step1Values) {
          message.error(
            "Cannot submit. Resource type, step 1 data, or UDF data is missing.",
          );
          console.error("Missing data for submission:", {
            resourceType,
            step1Values,
            udfData,
          });
          return;
        }
        const { success, newUdfData } = await saveUdfChanges();
        if (success) {
          onSubmit({
            ...step1Values,
            udf_id: newUdfData?.udf._id || null,
            type: resourceType,
          });
        } else {
          message.error(
            "Could not save UDF changes. Quantity submission aborted.",
          );
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
    setSearchTerm("");
    setSelectedTemplate(null);
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

  const filteredTemplates = templates.filter((template) =>
    template.display_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAddUDFTemplate = async () => {
    if (!step1Values?.resource_name) {
      message.error("Resource name is required before creating UDF.");
      throw new Error("Resource name required");
    }

    setUdfLoading(true);
    try {
      const response = await api.get<UDFResponse>(`/udf/${selectedTemplate}`, {
        params: {
          tanggal: formattedDate,
        },
      });
      if (response.data) {
        setUdfData(response.data);
        setUdfCode(response.data.udf.code);
        setCurrentStep(3);
      } else {
        message.error(`UDF with ID ${selectedTemplate} not found.`);
        setUdfData(null);
        setUdfCode("");
      }
    } catch (error) {
      console.error("Error fetching UDF data:", error);
      message.error("Failed to fetch UDF data");
      setUdfData(null);
      setUdfCode("");
    } finally {
      setUdfLoading(false);
    }
  };

  return (
    <>
      <Modal
        title={`Add new ${resourceType || "input/output"}`}
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
              Step 1 of 2
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
            name="resource_name"
            label="Resource name"
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
        title="Add UDF"
        open={open && currentStep === 2}
        onCancel={handleCancel}
        footer={null}
        closeIcon={<MdClose size={28} />}
        centered
        maskClosable={false}
        className="[&_.ant-modal-content]:rounded-lg [&_.ant-modal-header]:border-b-0 [&_.ant-modal-header]:px-6 [&_.ant-modal-header]:py-4 [&_.ant-modal-body]:px-6 [&_.ant-modal-body]:pt-0 [&_.ant-modal-body]:pb-6">
        <div className="flex flex-col gap-4">
          <div>
            <h4 className="font-semibold mb-2">Select UDF code template</h4>
            <Input
              prefix={<MdSearch size={20} />}
              placeholder="Search by name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex justify-between py-2 pr-[70px] text-neutral-900 text-sm">
              <span className="font-semibold">Template name</span>
              <span className="font-semibold">Last saved</span>
            </div>
            <List
              className="h-[240px] overflow-y-auto rounded-lg bg-neutral-100 [&_.ant-list-item]:!px-4 [&_.ant-list-item]:!py-[11px] [&_.ant-list-item]:cursor-pointer [&_.ant-list-item]:flex [&_.ant-list-item]:items-center [&_.ant-list-item]:gap-4 [&_.ant-list-item:hover]:bg-neutral-200"
              itemLayout="horizontal"
              loading={isUdfTemplateLoading}
              dataSource={filteredTemplates}
              renderItem={(item) => {
                const isSelected = selectedTemplate === item.udf_id;
                return (
                  <List.Item
                    className={isSelected ? "bg-secondary-300" : ""}
                    onClick={() => setSelectedTemplate(item.udf_id)}>
                    <div
                      className={`text-[16.8px] ${
                        isSelected ? "text-white" : "text-neutral-900"
                      }`}>
                      {item.display_name}
                    </div>
                    <div
                      className={`flex items-center gap-2 text-[16.8px] ${
                        isSelected ? "text-white" : "text-neutral-900"
                      }`}>
                      <Image
                        src="/images/avatar.png"
                        alt="User avatar"
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                  </List.Item>
                );
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="primary"
              onClick={() => handleAddUDFTemplate()}
              block
              className="customPrimaryButton btn-md disabled:!bg-neutral-300 disabled:!text-neutral-100 disabled:!border-0 disabled:cursor-not-allowed"
              disabled={!selectedTemplate}
              loading={udfLoading}>
              Add new UDF from template
            </Button>
            <Button
              onClick={() => createNewUDF()}
              block
              className="customSecondaryButton btn-md disabled:!bg-neutral-300 disabled:!text-neutral-100 disabled:!border-0 disabled:cursor-not-allowed"
              disabled={selectedTemplate !== null}
              loading={createUdfLoading}>
              Create new blank UDF
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        title={
          <div className="flex justify-between items-center">
            <div className="flex flex-col items-start">
              <span className="text-neutral-500 text-[16.8px] font-semibold">
                Step 2 of 2
              </span>
              <span className="text-neutral-900 text-[24.19px] font-semibold">
                Set Quantity UDF
              </span>
            </div>
            <div>
              <Button onClick={handleCancel} style={{ marginRight: 8 }}>
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
        onCancel={handleCancel}
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
                  Resource Name {resourceType}: {""}
                </span>
                <span className="bg-neutral-200 px-3 py-1 ml-[9px] mr-[18px] rounded-md text-neutral-900 text-[16.8px] font-normal">
                  {step1Values?.resource_name}
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
                      {udfData?.inputs?.map((input, index) => (
                        <div
                          key={input._id || index}
                          className="grid grid-cols-[150px_150px_minmax(0,2fr)_70px_120px_70px] gap-1.5 rounded-md">
                          <span
                            title={input.var_name}
                            className="text-sm text-white font-semibold block p-2 min-h-[38px] border border-secondary-300 rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px] bg-secondary-300">
                            {input.var_name}
                          </span>
                          <span title={getDataSource(input.ref_name)}>
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
                  <div className="flex-1">
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
                  </div>
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

export default InputOutputModal;

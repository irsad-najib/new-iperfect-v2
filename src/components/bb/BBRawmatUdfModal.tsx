import React, { useEffect, useState, useCallback } from "react";
import { Button, Input, Modal, Form, Tabs, message, List } from "antd";
import { MdClose, MdDelete, MdEditNote, MdSearch } from "react-icons/md";
import api from "@/utils/axios";
import { useDateContext } from "@/context/DateContext";
import AddInputModal from "@/components/processes/AddInputModal";
import Image from "next/image";
import { executeUdf, UdfResult } from "@/utils/udfUtils";
import { formatNumberWithoutRounding } from "@/utils/numberFormat";
import { getDataSource } from "@/utils/dataSourceUtils";
import { CodeEditor } from "@/components/processes/CodeEditor";

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

interface UDFTemplate {
  udf_id: string;
  name: string;
  display_name: string;
}

interface BBRawmatUdfModalProps {
  open: boolean;
  onCancel: () => void;
  materialName: string; // Resource name akan ambil dari material name
  columnTitle?: string; // Nama kolom yang diklik
  unit?: string; // Unit bisa optional atau required
  udfId?: string | null;
  cellValue?: number | null;
  onUpdateUDF?: (udfId: string) => void;
  cellLocation?: string;
  nms?: string; // NMS# value
  configId?: string; // Config ID untuk edit utility cell
  cellKey?: string; // Cell key untuk edit utility cell
  dataId?: string; // Data ID for BB rawmat
  types?: string; // Types for BB rawmat (e.g., "input_materials")
  onBindUdf?: (udfId: string) => Promise<void>; // Custom binding action overriding default rawmat edit
}

const BBRawmatUdfModal = ({
  open,
  onCancel,
  materialName,
  columnTitle = "Pemakaian Fuse",
  unit: initialUnit,
  udfId,
  cellValue,
  onUpdateUDF,
  configId,
  cellKey,
  dataId,
  types,
  onBindUdf,
}: BBRawmatUdfModalProps) => {
  const [form] = Form.useForm();
  const { formattedDate } = useDateContext();
  const [currentStep, setCurrentStep] = useState<"select" | "config">(
    udfId ? "config" : "select",
  );

  // Helper: Extract unit from material name, supports "Name (Unit)" or "name_with_unit"
  const getUnitFromMaterialName = (name: string): string => {
    if (!name) return "";
    // Try parentheses at the end: e.g., "Raw Condensate (Ton)"
    const parenMatch = name.match(/\(([^)]+)\)\s*$/);
    if (parenMatch && parenMatch[1]) {
      return parenMatch[1].trim();
    }
    // Fallback: last token after underscore: e.g., "fuel_of_gas_m3"
    const lastUnderscoreIndex = name.lastIndexOf("_");
    if (lastUnderscoreIndex !== -1) {
      return name.substring(lastUnderscoreIndex + 1);
    }
    return "";
  };

  const initialDerivedUnit =
    initialUnit || getUnitFromMaterialName(materialName);

  const [unit, setUnit] = useState(initialDerivedUnit);

  // Helper: Normalize material name to API enum key
  // const getMaterialKeyFromName = (name: string): string => {
  //   if (!name) return name;
  //   // Remove trailing parentheses e.g. "Fuel of Gas (M3)" -> "Fuel of Gas"
  //   let base = name.replace(/\s*\([^)]*\)\s*$/, "");
  //   base = base.replace(/[()]/g, "");
  //   // Normalize to snake_case
  //   const normalized = base
  //     .toLowerCase()
  //     .trim()
  //     .replace(/[-\s]+/g, "_")
  //     .replace(/__+/g, "_");

  //   const mapping: Record<string, string> = {
  //     natural_gas: "natural_gas",
  //     fuel_gas: "fuel_gas",
  //     fuel_of_gas: "fuel_gas",
  //     raw_condensate: "raw_condensate",
  //     steam: "steam",
  //   };

  //   if (mapping[normalized]) return mapping[normalized];

  //   // If unit suffix remains e.g. fuel_of_gas_m3, drop last segment and retry
  //   const lastUnderscore = normalized.lastIndexOf("_");
  //   if (lastUnderscore !== -1) {
  //     const maybeBase = normalized.substring(0, lastUnderscore);
  //     if (mapping[maybeBase]) return mapping[maybeBase];
  //   }

  //   return normalized;
  // };
  const [udfData, setUdfData] = useState<UDFResponse | null>(null);
  const [udfLoading, setUdfLoading] = useState(false);
  const [createUdfLoading, setCreateUdfLoading] = useState(false);
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

  // If we already have a UDF ID, jump straight to config and skip template selection.
  useEffect(() => {
    if (open && udfId && currentStep !== "config") {
      setCurrentStep("config");
    }
  }, [open, udfId, currentStep]);

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
      setCurrentStep(udfId ? "config" : "select");
      setSearchTerm("");
      setSelectedTemplate(null);
      setUdfData(null);
      setUdfCode("");
      setTestResult(null);
      setAvailableInputs([]);
      setEditingInput(null);
      setUnit(initialUnit || "");
    } else {
      // When opening, always populate the Unit field.
      const derived = initialUnit || getUnitFromMaterialName(materialName);
      form.setFieldValue("unit", derived);
      setUnit(derived);
    }
  }, [open, initialUnit, materialName, form, udfId]);

  const createNewUDF = async () => {
    const unitValue = form.getFieldValue("unit");
    if (!unitValue) {
      message.error("Unit is required before creating UDF.");
      return;
    }

    try {
      setCreateUdfLoading(true);
      const payload = {
        udf: {
          name: `npk-utility-${materialName}-${formattedDate}`,
          code: "# Start coding your UDF here",
        },
        inputs: [],
      };

      const response = await api.post<UDFResponse>("/udf", payload);

      if (response.status === 200 && response.data) {
        message.success("UDF created successfully. Configure inputs and code.");
        setUdfData(response.data);
        setUdfCode(response.data.udf.code);
        setUnit(unitValue);
        setCurrentStep("config");
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
    } finally {
      setCreateUdfLoading(false);
    }
  };

  const saveUdfChanges = useCallback(async (): Promise<{
    success: boolean;
    newUdfData?: UDFResponse;
  }> => {
    if (!udfData || !materialName) {
      message.error("No UDF data available to save or material name missing.");
      return { success: false };
    }

    setIsSavingUdf(true);
    try {
      let finalUdfId = udfData.udf._id;

      if (!udfId) {
        // Create new UDF
        const payload = {
          udf: {
            name: `npk-utility-${materialName}-${formattedDate}`,
            code: udfCode,
          },
          inputs: udfData.inputs.map((input) => ({
            ...input,
            udf_id: "", // UDF ID will be assigned by backend
          })),
        };
        const response = await api.post(`/udf`, payload);
        message.success("UDF added successfully.");
        finalUdfId = response.data.udf._id;
      } else {
        // Update existing UDF
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
        message.success("UDF changes saved successfully.");
        finalUdfId = response.data.udf._id;
      }

      // Call BB rawmat edit endpoint to update the cell with new/updated UDF
      if (onBindUdf) {
        await onBindUdf(finalUdfId);
      } else if (configId && cellKey && dataId && types) {
        await api.post("/bb/daily/rawmat/data/edit", {
          config_id: configId,
          data_id: dataId,
          types: types,
          cell_ref_key: cellKey,
          udf_id: finalUdfId,
        });
      }

      if (onUpdateUDF) {
        onUpdateUDF(finalUdfId);
      }

      return { success: true, newUdfData: udfData };
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
  }, [
    udfData,
    materialName,
    udfCode,
    udfId,
    formattedDate,
    onBindUdf,
    configId,
    cellKey,
    dataId,
    types,
    onUpdateUDF,
  ]);

  const handleFinish = useCallback(async () => {
    try {
      const { success } = await saveUdfChanges();
      if (success) {
        onCancel();
      }
    } catch (error) {
      console.error("Failed to finish:", error);
    }
  }, [saveUdfChanges, onCancel]);

  const handleCancel = useCallback(() => {
    form.resetFields();
    setCurrentStep(udfId ? "config" : "select");
    setSearchTerm("");
    setSelectedTemplate(null);
    onCancel();
  }, [form, udfId, onCancel]);

  const handleEditInput = (input: UDFInput) => {
    setEditingInput(input);
    setShowAddInputModal(true);
  };

  const handleDeleteInput = (inputId: string) => {
    if (!udfData) return;

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
    if (!udfData?.udf._id) {
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
        udf_id: udfData.udf._id,
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

  const isFinishing = isSavingUdf;

  const filteredTemplates = templates.filter((template) =>
    template.display_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAddUDFTemplate = async () => {
    const unitValue = form.getFieldValue("unit");
    if (!unitValue) {
      message.error("Unit is required before creating UDF.");
      return;
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
        setUnit(unitValue);
        setCurrentStep("config");
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

  useEffect(() => {
    if (!open || currentStep !== "config") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCancel();
      }

      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleFinish();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, currentStep, handleFinish, handleCancel]);

  // Shared column layout for input table
  const inputGridStyle: React.CSSProperties = {
    gridTemplateColumns: "150px 150px minmax(0, 2fr) 70px 120px 70px",
  };

  // Base cell classes for input table body rows
  const inputCellBase =
    "text-sm text-[#13162a] block p-2 min-h-[38px] border border-[#b3b5bd] rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px]";

  // Header cell classes
  const headerCellBase =
    "text-sm font-semibold text-[#13162a] text-center whitespace-nowrap overflow-hidden text-ellipsis px-2";

  return (
    <>
      <Modal
        title="Configure UDF"
        open={open && currentStep === "select" && !udfId}
        onCancel={onCancel}
        footer={null}
        closeIcon={<MdClose size={28} />}
        centered
        maskClosable={false}>
        {/* Modal content */}
        <div className="flex flex-col gap-4">
          <div className="mb-4">
            <div className="mb-2">
              <strong>Material Name:</strong> {materialName}
            </div>
            <Form form={form} layout="vertical">
              <Form.Item
                name="unit"
                label="Unit"
                initialValue={unit}
                rules={[{ required: true, message: "Unit is required!" }]}>
                <Input placeholder="Enter unit" />
              </Form.Item>
            </Form>
          </div>

          {/* Template section */}
          <div className="flex flex-col gap-2">
            <h4 className="mb-2 font-semibold">Select UDF code template</h4>
            <Input
              prefix={<MdSearch size={20} />}
              placeholder="Search by name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex justify-between py-2 pr-[70px] text-[#13162a] text-sm">
              <span>Template name</span>
              <span>Last saved</span>
            </div>
            <List
              className="h-60 overflow-y-auto rounded-lg bg-[#f3f4f8]"
              itemLayout="horizontal"
              loading={isUdfTemplateLoading}
              dataSource={filteredTemplates}
              renderItem={(item) => {
                const isSelected = selectedTemplate === item.udf_id;
                return (
                  <List.Item
                    className={isSelected ? "bg-[#ff6b35]!" : ""}
                    onClick={() => setSelectedTemplate(item.udf_id)}>
                    <div
                      className={`text-[16.8px] ${isSelected ? "text-white" : "text-[#13162a]"}`}>
                      {item.display_name}
                    </div>
                    <div
                      className={`text-[16.8px] flex items-center gap-2 ${isSelected ? "text-white" : "text-[#13162a]"}`}>
                      <Image
                        src="/images/avatar.png"
                        alt="User avatar"
                        width={24}
                        height={24}
                        className="w-5 h-5 rounded-full"
                      />
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                  </List.Item>
                );
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <Button
              type="primary"
              onClick={() => handleAddUDFTemplate()}
              block
              className="customPrimaryButton btn-md"
              disabled={!selectedTemplate}
              loading={udfLoading}>
              Add new UDF from template
            </Button>
            <Button
              onClick={() => createNewUDF()}
              block
              className="customSecondaryButton btn-md"
              disabled={selectedTemplate !== null}
              loading={createUdfLoading}>
              Create blank UDF
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        title={`Edit Utilitas ${columnTitle}`}
        open={open && (currentStep === "config" || !!udfId)}
        onCancel={handleCancel}
        width={1830}
        centered
        destroyOnClose={true}
        maskClosable={false}
        wrapClassName="npk-utility-config-modal"
        closeIcon={<MdClose size={24} />}
        footer={null}>
        {udfLoading ? (
          <div>Loading UDF data...</div>
        ) : (
          <>
            {/* Resource data bar */}
            <div className="flex flex-col items-start gap-[18px] mt-7">
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className="text-black text-[16.8px] font-semibold">
                    Material Name:{" "}
                  </span>
                  <span className="bg-[#e6e6e6] py-1 px-3 ml-[9px] mr-[18px] rounded-md text-[#13162a] text-[16.8px]">
                    {materialName}
                  </span>
                  <span className="text-black text-[16.8px] font-semibold">
                    Unit:
                  </span>
                  <span className="bg-[#e6e6e6] py-1 px-3 ml-[9px] mr-[18px] rounded-md text-[#13162a] text-[16.8px]">
                    {unit}
                  </span>
                  <span className="text-black text-[16.8px] font-semibold">
                    Cell result:{" "}
                  </span>
                  <span className="bg-[#e6e6e6] py-1 px-3 ml-[9px] mr-[18px] rounded-md text-[#13162a] text-[16.8px]">
                    {cellValue !== null && cellValue !== undefined
                      ? formatNumberWithoutRounding(cellValue)
                      : "-"}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <span className="bg-[#e6e6e6] py-1 px-3 ml-[9px] mr-[18px] rounded-md text-[#13162a] text-[16.8px]">
                    Last saved:{" "}
                    <span className="font-semibold">2 minutes ago</span>
                  </span>
                  <Button className="customSecondaryButton btn-md">
                    Reset UDF
                  </Button>
                  <Button className="customSecondaryButton btn-md">
                    Load template
                  </Button>
                  <Button
                    type="primary"
                    className="customPrimaryButton btn-md"
                    onClick={handleFinish}
                    loading={isFinishing}>
                    Update
                  </Button>
                </div>
              </div>
            </div>

            {/* Split layout: left = inputs table, right = code/test/debug */}
            <div className="flex gap-6 w-full mt-[18px]">
              {/* Left section – inputs */}
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
                  <div className="bg-white border border-[#b3b5bd] rounded-lg p-4 h-[600px] overflow-hidden">
                    <div
                      className={[
                        "flex flex-col gap-0.5 h-full overflow-y-auto",
                        "[&::-webkit-scrollbar]:w-2",
                        "[&::-webkit-scrollbar-track]:bg-[#f1f1f1] [&::-webkit-scrollbar-track]:rounded",
                        "[&::-webkit-scrollbar-thumb]:bg-[#b3b5bd] [&::-webkit-scrollbar-thumb]:rounded",
                        "[&::-webkit-scrollbar-thumb:hover]:bg-[#9598a1]",
                      ].join(" ")}>
                      {/* Header row */}
                      <div
                        className="grid gap-1.5 pb-2.5 sticky top-0 bg-white z-1"
                        style={inputGridStyle}>
                        <span className={headerCellBase}>Nama</span>
                        <span className={headerCellBase}>Data Source</span>
                        <span className={headerCellBase}>Data Path</span>
                        <span className={headerCellBase}>Default</span>
                        <span className={headerCellBase}>Value</span>
                        <span className={headerCellBase}></span>
                      </div>

                      {/* Data rows */}
                      {udfData?.inputs?.map((input, index) => (
                        <div
                          key={input._id || index}
                          className="grid gap-1.5 rounded-md"
                          style={inputGridStyle}>
                          {/* First cell – highlighted */}
                          <span
                            title={input.var_name}
                            className="bg-[#f47920] text-white border-[#f47920] font-semibold text-sm block p-2 min-h-[38px] rounded-md whitespace-nowrap overflow-hidden text-ellipsis text-center leading-[22px] border">
                            {input.var_name}
                          </span>
                          <span
                            title={getDataSource(input.ref_name)}
                            className={inputCellBase}>
                            {input.ref_name !== undefined &&
                            input.ref_name !== null
                              ? getDataSource(input.ref_name)
                              : "-"}
                          </span>
                          <span
                            title={input.ref_name}
                            className={`${inputCellBase} [direction:rtl]`}>
                            {input.ref_name}
                          </span>
                          <span className={inputCellBase}>
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
                            className={inputCellBase}>
                            {input.value
                              ? formatNumberWithoutRounding(input.value)
                              : ""}
                          </span>
                          <div className="flex justify-center items-center min-w-[70px]">
                            <MdEditNote
                              size={28}
                              className="text-[18px] cursor-pointer text-[#13162a] mt-0.5 hover:opacity-70"
                              onClick={() => handleEditInput(input)}
                            />
                            <MdDelete
                              size={24}
                              className="text-[18px] cursor-pointer text-[#13162a] hover:opacity-70"
                              onClick={() => handleDeleteInput(input._id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right section – code / test / debug */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex justify-between items-start gap-4">
                  <Tabs
                    defaultActiveKey="code"
                    className="customTabs flex-1"
                    items={[
                      { key: "code", label: "Code" },
                      { key: "test", label: "Test result" },
                      { key: "debug", label: "Debugging" },
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
                    <CodeEditor
                      value={udfCode}
                      onChange={setUdfCode}
                      highlightTerms={highlightWords}
                    />
                  </div>
                )}

                {activeTestTab === "test" && (
                  <div className="flex flex-col gap-2 rounded-lg grow py-1">
                    <div className="flex justify-start items-start bg-[#eeeff1] rounded-md h-152">
                      <div className="text-sm text-[#111827] font-medium p-4 flex items-start justify-start h-full w-full bg-[#eeeff1] rounded-md">
                        {testResult !== null ? testResult?.result_output : "-"}
                      </div>
                    </div>
                  </div>
                )}

                {activeTestTab === "debug" && (
                  <div className="flex flex-col gap-2 rounded-lg grow py-1">
                    <div className="rounded overflow-hidden">
                      <div className="bg-[#e6e6e6] px-4 py-2 text-[16.8px] font-semibold text-center">
                        STDOUT
                      </div>
                      <div className="bg-[#eeeff1] p-4 h-144 overflow-auto">
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

export default BBRawmatUdfModal;

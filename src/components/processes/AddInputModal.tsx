import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  InputNumber,
  Spin,
  message,
} from "antd";
import { MdClose } from "react-icons/md";
import { HiPlus, HiMinus } from "react-icons/hi";
import api from "@/utils/axios";
import { useDateContext } from "@/context/DateContext";

interface AddInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (input: {
    var_name: string;
    ref_name: string;
    default_value: number;
    timeframe_selection: string;
    adjustment_value?: number;
    value: number | null;
  }) => void;
  unbalance?: number | null | undefined;
  max?: number | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  availableInputs: any[];
  editingInput?: {
    _id?: string;
    udf_id?: string;
    var_name: string;
    ref_name: string;
    default_value: number;
    timeframe_selection: string | null;
    adjustment_value?: number;
    value?: number | null;
  } | null;
  activeTab?: string;
  tieinProfileId?: string;
  headers?: { key: string; title: string }[];
  rows?: { key: string; rowIndex: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setAdjustedTableData?: (data: any) => void;
}

const AddInputModal: React.FC<AddInputModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  availableInputs,
  unbalance,
  max,
  editingInput = null,
  activeTab = "before",
  tieinProfileId,
  headers = [],
  rows = [],
  setAdjustedTableData,
}) => {
  const [form] = Form.useForm();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [levels, setLevels] = useState<{ level: number; options: any[] }[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [timeframeOptions, setTimeframeOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [valueLoading, setValueLoading] = useState(false);
  const [fetchedValue, setFetchedValue] = useState<number | null>(null);
  const [finalValue, setFinalValue] = useState<number | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const { formattedDate } = useDateContext();

  const fetchTimeframeSelections = useCallback(
    async (refName: string) => {
      try {
        setLoading(true);
        const response = await api.get(
          `/udf/utils/available-timeframe-selection?ref_name=${refName}`
        );
        if (response.data?.timeframe) {
          setTimeframeOptions(response.data.timeframe);
          if (!editingInput) {
            form.setFieldValue("timeframe_selection", undefined);
          }
        }
      } catch (error) {
        console.error("Error fetching timeframe selections:", error);
      } finally {
        setLoading(false);
      }
    },
    [editingInput, form]
  );

  const fetchValue = useCallback(
    async (refName: string, timeframeSelection: string) => {
      if (!refName) return;

      try {
        setValueLoading(true);
        const response = await api.get("/udf/utils/udf-inputs-value", {
          params: {
            ref_name: refName,
            timeframe_selection: timeframeSelection,
            tanggal: formattedDate,
          },
        });

        if (response.data?.value !== undefined) {
          const numericValue = parseFloat(response.data.value);
          setFetchedValue(numericValue);
        }
      } catch (error) {
        console.error("Error fetching value:", error);
        setFetchedValue(null);
      } finally {
        setValueLoading(false);
      }
    },
    [formattedDate]
  );

  useEffect(() => {
    if (availableInputs?.length > 0) {
      setLevels([{ level: 1, options: availableInputs }]);
    }

    if (editingInput) {
      form.setFieldsValue(editingInput);

      const pathParts = editingInput.ref_name.split("/");
      setSelectedValues(pathParts);

      let currentData = availableInputs;
      const newLevels = [];

      for (let i = 0; i < pathParts.length; i++) {
        if (currentData) {
          newLevels.push({ level: i + 1, options: currentData });
          const selectedOption = currentData.find(
            (opt) => opt.name === pathParts[i]
          );
          currentData = selectedOption?.data || [];
        }
      }

      setLevels(newLevels);

      const refType = pathParts[1];
      if (refType) {
        fetchTimeframeSelections(refType);
      }
    }
  }, [availableInputs, editingInput, form, fetchTimeframeSelections]);

  const handleLevelChange = (value: string, level: number) => {
    const newSelectedValues = [...selectedValues];
    newSelectedValues[level - 1] = value;
    newSelectedValues.length = level;
    setSelectedValues(newSelectedValues);

    let currentData = availableInputs;
    let path = "";
    for (let i = 0; i < level; i++) {
      const selectedOption = currentData.find(
        (opt) => opt.name === newSelectedValues[i]
      );
      path = path ? `${path}/${selectedOption.name}` : selectedOption.name;
      currentData = selectedOption?.data || [];
    }

    const newLevels = levels.slice(0, level);
    if (currentData.length > 0) {
      newLevels.push({ level: level + 1, options: currentData });
    }
    setLevels(newLevels);

    if (currentData.length === 0) {
      form.setFieldsValue({ ref_name: path });
      setFetchedValue(null);
      const refType = path.split("/")[1];
      fetchTimeframeSelections(refType);

      const timeframeSelection = form.getFieldValue("timeframe_selection");
      fetchValue(path, timeframeSelection);
    } else {
      form.setFieldsValue({ ref_name: undefined });
      setFetchedValue(null);
      setTimeframeOptions([]);
    }
  };

  const handleTimeframeChange = (timeframeSelection: string) => {
    const refName = form.getFieldValue("ref_name");
    if (refName) {
      fetchValue(refName, timeframeSelection);
    }
  };

  const handleAdjustmentChange = (increment: boolean) => {
    const currentValue = Number(form.getFieldValue("adjustment_value"));
    if (
      currentValue !== undefined &&
      currentValue !== null &&
      editingInput?.value !== undefined &&
      editingInput.value !== null
    ) {
      const newFinalValue = increment
        ? Number(editingInput.value) + Number(currentValue)
        : Number(editingInput.value) - Number(currentValue);
      setFinalValue(newFinalValue);
    }
  };

  const handleSubmit = () => {
    form.validateFields().then(async (values) => {
      setSubmitLoading(true);
      try {
        if (activeTab === "adjusted") {
          try {
            const adjustmentValue = form.getFieldValue("adjustment_value");
            const reasoning = form.getFieldValue("reasoning");
            const finalVal = finalValue || 0;
            const beforeVal = editingInput?.value || 0;

            const operation = finalVal > beforeVal ? "add" : "subtract";

            const requestBody = {
              tiein_profile: {
                _id: tieinProfileId,
                tanggal: formattedDate,
                type: "kapasitas_tie_in",
                column: headers,
                row: rows,
              },
              last_edited_udf_id: editingInput?.udf_id,
              adjusted_tag: [
                {
                  inputs: values.ref_name,
                  adjustment_value: Math.abs(adjustmentValue),
                  operation: operation,
                  timeframe_selection: values.timeframe_selection,
                },
              ],
              reason: reasoning,
            };

            const response = await api.post(
              "/tiein/kapasitas-tiein/adjustment",
              requestBody
            );
            setAdjustedTableData?.(response.data.row);
            message.success("Adjustment saved successfully");
          } catch (error) {
            console.error("Error saving adjustment:", error);
            message.error("Failed to save adjustment");
            return;
          }
        }

        onAdd({
          ...values,
          value: fetchedValue,
        });
        form.resetFields();
        setSelectedValues([]);
        setLevels([{ level: 1, options: availableInputs }]);
        setTimeframeOptions([]);
        setFetchedValue(null);
        onClose();
      } catch (error) {
        console.error("Error submitting form:", error);
        message.error("Failed to process request");
      } finally {
        setSubmitLoading(false);
      }
    });
  };

  const getFieldClassName = (
    unbalance: number | null | undefined,
    max: number | null | undefined
  ) => {
    if (unbalance && max) {
      return unbalance <= max
        ? "!w-full !text-white !bg-success"
        : "!w-full !text-white !bg-danger";
    }
    return "!w-full !text-black";
  };

  return (
    <Modal
      title={
        editingInput
          ? activeTab === "adjusted"
            ? "Adjust input"
            : "Edit input"
          : "Add new input"
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      closeIcon={<MdClose size={28} />}
      width={activeTab === "adjusted" ? "75rem" : "50rem"}
      centered
      zIndex={1001}
      styles={{
        body: { padding: "24px", borderRadius: "8px" },
        header: { marginBottom: "24px", padding: 0, borderBottom: "none" },
      }}>
      <div className="p-0">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div
            className={
              activeTab === "adjusted"
                ? "grid grid-cols-3 gap-6"
                : "grid grid-cols-2 gap-6"
            }>
            <div className="pr-6">
              {levels.map((level, index) => (
                <Form.Item
                  key={level.level}
                  label={`Level ${level.level}`}
                  required={index === levels.length - 1}
                  className="mb-4">
                  <Select
                    placeholder={`Select level ${level.level}`}
                    value={selectedValues[level.level - 1]}
                    onChange={(value) => handleLevelChange(value, level.level)}
                    showSearch
                    optionFilterProp="children"
                    className="[&_.ant-select-selector]:!py-2 [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!rounded-md">
                    {level.options.map((option) => (
                      <Select.Option key={option.name} value={option.name}>
                        {option.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              ))}
              <Form.Item
                name="ref_name"
                hidden
                rules={[
                  {
                    required: true,
                    message: "Please complete level selection!",
                  },
                ]}>
                <Input />
              </Form.Item>
            </div>

            <div className="flex flex-col gap-4">
              <Form.Item
                label="Timeframe"
                name="timeframe_selection"
                className="mb-4">
                <Select
                  placeholder="Select timeframe"
                  loading={loading}
                  disabled={timeframeOptions.length === 0}
                  showSearch
                  optionFilterProp="children"
                  onChange={handleTimeframeChange}
                  className="[&_.ant-select-selector]:!py-2 [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!rounded-md">
                  {timeframeOptions.map((timeframe) => (
                    <Select.Option key={timeframe} value={timeframe}>
                      {timeframe}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="Input Name"
                name="var_name"
                rules={[
                  { required: true, message: "Please input variable name!" },
                ]}
                className="mb-4">
                <Input
                  placeholder="Enter input name"
                  className="!py-2 !px-3 !rounded-md"
                />
              </Form.Item>

              {activeTab === "adjusted" && editingInput ? (
                <Form.Item label="Value (before)" className="mb-4">
                  <InputNumber
                    placeholder="Value (before)"
                    className="!w-full !text-black"
                    disabled
                    value={editingInput.value}
                  />
                </Form.Item>
              ) : (
                <>
                  <Form.Item
                    label="Default Value"
                    name="default_value"
                    className="mb-4">
                    <InputNumber
                      placeholder="Enter default value"
                      className="!w-full"
                    />
                  </Form.Item>

                  <Form.Item label="Value" className="mb-4">
                    <Spin spinning={valueLoading}>
                      <InputNumber
                        placeholder="Value"
                        className="!w-full !text-black !bg-gray-100"
                        readOnly
                        value={fetchedValue}
                      />
                    </Spin>
                  </Form.Item>
                </>
              )}
            </div>

            {activeTab === "adjusted" && (
              <div className="flex flex-col gap-4">
                <Form.Item label="Unbalance (material)" className="mb-4">
                  <InputNumber
                    disabled
                    value={unbalance}
                    className={getFieldClassName(unbalance, max)}
                  />
                </Form.Item>
                <Form.Item label="Max tolerance (material)" className="mb-4">
                  <InputNumber
                    disabled
                    value={max}
                    className={getFieldClassName(unbalance, max)}
                  />
                </Form.Item>
                <Form.Item
                  label="Adjustment Value"
                  name="adjustment_value"
                  rules={[
                    {
                      required: true,
                      message: "Please input adjustment value!",
                    },
                  ]}
                  className="mb-4">
                  <div className="flex items-stretch gap-2">
                    <InputNumber
                      placeholder="Enter adjust value"
                      className="!w-full"
                      onChange={(value) => {
                        form.setFieldValue("adjustment_value", value);
                      }}
                    />
                    <Button
                      icon={<HiPlus size={28} />}
                      className="!flex !items-center !justify-center !h-[50px] !min-w-[50px] !p-0 !border !border-secondary-300 !rounded-md hover:!border-secondary-300 hover:!text-secondary-300"
                      onClick={() => handleAdjustmentChange(true)}
                    />
                    <Button
                      icon={<HiMinus size={28} />}
                      className="!flex !items-center !justify-center !h-[50px] !min-w-[50px] !p-0 !border !border-secondary-300 !rounded-md hover:!border-secondary-300 hover:!text-secondary-300"
                      onClick={() => handleAdjustmentChange(false)}
                    />
                  </div>
                </Form.Item>
                <Form.Item label="Final" className="mb-4">
                  <InputNumber
                    placeholder="Final"
                    className="!w-full !text-black"
                    disabled
                    value={finalValue}
                  />
                </Form.Item>
                <Form.Item
                  label="Reasoning"
                  name="reasoning"
                  rules={[{ required: true, message: "Tolong Isi alasan!" }]}
                  className="mb-4">
                  <Input.TextArea placeholder="Isi alasan" />
                </Form.Item>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-6">
            <Button onClick={onClose}>Undo</Button>
            <Button type="primary" htmlType="submit" loading={submitLoading}>
              {editingInput ? "Save" : "Add"}
            </Button>
          </div>
        </Form>
      </div>
    </Modal>
  );
};

export default AddInputModal;

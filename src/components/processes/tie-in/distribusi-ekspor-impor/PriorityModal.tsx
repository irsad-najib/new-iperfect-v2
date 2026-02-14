import { useEffect, useMemo } from "react";
import { Button, Form, Input, Modal, Radio, Select } from "antd";
import { useState } from "react";
import TieinDistribusiUdfModal from "./TieinDistribusiUdfModal";

interface PriorityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    value: string,
    limit: number | null,
    limit_udf_id: string | null,
  ) => void;
  options: Array<{ value: string; label: string }>;
  currentPriorities: Array<{ order: number; value: string }>;
  material: string;
  unit: string;
  row: string | undefined;
  importer: string | undefined;
  exporter?: string | undefined;
  maxValue?: number | null;
  initialPriority?: {
    value: string;
    limit: number | null;
    limit_udf_id: string | null;
  };
  modifyLoading: boolean;
  showUdfModal: boolean;
  setShowUdfModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const PriorityModal = ({
  isOpen,
  onClose,
  onSelect,
  options,
  currentPriorities,
  material,
  unit,
  row,
  importer,
  initialPriority,
  modifyLoading,
  showUdfModal,
  setShowUdfModal,
}: PriorityModalProps) => {
  const [form] = Form.useForm();

  const initialMaxOption = useMemo(() => {
    if (isOpen && initialPriority) {
      if (initialPriority.limit_udf_id) {
        return "use udf";
      } else if (initialPriority.limit !== null) {
        return "with max";
      }
    }
    return "no max";
  }, [isOpen, initialPriority]);

  const [udfExporter, setUdfExporter] = useState<string | null>(null);
  const [maxOption, setMaxOption] = useState(initialMaxOption);

  useEffect(() => {
    setMaxOption(initialMaxOption);
  }, [initialMaxOption]);

  // Filter available options
  const availableOptions = options.filter(
    (option) =>
      !currentPriorities.some(
        (priority) =>
          priority.value === option.value &&
          (!initialPriority || priority.value !== initialPriority.value),
      ),
  );

  useEffect(() => {
    if (isOpen && initialPriority) {
      form.setFieldsValue({
        exporter_selection: initialPriority.value,
        max_value: initialPriority.limit,
      });
    } else {
      form.resetFields();
    }
  }, [isOpen, initialPriority, form]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFinish = (values: any) => {
    const { exporter_selection, max_value } = values;
    if (maxOption === "use udf") {
      setUdfExporter(exporter_selection);
      setShowUdfModal(true);
    } else {
      onSelect(
        exporter_selection,
        max_value ? parseFloat(max_value) : null,
        null,
      );
    }
  };

  const handleUdfModalClose = () => {
    setShowUdfModal(false);
    setUdfExporter(null);
    onClose();
  };

  return (
    <>
      <Modal
        title={initialPriority ? "Edit item" : "Add new item"}
        open={isOpen}
        onCancel={onClose}
        footer={null}
        width={"25rem"}
        centered
        className="[&_.ant-form-item-label>label]:font-semibold">
        <div className="max-h-[400px] overflow-y-auto">
          <Form form={form} layout="vertical" onFinish={handleFinish}>
            <Form.Item
              label={`Pabrik (Exporter)`}
              name="exporter_selection"
              rules={[{ required: true, message: "Please select exporter!" }]}>
              <Select
                placeholder={`Pilih exporter`}
                showSearch
                optionFilterProp="children">
                {availableOptions.map((option) => (
                  <Select.Option key={option.label} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))}
                {/* Show current value even if not available */}
                {initialPriority &&
                  !availableOptions.some(
                    (opt) => opt.value === initialPriority.value,
                  ) && (
                    <Select.Option
                      key={initialPriority.value}
                      value={initialPriority.value}>
                      {initialPriority.value}
                    </Select.Option>
                  )}
              </Select>
            </Form.Item>

            <div className="flex gap-2.5 flex-col">
              <span className="font-semibold text-[16.8px] text-neutral-900">
                Max value
              </span>
              <Radio.Group
                value={maxOption}
                onChange={(e) => setMaxOption(e.target.value)}
                className="flex gap-6 [&_.ant-radio-wrapper]:text-20 [&_.ant-radio-wrapper]:items-center [&_.ant-radio-checked_.ant-radio-inner]:!border-secondary-300 [&_.ant-radio-checked_.ant-radio-inner]:!bg-secondary-300 [&_.ant-radio:hover_.ant-radio-inner]:!border-primary-300">
                <Radio value="no max">No max</Radio>
                <Radio value="with max">With max</Radio>
                <Radio value="use udf">Use UDF</Radio>
              </Radio.Group>
              {maxOption === "with max" && (
                <Form.Item name="max_value">
                  <Input
                    placeholder="Isi value maksimal"
                    onBeforeInput={(e: React.FormEvent<HTMLInputElement>) => {
                      const target = e.target as HTMLInputElement;
                      if (
                        !/^[0-9]*[,.]?[0-9]*$/.test(
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          target.value + (e as any).data,
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                  />
                </Form.Item>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-2.5">
              <Button
                className="bg-transparent border border-neutral-700 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-900 hover:bg-secondary-300 hover:border-secondary-300 hover:text-neutral-100 active:bg-neutral-500 active:border-neutral-500 active:text-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-[#eeeff1]"
                onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                className="bg-primary-300 border-primary-300 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-100 hover:bg-primary-700 hover:border-primary-700 active:bg-neutral-900 active:border-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300"
                loading={modifyLoading}>
                {initialPriority ? "Save" : "Add"}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
      {showUdfModal && udfExporter && (
        <TieinDistribusiUdfModal
          isOpen={showUdfModal}
          onClose={handleUdfModalClose}
          unbalance={null}
          exporter={udfExporter}
          udfId={initialPriority?.limit_udf_id || null}
          unit={unit}
          importer={importer}
          material={material}
          row={row}
          onUpdateUDF={onSelect}
          modifyLoading={modifyLoading}
        />
      )}
    </>
  );
};

export default PriorityModal;

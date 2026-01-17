"use client";

/**
 * OverwriteModal Component - Two-step modal for editing cell values
 *
 * This modal handles the cell editing workflow in two steps:
 *
 * Step 1 (Input):
 * - Shows current cell value
 * - Input field for new value
 * - Indonesian number format support (comma as decimal separator)
 * - Validation for numeric input
 *
 * Step 2 (Confirmation):
 * - Shows value comparison (before → after)
 * - User confirms the change
 * - Triggers API call to save overwrite
 *
 * Features:
 * - Field name translation (e.g., "total" → "Total")
 * - Time format display (HH:MM)
 * - Indonesian number parsing (1.234,56 → 1234.56)
 * - Two-step confirmation to prevent mistakes
 * - Loading state during API call
 * - Input validation
 *
 * API Endpoint: POST /data/{factory}/{part}/cleaning/overwrite
 * Payload: { tag, field, new_value }
 *
 * @component
 */

import React, { useState, useEffect } from "react";
import { Modal, Button, Input, message } from "antd";
import { MdInfo } from "react-icons/md";

/**
 * Props for OverwriteModal component
 */
interface OverwriteModalProps {
  /** Modal visibility state */
  visible: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Confirm overwrite callback - receives new value, returns true if successful */
  onConfirm: (newValue: number) => Promise<boolean>;
  /** Tag name being edited */
  tag: string;
  /** Field name being edited (e.g., "total", "00:00", "average") */
  field: string;
  /** Current value in the cell */
  currentValue: number;
}

const OverwriteModal: React.FC<OverwriteModalProps> = ({
  visible,
  onClose,
  onConfirm,
  tag,
  field,
  currentValue,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [newValue, setNewValue] = useState<string>("");
  const [parsedValue, setParsedValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Reset input when modal opens
   */
  useEffect(() => {
    if (visible) {
      setNewValue("");
      setParsedValue(0);
      setStep(1);
    }
  }, [visible]);

  /**
   * Translates field keys to display names
   * - Hourly fields (HH:MM) → displayed as-is
   * - Summary fields → capitalized display names
   */
  const getFieldDisplayName = (field: string): string => {
    // Check if it's a time field (HH:MM format)
    if (/^\d{2}:\d{2}$/.test(field)) {
      return field;
    }

    // Map summary fields to display names
    const fieldMap: Record<string, string> = {
      total: "Total",
      difference: "Difference",
      average: "Average",
      tda: "TDA",
    };

    return fieldMap[field.toLowerCase()] || field;
  };

  /**
   * Parses Indonesian number format to standard float
   * Supports:
   * - Dot as thousand separator: 1.234.567
   * - Comma as decimal separator: 1.234,56
   *
   * Examples:
   * - "1.234,56" → 1234.56
   * - "1234,56" → 1234.56
   * - "1234.56" → 1234.56 (also valid)
   * - "1234" → 1234
   */
  const parseIndonesianNumber = (value: string): number => {
    if (!value.trim()) return 0;

    // Remove thousand separators (dots) and replace comma with dot
    let cleanValue = value.trim();

    // Check if it uses Indonesian format (comma as decimal)
    const hasComma = cleanValue.includes(",");
    const hasDot = cleanValue.includes(".");

    if (hasComma && hasDot) {
      // Format: 1.234.567,89 (Indonesian)
      cleanValue = cleanValue.replace(/\./g, "").replace(",", ".");
    } else if (hasComma) {
      // Format: 1234,89 (Indonesian)
      cleanValue = cleanValue.replace(",", ".");
    }
    // else: Format: 1234.56 (already standard)

    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  };

  /**
   * Handles input change with validation
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewValue(value);

    // Parse value for preview
    const parsed = parseIndonesianNumber(value);
    setParsedValue(parsed);
  };

  /**
   * Validates input and moves to confirmation step
   */
  const handleNext = () => {
    if (!newValue.trim()) {
      message.error("Please enter a value");
      return;
    }

    const parsed = parseIndonesianNumber(newValue);
    if (isNaN(parsed)) {
      message.error("Please enter a valid number");
      return;
    }

    if (parsed === currentValue) {
      message.warning("New value is the same as current value");
      return;
    }

    setParsedValue(parsed);
    setStep(2);
  };

  /**
   * Returns to input step
   */
  const handleBack = () => {
    setStep(1);
  };

  /**
   * Handles final Save button click
   * Triggers API call via onConfirm callback
   */
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const success = await onConfirm(parsedValue);
      if (success) {
        handleClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resets modal state and closes
   */
  const handleClose = () => {
    setStep(1);
    setNewValue("");
    setParsedValue(0);
    setIsLoading(false);
    onClose();
  };

  /**
   * Step 1: Input new value
   */
  const renderStep1 = () => (
    <div className="px-6 py-4">
      <div className="mb-6">
        <div className="text-[16px] font-semibold mb-2">Tag</div>
        <div className="bg-[#f5f5f5] px-4 py-2 rounded-lg text-[16px]">
          {tag}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-[16px] font-semibold mb-2">Field</div>
        <div className="bg-[#f5f5f5] px-4 py-2 rounded-lg text-[16px]">
          {getFieldDisplayName(field)}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-[16px] font-semibold mb-2">Current Value</div>
        <div className="bg-[#f5f5f5] px-4 py-2 rounded-lg text-[16px]">
          {currentValue}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-[16px] font-semibold mb-2">New Value</div>
        <Input
          value={newValue}
          onChange={handleInputChange}
          placeholder="Enter new value (e.g., 1234,56 or 1234.56)"
          className="text-[16px]"
          autoFocus
          onPressEnter={handleNext}
        />
        <div className="text-[12px] text-[#777986] mt-1">
          Supports Indonesian format: use comma (,) for decimal separator
        </div>
        {newValue && (
          <div className="text-[14px] text-[#404252] mt-2">
            Parsed value: <span className="font-semibold">{parsedValue}</span>
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Step 2: Confirmation with value comparison
   */
  const renderStep2 = () => (
    <div className="px-6 py-4">
      <div className="flex items-start gap-3 mb-6">
        <MdInfo className="text-[#1268B3] flex-shrink-0 mt-1" size={24} />
        <div>
          <div className="text-[16px] font-semibold mb-2">
            Confirm Value Change
          </div>
          <div className="text-[14px] text-[#777986]">
            You are about to change the value for{" "}
            <span className="font-semibold">{tag}</span> at field{" "}
            <span className="font-semibold">{getFieldDisplayName(field)}</span>.
          </div>
        </div>
      </div>

      {/* Value Comparison */}
      <div className="bg-[#f5f5f5] px-4 py-4 rounded-lg mb-6">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="text-[12px] text-[#777986] mb-1">Current</div>
            <div className="text-[20px] font-semibold text-[#404252]">
              {currentValue}
            </div>
          </div>

          <div className="text-[24px] text-[#777986]">→</div>

          <div className="text-center">
            <div className="text-[12px] text-[#777986] mb-1">New</div>
            <div className="text-[20px] font-semibold text-[#00AD17]">
              {parsedValue}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#e3f2fd] border-l-4 border-[#1268B3] px-4 py-3 rounded">
        <div className="text-[14px] text-[#333]">
          <strong>Note:</strong> This will create an overwrite record. You can
          revert this change later if needed.
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      open={visible}
      onCancel={handleClose}
      width={600}
      centered
      footer={null}
      title={
        <div className="text-[20px] font-semibold">
          {step === 1 ? "Edit Cell Value" : "Confirm Changes"}
        </div>
      }>
      {step === 1 ? renderStep1() : renderStep2()}

      {/* Modal Footer */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#d9d9d9]">
        {step === 1 ? (
          <>
            <Button onClick={handleClose} className="min-w-[100px]">
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleNext}
              className="min-w-[100px]">
              Next
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleBack} className="min-w-[100px]">
              Back
            </Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={isLoading}
              className="min-w-[100px]">
              Save
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default OverwriteModal;

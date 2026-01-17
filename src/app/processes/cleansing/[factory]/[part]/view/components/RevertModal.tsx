"use client";

/**
 * RevertModal Component - Two-step modal for reverting user modifications
 *
 * This modal handles the revert workflow in two steps:
 *
 * Step 1 (Initial):
 * - Shows current modified value
 * - Shows original value (before modification)
 * - User confirms intent to revert
 *
 * Step 2 (Confirmation):
 * - Shows warning message
 * - User confirms final revert action
 * - Triggers API call to remove overwrite
 *
 * Features:
 * - Field name translation (e.g., "total" → "Total")
 * - Time format display (HH:MM)
 * - Value before/after comparison
 * - Two-step confirmation to prevent accidental reverts
 * - Loading state during API call
 *
 * API Endpoint: DELETE /data/{factory}/{part}/cleaning/overwrite/{tag}/{field}
 *
 * @component
 */

import React, { useState } from "react";
import { Modal, Button } from "antd";
import { MdInfo } from "react-icons/md";

/**
 * Props for RevertModal component
 */
interface RevertModalProps {
  /** Modal visibility state */
  visible: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Confirm revert callback - returns true if successful */
  onConfirm: () => Promise<boolean>;
  /** Tag name being reverted */
  tag: string;
  /** Field name being reverted (e.g., "total", "00:00", "average") */
  field: string;
  /** Original value before modification */
  valueBefore: number;
  /** Current modified value */
  valueAfter: number;
}

const RevertModal: React.FC<RevertModalProps> = ({
  visible,
  onClose,
  onConfirm,
  tag,
  field,
  valueBefore,
  valueAfter,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);

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
   * Handles Next button click in step 1
   * Moves to confirmation step
   */
  const handleNext = () => {
    setStep(2);
  };

  /**
   * Handles Back button click in step 2
   * Returns to initial step
   */
  const handleBack = () => {
    setStep(1);
  };

  /**
   * Handles final Revert button click in step 2
   * Triggers API call via onConfirm callback
   */
  const handleRevert = async () => {
    setIsLoading(true);
    try {
      const success = await onConfirm();
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
    setIsLoading(false);
    onClose();
  };

  /**
   * Step 1: Show current and original values
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
        <div className="text-[16px] font-semibold mb-2">
          Current Value (Modified)
        </div>
        <div className="bg-[#00AD17] text-white px-4 py-2 rounded-lg text-[16px] font-semibold">
          {valueAfter}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-[16px] font-semibold mb-2">Original Value</div>
        <div className="bg-[#f5f5f5] px-4 py-2 rounded-lg text-[16px]">
          {valueBefore}
        </div>
      </div>

      <div className="text-[14px] text-[#777986] mt-4">
        This will revert the modified value back to the original value.
      </div>
    </div>
  );

  /**
   * Step 2: Confirmation warning
   */
  const renderStep2 = () => (
    <div className="px-6 py-4">
      <div className="flex items-start gap-3 mb-6">
        <MdInfo className="text-[#F47920] flex-shrink-0 mt-1" size={24} />
        <div>
          <div className="text-[16px] font-semibold mb-2">
            Are you sure you want to revert this modification?
          </div>
          <div className="text-[14px] text-[#777986]">
            The value for <span className="font-semibold">{tag}</span> at field{" "}
            <span className="font-semibold">{getFieldDisplayName(field)}</span>{" "}
            will be reverted from{" "}
            <span className="font-semibold text-[#00AD17]">{valueAfter}</span>{" "}
            back to <span className="font-semibold">{valueBefore}</span>.
          </div>
        </div>
      </div>

      <div className="bg-[#fff3e0] border-l-4 border-[#F47920] px-4 py-3 rounded">
        <div className="text-[14px] text-[#333]">
          <strong>Warning:</strong> This action cannot be undone. The modified
          value will be permanently removed.
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
          {step === 1 ? "Revert Modification" : "Confirm Revert"}
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
              danger
              onClick={handleRevert}
              loading={isLoading}
              className="min-w-[100px]">
              Revert
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default RevertModal;

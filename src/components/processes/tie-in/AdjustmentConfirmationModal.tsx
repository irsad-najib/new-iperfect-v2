"use client";

import React from "react";
import { Modal, Button } from "antd";
import { MdInfo, MdRestartAlt } from "react-icons/md";
import { HiOutlineAdjustments } from "react-icons/hi";

interface AdjustmentConfirmationModalProps {
  isOpen: boolean;
  isRevert: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRevert: () => void;
}

const AdjustmentConfirmationModal: React.FC<
  AdjustmentConfirmationModalProps
> = ({ isOpen, isRevert, onClose, onConfirm, onRevert }) => {
  return (
    <Modal
      title={
        <div className="flex items-start">
          <MdInfo size={32} className="text-secondary-300 mr-2.5 rotate-180" />
          <span className="text-16">
            {isRevert
              ? "Are you sure you want to revert all adjustments?"
              : "Switch to adjustment mode?"}
          </span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} className="customCancelButton">
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={isRevert ? onRevert : onConfirm}
          className="customPrimaryButton"
          icon={
            isRevert ? (
              <MdRestartAlt size={18} />
            ) : (
              <HiOutlineAdjustments size={18} />
            )
          }>
          {isRevert ? "Revert All" : "Switch to Adjusted"}
        </Button>,
      ]}
      centered
      width={450}>
      <p className="text-14 text-neutral-700 mb-0">
        {isRevert
          ? "This will revert all adjustments made to the matrix values."
          : "You can adjust individual matrix values in adjustment mode."}
      </p>
    </Modal>
  );
};

export default AdjustmentConfirmationModal;

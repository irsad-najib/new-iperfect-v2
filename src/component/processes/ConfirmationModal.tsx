import React from "react";
import { Modal } from "antd";
import { MdInfo } from "react-icons/md";

interface ConfirmationModalProps {
  isVisible: boolean;
  onOk: () => void;
  onCancel: () => void;
  confirmLoading?: boolean;
  okText?: string;
  width?: number;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isVisible,
  onOk,
  onCancel,
  confirmLoading = false,
  okText = "Continue",
  width = 400,
}) => {
  return (
    <Modal
      title={
        <div className="flex items-start font-16">
          <MdInfo size={32} className="text-orange-500 mr-2.5 rotate-180" />
          <span>There will be a possibility of data being overwritten</span>
        </div>
      }
      open={isVisible}
      onOk={onOk}
      onCancel={onCancel}
      okText={okText}
      confirmLoading={confirmLoading}
      centered
      width={width}>
      {/* Empty content */}
    </Modal>
  );
};

export default ConfirmationModal;

import React, { useState } from "react";
import { Modal, DatePicker, message } from "antd";
import { HiCheckCircle } from "react-icons/hi";
import { Dayjs } from "dayjs";
import api from "@/utils/axios";
import ConfirmationModal from "./ConfirmationModal";

const { RangePicker } = DatePicker;

interface UploadDataModalProps {
  isVisible: boolean;
  onCancel: () => void;
  uploadedFileName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uploadedFile: any;
  profileId?: string;
  onSuccess: () => void;
}

const UploadDataModal: React.FC<UploadDataModalProps> = ({
  isVisible,
  onCancel,
  uploadedFileName,
  uploadedFile,
  profileId,
  onSuccess,
}) => {
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    null,
    null,
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);

  const handleDateRangeChange = (
    dates: [Dayjs | null, Dayjs | null] | null
  ) => {
    if (dates) {
      setDateRange(dates);
    } else {
      setDateRange([null, null]);
    }
  };

  const showConfirmModal = () => {
    if (!dateRange[0] || !dateRange[1]) {
      message.error("Please select a date range");
      return;
    }
    setIsConfirmModalVisible(true);
  };

  const handleConfirmCancel = () => {
    setIsConfirmModalVisible(false);
  };

  const handleUploadData = async () => {
    if (!uploadedFile || !profileId) {
      message.error("No file or profile selected");
      return;
    }

    setIsSubmitting(true);
    setIsConfirmModalVisible(false);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("excel_file", uploadedFile.originFileObj);

      // Add date range to form data if available
      if (dateRange[0] && dateRange[1]) {
        formData.append("start_date", dateRange[0].format("YYYY-MM-DD"));
        formData.append("end_date", dateRange[1].format("YYYY-MM-DD"));
      }

      // Send the request
      const response = await api.post(
        `/external_data/${profileId}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200) {
        message.success(`${uploadedFileName} uploaded successfully!`);
        onSuccess();
      } else {
        message.error(
          `Upload failed: ${response.data.message || "Unknown error"}`
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Failed to upload file:", error);
      message.error(
        `Upload failed: ${
          error.response?.data?.message || error.message || "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setDateRange([null, null]);
    onCancel();
  };
  return (
    <>
      <Modal
        title="Upload data"
        open={isVisible}
        onOk={showConfirmModal}
        onCancel={handleCancel}
        okText="Update data"
        confirmLoading={isSubmitting}
        okButtonProps={{ disabled: !dateRange[0] || !dateRange[1] }}
        centered>
        <p className="text-neutral-900 font-14 mb-4 rounded-md">
          <HiCheckCircle size={22} className="text-primary-300 mr-2 text-20" />
          File loaded:&nbsp;
          <span className="font-semibold">{uploadedFileName}</span>
        </p>

        <div className="mb-5">
          <p className="font-medium mb-2 text-neutral-900">Choose date range</p>
          <RangePicker
            className="w-full"
            onChange={handleDateRangeChange}
            format="DD/MM/YYYY"
            value={dateRange}
          />
        </div>
      </Modal>

      <ConfirmationModal
        isVisible={isConfirmModalVisible}
        onOk={handleUploadData}
        onCancel={handleConfirmCancel}
        confirmLoading={isSubmitting}
        okText="Continue"
      />
    </>
  );
};

export default UploadDataModal;

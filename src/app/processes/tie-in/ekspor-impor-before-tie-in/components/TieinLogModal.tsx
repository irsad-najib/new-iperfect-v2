"use client";

import React, { useEffect, useState, useCallback, memo } from "react";
import { Modal, Spin, Empty, Typography, Button } from "antd";
import { MdError } from "react-icons/md";
import { HiDownload } from "react-icons/hi";
import api from "@/utils/axios";
import { useDateContext } from "@/context/DateContext";

const { Text } = Typography;

interface LogResponse {
  message: string;
  status_code: number;
}

interface TieinLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Optimized: Memoized component for better performance
const TieinLogModal: React.FC<TieinLogModalProps> = memo(
  ({ isOpen, onClose }) => {
    const [logHtml, setLogHtml] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logType, setLogType] = useState<string>("adjustment");
    const { formattedDate } = useDateContext();

    const fetchLogs = useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const params: any = {
          tanggal: formattedDate,
          type: logType,
        };

        const response = await api.get<LogResponse>(
          "/utils/kapasitas-tiein-log/all",
          { params }
        );

        if (response.data && response.data.message) {
          setLogHtml(response.data.message);
        } else {
          setLogHtml("");
        }
      } catch (err: any) {
        console.error("Error fetching logs:", err);
        setError(err.response?.data?.message || "Failed to fetch logs");
        setLogHtml("");
      } finally {
        setLoading(false);
      }
    }, [formattedDate, logType]);

    useEffect(() => {
      if (isOpen) {
        fetchLogs();
      }
    }, [isOpen, fetchLogs]);

    // Optimized: useCallback to prevent recreating function
    const handleDownload = useCallback(async () => {
      try {
        setLoading(true);
        console.log("Download functionality is not implemented yet.");
      } catch (err) {
        console.error("Error downloading logs:", err);
      } finally {
        setLoading(false);
      }
    }, []);

    // Optimized: Memoized render function
    const renderLogContent = useCallback(() => {
      if (loading) {
        return (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Spin size="large" />
            <Text>Loading logs...</Text>
          </div>
        );
      }

      if (error) {
        return (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <MdError size={32} color="#E20301" />
            <Text type="danger">{error}</Text>
          </div>
        );
      }

      if (!logHtml || logHtml.includes("No Data Found")) {
        return (
          <Empty
            description="No logs available"
            className="flex flex-col items-center justify-center py-12 gap-4"
          />
        );
      }

      return (
        <div
          className="mt-4 max-h-[500px] overflow-y-auto [&_table]:w-full [&_table]:border-collapse [&_th]:p-2 [&_th]:text-left [&_th]:border [&_th]:border-[#e8e8e8] [&_th]:bg-[#f5f5f5] [&_th]:font-semibold [&_td]:p-2 [&_td]:text-left [&_td]:border [&_td]:border-[#e8e8e8] [&_tr:nth-child(even)]:bg-[#fafafa]"
          dangerouslySetInnerHTML={{ __html: logHtml }}
        />
      );
    }, [loading, error, logHtml]);

    const modalTitle = (
      <div className="flex items-center w-full gap-3">
        <Button
          type="default"
          icon={<HiDownload size={24} />}
          onClick={handleDownload}
          className="flex items-center justify-center text-[#f47920] ml-0 border border-[#404252] rounded w-9 h-9 p-0 hover:text-[#d86b18] hover:bg-[rgba(244,121,32,0.1)] hover:border-[#404252] disabled:text-[#d9d9d9] disabled:border-[#404252]"
          disabled={!logHtml || logHtml.includes("No Data Found")}
        />
        <span className="flex-1">View log Tie In</span>
        <div className="flex mr-8">
          <Button
            className={`customSecondaryButton ${
              logType === "revert" ? "activeButton" : ""
            }`}
            onClick={() => setLogType("revert")}>
            Revert log
          </Button>
          <Button
            className={`customSecondaryButton ${
              logType === "adjustment" ? "activeButton" : ""
            }`}
            onClick={() => setLogType("adjustment")}>
            Adjustment log
          </Button>
        </div>
      </div>
    );

    return (
      <Modal
        title={modalTitle}
        open={isOpen}
        onCancel={onClose}
        footer={null}
        width={"103rem"}
        className="[&_.ant-modal-content]:p-6 [&_.ant-modal-content]:rounded-lg [&_.ant-modal-header]:mb-4 [&_.ant-modal-header]:p-0 [&_.ant-modal-title]:text-lg [&_.ant-modal-title]:font-semibold [&_.ant-modal-close]:top-6 [&_.ant-modal-close]:right-6"
        centered>
        {renderLogContent()}
      </Modal>
    );
  }
);

TieinLogModal.displayName = "TieinLogModal";

export default TieinLogModal;

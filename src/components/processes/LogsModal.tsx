import React, { useEffect, useState, useCallback } from "react";
import { Modal, Spin, Empty, Typography, Button, Switch } from "antd";
import { MdError } from "react-icons/md";
import { HiDownload } from "react-icons/hi";
import api from "@/utils/axios";
import { useDateContext } from "@/context/DateContext";
import { saveAs } from "file-saver";
const { Text } = Typography;

interface LogResponse {
  message: string;
  status_code: number;
}

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bagianId: number;
  pabrikId: number;
  jobId?: string;
  partName: string;
  pabrikName: string;
  customTitle?: string | React.ReactNode;
  name_alias?: string;
}

const LogsModal: React.FC<LogsModalProps> = ({
  isOpen,
  onClose,
  partName,
  pabrikName,
  customTitle,
  name_alias,
}) => {
  const [logHtml, setLogHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailedMode, setDetailedMode] = useState<boolean>(false);
  const { formattedDate } = useDateContext();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use different endpoints based on whether name_alias is provided
      const endpoint = name_alias
        ? "/utils/cleansing-log"
        : "/utils/cleansing-log/all";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        tanggal: formattedDate,
        detailed: detailedMode,
      };

      // Add name_alias to params if provided
      if (name_alias) {
        params.name_alias = name_alias;
      } else {
        // Use the original params for the /all endpoint
        params.pabrik_name = pabrikName;
        params.bagian_name = partName;
      }

      const response = await api.get<LogResponse>(endpoint, { params });

      if (response.data && response.data.message) {
        setLogHtml(response.data.message);
      } else {
        setLogHtml("");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Error fetching logs:", err);
      setError(err.response?.data?.message || "Failed to fetch logs");
      setLogHtml("");
    } finally {
      setLoading(false);
    }
  }, [pabrikName, partName, formattedDate, name_alias, detailedMode]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs, detailedMode]);

  const handleDownload = async () => {
    try {
      // Show loading state
      setLoading(true);

      // Determine the endpoint and params based on whether name_alias is provided
      const endpoint = name_alias
        ? "/utils/cleansing-log/download"
        : "/utils/cleansing-log/all/download";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        tanggal: formattedDate,
      };

      // Add name_alias to params if provided
      if (name_alias) {
        params.name_alias = name_alias;
      } else {
        // Use the original params for the /all endpoint
        params.pabrik_name = pabrikName;
        params.bagian_name = partName;
      }

      // Make an authenticated request to get the file
      const response = await api.get(endpoint, {
        params,
        responseType: "blob", // Important: This tells axios to handle the response as a blob
      });

      const contentDisposition =
        response.headers["content-disposition"]?.trim();
      let filename = "defaultDownload.pdf"; // Fallback filename
      if (contentDisposition) {
        const matches = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }
      saveAs(response.data, filename);
    } catch (err) {
      console.error("Error downloading logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDetailedModeChange = (checked: boolean) => {
    setDetailedMode(checked);
  };

  const renderLogContent = () => {
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
        className="mt-4 max-h-[500px] overflow-y-auto [&_table]:w-full [&_table]:border-collapse [&_th]:p-2 [&_th]:text-left [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-100 [&_th]:font-semibold [&_td]:p-2 [&_td]:text-left [&_td]:border [&_td]:border-neutral-200 [&_td]:wrap-break-word [&_tr:nth-child(even)]:bg-neutral-50"
        dangerouslySetInnerHTML={{ __html: logHtml }}
      />
    );
  };

  const modalTitle = (
    <div className="flex items-center w-full gap-3">
      <Button
        type="default"
        icon={<HiDownload size={24} />}
        onClick={handleDownload}
        className="flex items-center justify-center text-secondary-300 ml-0 border border-neutral-700 rounded w-9 h-9 p-0 hover:text-secondary-500 hover:bg-secondary-300/10 disabled:text-neutral-200 disabled:border-neutral-700"
        disabled={!logHtml || logHtml.includes("No Data Found")}
      />
      <span className="flex-1">
        {customTitle || `View log ${pabrikName}: ${partName}`}
      </span>
      <div className="flex items-center whitespace-nowrap ml-auto mr-5">
        <Text className="mr-2 text-17">Detailed mode</Text>
        <Switch
          checked={detailedMode}
          onChange={handleDetailedModeChange}
          // size="small"
          className="customSwitch"
        />
      </div>
    </div>
  );

  return (
    <Modal
      title={modalTitle}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={800}
      className="[&_.ant-modal-content]:p-6 [&_.ant-modal-content]:rounded-lg [&_.ant-modal-header]:mb-4 [&_.ant-modal-header]:p-0 [&_.ant-modal-title]:text-lg [&_.ant-modal-title]:font-semibold [&_.ant-modal-close]:top-6 [&_.ant-modal-close]:right-6">
      {renderLogContent()}
    </Modal>
  );
};

export default LogsModal;

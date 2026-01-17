import React, { useState, useEffect } from "react";
import { Modal, Input, Button, List, message } from "antd";
import { MdClose, MdSearch } from "react-icons/md";
import Image from "next/image";
import api from "@/utils/axios";

interface PipelineConfig {
  pipeline_id: string;
  name: string;
  display_name: string;
}

interface DailyRunner {
  _id: string;
  tanggal: string;
  config_type: string;
  output: any[];
  pipeline_id: string;
  bagian_id: number;
}

interface LoadConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onLoadConfig: (pipelineId: string) => void;
  dailyRunner: DailyRunner | null;
}

const LoadConfigModal: React.FC<LoadConfigModalProps> = ({
  visible,
  onClose,
  onLoadConfig,
  dailyRunner,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [configs, setConfigs] = useState<PipelineConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchConfigs = async () => {
      setIsLoading(true);
      try {
        // Determine if it's lab data based on the config_type
        const isLabData = dailyRunner?.config_type === "cleaning-lab";
        const pipelineType = isLabData ? "cleaning-lab" : "cleaning";

        const response = await api.get<PipelineConfig[]>(
          `/pipeline/utils/available-pipeline?pipeline_type=${pipelineType}`
        );
        setConfigs(response.data);
      } catch (error) {
        console.error("Error fetching configurations:", error);
        message.error("Failed to fetch configurations");
      } finally {
        setIsLoading(false);
      }
    };

    if (visible) {
      fetchConfigs();
    }
  }, [visible, dailyRunner]);

  const resetStates = () => {
    setSearchTerm("");
    setSelectedConfig(null);
  };

  const handleClose = () => {
    resetStates();
    onClose();
  };

  const handleLoadConfig = async () => {
    if (selectedConfig && dailyRunner) {
      try {
        // Create base payload
        const updatePayload = {
          _id: dailyRunner._id,
          tanggal: dailyRunner.tanggal,
          config_type: dailyRunner.config_type,
          output: [],
          pipeline_id: selectedConfig,
        };

        // Use lab_id for lab data, bagian_id for non-lab data
        const isLabData = dailyRunner.config_type === "cleaning-lab";
        if (isLabData) {
          // For lab data, use lab_id in the API call
          Object.assign(updatePayload, { lab_id: dailyRunner.bagian_id });
        } else {
          // For non-lab data, use bagian_id
          Object.assign(updatePayload, { bagian_id: dailyRunner.bagian_id });
        }

        // Update daily runner with new pipeline id
        const updateResponse = await api.put(
          `/daily_runner/${dailyRunner._id}`,
          updatePayload
        );

        if (updateResponse.status === 200) {
          await onLoadConfig(selectedConfig);
          resetStates();
          onClose();
          message.success("Configuration loaded successfully");
        }
      } catch (error) {
        console.error("Error updating daily runner:", error);
        message.error("Failed to load configuration");
      }
    }
  };

  const filteredConfigs = configs.filter((config) =>
    config.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal
      title="Load config"
      open={visible}
      onCancel={handleClose}
      footer={null}
      closeIcon={<MdClose size={28} />}>
      <div className="flex flex-col gap-4">
        <div>
          <Input
            prefix={<MdSearch size={20} />}
            placeholder="Search by name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex justify-between px-0 pr-[70px] py-2 text-neutral-900 text-14 rounded-t-md">
            <span>Config name</span>
            <span>Last saved</span>
          </div>
          <List
            className="h-60 overflow-y-auto rounded-lg bg-neutral-100"
            itemLayout="horizontal"
            loading={isLoading}
            dataSource={filteredConfigs}
            renderItem={(item) => (
              <List.Item
                className={`!py-[11px] !px-4 cursor-pointer flex items-center gap-4 hover:bg-neutral-200 ${
                  selectedConfig === item.pipeline_id ? "!bg-secondary-300" : ""
                }`}
                onClick={() => setSelectedConfig(item.pipeline_id)}>
                <div
                  className={`text-[16.8px] ${
                    selectedConfig === item.pipeline_id
                      ? "text-white"
                      : "text-neutral-900"
                  }`}>
                  {item.display_name}
                </div>
                <div
                  className={`text-[16.8px] flex items-center gap-2 ml-auto ${
                    selectedConfig === item.pipeline_id
                      ? "text-white"
                      : "text-neutral-900"
                  }`}>
                  <Image
                    src="/images/avatar.png"
                    alt="User avatar"
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </List.Item>
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleLoadConfig}
            block
            className="h-10 disabled:!bg-neutral-400 disabled:!text-neutral-100 disabled:!border-none disabled:cursor-not-allowed"
            disabled={!selectedConfig}>
            Choose config
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default LoadConfigModal;

import React from "react";
import { Modal, Button, List, Spin, Empty } from "antd";

interface LoadUtilityConfigModalProps {
  isVisible: boolean;
  onCancel: () => void;
  onSelect: (configId: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configList: any[];
  isLoading: boolean;
  isApplying: boolean;
}

const LoadUtilityConfigModal: React.FC<LoadUtilityConfigModalProps> = ({
  isVisible,
  onCancel,
  onSelect,
  configList,
  isLoading,
  isApplying,
}) => {
  return (
    <Modal
      title="Load Utility Configuration"
      open={isVisible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
      ]}
      width={600}>
      <div className="my-6">
        {isLoading ? (
          <div className="text-center py-10">
            <Spin tip="Loading configurations..." />
          </div>
        ) : configList.length > 0 ? (
          <List
            dataSource={configList}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            renderItem={(config: any) => (
              <List.Item
                key={config.config_id}
                actions={[
                  <Button
                    key={`apply-button-${config.config_id}`}
                    type="primary"
                    onClick={() => onSelect(config.config_id)}
                    loading={isApplying}
                    disabled={isApplying}>
                    Apply
                  </Button>,
                ]}>
                <List.Item.Meta
                  title={
                    <div className="font-semibold">
                      {config.config_name || config.config_id}
                    </div>
                  }
                  description={
                    <div className="text-12 text-gray-500">
                      Last modified:{" "}
                      {config.last_modified
                        ? new Date(config.last_modified * 1000).toLocaleString(
                            "id-ID",
                          )
                        : "N/A"}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="No configurations available" />
        )}
      </div>
    </Modal>
  );
};

export default LoadUtilityConfigModal;

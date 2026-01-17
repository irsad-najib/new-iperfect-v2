"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  Breadcrumb,
  DatePicker,
  Button,
  Dropdown,
  message,
  Space,
  Modal,
  Tooltip,
} from "antd";
import {
  MdArrowForwardIos,
  MdDelete,
  MdEditNote,
  MdError,
  MdInfoOutline,
} from "react-icons/md";
import Link from "next/link";
import { useDateContext } from "@/context/DateContext";
import { useRouter } from "next/navigation";
import api from "@/utils/axios";
// import TieinConfigModal from "@/component/TieinConfigModal"; // Component belum ada
import { HiOutlineArrowNarrowRight } from "react-icons/hi";

interface Product {
  _id: string;
  name: string;
  unit: string;
}

interface PabrikConfig {
  _id: string;
  pabrik_id: number;
  config_id: string;
  config_name: string;
  export_product: Product[];
  import_product: Product[];
}

interface PabrikData {
  key: number;
  pabrik_name: string;
  pabrik_id: number;
  number_of_configs: number;
  config: PabrikConfig[];
}

interface TieinConfigResponse {
  _id: string;
  name: string;
  tanggal: string;
  default: boolean;
  config: PabrikData[];
}

const TieinConfigPage = () => {
  const { selectedDate, formattedDate } = useDateContext();
  const [selectedConfig, setSelectedConfig] = useState("default_configuration");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [isTieInConfigModalVisible, setIsTieInConfigModalVisible] =
    useState(false);
  const [isLoadConfigModalVisible, setIsLoadConfigModalVisible] =
    useState(false);
  const [isDeleteConfigModalVisible, setIsDeleteConfigModalVisible] =
    useState(false);
  const [tieinConfig, setTieinConfig] = useState<TieinConfigResponse | null>(
    null
  );
  const [selectedPabrikId, setSelectedPabrikId] = useState<number | null>(null);
  const [editingConfig, setEditingConfig] = useState<PabrikConfig | null>(null);
  const [configToDelete, setConfigToDelete] = useState<PabrikConfig | null>(
    null
  );

  // Optimized: Fetch data with useCallback
  const fetchData = useCallback(async () => {
    if (!formattedDate) return;

    try {
      setLoading(true);
      const response = await api.get<TieinConfigResponse>(
        "/tiein/config/get-by-args",
        {
          params: {
            tanggal: formattedDate,
          },
        }
      );
      setTieinConfig(response.data);
    } catch (error) {
      console.error("Error fetching tiein config:", error);
      message.error("Failed to fetch tiein configuration");
    } finally {
      setLoading(false);
    }
  }, [formattedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLoadConfig = useCallback(() => {
    setIsLoadConfigModalVisible(true);
  }, []);

  const handleSetDefault = useCallback(async () => {
    // TODO: Implement set default logic
    // if (!pipeline) return;
    // try {
    //   await api.post("/pipeline/set-default", {
    //     pipeline_id: pipeline._id,
    //     pipeline_type: pipeline.pipeline_type,
    //     bagian_id: part
    //   });
    //   message.success("Successfully set as default configuration");
    // } catch (error) {
    //   console.error("Error setting default configuration:", error);
    //   message.error("Failed to set default configuration");
    // }
  }, []);

  const handleDeleteConfig = useCallback(async () => {
    if (!tieinConfig || !configToDelete) return;

    const updatedPabrikConfigs = tieinConfig.config.map((pabrik) => {
      if (pabrik.pabrik_id === configToDelete.pabrik_id) {
        return {
          ...pabrik,
          config: pabrik.config.filter(
            (config) => config._id !== configToDelete._id
          ),
        };
      }
      return pabrik;
    });

    const newTieinConfig = {
      ...tieinConfig,
      config: updatedPabrikConfigs,
    };

    setTieinConfig(newTieinConfig);
    setIsDeleteConfigModalVisible(false);
    setConfigToDelete(null);

    try {
      await api.post("/tiein/config/save", newTieinConfig);
      message.success("Configuration deleted successfully");
    } catch (error) {
      console.error("Error deleting tie in config:", error);
      message.error("Failed to delete configuration");
    }
  }, [tieinConfig, configToDelete]);

  const handleRedirect = useCallback(() => {
    router.push("/processes/tie-in/ekspor-impor-before-tie-in");
  }, [router]);

  // Optimized: Memoized breadcrumb items
  const breadcrumbItems = useMemo(
    () => [
      {
        title: (
          <Link className="breadcrumbLink" href="/processes">
            <span className="linkText">Processes</span>
          </Link>
        ),
      },
      {
        title: (
          <Link className="breadcrumbLink" href="/processes/tie-in">
            <span className="linkText">Tie In</span>
          </Link>
        ),
      },
      { title: <span className="lastBreadcrumbItem">Set config</span> },
    ],
    []
  );

  // Optimized: Memoized handlers
  const handleEdit = useCallback((record: PabrikConfig) => {
    setEditingConfig(record);
    setIsTieInConfigModalVisible(true);
  }, []);

  const handleDelete = useCallback((record: PabrikConfig) => {
    setConfigToDelete(record);
    setIsDeleteConfigModalVisible(true);
  }, []);

  const handleAddConfig = useCallback(
    async (newConfig: PabrikConfig) => {
      if (!tieinConfig) return;

      const updatedPabrikConfigs = tieinConfig.config.map((pabrik) => {
        if (pabrik.pabrik_id === newConfig.pabrik_id) {
          return {
            ...pabrik,
            config: [...pabrik.config, newConfig],
          };
        }
        return pabrik;
      });

      const newTieinConfig = {
        ...tieinConfig,
        config: updatedPabrikConfigs,
      };

      try {
        const response = await api.post("/tiein/config/save", newTieinConfig);
        setTieinConfig(response.data);
        message.success("Tie in configuration saved successfully");
      } catch (error) {
        console.error("Error saving tie in config:", error);
        message.error("Failed to save tie in configuration");
      }
    },
    [tieinConfig]
  );

  const handleUpdateConfig = useCallback(
    async (updatedConfig: PabrikConfig) => {
      if (!tieinConfig) return;
      const updatedPabrikConfigs = tieinConfig.config.map((pabrik) => {
        if (pabrik.pabrik_id === updatedConfig.pabrik_id) {
          return {
            ...pabrik,
            config: pabrik.config.map((config) =>
              config._id === updatedConfig._id ? updatedConfig : config
            ),
          };
        }
        return pabrik;
      });

      const newTieinConfig = {
        ...tieinConfig,
        config: updatedPabrikConfigs,
      };

      setTieinConfig(newTieinConfig);

      try {
        await api.post("/tiein/config/save", newTieinConfig);
        message.success("Tie in configuration updated successfully");
      } catch (error) {
        console.error("Error updating tie in config:", error);
        message.error("Failed to update tie in configuration");
      }
    },
    [tieinConfig]
  );

  // Optimized: Memoized expanded columns
  const expandedColumns = useMemo(
    () => [
      {
        title: "Name",
        dataIndex: "config_name",
        key: "config_name",
        align: "center" as const,
      },
      {
        title: "ID",
        dataIndex: "config_id",
        key: "config_id",
        align: "center" as const,
      },
      {
        title: "Import Needs",
        dataIndex: "import_product",
        key: "import_product",
        align: "center" as const,
        render: (products: Product[]) => (
          <>
            {products.map((item, index) => (
              <Button
                key={item._id || index}
                className="!px-3 !py-1 !bg-secondary-300 !border-none !rounded !text-14 !my-0.5 !text-neutral-100 !cursor-default !font-semibold !w-max !justify-self-center">
                <span className="value-text">{item.name}</span>
              </Button>
            ))}
          </>
        ),
      },
      {
        title: "Exports",
        dataIndex: "export_product",
        key: "export_product",
        align: "center" as const,
        render: (products: Product[]) => (
          <>
            {products.map((item, index) => (
              <Button
                key={item._id || index}
                className="!px-3 !py-1 !bg-secondary-300 !border-none !rounded !text-14 !my-0.5 !text-neutral-100 !cursor-default !font-semibold !w-max !justify-self-center">
                <span className="value-text">{item.name}</span>
              </Button>
            ))}
          </>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        align: "center" as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render: (_: any, record: PabrikConfig) => (
          <Space size="small">
            <MdEditNote
              className="cursor-pointer"
              size={28}
              onClick={() => handleEdit(record)}
            />
            <MdDelete
              className="cursor-pointer"
              size={24}
              onClick={() => handleDelete(record)}
            />
          </Space>
        ),
      },
    ],
    [handleEdit, handleDelete]
  );

  // Optimized: Memoized main columns
  const mainColumns = useMemo(
    () => [
      {
        title: "No",
        dataIndex: "key",
        key: "key",
        align: "center" as const,
        width: "4%",
      },
      {
        title: "Name",
        dataIndex: "pabrik_name",
        key: "pabrik_name",
        align: "center" as const,
        width: "20%",
      },
      {
        title: "ID",
        dataIndex: "pabrik_id",
        key: "pabrik_id",
        align: "center" as const,
        width: "10%",
      },
      {
        title: "Tie In Configs",
        dataIndex: "number_of_configs",
        key: "number_of_configs",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render: (_: any, record: PabrikData) => {
          const configIds = record.config.map((c) => c.config_id).join(", ");

          return (
            <div className="flex items-center gap-1 pl-10">
              <span>{record.number_of_configs}</span>
              <Tooltip placement="bottom" color="#F47920" title={configIds}>
                <MdInfoOutline size={15} color="#F47920" />
              </Tooltip>
            </div>
          );
        },
      },
    ],
    []
  );

  // Optimized: Memoized expanded row render
  const expandedRowRender = useCallback(
    (record: PabrikData) => (
      <div className="p-0 px-4 pb-4 rounded-lg">
        <div className="flex justify-between items-center mt-0 mb-4">
          <h3 className="m-0 text-[16.8px] text-black">Tie In Config</h3>
          <Button
            type="primary"
            className="customSecondaryButton btn-sm"
            onClick={() => {
              setSelectedPabrikId(record.pabrik_id);
              setEditingConfig(null);
              setIsTieInConfigModalVisible(true);
            }}>
            Add Tie in config
          </Button>
        </div>
        <Table<PabrikConfig>
          columns={expandedColumns}
          dataSource={record.config}
          pagination={false}
          size="small"
          bordered
        />
      </div>
    ),
    [expandedColumns]
  );

  return (
    <div className="p-4 px-5 h-full">
      <div className="flex items-center justify-between">
        <Breadcrumb
          separator={<MdArrowForwardIos size={16} />}
          items={breadcrumbItems}
          className="customBreadcrumb separatorSpacing"
        />
        <Button
          type="default"
          className="customSecondaryButton btn-md mr-12"
          onClick={handleRedirect}>
          <span className="font-normal">Next: </span>
          <span className="font-semibold">Kapasitas Ekspor Impor</span>
          <HiOutlineArrowNarrowRight size={24} className="ml-1" />
        </Button>
      </div>

      <div className="flex justify-between items-center my-7">
        <div className="flex items-center gap-3">
          <span></span>
          <DatePicker
            disabled
            value={selectedDate}
            format="dddd, DD MMMM YYYY"
            className="boldDatePicker"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="font-semibold">Config Tie In:</span>
          <div className="w-fit min-w-[200px] px-[11px] py-1 border border-neutral-200 rounded-md bg-neutral-250">
            {loading ? "Loading..." : tieinConfig?.name || selectedConfig}
          </div>
          <Dropdown
            menu={{
              items: [
                {
                  key: "1",
                  label: "Load default config",
                },
                {
                  key: "2",
                  label: "Load other config",
                },
              ],
            }}>
            <Button
              type="default"
              loading={loading}
              onClick={handleLoadConfig}
              className="customSecondaryButton">
              Load config
              <MdArrowForwardIos
                size={18}
                style={{ transform: "rotate(90deg)" }}
              />
            </Button>
          </Dropdown>
          <Dropdown
            menu={{
              items: [
                {
                  key: "1",
                  label: "Save as new default",
                  onClick: handleSetDefault,
                },
                {
                  key: "2",
                  label: "Save as new tie in config",
                },
              ],
            }}>
            <Button type="primary" className="customPrimaryButton">
              Save
              <MdArrowForwardIos
                size={18}
                style={{ transform: "rotate(90deg)" }}
              />
            </Button>
          </Dropdown>
          <Button type="default" loading={loading} onClick={handleDeleteConfig}>
            <MdDelete size={24} />
          </Button>
        </div>
      </div>

      <Table<PabrikData>
        rowKey="key"
        columns={mainColumns}
        dataSource={tieinConfig?.config}
        expandable={{
          expandedRowRender,
          expandIcon: (props) => {
            const { expanded, onExpand, record } = props;
            return (
              <span
                onClick={(e) => onExpand(record, e)}
                className="mr-2 text-neutral-900 text-lg cursor-pointer">
                {expanded ? (
                  <MdArrowForwardIos className="-rotate-90" />
                ) : (
                  <MdArrowForwardIos className="rotate-90" />
                )}
              </span>
            );
          },
        }}
        bordered
        className="[&_.ant-table-thead>tr>th]:!bg-neutral-250 [&_.ant-table-tbody>tr>td]:!bg-neutral-100 [&_.ant-table-bordered_.ant-table-thead>tr>th]:!border-neutral-250 [&_.ant-table-bordered_.ant-table-tbody>tr>td]:!border-neutral-250"
      />

      {/* TieinConfigModal component belum tersedia */}
      {/* <TieinConfigModal
        visible={isTieInConfigModalVisible}
        onClose={() => {
          setIsTieInConfigModalVisible(false);
          setEditingConfig(null);
        }}
        onSubmit={editingConfig ? handleUpdateConfig : handleAddConfig}
        defaultPabrikId={
          editingConfig
            ? editingConfig.pabrik_id
            : selectedPabrikId ?? undefined
        }
        initialData={editingConfig || undefined}
      /> */}

      <Modal
        title={
          <div className="flex items-center gap-2">
            <MdError size={32} color="#E20301" />
            <span className="text-[16.8px]">Delete Config</span>
          </div>
        }
        open={isDeleteConfigModalVisible}
        onCancel={() => {
          setIsDeleteConfigModalVisible(false);
          setConfigToDelete(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsDeleteConfigModalVisible(false);
              setConfigToDelete(null);
            }}>
            Cancel
          </Button>,
          <Button
            danger
            key="confirm"
            type="primary"
            onClick={handleDeleteConfig}>
            Delete
          </Button>,
        ]}>
        <div className="text-[16.8px] mb-4 ml-8">
          <div className="text-neutral-900">
            Are you sure you want to delete this config?
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TieinConfigPage;

"use client";

import Link from "next/link";
import {
  Breadcrumb,
  Button,
  DatePicker,
  Dropdown,
  Table,
  Tabs,
  Select,
  message,
  Modal,
} from "antd";
import {
  MdArrowForwardIos,
  MdDelete,
  MdPlayArrow,
  MdAdd,
  MdAddCircle,
  MdLibraryBooks,
  MdEditNote,
} from "react-icons/md";
import { HiDotsVertical, HiOutlineArrowNarrowRight } from "react-icons/hi";
import { useDateContext } from "@/context/DateContext";
import { useState, useEffect, useCallback, useMemo } from "react";
import type { ColumnsType } from "antd/es/table";
import api from "@/utils/axios";
import { useRouter } from "next/navigation";
import GuideModal from "@/components/processes/tie-in/GuideModal";
import LoadingSpinner from "@/components/processes/tie-in/LoadingSpinner";
import { formatNumber } from "@/utils/numberFormat";
import PriorityModal from "../../../../components/processes/tie-in/distribusi-ekspor-impor/PriorityModal";

interface DataType {
  key: string;
  no: number;
  name: string;
  priority_list: Array<{
    order: number;
    value: string;
    limit: number | null;
    limit_udf_id: string | null;
  }>;
}

interface DistributionConfig {
  balance: number;
  distribution_config: DataType[];
}

interface ApiConfig {
  [key: string]: DistributionConfig;
}

interface ApiResponse {
  _id: string;
  name: string;
  tanggal: string;
  config: ApiConfig;
  type: string;
  default: boolean;
}

interface OptionsResponse {
  material: string;
  eksporter: string[];
  importer: string[];
}

interface ResultItem {
  importer: string;
  eksporter: string;
  kebutuhan_awal: number;
  jumlah_diimpor: number;
  sisa_kebutuhan: number;
  sisa_kapasitas_ekspor: number;
}

interface MaterialResult {
  material: string;
  items: ResultItem[];
}

export interface DistribusiResult {
  tanggal: string;
  data_id: string;
  profile_id: string;
  data: MaterialResult[];
}

const DistribusiEksporImporPage: React.FC = () => {
  const { selectedDate, formattedDate } = useDateContext();
  const [loading, setLoading] = useState(false);
  const [modifyLoading, setModifyLoading] = useState(false);
  const [runConfigLoading, setRunConfigLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("config");
  const [selectedConfig, setSelectedConfig] = useState("default_configuration");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [config, setConfig] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dailyRunner, setDailyRunner] = useState<any>(null);
  const [activeButton, setActiveButton] = useState("steam");
  const [buttonTabs, setButtonTabs] = useState<
    Array<{ key: string; label: string }>
  >([]);
  const router = useRouter();
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<DataType | null>(null);
  const [editingPriorityIndex, setEditingPriorityIndex] = useState<
    number | null
  >(null);
  const [tabsData, setTabsData] = useState<Record<string, DistributionConfig>>(
    {},
  );
  const [unitOptions, setUnitOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [priorityOptions, setPriorityOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [distribusiTieInProfileId, setDistribusiTieInProfileId] = useState<
    string | null
  >(null);
  const [resultData, setResultData] = useState<DistribusiResult | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [guideContent, setGuideContent] = useState("");
  const [guideLoading, setGuideLoading] = useState(false);
  const [showUdfModal, setShowUdfModal] = useState(false);

  const saveData = useCallback(
    async (newTabsData: Record<string, DistributionConfig>) => {
      if (!dailyRunner?._id || !formattedDate) return;

      setModifyLoading(true);
      try {
        const requestBody = {
          _id: dailyRunner._id,
          tanggal: formattedDate,
          type: "distribusi_ekspor_impor",
          config: Object.entries(newTabsData).reduce((acc, [key, value]) => {
            {
              acc[key] = {
                balance: value.balance,
                distribution_config: value.distribution_config.map((item) => ({
                  key: item.key,
                  no: item.no,
                  name: item.name,
                  priority_list: item.priority_list.map((p) => ({
                    order: p.order,
                    value: p.value,
                    limit: p.limit,
                    limit_udf_id: p.limit_udf_id,
                  })),
                })),
              };
            }
            return acc;
          }, {} as ApiConfig),
        };

        const response = await api.post(
          "/tiein/distribusi-tiein/save",
          requestBody,
        );
        setTabsData(response.data.config);
        setIsPriorityModalOpen(false);
        setShowUdfModal(false);
      } catch (error) {
        console.error("Error saving data:", error);
        message.error("Failed to save data");
      } finally {
        setModifyLoading(false);
      }
    },
    [dailyRunner?._id, formattedDate],
  );
  // Optimized: Memoized fetch result data
  const fetchResultData = useCallback(async () => {
    if (!formattedDate) return;

    try {
      const response = await api.get(`/tiein/distribusi-tiein/result`, {
        params: { tanggal: formattedDate },
      });
      setResultData(response.data);
    } catch (error) {
      console.error("Error fetching result data:", error);
      message.error("Failed to fetch result data");
    }
  }, [formattedDate]);

  useEffect(() => {
    fetchResultData();
  }, [fetchResultData]);

  // Optimized: Parallel API calls for initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!formattedDate) return;

      setLoading(true);
      try {
        const response = await api.get(
          `/tiein/distribusi-tiein/get-by-args?tanggal=${formattedDate}`,
        );
        const data: ApiResponse = response.data;

        const tabs = Object.keys(data.config).map((key) => ({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
        }));
        setButtonTabs(tabs);

        if (!activeButton) {
          setActiveButton(tabs[0]?.key || "steam");
        }

        const transformedData: Record<string, DistributionConfig> = {};
        Object.entries(data.config).forEach(([key, value]) => {
          transformedData[key] = value;
        });

        setTabsData(transformedData);
        setConfig(data);
        setSelectedConfig(data._id);
        if (data._id) {
          setDailyRunner({
            _id: data._id,
            tanggal: data.tanggal,
            type: data.type,
          });
          setDistribusiTieInProfileId(data._id);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        message.error("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [formattedDate, activeButton]);

  // Optimized: Memoized fetch options
  const fetchOptions = useCallback(
    async (material: string) => {
      try {
        const response = await api.get(
          `/tiein/distribusi-tiein/available-eksporter-importer?tanggal=${formattedDate}&material=${material}`,
        );
        const data: OptionsResponse[] = response.data;

        const materialOptions = data.find((item) => item.material === material);
        if (materialOptions) {
          setUnitOptions(
            materialOptions.importer.map((item) => ({
              value: item,
              label: item,
            })),
          );

          setPriorityOptions(
            materialOptions.eksporter.map((item) => ({
              value: item,
              label: item,
            })),
          );
        }
      } catch (error) {
        console.error("Error fetching options:", error);
        message.error("Failed to fetch options");
      }
    },
    [formattedDate],
  );

  useEffect(() => {
    fetchOptions(activeButton);
  }, [activeButton, fetchOptions]);

  // Optimized: Memoized current data getter
  const getCurrentData = useCallback(
    () => tabsData[activeButton] || { distribution_config: [] },
    [tabsData, activeButton],
  );

  // Optimized: useCallback for handlers
  const handleDeleteRow = useCallback(
    (record: DataType) => {
      const currentData = getCurrentData();
      const newData = currentData.distribution_config.filter(
        (item) => item.key !== record.key,
      );

      const updatedData = newData.map((item, index) => ({
        ...item,
        no: index + 1,
      }));

      const newTabsData = {
        ...tabsData,
        [activeButton]: {
          balance: currentData.balance,
          distribution_config: updatedData,
        },
      };

      setTabsData(newTabsData);
      saveData(newTabsData);
    },
    [getCurrentData, tabsData, activeButton, saveData],
  );

  const handleAddRow = useCallback(
    (record: DataType) => {
      const currentData = getCurrentData();
      const index = currentData.distribution_config.findIndex(
        (item) => item.key === record.key,
      );

      const newRow: DataType = {
        key: `row-${Date.now()}`,
        no: record.no + 1,
        name: "",
        priority_list: [],
      };

      const updatedData = [
        ...currentData.distribution_config.slice(0, index + 1),
        newRow,
        ...currentData.distribution_config.slice(index + 1).map((item) => ({
          ...item,
          no: item.no + 1,
        })),
      ];

      const newTabsData = {
        ...tabsData,
        [activeButton]: {
          balance: currentData.balance,
          distribution_config: updatedData,
        },
      };

      setTabsData(newTabsData);
      saveData(newTabsData);
    },
    [getCurrentData, tabsData, activeButton, saveData],
  );

  const handleUnitChange = useCallback(
    (value: string, record: DataType) => {
      const currentData = getCurrentData();
      const newData = currentData.distribution_config.map((item) => {
        if (item.key === record.key) {
          return { ...item, name: value };
        }
        return item;
      });

      const newTabsData = {
        ...tabsData,
        [activeButton]: {
          balance: currentData.balance,
          distribution_config: newData,
        },
      };

      setTabsData(newTabsData);
      saveData(newTabsData);
    },
    [getCurrentData, tabsData, activeButton, saveData],
  );

  const handlePriorityChange = useCallback(
    (
      value: string,
      record: DataType,
      limit: number | null,
      limit_udf_id: string | null,
    ) => {
      const currentData = getCurrentData();
      const newData = currentData.distribution_config.map((item) => {
        if (item.key === record.key) {
          const newOrder = item.priority_list.length + 1;
          return {
            ...item,
            priority_list: [
              ...item.priority_list,
              { order: newOrder, value, limit, limit_udf_id },
            ],
          };
        }
        return item;
      });

      const newTabsData = {
        ...tabsData,
        [activeButton]: {
          balance: currentData.balance,
          distribution_config: newData,
        },
      };

      setTabsData(newTabsData);
      saveData(newTabsData);
    },
    [getCurrentData, tabsData, activeButton, saveData],
  );

  const handleDeletePriority = useCallback(
    (index: number, record: DataType) => {
      Modal.confirm({
        title: (
          <div className="flex items-center gap-2">
            <MdDelete size={32} color="#ff4d4f" />
            <span className="text-[16.8px]">Delete Priority</span>
          </div>
        ),
        content: (
          <div className="text-[16.8px] mb-4 ml-8">
            <div className="text-neutral-900 mb-3">
              Apakah anda yakin ingin menghapus priority ini?
            </div>
            <div className="text-14 text-[#8c8c8c]">
              Tindakan ini tidak dapat dibatalkan.
            </div>
          </div>
        ),
        okText: "Ya, Hapus",
        cancelText: "Cancel",
        okType: "danger",
        centered: true,
        width: 480,
        okButtonProps: {
          style: {
            fontSize: "14px",
            height: "32px",
            borderRadius: "6px",
          },
        },
        cancelButtonProps: {
          style: {
            fontSize: "14px",
            height: "32px",
            borderRadius: "6px",
          },
        },
        onOk() {
          const currentData = getCurrentData();
          const newData = currentData.distribution_config.map((item) => {
            if (item.key === record.key) {
              const newPriority = [...item.priority_list];
              newPriority.splice(index, 1);
              const reorderedPriority = newPriority.map((p, idx) => ({
                order: idx + 1,
                value: p.value,
                limit: p.limit,
                limit_udf_id: p.limit_udf_id,
              }));
              return { ...item, priority_list: reorderedPriority };
            }
            return item;
          });

          const newTabsData = {
            ...tabsData,
            [activeButton]: {
              balance: currentData.balance,
              distribution_config: newData,
            },
          };

          setTabsData(newTabsData);
          saveData(newTabsData);
          message.success("Priority deleted successfully");
        },
      });
    },
    [getCurrentData, tabsData, activeButton, saveData],
  );

  const handleEditPriority = useCallback((record: DataType, index: number) => {
    setCurrentRecord(record);
    setEditingPriorityIndex(index);
    setIsPriorityModalOpen(true);
  }, []);

  const handleUpdatePriority = useCallback(
    (
      value: string,
      record: DataType,
      index: number,
      limit: number | null,
      limit_udf_id: string | null,
    ) => {
      const currentData = getCurrentData();
      const newData = currentData.distribution_config.map((item) => {
        if (item.key === record.key) {
          const newPriority = [...item.priority_list];
          newPriority[index] = {
            ...newPriority[index],
            value,
            limit,
            limit_udf_id,
          };
          return { ...item, priority_list: newPriority };
        }
        return item;
      });

      const newTabsData = {
        ...tabsData,
        [activeButton]: {
          balance: currentData.balance,
          distribution_config: newData,
        },
      };

      setTabsData(newTabsData);
      saveData(newTabsData);
    },
    [getCurrentData, tabsData, activeButton, saveData],
  );

  const handleAddNewRow = useCallback(() => {
    const currentData = getCurrentData();
    const newRow: DataType = {
      key: `row-${Date.now()}`,
      no: currentData.distribution_config.length + 1,
      name: "",
      priority_list: [],
    };

    const newTabsData = {
      ...tabsData,
      [activeButton]: {
        balance: currentData.balance,
        distribution_config: [...currentData.distribution_config, newRow],
      },
    };

    setTabsData(newTabsData);
    saveData(newTabsData);
  }, [getCurrentData, tabsData, activeButton, saveData]);

  const handleLoadConfig = async () => {};
  const handleDeleteConfig = async () => {};

  // Optimized: useCallback for run config
  const handleRunConfig = useCallback(async () => {
    if (!distribusiTieInProfileId) {
      message.error("Profile ID is required to run the config.");
      return;
    }

    setRunConfigLoading(true);
    try {
      await api.post(`/tiein/distribusi-tiein/execute`, null, {
        params: { distribusi_tiein_profile_id: distribusiTieInProfileId },
      });
      message.success("Config executed successfully!");
      await fetchResultData();
      setActiveTab("result");
    } catch (error) {
      console.error("Error executing config:", error);
      message.error("Failed to execute config");
    } finally {
      setRunConfigLoading(false);
    }
  }, [distribusiTieInProfileId, fetchResultData]);

  // Optimized: Memoized dropdown menu
  const getDropdownMenu = useCallback(
    (record: DataType) => ({
      items: [
        {
          key: "add",
          label: "Add row",
          icon: <MdAdd size={24} />,
          onClick: () => handleAddRow(record),
        },
        {
          key: "delete",
          label: "Delete row",
          icon: <MdDelete size={24} />,
          danger: true,
          onClick: () => handleDeleteRow(record),
        },
      ],
    }),
    [handleAddRow, handleDeleteRow],
  );

  // Optimized: Memoized columns
  const columns: ColumnsType<DataType> = useMemo(
    () => [
      {
        title: "No",
        dataIndex: "no",
        key: "no",
        width: 50,
        align: "center",
        render: (_, record) => (
          <div className="flex items-center justify-center gap-2">
            <Dropdown
              menu={getDropdownMenu(record)}
              trigger={["click"]}
              placement="bottomRight">
              <Button
                type="text"
                icon={<HiDotsVertical size={18} />}
                className="border-none p-0 h-auto"
              />
            </Dropdown>
            <span>{record.no}</span>
          </div>
        ),
      },
      {
        title: "Importer",
        dataIndex: "name",
        key: "name",
        width: 150,
        align: "center",
        render: (value: string, record: DataType) => (
          <Select
            value={value || undefined}
            onChange={(value) => handleUnitChange(value, record)}
            style={{ width: "100%" }}
            options={unitOptions}
            placeholder="Select unit"
          />
        ),
      },
      {
        title: () => (
          <div className="text-center w-full">Prioritas Exporter</div>
        ),
        dataIndex: "priority_list",
        key: "priority_list",
        align: "start",
        render: (
          value: Array<{ order: number; value: string; limit: number | null }>,
          record: DataType,
        ) => {
          const sortedPriorities = [...value].sort((a, b) => a.order - b.order);
          return (
            <div className="flex items-center gap-2 ">
              <div className="flex gap-1 flex-wrap items-center">
                {sortedPriorities.map((p, index) => (
                  <>
                    <div className="flex gap-0.5 relative transition-all duration-200 rounded group hover:bg-danger bg-secondary-300 text-neutral-100">
                      <Button
                        key={`btn-${index}`}
                        className="px-3 py-1 bg-secondary-300 border-none rounded text-[16.8px] my-0.5 h-8 text-neutral-100 flex items-center justify-center min-w-max transition-all duration-200 group-hover:bg-transparent group-hover:shadow-none">
                        <span className="opacity-100 transition-all duration-200 relative group-hover:opacity-0 group-hover:invisible text-neutral-100">
                          {p.value}
                        </span>
                      </Button>

                      <div className="flex gap-1 opacity-0 absolute transition-all duration-200 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 invisible z-1 group-hover:opacity-100 group-hover:visible">
                        <MdEditNote
                          className="cursor-pointer"
                          size={24}
                          color="#F3F4F8"
                          onClick={() => handleEditPriority(record, index)}
                        />
                        <MdDelete
                          className="cursor-pointer"
                          size={20}
                          color="#F3F4F8"
                          onClick={() =>
                            modifyLoading
                              ? null
                              : handleDeletePriority(index, record)
                          }
                        />
                      </div>

                      {p.limit && (
                        <div className="flex opacity-100 transition-all duration-200 group-hover:opacity-0 group-hover:invisible">
                          <span className="bg-secondary-300 px-2.5 py-1 rounded-l">
                            Max
                          </span>
                          <span className="bg-secondary-700 px-2.5 py-1 rounded-r">
                            {p.limit}
                          </span>
                        </div>
                      )}
                    </div>
                    <MdArrowForwardIos
                      key={`arrow-${index}`}
                      size={16}
                      className="text-secondary-300"
                    />
                  </>
                ))}
              </div>
              <Button
                type="default"
                className="!w-9 !h-8 !border !border-dashed !border-secondary-300 flex justify-center items-center !bg-transparent !p-0 hover:!bg-white"
                onClick={() => {
                  setCurrentRecord(record);
                  setIsPriorityModalOpen(true);
                }}>
                <MdAddCircle
                  size={20}
                  className="!w-5 !h-5 !text-secondary-300"
                />
              </Button>
            </div>
          );
        },
      },
    ],
    [
      getDropdownMenu,
      unitOptions,
      handleUnitChange,
      handleEditPriority,
      modifyLoading,
      handleDeletePriority,
    ],
  );

  // Optimized: Memoized current result data
  const getCurrentResultData = useCallback(
    () =>
      resultData?.data.find((item) => item.material === activeButton)?.items ||
      [],
    [resultData, activeButton],
  );

  // Optimized: Memoized result columns
  const resultColumns: ColumnsType<ResultItem> = useMemo(
    () => [
      {
        title: "Importer",
        dataIndex: "importer",
        key: "importer",
        align: "center",
      },
      {
        title: "Exporter",
        dataIndex: "eksporter",
        key: "eksporter",
        align: "center",
      },
      {
        title: "Kebutuhan Awal",
        dataIndex: "kebutuhan_awal",
        key: "kebutuhan_awal",
        align: "center",
        render: (value) => (
          <div className="w-full text-center font-normal tabular-nums tracking-tight whitespace-nowrap">
            {typeof value === "number"
              ? formatNumber(value, { decimals: 2, locale: "id-ID" })
              : value === null || value === undefined
                ? "-"
                : value}
          </div>
        ),
      },
      {
        title: "Jumlah di-Impor",
        dataIndex: "jumlah_diimpor",
        key: "jumlah_diimpor",
        align: "center",
        render: (value) => (
          <div className="w-full text-center font-normal tabular-nums tracking-tight whitespace-nowrap">
            {typeof value === "number"
              ? formatNumber(value, { decimals: 2, locale: "id-ID" })
              : value === null || value === undefined
                ? "-"
                : value}
          </div>
        ),
      },
      {
        title: "Sisa Kebutuhan",
        dataIndex: "sisa_kebutuhan",
        key: "sisa_kebutuhan",
        align: "center",
        render: (value) => (
          <div className="w-full text-center font-normal tabular-nums tracking-tight whitespace-nowrap">
            {typeof value === "number"
              ? formatNumber(value, { decimals: 2, locale: "id-ID" })
              : value === null || value === undefined
                ? "-"
                : value}
          </div>
        ),
      },
      {
        title: "Sisa  Kapasitas Ekspor",
        dataIndex: "sisa_kapasitas_ekspor",
        key: "sisa_kapasitas_ekspor",
        align: "center",
        render: (value) => (
          <div className="w-full text-center font-normal tabular-nums tracking-tight whitespace-nowrap">
            {typeof value === "number"
              ? formatNumber(value, { decimals: 2, locale: "id-ID" })
              : value === null || value === undefined
                ? "-"
                : value}
          </div>
        ),
      },
    ],
    [],
  );

  const getItemLabel = useCallback(
    (key: string) => {
      const item = buttonTabs.find((tab) => tab.key === key);
      return item ? item.label : "";
    },
    [buttonTabs],
  );

  const renderContent = () => {
    if (activeTab !== "config") {
      return (
        <div className="flex flex-col gap-6">
          <div className="w-full rounded-lg overflow-hidden">
            <div className="py-3">
              <h2 className="m-0 text-20 font-semibold text-neutral-900">
                Ekspor dan Impor {getItemLabel(activeButton)}
              </h2>
            </div>
            <div className="p-0 overflow-y-auto relative">
              <Table
                columns={resultColumns}
                dataSource={getCurrentResultData()}
                pagination={false}
                className="
  /* font size semua cell */
  [&_.ant-table-cell]:text-[16.8px]

  /* HEADER */
  [&_.ant-table-thead>tr>th]:bg-[#e6e6e6]!
  [&_.ant-table-thead>tr>th]:font-semibold
  [&_.ant-table-thead>tr>th]:text-center

  /* BODY CELL */
  [&_.ant-table-tbody>tr>td]:bg-[#eeeff1]!
  [&_.ant-table-tbody>tr>td]:text-center
"
                bordered
                size="middle"
                scroll={{ x: true, y: 450 }}
                sticky
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="w-full rounded-lg overflow-hidden">
          <div className="py-3">
            <h2 className="m-0 text-20 font-semibold text-neutral-900">
              Ekspor dan Impor {getItemLabel(activeButton)}
            </h2>
          </div>
          <div className="p-0 overflow-y-auto relative">
            <Table
              columns={columns}
              dataSource={getCurrentData().distribution_config}
              pagination={false}
              className="dataTable"
              bordered
              size="middle"
              scroll={{ x: true, y: 420 }}
              sticky
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2} align="center">
                      Balance
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="center">
                      {typeof getCurrentData().balance === "number"
                        ? formatNumber(getCurrentData().balance, {
                            decimals: 2,
                            locale: "id-ID",
                          })
                        : getCurrentData().balance}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </div>
          <Button
            type="dashed"
            className="w-full h-10 text-14 flex justify-center items-center text-[#666] border-t-0 rounded-b-lg !bg-transparent !border !border-dashed !border-neutral-300 hover:!border-secondary-300 [&:hover_svg]:!text-secondary-300"
            onClick={handleAddNewRow}>
            <MdAdd size={24} />
          </Button>
        </div>
      </div>
    );
  };

  const items = [
    {
      key: "config",
      label: "Config Tie In",
      children: <div>{/* Table content will be added here */}</div>,
    },
    {
      key: "result",
      label: "Result",
      children: <div>{/* Result content will be added here */}</div>,
    },
  ];

  const handleRedirect = useCallback(() => {
    router.push("/processes/tie-in/generate-matrix");
  }, [router]);

  const handleGuide = useCallback(async () => {
    setGuideLoading(true);
    try {
      const response = await api.get("/tiein/distribusi-tiein/wiki", {
        params: {
          material: activeButton,
          language: "en",
        },
      });
      setGuideContent(response.data.message);
      setIsGuideModalOpen(true);
    } catch (error) {
      console.error("Error fetching guide:", error);
      message.error("Failed to fetch guide content");
    } finally {
      setGuideLoading(false);
    }
  }, [activeButton]);

  if (loading) {
    return <LoadingSpinner text="Loading data..." />;
  }

  return (
    <div className="p-4 px-5">
      <div className="flex items-center justify-between">
        <Breadcrumb
          separator={<MdArrowForwardIos size={16} />}
          items={[
            {
              title: (
                <Link
                  href="/processes"
                  className="text-neutral-300 hover:text-neutral-900 transition-colors">
                  <span className="text-2xl font-semibold">Processes</span>
                </Link>
              ),
            },
            {
              title: (
                <Link
                  href="/processes/tie-in"
                  className="text-neutral-300 hover:text-neutral-900 transition-colors">
                  <span className="text-2xl font-semibold">Tie in</span>
                </Link>
              ),
            },
            {
              title: (
                <span className="text-neutral-900 text-2xl font-semibold">
                  Kapasitas dan Kebutuhan Ekspor - Impor
                </span>
              ),
            },
          ]}
          className="[&_.ant-breadcrumb-separator]:mx-1.5 [&_.ant-breadcrumb-separator]:flex [&_.ant-breadcrumb-separator]:items-center"
        />
        <Button
          type="default"
          className="bg-transparent border border-neutral-700 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-900 hover:bg-secondary-300 hover:border-secondary-300 hover:text-neutral-100 active:bg-neutral-500 active:border-neutral-500 active:text-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-[#eeeff1] mr-12"
          onClick={handleRedirect}>
          <span className="font-normal">Next: </span>
          <span className="font-semibold">Generate Matrix</span>
          <HiOutlineArrowNarrowRight size={24} className="ml-1" />
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3 mb-[18px] mt-[34px]">
          <span className="text-neutral-700"></span>
          <DatePicker
            disabled
            value={selectedDate}
            format="dddd, DD MMMM YYYY"
            className="boldDatePicker"
          />
        </div>
      </div>

      <div className="flex justify-between items-center gap-4">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={items}
          className="text-20 [&_.ant-tabs-nav::before]:h-1 [&_.ant-tabs-nav::before]:bg-neutral-250 [&_.ant-tabs-tab]:text-center [&_.ant-tabs-tab]:items-center [&_.ant-tabs-tab]:justify-center [&_.ant-tabs-tab]:py-2 [&_.ant-tabs-tab]:px-4 [&_.ant-tabs-tab]:mx-1 [&_.ant-tabs-tab]:text-neutral-300 [&_.ant-tabs-tab]:font-semibold [&_.ant-tabs-tab-active]:rounded [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:text-black [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:font-semibold [&_.ant-tabs-ink-bar]:bg-orange-500 [&_.ant-tabs-ink-bar]:h-1"
        />
        <div className="flex items-center gap-3 py-4 rounded-lg shrink-0">
          <span>Config:</span>
          <div className="py-1 px-[11px] border border-[#d9d9d9] rounded-md min-w-[200px] bg-neutral-250">
            {loading ? "Loading..." : config?.name || selectedConfig}
          </div>
          <Button
            type="default"
            loading={guideLoading}
            onClick={handleGuide}
            className="bg-transparent border border-neutral-700 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-900 hover:bg-secondary-300 hover:border-secondary-300 hover:text-neutral-100 active:bg-neutral-500 active:border-neutral-500 active:text-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-[#eeeff1]">
            <MdLibraryBooks size={24} />
            Guide
          </Button>
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
              className="bg-transparent border border-neutral-700 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-900 hover:bg-secondary-300 hover:border-secondary-300 hover:text-neutral-100 active:bg-neutral-500 active:border-neutral-500 active:text-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-[#eeeff1]">
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
                  label: "Save as Default",
                },
                {
                  key: "2",
                  label: "Save Changes",
                },
              ],
            }}>
            <Button type="primary">
              Save{" "}
              <MdArrowForwardIos
                size={18}
                style={{ transform: "rotate(90deg)" }}
              />
            </Button>
          </Dropdown>
          <Button
            type="primary"
            onClick={handleRunConfig}
            icon={<MdPlayArrow size={18} />}
            loading={runConfigLoading}>
            Run Config
          </Button>
          <Button type="default" loading={loading} onClick={handleDeleteConfig}>
            <MdDelete size={24} />
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap mt-0 mb-5">
        {buttonTabs.map((tab) => (
          <Button
            key={tab.key}
            className={`bg-transparent border rounded px-4 h-9 flex items-center justify-center font-semibold hover:bg-secondary-300 hover:border-secondary-300 hover:text-neutral-100 active:bg-neutral-500 active:border-neutral-500 disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-[#eeeff1] ${
              activeButton === tab.key
                ? "bg-secondary-300 border-secondary-300 border-2 text-neutral-100"
                : "border-neutral-700 text-neutral-900"
            }`}
            onClick={() => setActiveButton(tab.key)}>
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="flex-1 rounded-lg mt-5 mb-6 min-h-[400px]">
        {renderContent()}
      </div>

      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        content={guideContent}
      />

      <PriorityModal
        isOpen={isPriorityModalOpen}
        onClose={() => {
          setIsPriorityModalOpen(false);
          setEditingPriorityIndex(null);
        }}
        onSelect={(value, limit, limit_udf_id) => {
          if (currentRecord) {
            if (editingPriorityIndex !== null) {
              handleUpdatePriority(
                value,
                currentRecord,
                editingPriorityIndex,
                limit,
                limit_udf_id,
              );
            } else {
              handlePriorityChange(value, currentRecord, limit, limit_udf_id);
            }
          }
        }}
        options={priorityOptions}
        currentPriorities={currentRecord?.priority_list || []}
        material={activeButton}
        unit="MWH"
        row={currentRecord?.key}
        importer={currentRecord?.name}
        initialPriority={
          editingPriorityIndex !== null && currentRecord
            ? currentRecord.priority_list[editingPriorityIndex]
            : undefined
        }
        modifyLoading={modifyLoading}
        showUdfModal={showUdfModal}
        setShowUdfModal={setShowUdfModal}
      />
    </div>
  );
};

export default DistribusiEksporImporPage;

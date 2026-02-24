"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Breadcrumb,
  DatePicker,
  Button,
  Dropdown,
  message,
  Space,
  Tabs,
  Collapse,
  CollapseProps,
} from "antd";
import { MdAdd, MdArrowForwardIos, MdDelete, MdEditNote } from "react-icons/md";
import Link from "next/link";
import { useDateContext } from "@/context/DateContext";
import { useRouter } from "next/navigation";
import api from "@/utils/axios";
import { HiOutlineArrowNarrowRight } from "react-icons/hi";
import { AiOutlineLoading3Quarters, AiOutlineCheck } from "react-icons/ai";
import InputOutputModal from "@/components/processes/rawmat/set-input-output/InputOutputModal";
import DeleteInputOutputDataModal from "@/components/processes/rawmat/DeleteInputOutputDataModal";
import NextStepModal from "@/components/processes/rawmat/NextStepModal";
import { formatNumberWithoutRounding } from "@/utils/numberFormat";

interface PabrikConfig {
  pabrik_id: number;
  config_id: string;
  config_name: string;
  pabrik_name: string;
  table_groups_count: number;
}

interface RawmatConfig {
  _id: string;
  name: string;
  tanggal: string;
  default: boolean;
  config: PabrikConfig[];
}

interface ValueWithUdfId {
  value: number | null;
  udf_id: string | null;
}

interface RpfData {
  name: string;
  rpf: ValueWithUdfId;
  integration: ValueWithUdfId;
  unit: string;
}

interface InputOutputData {
  name: string;
  quantity: ValueWithUdfId;
  unit: string;
  mmbtu: ValueWithUdfId;
}

interface InputOutputSubmitData {
  resource_name: string;
  unit: string;
  udf_id: string | null;
  type: "input" | "output";
}

interface TableItem {
  name: string;
  input_data: InputOutputData | null;
  output_data: InputOutputData | null;
}

interface TableGroup {
  name: string;
  rpf_data: RpfData[] | null;
  table_items: TableItem[];
  completed: boolean;
}

interface DataGroup {
  config_id: string;
  table_groups: TableGroup[];
}

interface RawmatData {
  _id: string;
  rawmat_config_id: string;
  tanggal: string;
  data_group: DataGroup[];
  default: boolean;
}

interface ResourceRowData {
  key: string;
  index: number;
  input?: string;
  output?: string;
  unit: string;
  udf_id: string | null;
}

const SetInputOutputPage = () => {
  const router = useRouter();
  const { selectedDate, formattedDate } = useDateContext();
  const [loadingData, setLoadingData] = useState(false);
  const [rawmatConfig, setRawmatConfig] = useState<RawmatConfig | null>(null);
  const [rawmatData, setRawmatData] = useState<RawmatData | null>(null);
  const [activeTab, setActiveTab] = useState("");
  const [selectedTableGroup, setSelectedTableGroup] = useState("");
  const [selectedTableItem, setSelectedTableItem] = useState("");
  const [isInputOutputModalOpen, setIsInputOutputModalOpen] = useState(false);
  const [isDeleteInputOutputModalOpen, setIsDeleteInputOutputModalOpen] =
    useState(false);
  const [isNextStepModalVisible, setIsNextStepModalVisible] = useState(false);
  const [editingResourceType, setEditingResourceType] = useState<
    "input" | "output" | null
  >(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingItemData, setEditingItemData] =
    useState<ResourceRowData | null>(null);

  const activeDataGroup = rawmatData?.data_group.find(
    (data_group) => data_group.config_id === activeTab,
  );

  const activeTableGroup = activeDataGroup?.table_groups.find(
    (table_group) => table_group.name === selectedTableGroup,
  );

  const activeTableItem = activeTableGroup?.table_items.find(
    (table_item) => table_item.name === selectedTableItem,
  );

  useEffect(() => {
    if (activeDataGroup && activeDataGroup.table_groups.length > 0) {
      if (
        !selectedTableGroup ||
        !activeDataGroup.table_groups.some((g) => g.name === selectedTableGroup)
      ) {
        setSelectedTableGroup(activeDataGroup.table_groups[0].name);
      }
    }
  }, [activeTab, activeDataGroup, selectedTableGroup]);

  useEffect(() => {
    if (activeTableGroup && activeTableGroup.table_items.length > 0) {
      setSelectedTableItem(activeTableGroup.table_items[0].name);
    }
  }, [activeTableGroup]);

  // Refetch data function
  const fetchRawmatData = useCallback(async () => {
    if (!formattedDate) {
      return;
    }
    try {
      setLoadingData(true);
      const response = await api.get<RawmatData>("/rawmat/data/get-by-args", {
        params: {
          tanggal: formattedDate,
        },
      });
      setRawmatData(response.data);
    } catch (error) {
      console.error("Error fetching rawmat data:", error);
      message.error("Failed to fetch rawmat data");
    } finally {
      setLoadingData(false);
    }
  }, [formattedDate]);

  useEffect(() => {
    const fetchRawmatConfig = async () => {
      try {
        const response = await api.get<RawmatConfig>(
          "/rawmat/config/get-by-args",
          {
            params: {
              tanggal: formattedDate,
            },
          },
        );
        setRawmatConfig(response.data);

        if (response.data?.config.length > 0) {
          setActiveTab(response.data.config[0].config_id);
        }
      } catch (error) {
        console.error("Error fetching rawmat config:", error);
        message.error("Failed to fetch rawmat configuration");
      }
    };

    // Initial fetch
    if (formattedDate) {
      fetchRawmatConfig();
      fetchRawmatData();
    }
  }, [formattedDate, fetchRawmatData]);

  const handleTabChange = async (key: string) => {
    setActiveTab(key);
  };

  const tabItems = rawmatConfig?.config.map((config) => ({
    label: (
      <span className="flex items-center gap-2">
        {/* {getFactoryStatus(config.pabrik_id.toString()) === "loading" && (
            <Image
              src="/images/breathing.gif"
              alt="Loading"
              width={20}
              height={20}
              style={{ marginRight: "5px" }}
            />
          )}
          {getFactoryStatus(config.pabrik_id.toString()) === "completed" && (
            <HiCheckCircle size={20} color="#1268B3" />
          )}
          {getFactoryStatus(config.pabrik_id.toString()) === "failed" && (
            <MdError size={20} color="#E20301" />
          )} */}
        {config.config_name}
      </span>
    ),
    key: config.config_id,
  }));

  const formatQuantity = (quantityValue: number | null | undefined) => {
    if (quantityValue === null || quantityValue === undefined) {
      return "None";
    }
    return quantityValue;
  };

  const getInputData = () => {
    if (!activeTableItem || !activeTableItem.input_data) return [];

    if (Array.isArray(activeTableItem.input_data)) {
      return activeTableItem.input_data.map((input, index) => ({
        key: index.toString(),
        index: index + 1,
        input: input.name,
        quantity: formatQuantity(input.quantity?.value),
        unit: input.unit,
        udf_id: input.quantity?.udf_id || null,
      }));
    } else {
      return [
        {
          key: "1",
          index: 1,
          input: activeTableItem.input_data.name,
          quantity: formatQuantity(activeTableItem.input_data.quantity?.value),
          unit: activeTableItem.input_data.unit,
          udf_id: activeTableItem.input_data.quantity?.udf_id || null,
        },
      ];
    }
  };

  const getOutputData = () => {
    if (!activeTableItem || !activeTableItem.output_data) return [];

    if (Array.isArray(activeTableItem.output_data)) {
      return activeTableItem.output_data.map((output, index) => ({
        key: index.toString(),
        index: index + 1,
        output: output.name,
        quantity: formatQuantity(output.quantity?.value),
        unit: output.unit,
        udf_id: output.quantity?.udf_id || null,
      }));
    } else {
      return [
        {
          key: "1",
          index: 1,
          output: activeTableItem.output_data.name,
          quantity: formatQuantity(activeTableItem.output_data.quantity?.value),
          unit: activeTableItem.output_data.unit,
          udf_id: activeTableItem.output_data.quantity?.udf_id || null,
        },
      ];
    }
  };

  const calculateInputTotal = () => {
    const inputData = getInputData();
    return inputData.reduce((total, item) => {
      const quantity = item.quantity === "None" ? 0 : +item.quantity || 0;
      return total + quantity;
    }, 0);
  };

  const calculateOutputTotal = () => {
    const outputData = getOutputData();
    return outputData.reduce((total, item) => {
      const quantity = item.quantity === "None" ? 0 : +item.quantity || 0;
      return total + quantity;
    }, 0);
  };

  const showInputOutputModal = (type: "input" | "output") => {
    setEditingResourceType(type);
    setIsInputOutputModalOpen(true);
  };

  const handleCloseInputOutputModal = () => {
    setIsInputOutputModalOpen(false);
    setEditingResourceType(null);
    setEditingItemData(null);
  };

  const handleEditInputOutput = (
    type: "input" | "output",
    record: ResourceRowData,
  ) => {
    setEditingResourceType(type);
    setEditingItemData(record);
    setIsInputOutputModalOpen(true);
  };

  const handleDeleteInputOutput = (
    type: "input" | "output",
    record: ResourceRowData,
  ) => {
    setEditingResourceType(type);
    setEditingItemData(record);
    setIsDeleteInputOutputModalOpen(true);
  };

  const handleCloseDeleteInputOutputModal = () => {
    setIsDeleteInputOutputModalOpen(false);
    setEditingResourceType(null);
    setEditingItemData(null);
  };

  const inputColumns = [
    {
      title: "",
      dataIndex: "index",
      key: "index",
      width: 60,
      align: "center",
    },
    {
      title: "Input",
      dataIndex: "input",
      key: "input",
      align: "center",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
      width: 300,
      render: (quantity: number) => formatNumberWithoutRounding(quantity),
    },
    {
      title: "Unit",
      dataIndex: "unit",
      key: "unit",
      width: 120,
      align: "center",
    },
    {
      title: (
        <div className="flex justify-center w-20">
          <Button
            icon={<MdAdd size={24} />}
            type="primary"
            className="customPrimaryButton"
            onClick={() => showInputOutputModal("input")}
          />
        </div>
      ),
      key: "actions",
      width: 80,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (_: any, record: ResourceRowData) => (
        <Space>
          <Button
            type="text"
            icon={
              <MdEditNote
                size={28}
                onClick={() => handleEditInputOutput("input", record)}
              />
            }
          />
          <Button
            type="text"
            icon={<MdDelete size={24} />}
            onClick={() => handleDeleteInputOutput("input", record)}
          />
        </Space>
      ),
    },
  ];

  const outputColumns = [
    {
      title: "",
      dataIndex: "index",
      key: "index",
      width: 60,
      align: "center",
    },
    {
      title: "Output",
      dataIndex: "output",
      key: "output",
      align: "center",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
      width: 300,
      render: (quantity: number) => formatNumberWithoutRounding(quantity),
    },
    {
      title: "Unit",
      dataIndex: "unit",
      key: "unit",
      align: "center",
      width: 120,
    },
    {
      title: (
        <div className="flex justify-center w-20">
          <Button
            icon={<MdAdd size={24} />}
            type="primary"
            className="customPrimaryButton"
            onClick={() => showInputOutputModal("output")}
          />
        </div>
      ),
      key: "actions",
      width: 80,
      align: "center",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (_: any, record: ResourceRowData) => (
        <Space>
          <Button
            type="text"
            icon={
              <MdEditNote
                size={28}
                onClick={() => handleEditInputOutput("output", record)}
              />
            }
          />
          <Button
            type="text"
            icon={<MdDelete size={24} />}
            onClick={() => handleDeleteInputOutput("output", record)}
          />
        </Space>
      ),
    },
  ];

  const inputData = getInputData();
  const outputData = getOutputData();
  const inputTotal = calculateInputTotal();
  const outputTotal = calculateOutputTotal();

  const resourceTableClassName =
    "[&_.ant-table-thead>tr>th]:!bg-[#e6e6e6] [&_.ant-table-tbody>tr>td]:!bg-[#f1f2f3] [&_.ant-table-thead>tr>th]:!border-[#e6e6e6] [&_.ant-table-tbody>tr>td]:!border-[#e6e6e6]";
  const summaryRowClassName = "[&_td]:!bg-[#b3b5bd] [&_td]:!font-semibold";

  const inputHeader = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2 font-semibold text-[20.16px]">
        <span>Input resources</span>
        <span className="text-[#f47920] text-[16.8px]">{inputData.length}</span>
      </div>
      <div className="flex items-center gap-2 font-semibold text-[20.16px]">
        <span>Total:</span>
        <span className="text-[16.8px] font-normal bg-[#e6e6e6] py-1 px-3 rounded-md">
          {formatNumberWithoutRounding(inputTotal)}
        </span>
      </div>
    </div>
  );

  const outputHeader = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2 font-semibold text-[20.16px]">
        <span>Output resources</span>
        <span className="text-[#f47920] text-[16.8px]">
          {outputData.length}
        </span>
      </div>
      <div className="flex items-center gap-2 font-semibold text-[20.16px]">
        <span>Total:</span>
        <span className="text-[16.8px] font-normal bg-[#e6e6e6] py-1 px-3 rounded-md">
          {formatNumberWithoutRounding(outputTotal)}
        </span>
      </div>
    </div>
  );

  const collapseItems: CollapseProps["items"] = [
    {
      key: "1",
      label: inputHeader,
      children: (
        <Table
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          columns={inputColumns as any}
          dataSource={inputData}
          pagination={false}
          className={resourceTableClassName}
          bordered
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row className={summaryRowClassName}>
                <Table.Summary.Cell index={0} colSpan={2} align="center">
                  Total
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={3} align="center">
                  {inputTotal}
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      ),
    },
    {
      key: "2",
      label: outputHeader,
      children: (
        <Table
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          columns={outputColumns as any}
          dataSource={outputData}
          pagination={false}
          className={resourceTableClassName}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row className={summaryRowClassName}>
                <Table.Summary.Cell index={0} colSpan={2}>
                  Total
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={3}>
                  {outputTotal}
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      ),
    },
  ];

  const breadcrumbItems = [
    {
      title: (
        <Link className="breadcrumbLink" href="/processes">
          <span className="text-neutral-300 text-20 font-semibold">
            Processes
          </span>
        </Link>
      ),
    },
    {
      title: (
        <Link className="breadcrumbLink" href="/processes/rawmat">
          <span className="text-neutral-300 text-20 font-semibold">RawMat</span>
        </Link>
      ),
    },
    {
      title: (
        <span className="text-neutral-900 text-20 font-semibold">
          Set inputs and outputs
        </span>
      ),
    },
  ];

  const handleNextStep = () => {
    router.push("/processes/rawmat/set-ratio-performance-figure");
  };

  const handleLoadConfig = () => {};

  const handleSetDefault = async () => {
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
  };

  const handleDeleteConfig = async () => {};

  const handleInputOutputSubmit = async (newData: InputOutputSubmitData) => {
    if (
      !rawmatData?._id ||
      !activeDataGroup?.config_id ||
      !activeTableGroup?.name ||
      !activeTableItem?.name ||
      !newData.type
    ) {
      message.error("Missing required information to save data.");
      console.error("Missingg IDs:", {
        data_id: rawmatData?._id,
        config_id: activeDataGroup?.config_id,
        group_name: activeTableGroup?.name,
        table_name: activeTableItem?.name,
        type: newData.type,
      });
      return;
    }

    setSubmitLoading(true);
    try {
      const isEditing = !!editingItemData;

      const params = {
        data_id: rawmatData._id,
        config_id: activeDataGroup.config_id,
        group_name: activeTableGroup.name,
        table_name: activeTableItem.name,
        type: newData.type,
      };

      if (isEditing && editingItemData) {
        const updateBody = {
          old_data: {
            name: editingItemData.input || editingItemData.output || "",
            quantity: {
              value: null,
              udf_id: editingItemData.udf_id,
            },
            unit: editingItemData.unit,
            mmbtu: {
              value: null,
              udf_id: null,
            },
          },
          data: {
            name: newData.resource_name,
            quantity: {
              value: null,
              udf_id: newData.udf_id,
            },
            unit: newData.unit,
            mmbtu: {
              value: null,
              udf_id: null,
            },
          },
        };

        await api.post("/rawmat/data/replace-input-output/qty", updateBody, {
          params,
        });
        message.success(
          `${
            newData.type.charAt(0).toUpperCase() + newData.type.slice(1)
          } resource updated successfully!`,
        );
      } else {
        const addBody = {
          name: newData.resource_name,
          quantity: {
            value: null,
            udf_id: newData.udf_id,
          },
          unit: newData.unit,
          mmbtu: {
            value: null,
            udf_id: null,
          },
        };

        await api.post("/rawmat/data/save-input-output/qty", addBody, {
          params,
        });
        message.success(
          `${
            newData.type.charAt(0).toUpperCase() + newData.type.slice(1)
          } resource added succesfully!`,
        );
      }

      handleCloseInputOutputModal();
      fetchRawmatData();
    } catch (error) {
      console.error("Error saving input/output data:", error);
      message.error("Failed to save input/output data.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleInputOutputDelete = async (
    resourceType: "input" | "output" | null,
  ) => {
    if (
      !rawmatData?._id ||
      !activeDataGroup?.config_id ||
      !activeTableGroup?.name ||
      !activeTableItem?.name ||
      !resourceType
    ) {
      message.error("Missing required information to delete data.");
      console.error("Missingg IDs:", {
        data_id: rawmatData?._id,
        config_id: activeDataGroup?.config_id,
        group_name: activeTableGroup?.name,
        table_name: activeTableItem?.name,
        type: resourceType,
      });
      return;
    }

    setDeleteLoading(true);
    try {
      const params = {
        data_id: rawmatData._id,
        config_id: activeDataGroup.config_id,
        group_name: activeTableGroup.name,
        table_name: activeTableItem.name,
        type: resourceType,
      };

      const body = {
        name: editingItemData?.input || editingItemData?.output || "",
        quantity: {
          value: null,
          udf_id: editingItemData?.udf_id,
        },
        unit: editingItemData?.unit,
        mmbtu: {
          value: null,
          udf_id: null,
        },
      };

      await api.post("/rawmat/data/delete-input-output/qty", body, {
        params,
      });
      message.success(
        `${
          resourceType.charAt(0).toUpperCase() + resourceType.slice(1)
        } resource deleted succesfully!`,
      );

      handleCloseDeleteInputOutputModal();
      fetchRawmatData();
    } catch (error) {
      console.error("Error deleting input/output data:", error);
      message.error("Failed to delete input/output data.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="py-4 px-5 h-full">
      <div className="flex items-center justify-between">
        <Breadcrumb
          separator={
            <MdArrowForwardIos
              size={16}
              className="inline-block align-middle"
            />
          }
          items={breadcrumbItems}
          className="customBreadcrumb separatorSpacing mb-4"
        />
        <Button
          type="default"
          className="customSecondaryButton btn-md mr-12"
          onClick={() => setIsNextStepModalVisible(true)}>
          <span className="font-normal">Next: </span>
          <span className="font-semibold">Set Ratio Performance Figure</span>
          <HiOutlineArrowNarrowRight size={24} className="ml-1" />
        </Button>
      </div>

      <div className="flex justify-between items-center my-7">
        <div className="flex items-center gap-3">
          <span className="text-[#777986]">Date:</span>
          <DatePicker
            disabled
            value={selectedDate}
            format="dddd, DD MMMM YYYY"
            className="boldDatePicker"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="font-semibold">Config input output:</span>
          <div className="w-fit min-w-[200px] py-1 px-[11px] border border-[#d9d9d9] rounded-md bg-[#e6e6e6]">
            {loadingData ? "Loading..." : rawmatConfig?.name}
          </div>
          <Dropdown
            menu={{
              items: [
                {
                  key: "1",
                  label: "Load default config",
                  // disabled: !config,
                },
                {
                  key: "2",
                  label: "Load other config",
                  // disabled: !config,
                },
              ],
            }}>
            <Button
              type="default"
              loading={loadingData}
              onClick={handleLoadConfig}
              className="customSecondaryButton"
              // disabled={!dailyRunner?.pipeline_id}
            >
              Load config
              <MdArrowForwardIos size={18} className="rotate-90" />
            </Button>
          </Dropdown>
          <Dropdown
            menu={{
              items: [
                {
                  key: "1",
                  label: "Save as new default",
                  // disabled: !pipeline,
                  onClick: handleSetDefault,
                },
                {
                  key: "2",
                  label: "Save as new input output config",
                  // disabled: !pipeline,
                },
              ],
            }}>
            <Button type="primary" className="customPrimaryButton">
              Save
              <MdArrowForwardIos size={18} className="rotate-90" />
            </Button>
          </Dropdown>
          <Button
            type="default"
            loading={loadingData}
            onClick={handleDeleteConfig}
            // disabled={!dailyRunner?.pipeline_id}
          >
            <MdDelete size={24} />
          </Button>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        className="customTabs"
      />

      {activeDataGroup && (
        <div className="flex rounded-lg">
          <div>
            <div className="flex flex-col w-[287px] flex-none">
              <div className="bg-[#e6e6e6] p-3 font-semibold border border-[#e8e8e8] flex justify-center items-center text-[20.16px] h-[45px] shrink-0">
                Table Group
              </div>
              <div className="overflow-y-auto">
                {activeDataGroup.table_groups.map((table_group) => (
                  <div
                    key={table_group.name}
                    className={`flex items-center gap-3 bg-white p-4 cursor-pointer border-b border-l border-[#e8e8e8] ${
                      table_group.name === selectedTableGroup
                        ? "bg-[#eeeff1]"
                        : ""
                    }`}
                    onClick={() => setSelectedTableGroup(table_group.name)}>
                    <div className="mr-3">
                      {table_group.completed === true ? (
                        <div className="w-6 h-6 rounded-full bg-[#1268b3] flex items-center justify-center">
                          <AiOutlineCheck color="#F3F4F8" size={16} />
                        </div>
                      ) : (
                        <div className="relative">
                          <AiOutlineLoading3Quarters
                            size={24}
                            color="#F47920"
                          />
                          <div className="absolute w-3 h-3 rounded-full bg-[#f47920] top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                      )}
                    </div>
                    <span
                      className={`flex-1 font-normal ${
                        table_group.name === selectedTableGroup
                          ? "font-semibold"
                          : ""
                      }`}>
                      {table_group.name}
                    </span>
                    <MdArrowForwardIos className="text-[#13162a]" size={20} />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#e6e6e6] p-3 font-semibold border border-[#e8e8e8] flex justify-center items-center text-[20.16px] h-[45px] shrink-0">
              Unbalance
            </div>
            <div className="flex text-[16.8px]">
              <div className="bg-[#e6e6e6] flex-1 text-center py-3.5 px-1.5">
                Input total
              </div>
              <div className="bg-[#f1f2f3] flex-1 text-center py-3.5 px-1.5 border border-[#e6e6e6]">
                {formatNumberWithoutRounding(inputTotal)}
              </div>
            </div>
            <div className="flex text-[16.8px]">
              <div className="bg-[#e6e6e6] flex-1 text-center py-3.5 px-1.5">
                Output total
              </div>
              <div className="bg-[#f1f2f3] flex-1 text-center py-3.5 px-1.5 border border-[#e6e6e6]">
                {formatNumberWithoutRounding(outputTotal)}
              </div>
            </div>
            <div className="flex text-[16.8px]">
              <div className="bg-[#404252] flex-1 text-center text-white py-3.5 px-1.5 border border-[#e6e6e6]">
                Unbalance value
              </div>
              <div
                className={
                  formatNumberWithoutRounding(inputTotal - outputTotal) === "0"
                    ? "bg-[#00ad17] flex-1 text-center text-white py-3.5 px-1.5 border border-[#e6e6e6]"
                    : "bg-[#e20301] flex-1 text-center text-white py-3.5 px-1.5 border border-[#e6e6e6]"
                }>
                {formatNumberWithoutRounding(inputTotal - outputTotal)}
              </div>
            </div>
          </div>
          <div className="flex-1 h-[calc(100vh-250px)] max-w-[calc(100%-287px)] border-x border-b border-[#e8e8e8]">
            <div className="bg-[#e6e6e6] p-3 font-semibold border border-[#e8e8e8] flex justify-center items-center text-[20.16px] h-[45px] shrink-0">
              Input and Outputs
            </div>
            <div className="bg-white p-4 flex-1 flex flex-col justify-between overflow-y-auto">
              {selectedTableGroup !== null ? (
                <>
                  <div className="grow">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="font-semibold text-[16.8px]">
                        Table items:
                      </span>
                      <div className="flex flex-1 flex-wrap gap-3">
                        {activeTableGroup?.table_items.map((table_item) => (
                          <Button
                            key={table_item.name}
                            className={`customSecondaryButton ${
                              selectedTableItem === table_item.name
                                ? "activeButton"
                                : ""
                            }`}
                            onClick={() =>
                              setSelectedTableItem(table_item.name)
                            }>
                            {table_item.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Collapse items={collapseItems} />
                  </div>
                </>
              ) : (
                <span>Select an item to view content</span>
              )}
            </div>
          </div>
        </div>
      )}
      <InputOutputModal
        open={isInputOutputModalOpen}
        onCancel={handleCloseInputOutputModal}
        onSubmit={handleInputOutputSubmit}
        activeDataGroup={activeDataGroup?.config_id}
        activeTableGroup={activeTableGroup?.name}
        activeTableItemName={activeTableItem?.name}
        resourceType={editingResourceType}
        isSubmitting={submitLoading}
        initialValues={
          editingItemData
            ? {
                resource_name:
                  editingItemData.input || editingItemData.output || "",
                unit: editingItemData.unit,
              }
            : undefined
        }
        udfId={editingItemData ? editingItemData.udf_id : null}
      />

      <DeleteInputOutputDataModal
        visible={isDeleteInputOutputModalOpen}
        onClose={handleCloseDeleteInputOutputModal}
        loading={deleteLoading}
        onDelete={handleInputOutputDelete}
        resourceType={editingResourceType}
      />

      <NextStepModal
        visible={isNextStepModalVisible}
        onClose={() => setIsNextStepModalVisible(false)}
        onNext={handleNextStep}
      />
    </div>
  );
};

export default SetInputOutputPage;

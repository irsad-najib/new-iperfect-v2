"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Breadcrumb,
  DatePicker,
  Button,
  message,
  Tabs,
  Collapse,
  CollapseProps,
} from "antd";
import { MdAddCircle, MdArrowForwardIos } from "react-icons/md";
import Link from "next/link";
import { useDateContext } from "@/context/DateContext";
import { useRouter } from "next/navigation";
import api from "@/utils/axios";
import { HiOutlineArrowNarrowRight } from "react-icons/hi";
import { AiOutlineLoading3Quarters, AiOutlineCheck } from "react-icons/ai";
import MmbtuModal from "@/components/processes/rawmat/calculate-mmbtu/MmbtuModal";
import DeleteInputOutputDataModal from "@/components/processes/rawmat/calculate-mmbtu/DeleteInputOutputDataModal";
import NextStepModal from "@/components/processes/rawmat/calculate-mmbtu/NextStepModal";
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
  resource_name: string | undefined;
  unit: string | undefined;
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
  quantity: number;
  mmbtu: number;
  udf_id: string | null;
  unit: string;
}

interface UDF {
  _id: string;
  name: string;
  code: string;
  createdAt: number;
}

interface UDFInput {
  _id: string;
  var_name: string;
  ref_name: string;
  default_value: number;
  timeframe_selection: string | null;
  udf_id: string | undefined;
  value?: number | null;
  tie_in_adjustment_value?: number | null;
}

interface UDFResponse {
  udf: UDF;
  inputs: UDFInput[];
}

const CalculateMmbtuPage = () => {
  const router = useRouter();
  const { selectedDate, formattedDate } = useDateContext();
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [rawmatConfig, setRawmatConfig] = useState<RawmatConfig | null>(null);
  const [rawmatData, setRawmatData] = useState<RawmatData | null>(null);
  const [activeTab, setActiveTab] = useState("");
  const [selectedTableGroup, setSelectedTableGroup] = useState("");
  const [selectedTableItem, setSelectedTableItem] = useState("");
  const [isMmbtuModalOpen, setIsMmbtuModalOpen] = useState(false);
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
        setLoadingConfig(true);
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
      } finally {
        setLoadingConfig(false);
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
      <span className="flex items-center gap-2">{config.config_name}</span>
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
        mmbtu: formatQuantity(input.mmbtu?.value),
        udf_id: input.mmbtu?.udf_id || null,
        unit: input.unit,
      }));
    } else {
      return [
        {
          key: "1",
          index: 1,
          input: activeTableItem.input_data.name,
          quantity: formatQuantity(activeTableItem.input_data.quantity?.value),
          mmbtu: formatQuantity(activeTableItem.input_data.mmbtu?.value),
          udf_id: activeTableItem.input_data.mmbtu?.udf_id || null,
          unit: activeTableItem.input_data.unit,
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
        mmbtu: formatQuantity(output.mmbtu?.value),
        udf_id: output.mmbtu?.udf_id || null,
        unit: output.unit,
      }));
    } else {
      return [
        {
          key: "1",
          index: 1,
          output: activeTableItem.output_data.name,
          quantity: formatQuantity(activeTableItem.output_data.quantity?.value),
          mmbtu: formatQuantity(activeTableItem.output_data.mmbtu?.value),
          udf_id: activeTableItem.output_data.mmbtu?.udf_id || null,
          unit: activeTableItem.output_data.unit,
        },
      ];
    }
  };

  const getRpfData = () => {
    if (!activeTableGroup || !activeTableGroup.rpf_data) return [];

    if (Array.isArray(activeTableGroup.rpf_data)) {
      return activeTableGroup.rpf_data.map((rpf, index) => ({
        key: index.toString(),
        index: index + 1,
        rpf_name: rpf.name,
        rpf_value: formatQuantity(rpf.rpf?.value),
        rpf_udf_id: rpf.rpf?.udf_id,
        integration_value: formatQuantity(rpf.integration?.value),
        integration_udf_id: rpf.integration?.udf_id,
        unit: rpf.unit,
      }));
    }
  };

  const calculateInputTotal = () => {
    const inputData = getInputData();
    return inputData.reduce((total, item) => {
      const quantity = item.quantity === "None" ? 0 : +item.quantity || 0;
      return total + quantity;
    }, 0);
  };

  const calculateInputMmbtuTotal = () => {
    const inputData = getInputData();
    return inputData.reduce((total, item) => {
      const quantity = item.mmbtu === "None" ? 0 : +item.mmbtu || 0;
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

  const calculateOutputMmbtuTotal = () => {
    const outputData = getOutputData();
    return outputData.reduce((total, item) => {
      const quantity = item.mmbtu === "None" ? 0 : +item.mmbtu || 0;
      return total + quantity;
    }, 0);
  };

  //   const showInputOutputModal = (type: "input" | "output") => {
  //     setEditingResourceType(type);
  //     setIsMmbtuModalOpen(true);
  //   };

  const handleCloseInputOutputModal = () => {
    setIsMmbtuModalOpen(false);
    setEditingResourceType(null);
    setEditingItemData(null);
  };

  //   const handleEditInputOutput = (
  //     type: "input" | "output",
  //     record: ResourceRowData,
  //   ) => {
  //     setEditingResourceType(type);
  //     setEditingItemData(record);
  //     setIsMmbtuModalOpen(true);
  //   };

  //   const handleDeleteInputOutput = (
  //     type: "input" | "output",
  //     record: ResourceRowData,
  //   ) => {
  //     setEditingResourceType(type);
  //     setEditingItemData(record);
  //     setIsDeleteInputOutputModalOpen(true);
  //   };

  const handleCloseDeleteInputOutputModal = () => {
    setIsDeleteInputOutputModalOpen(false);
    setEditingResourceType(null);
    setEditingItemData(null);
  };

  const handleClickAddMmbtu = async (
    type: "input" | "output",
    record: ResourceRowData,
  ) => {
    try {
      setSubmitLoading(true);

      if (!record.udf_id) {
        const payload = {
          udf: {
            name: `${activeDataGroup?.config_id}-${activeTableGroup?.name}-${
              activeTableItem?.name
            }-${type}-${record.input || record.output}-mmbtu-${formattedDate}`,
            code: "# Start coding your MMBTU UDF here",
          },
          inputs: [],
        };

        const response = await api.post<UDFResponse>("/udf", payload);
        record.udf_id = response.data?.udf?._id || null;
      }

      setEditingItemData({
        ...record,
      });
      setEditingResourceType(type);
      setIsMmbtuModalOpen(true);
    } catch (error) {
      console.error("Error creating UDF:", error);
      message.error("Failed to create UDF");
    } finally {
      setSubmitLoading(false);
    }
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
      title: "MMBTU",
      dataIndex: "mmbtu",
      key: "mmbtu",
      width: 300,
      align: "center",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (_: any, record: ResourceRowData) =>
        record.udf_id !== null ? (
          formatNumberWithoutRounding(record.mmbtu)
        ) : (
          <Button
            type="text"
            icon={<MdAddCircle size={24} color="#1268B3" />}
            onClick={() => handleClickAddMmbtu("input", record)}
            loading={submitLoading && editingItemData?.key === record.key}
          />
        ),
      onCell: (record: ResourceRowData) => ({
        onClick:
          record.udf_id !== null
            ? () => handleClickAddMmbtu("input", record)
            : undefined,
        className: record.udf_id !== null ? "clickableCell" : "",
      }),
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
      title: "MMBTU",
      dataIndex: "mmbtu",
      key: "mmbtu",
      width: 300,
      align: "center",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (_: any, record: ResourceRowData) =>
        record.udf_id !== null ? (
          formatNumberWithoutRounding(record.mmbtu)
        ) : (
          <Button
            type="text"
            icon={<MdAddCircle size={24} color="#1268B3" />}
            onClick={() => handleClickAddMmbtu("output", record)}
            loading={submitLoading && editingItemData?.key === record.key}
          />
        ),
      onCell: (record: ResourceRowData) => ({
        onClick:
          record.udf_id !== null
            ? () => handleClickAddMmbtu("output", record)
            : undefined,
        className: record.udf_id !== null ? "clickableCell" : "",
      }),
    },
  ];

  const rpfColumns = [
    {
      title: "",
      dataIndex: "index",
      key: "index",
      width: 60,
      align: "center",
    },
    {
      title: "Ratio Performance Figure",
      dataIndex: "rpf_name",
      key: "rpf_name",
      align: "center",
    },
    {
      title: "Value",
      dataIndex: "rpf_value",
      key: "rpf_value",
      align: "center",
      width: 250,
      render: (rpf_value: number) => formatNumberWithoutRounding(rpf_value),
    },
    {
      title: "Integrasi",
      dataIndex: "integration_value",
      key: "integration_value",
      align: "center",
      width: 250,
      render: (integration_value: number) =>
        formatNumberWithoutRounding(integration_value),
    },
    {
      title: "Unit",
      dataIndex: "unit",
      key: "unit",
      width: 160,
      align: "center",
    },
  ];

  const inputData = getInputData();
  const outputData = getOutputData();
  const rpfData = getRpfData();
  const inputTotal = calculateInputTotal();
  const inputMmbtuTotal = calculateInputMmbtuTotal();
  const outputTotal = calculateOutputTotal();
  const outputMmbtuTotal = calculateOutputMmbtuTotal();

  const inputHeader = (
    <div className="flex justify-between items-center w-full">
      <div className="flex items-center font-semibold text-20 gap-2">
        <span>Input MMBTU</span>
        <span className="bg-secondary-300 font-16">{inputData.length}</span>
      </div>
      <div className="flex items-center font-semibold text-20 gap-2">
        <span>Total MMBTU:</span>
        <span className="text-16 font-normal bg-neutral-250 px-1 py-3 rounded-md">
          {formatNumberWithoutRounding(inputMmbtuTotal, 2)}
        </span>
      </div>
    </div>
  );

  const outputHeader = (
    <div className="flex justify-between items-center w-full">
      <div className="flex items-center font-semibold text-20 gap-2">
        <span>Output MMBTU</span>
        <span className="bg-secondary-300 font-16">{outputData.length}</span>
      </div>
      <div className="flex items-center font-semibold text-20 gap-2">
        <span>Total MMBTU:</span>
        <span className="text-16 font-normal bg-neutral-250 px-1 py-3 rounded-md">
          {formatNumberWithoutRounding(outputMmbtuTotal, 2)}
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
          className="[&_.ant-table-thead>tr>th]:bg-neutral-250 [&_.ant-table-tbody>tr>td]:bg-neutral-200 [&_.ant-table-tbody>tr>td.clickableCell]:cursor-pointer [&_.ant-table-tbody>tr>td.clickableCell:hover]:bg-[#d6d7db]!"
          bordered
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row className="[&_td]:bg-[#b3b5bd]! [&_td]:font-semibold!">
                <Table.Summary.Cell index={0} colSpan={2} align="center">
                  Total
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="center">
                  {inputTotal}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="center">
                  {}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="center">
                  {inputMmbtuTotal}
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
          className="[&_.ant-table-thead>tr>th]:bg-neutral-250 [&_.ant-table-tbody>tr>td]:bg-neutral-200 [&_.ant-table-tbody>tr>td.clickableCell]:cursor-pointer [&_.ant-table-tbody>tr>td.clickableCell:hover]:bg-[#d6d7db]!"
          bordered
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row className="[&_td]:bg-[#b3b5bd]! [&_td]:font-semibold!">
                <Table.Summary.Cell index={0} colSpan={2} align="center">
                  Total
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="center">
                  {outputTotal}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="center">
                  {}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="center">
                  {outputMmbtuTotal}
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
          <span className="linkText">Processes</span>
        </Link>
      ),
    },
    {
      title: (
        <Link className="breadcrumbLink" href="/processes/rawmat">
          <span className="linkText">RawMat</span>
        </Link>
      ),
    },
    {
      title: <span className="lastBreadcrumbItem">Calculate MMBTU</span>,
    },
  ];

  const handleNextStep = () => {
    router.push("/processes/rawmat");
  };

  //   const handleLoadConfig = () => {};

  //   const handleSetDefault = async () => {
  //     // if (!pipeline) return;
  //     // try {
  //     //   await api.post("/pipeline/set-default", {
  //     //     pipeline_id: pipeline._id,
  //     //     pipeline_type: pipeline.pipeline_type,
  //     //     bagian_id: part
  //     //   });
  //     //   message.success("Successfully set as default configuration");
  //     // } catch (error) {
  //     //   console.error("Error setting default configuration:", error);
  //     //   message.error("Failed to set default configuration");
  //     // }
  //   };

  //   const handleDeleteConfig = async () => {};

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
      if (editingItemData) {
        const params = {
          data_id: rawmatData._id,
          config_id: activeDataGroup.config_id,
          group_name: activeTableGroup.name,
          table_name: activeTableItem.name,
          type: newData.type,
          name: editingItemData.input || editingItemData.output || "",
          udf_id: newData.udf_id,
        };

        await api.post("/rawmat/data/save-input-output/mmbtu", null, {
          params: params,
        });
        message.success(
          `${
            newData.type.charAt(0).toUpperCase() + newData.type.slice(1)
          } MMBTU added successfully!`,
        );
      }

      handleCloseInputOutputModal();
      fetchRawmatData();
    } catch (error) {
      console.error("Error saving MMBTU udf:", error);
      message.error("Failed to save MMBTU udf.");
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
    <div className="px-5 py-4 h-full">
      <div className="flex items-center justify-between">
        <Breadcrumb
          separator={<MdArrowForwardIos size={16} />}
          items={breadcrumbItems}
          className="customBreadcrumb separatorSpacing"
        />
        <Button
          type="default"
          className="customSecondaryButton btn-md mr-12"
          onClick={() => setIsNextStepModalVisible(true)}>
          <span className="font-normal">Next: </span>
          <span className="font-semibold">Run Calculation</span>
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
            <div className="w-[287px] flex-none flex flex-col [&>div:not(:first-child)]:overflow-y-auto">
              <div className="bg-neutral-250 p-3 font-semibold border border-neutral-300 flex justify-center items-center text-20 h-[45px] shrink-0">
                Table Group
              </div>
              {activeDataGroup.table_groups.map((table_group) => (
                <div
                  key={table_group.name}
                  className={`flex items-center gap-3 bg-white p-4 cursor-pointer border-b border-l border-neutral-300 ${
                    table_group.name === selectedTableGroup
                      ? "bg-neutral-100!"
                      : ""
                  }`}
                  onClick={() => setSelectedTableGroup(table_group.name)}>
                  <div className="mr-3">
                    {table_group.completed === true ? (
                      <div className="w-6 h-6 rounded-full bg-[#1268b3] flex justify-center items-center">
                        <AiOutlineCheck color="#F3F4F8" size={16} />
                      </div>
                    ) : (
                      <div className="relative">
                        <AiOutlineLoading3Quarters size={24} color="#F47920" />
                        <div className="absolute w-3 h-3 rounded-full bg-secondary-300 top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                      </div>
                    )}
                  </div>
                  <span
                    className={`grow font-normal ${
                      table_group.name === selectedTableGroup
                        ? "font-semibold!"
                        : ""
                    }`}>
                    {table_group.name}
                  </span>
                  <MdArrowForwardIos className="text-primary-500" size={20} />
                </div>
              ))}
            </div>
            <div className="bg-neutral-250 p-3 font-semibold border border-neutral-300 flex justify-center items-center text-20 h-[45px] shrink-0">
              Unbalance
            </div>
            <div className="flex text-16">
              <div className="bg-neutral-250 flex-1 text-center py-3.5 px-1.5">
                Input total
              </div>
              <div className="bg-neutral-200 flex-1 text-center py-3.5 px-1.5 border border-neutral-250">
                {formatNumberWithoutRounding(inputMmbtuTotal)}
              </div>
            </div>
            <div className="flex text-16">
              <div className="bg-neutral-250 flex-1 text-center py-3.5 px-1.5">
                Output total
              </div>
              <div className="bg-neutral-200 flex-1 text-center py-3.5 px-1.5 border border-neutral-250">
                {formatNumberWithoutRounding(outputMmbtuTotal)}
              </div>
            </div>
            <div className="flex text-16">
              <div className="bg-[#404252] flex-1 text-center text-white py-3.5 px-1.5 border border-neutral-250">
                Unbalance value
              </div>
              <div className="bg-[#00ad17] flex-1 text-center text-white py-3.5 px-1.5 border border-neutral-250">
                {formatNumberWithoutRounding(
                  inputMmbtuTotal - outputMmbtuTotal,
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 h-[calc(100vh-250px)] max-w-[calc(100%-287px)] border-r border-b border-l border-neutral-300 flex flex-col">
            <div className="bg-neutral-250 p-3 font-semibold border border-neutral-300 flex justify-center items-center text-20 h-[45px] shrink-0">
              MMBTU
            </div>
            <div className="bg-white p-4 flex-1 flex flex-col justify-between overflow-y-auto">
              {selectedTableGroup !== null ? (
                <>
                  <div className="grow">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="font-semibold text-16">
                        Table items:
                      </span>
                      <div className="flex gap-3 flex-wrap flex-1">
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
                    <div className="flex justify-between items-center w-full my-2.5">
                      <div className="flex items-center font-semibold text-20 gap-2">
                        <span>References</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center w-full my-2.5">
                      <div className="flex items-center font-semibold text-20 gap-2">
                        <span>Ratio Performance Figure</span>
                        <span className="text-secondary-300 text-16">
                          {rpfData?.length}
                        </span>
                      </div>
                    </div>
                    <Table
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      columns={rpfColumns as any}
                      dataSource={rpfData}
                      pagination={false}
                      className="[&_.ant-table-thead>tr>th]:bg-neutral-250 [&_.ant-table-tbody>tr>td]:bg-neutral-200"
                      bordered
                    />
                  </div>
                </>
              ) : (
                <span>Select an item to view content</span>
              )}
            </div>
          </div>
        </div>
      )}
      <MmbtuModal
        open={isMmbtuModalOpen}
        onCancel={handleCloseInputOutputModal}
        onSubmit={handleInputOutputSubmit}
        activeDataGroup={activeDataGroup?.config_id}
        activeTableGroup={activeTableGroup?.name}
        activeTableItemName={activeTableItem?.name}
        resourceType={editingResourceType}
        isSubmitting={submitLoading}
        initialValues={editingItemData}
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

export default CalculateMmbtuPage;

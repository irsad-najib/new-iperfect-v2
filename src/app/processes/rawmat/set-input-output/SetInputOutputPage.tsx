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
import styles from "./SetInputOutputPage.module.css";
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
  const [loadingConfig, setLoadingConfig] = useState(false);
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
      <span className={styles.tabLabel}>
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
        <div className={styles.buttonHeader}>
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
        <div className={styles.buttonHeader}>
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

  const inputHeader = (
    <div className={styles.collapseHeader}>
      <div className={styles.collapseTitle}>
        <span>Input resources</span>
        <span className={styles.resourceCount}>{inputData.length}</span>
      </div>
      <div className={styles.collapseTotal}>
        <span>Total:</span>
        <span className={styles.totalValue}>
          {formatNumberWithoutRounding(inputTotal)}
        </span>
      </div>
    </div>
  );

  const outputHeader = (
    <div className={styles.collapseHeader}>
      <div className={styles.collapseTitle}>
        <span>Output resources</span>
        <span className={styles.resourceCount}>{outputData.length}</span>
      </div>
      <div className={styles.collapseTotal}>
        <span>Total:</span>
        <span className={styles.totalValue}>
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
          className={styles.resourceTable}
          bordered
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row className={styles.summaryRow}>
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
          className={styles.resourceTable}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row className={styles.summaryRow}>
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
      title: <span className="lastBreadcrumbItem">Set inputs and outputs</span>,
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
    <div className={styles.container}>
      <div className={styles.breadcrumbButtonContainer}>
        <Breadcrumb
          separator={<MdArrowForwardIos size={16} />}
          items={breadcrumbItems}
          className="customBreadcrumb separatorSpacing"
        />
        <Button
          type="default"
          className={`customSecondaryButton btn-md ${styles.buttonMargin}`}
          onClick={() => setIsNextStepModalVisible(true)}>
          <span className={styles.nextButtonText}>Next: </span>
          <span className={styles.nextButtonBoldText}>
            Set Ratio Performance Figure
          </span>
          <HiOutlineArrowNarrowRight
            size={24}
            className={styles.nextButtonIcon}
          />
        </Button>
      </div>

      <div className={styles.header}>
        <div className={styles.dateSection}>
          <span>Date:</span>
          <DatePicker
            disabled
            value={selectedDate}
            format="dddd, DD MMMM YYYY"
            className="boldDatePicker"
          />
        </div>

        <div className={styles.configSection}>
          <span>Config input output:</span>
          <div className={styles.configSelect}>
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
              <MdArrowForwardIos
                size={18}
                style={{ transform: "rotate(90deg)" }}
              />
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
        <div className={styles.tableContainer}>
          <div>
            <div className={styles.dataColumn}>
              <div className={styles.columnHeader}>Table Group</div>
              {activeDataGroup.table_groups.map((table_group) => (
                <div
                  key={table_group.name}
                  className={`${styles.dataCell} ${
                    table_group.name === selectedTableGroup
                      ? styles.selectedCell
                      : ""
                  }`}
                  onClick={() => setSelectedTableGroup(table_group.name)}>
                  <div className={styles.statusIcon}>
                    {table_group.completed === true ? (
                      <div className={styles.completedIcon}>
                        <AiOutlineCheck color="#F3F4F8" size={16} />
                      </div>
                    ) : (
                      <div className={styles.pendingIcon}>
                        <AiOutlineLoading3Quarters size={24} color="#F47920" />
                        <div className={styles.pendingIconDot}></div>
                      </div>
                    )}
                  </div>
                  <span
                    className={`${styles.dataCellText} ${
                      table_group.name === selectedTableGroup
                        ? styles.selectedCellText
                        : ""
                    }`}>
                    {table_group.name}
                  </span>
                  <MdArrowForwardIos
                    className={styles.dataCellArrow}
                    size={20}
                  />
                </div>
              ))}
            </div>
            <div className={styles.columnHeader}>Unbalance</div>
            <div className={styles.unbalanceRow}>
              <div className={styles.unbalanceColumnTitle}>Input total</div>
              <div className={styles.unbalanceColumnValue}>
                {formatNumberWithoutRounding(inputTotal)}
              </div>
            </div>
            <div className={styles.unbalanceRow}>
              <div className={styles.unbalanceColumnTitle}>Output total</div>
              <div className={styles.unbalanceColumnValue}>
                {formatNumberWithoutRounding(outputTotal)}
              </div>
            </div>
            <div className={styles.unbalanceRow}>
              <div className={styles.unbalanceColumnTitle2}>
                Unbalance value
              </div>
              <div
                className={
                  formatNumberWithoutRounding(inputTotal - outputTotal) === "0"
                    ? styles.unbalanceColumnValue2
                    : styles.unbalance
                }>
                {formatNumberWithoutRounding(inputTotal - outputTotal)}
              </div>
            </div>
          </div>
          <div className={styles.viewerColumn}>
            <div className={styles.columnHeader}>Input and Outputs</div>
            <div className={styles.viewerCell}>
              {selectedTableGroup !== null ? (
                <>
                  <div className={styles.viewerContent}>
                    <div className={styles.tableItemsContainer}>
                      <span className={styles.tableItemsLabel}>
                        Table items:
                      </span>
                      <div className={styles.buttonTabs}>
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

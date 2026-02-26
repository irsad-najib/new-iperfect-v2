/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Breadcrumb,
  DatePicker,
  Tabs,
  Button,
  Dropdown,
  Spin,
  message,
} from "antd";
import { MdArrowForwardIos } from "react-icons/md";
import Link from "next/link";
import { useDateContext } from "@/context/DateContext";
import { FiAlertTriangle } from "react-icons/fi";
import NPKTable from "@/components/npk/NPK-table";
import api from "@/utils/axios";
import SyncToModal from "@/components/npk/summary/sync-toModal";
import FileSaver from "file-saver";
import NPKUtilityModal from "@/components/npk/summary/NPKUtilityModal";
import SaveConfigModal from "@/components/npk/summary/SaveConfigModal";
import LoadUtilityConfigModal from "@/components/npk/summary/LoadUtilityConfigModal";

const formatTanggalID = (iso: string) => {
  if (!iso) return "";
  // Pastikan pakai format YYYY-MM-DD
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso; // fallback kalau invalid
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatNumbersInData = (data: any): any => {
  // 1. Jika data bukan objek (misal: string, boolean, null), langsung kembalikan
  if (typeof data !== "object" || data === null) {
    // Jika datanya adalah angka, format di sini
    if (typeof data === "number") {
      // format angka dengan 2 angka di belakang koma
      return new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(data);
    }
    // Jika bukan angka (string, etc), kembalikan apa adanya
    return data;
  }

  // 2. Jika data adalah sebuah Array
  if (Array.isArray(data)) {
    return data.map((item) => formatNumbersInData(item));
  }

  // 3. Jika data adalah sebuah Object
  const newObj: Record<string, any> = {};
  for (const key in data) {
    newObj[key] = formatNumbersInData(data[key]);
  }
  return newObj;
};

const formatDateForAPI = (date: any) => {
  if (!date) return "";

  let formattedDate: Date;

  // Handle different date formats
  if (typeof date === "string") {
    formattedDate = new Date(date);
  } else if (date instanceof Date) {
    formattedDate = date;
  } else if (date && typeof date === "object" && date.format) {
    // Handle Dayjs/Moment object
    return date.format("YYYY-MM-DD");
  } else {
    formattedDate = new Date(date);
  }

  // Validate date
  if (isNaN(formattedDate.getTime())) {
    return "";
  }

  // Format to YYYY-MM-DD
  return formattedDate.toISOString().split("T")[0];
};

const DailySummary = () => {
  const { selectedDate } = useDateContext();
  const [active, setActive] = useState("produksi");
  const [SummaryData, setSummaryData] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [UtilitasData, setUtilitasData] = useState<any>([]);
  const [DowntimeData, setDowntimeData] = useState<any>([]);
  const [utilitasLoading, setUtilitasLoading] = useState(false);
  const [downtimeLoading, setDowntimeLoading] = useState(false);
  const [isSyncModalVisible, setIsSyncModalVisible] = useState(false);
  const [isUDFModalOpen, setIsUDFModalOpen] = useState(false);
  const [utilityConfigs, setUtilityConfigs] = useState<any[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>("in-progress");
  const [statusLoading, setStatusLoading] = useState(false);
  const [isSaveConfigModalVisible, setIsSaveConfigModalVisible] =
    useState(false);
  const [isLoadConfigModalVisible, setIsLoadConfigModalVisible] =
    useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isApplyingConfig, setIsApplyingConfig] = useState(false);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    value: number | null;
    location: string;
    udfId: string | null;
    unit: string;
    materialName: string;
    columnTitle: string;
    nms: string;
    configId: string;
    cellKey: string;
  } | null>(null);

  const getSummaryData = useCallback(async () => {
    setLoading(true);
    try {
      const formattedDate = formatDateForAPI(selectedDate);
      const response = await api.get("/npk/daily/summary/get-by-args", {
        params: {
          tanggal: formattedDate,
          data_type: active,
        },
      });
      const data = await response.data;
      const formattedData = formatNumbersInData(data);
      setSummaryData(formattedData);
    } catch (error) {
      console.error("Error fetching summary data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, active]);

  const getUtilitasData = useCallback(async () => {
    setUtilitasLoading(true);
    try {
      const formattedDate = formatDateForAPI(selectedDate);
      const response = await api.get("/npk/daily/summary/utility/get-by-args", {
        params: {
          tanggal: formattedDate,
        },
      });
      console.log("Utilitas response:", response);
      const data = await response.data;
      const formattedData = formatNumbersInData(data);
      setUtilitasData(formattedData);
    } catch (error) {
      console.error("Error fetching utilitas data:", error);
    } finally {
      setUtilitasLoading(false);
    }
  }, [selectedDate]);

  const getDowntimeData = useCallback(async () => {
    setDowntimeLoading(true);
    try {
      const formattedDate = formatDateForAPI(selectedDate);
      const response = await api.get(
        "/npk/daily/summary/downtime/get-by-args",
        {
          params: {
            tanggal: formattedDate,
          },
        },
      );
      const data = await response.data;
      const formattedData = formatNumbersInData(data);
      setDowntimeData(formattedData);
    } catch (error) {
      console.error("Error fetching downtime data:", error);
    } finally {
      setDowntimeLoading(false);
    }
  }, [selectedDate]);

  const getUtilityConfigList = useCallback(async () => {
    setIsLoadingConfigs(true);
    try {
      const response = await api.get("/npk/daily/summary/utility/config-list");
      if (response.data) {
        setUtilityConfigs(response.data);
      }
    } catch (error) {
      console.error("Error fetching utility config list:", error);
      message.error("Failed to fetch utility configurations");
    } finally {
      setIsLoadingConfigs(false);
    }
  }, []);

  const handlesyncTO = () => {
    setIsSyncModalVisible(true);
  };

  const handleSyncModalClose = () => {
    setIsSyncModalVisible(false);
  };

  // const handleSyncModalSave = async (data: any) => {
  //   try {
  //     console.log("Sync TO Data:", data);
  //     // TODO: Implement API call to save sync template order
  //     // const response = await api.post("/npk/daily/sync-template-order", data);
  //     // Handle success response
  //   } catch (error) {
  //     console.error("Error saving sync template order:", error);
  //     // Handle error
  //   }
  // };

  const findColumnTitle = useCallback(
    (dataIndex: string) => {
      if (!UtilitasData?.header) return dataIndex;

      const findColumnInHeader = (items: any[]): any => {
        for (const item of items) {
          if (String(item.start_column_key) === String(dataIndex)) {
            return item;
          }
          if (item.items && item.items.length > 0) {
            const found = findColumnInHeader(item.items);
            if (found) return found;
          }
        }
        return null;
      };

      const headerItems = UtilitasData.header.flatMap(
        (h: any) => h.items || [],
      );
      const columnInfo = findColumnInHeader(headerItems);
      return columnInfo?.title || dataIndex;
    },
    [UtilitasData],
  );

  const openUdfEditor = useCallback(
    (record: any, dataIndex: string, columnKey?: string) => {
      if (!record) return;

      const metaFromRow = record?._cellMeta?.[String(dataIndex)];
      const items: any[] = record?.originalRow?.items || [];
      const matchedItem =
        metaFromRow ||
        items.find(
          (it: any) => String(it?.start_column_key) === String(dataIndex),
        );

      if (!matchedItem) return;

      const rowIndex = record["0"] || record.rowIndex || "";
      const columnTitle =
        matchedItem.columnTitle || findColumnTitle(String(dataIndex));

      const rawValue = record[dataIndex];
      const numericValue =
        typeof rawValue === "number"
          ? rawValue
          : rawValue === null || rawValue === undefined || rawValue === ""
            ? null
            : Number(rawValue);

      const cellKey =
        matchedItem.cellRefKey ||
        matchedItem.cell_ref_key ||
        columnKey ||
        String(dataIndex);

      setSelectedCell({
        value: Number.isNaN(numericValue) ? null : numericValue,
        location: `${rowIndex}-${columnTitle}`,
        udfId: matchedItem.udfId || matchedItem.udf_id || null,
        unit: matchedItem.unit || "",
        materialName:
          matchedItem.materialName || rowIndex || "Unknown Material",
        columnTitle: columnTitle,
        nms: record.nms || matchedItem.nms || "",
        configId: UtilitasData?.config_id || "",
        cellKey: String(cellKey),
      });

      setIsUDFModalOpen(true);
    },
    [UtilitasData, findColumnTitle],
  );

  const handleNullCellClick = useCallback(
    (record: any, dataIndex: string, columnKey: string) => {
      openUdfEditor(record, dataIndex, columnKey);
    },
    [openUdfEditor],
  );

  const handleCellClick = useCallback(
    (record: any, dataIndex: string, columnKey?: string) => {
      openUdfEditor(record, dataIndex, columnKey);
    },
    [openUdfEditor],
  );

  const handleUDFModalClose = () => {
    setIsUDFModalOpen(false);
    setSelectedCell(null);
  };

  const handleUpdateUDF = async () => {
    // Refresh utilitas data after UDF is updated
    await getUtilitasData();
  };

  // const handleRevert = async (reasoning: string, udfId: string) => {
  //   try {
  //     // setRevertLoading(true);
  //     // TODO: Implement revert API call if needed
  //     console.log("Reverting UDF:", { reasoning, udfId });
  //     message.success("UDF reverted successfully");
  //     await getUtilitasData();
  //   } catch (error) {
  //     console.error("Error reverting UDF:", error);
  //     message.error("Failed to revert UDF");
  //   } finally {
  //     // setRevertLoading(false);
  //   }
  // };

  // const handleEditUtilityCell = async (
  //   configId: string,
  //   cellKey: string,
  //   udfId: string,
  //   material: string,
  // ) => {
  //   try {
  //     const formattedDate = formatDateForAPI(selectedDate);
  //     const response = await api.post("/npk/daily/summary/utility/edit", {
  //       config_id: configId,
  //       cell_key: cellKey,
  //       udf_id: udfId,
  //       material: material,
  //     });

  //     if (response.status === 200) {
  //       message.success("Utility cell updated successfully");
  //       await getUtilitasData();
  //     }
  //   } catch (error) {
  //     console.error("Error editing utility cell:", error);
  //     message.error("Failed to update utility cell");
  //   }
  // };

  const handleSaveUtilityConfig = async (values: { save_name: string }) => {
    if (!UtilitasData?.config_id) {
      message.error("No config ID found in current data");
      return;
    }

    setIsSavingConfig(true);
    try {
      const response = await api.post("/npk/daily/summary/utility/save-as", {
        config_id: UtilitasData.config_id,
        save_name: values.save_name,
      });

      if (response.status === 200) {
        message.success("Utility configuration saved successfully");
        setIsSaveConfigModalVisible(false);
        await getUtilityConfigList();
        await getUtilitasData();
      }
    } catch (error) {
      console.error("Error saving utility config:", error);
      message.error("Failed to save utility configuration");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleApplyUtilityConfig = async (configId: string) => {
    setIsApplyingConfig(true);
    try {
      const formattedDate = formatDateForAPI(selectedDate);
      const response = await api.post(
        "/npk/daily/summary/utility/apply",
        null,
        {
          params: {
            target_tanggal: formattedDate,
            config_id: configId,
          },
        },
      );

      if (response.status === 200) {
        message.success("Utility configuration applied successfully");
        setIsLoadConfigModalVisible(false);
        await getUtilitasData();
      }
    } catch (error) {
      console.error("Error applying utility config:", error);
      message.error("Failed to apply utility configuration");
    } finally {
      setIsApplyingConfig(false);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    try {
      setStatusLoading(true);
      const formattedDate = formatDateForAPI(selectedDate);

      const dataTypeMapping: Record<string, string> = {
        produksi: "production",
        pemakaian_bahan: "pemakaian_bahan",
        utilitas_downtime: "downtime_utility",
        penerimaan: "penerimaan",
        pengapalan_trucking: "pengapalan_trucking",
      };

      const productTypeMapping: Record<string, string> = {
        produksi: "fuse_1",
        pemakaian_bahan: "fuse_1",
        utilitas_downtime: "fuse_1",
        penerimaan: "fuse_1",
        pengapalan_trucking: "fuse_1",
      };

      const dataType = dataTypeMapping[active] || active;
      const productType = productTypeMapping[active] || "fuse_1";

      const response = await api.post("/npk/daily/utils/change-status", null, {
        params: {
          tanggal: formattedDate,
          product_type: productType,
          data_type: dataType,
          status: newStatus,
          is_summary: true,
        },
      });

      if (response.status === 200) {
        message.success(`Status changed to ${newStatus} successfully`);
        setCurrentStatus(newStatus);
        // Refresh data sesuai tab aktif
        if (active === "utilitas_downtime") {
          await getUtilitasData();
          await getDowntimeData();
        } else {
          await getSummaryData();
        }
      }
    } catch (error: any) {
      console.error("Error changing status:", error);
      const messageDetail =
        error?.response?.data?.message || "Failed to change status";
      message.error(messageDetail);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDownloadSAP = async () => {
    try {
      const formattedDate = formatDateForAPI(selectedDate);
      const response = await api.get(`/npk/daily/sap/download`, {
        params: { tanggal: formattedDate },
        responseType: "blob", // Ensure the response is treated as a file
      });
      FileSaver.saveAs(response.data, `SAP_NPK`);
    } catch (error) {
      console.error("Error downloading SAP file:", error);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      // Hanya panggil API sesuai tab yang aktif
      if (active === "utilitas_downtime") {
        getUtilitasData();
        getDowntimeData();
        getUtilityConfigList();
      } else {
        getSummaryData();
      }
    }
  }, [
    selectedDate,
    active,
    getSummaryData,
    getUtilitasData,
    getDowntimeData,
    getUtilityConfigList,
  ]);

  const tabList = [
    { key: "produksi", label: "Produksi" },
    { key: "pemakaian_bahan", label: "Pemakaian Bahan" },
    { key: "utilitas_downtime", label: "Utilitas dan Downtime" },
    { key: "penerimaan", label: "Penerimaan Bahan" },
    { key: "pengapalan_trucking", label: "Pengapalan & Trucking" },
  ];

  return (
    <div>
      <Breadcrumb
        separator={
          <MdArrowForwardIos size={16} className="inline-block align-middle" />
        }
        items={[
          {
            title: (
              <Link href="/npk" className="breadcrumbLink">
                <span className="text-neutral-300 text-20 font-semibold">
                  NPK
                </span>
              </Link>
            ),
          },
          {
            title: (
              <span className="text-neutral-900 text-20 font-semibold">
                Daily Summary
              </span>
            ),
          },
        ]}
        className="customBreadcrumb separatorSpacing mb-4"
      />
      <div className="mt-7 mb-4">
        <DatePicker
          disabled
          value={selectedDate}
          format="dddd, DD MMMM YYYY"
          className="boldDatePicker"
        />
      </div>
      <div className="flex justify-between items-start gap-4">
        <Tabs
          className="text-20 [&_.ant-tabs-nav::before]:h-1 [&_.ant-tabs-nav::before]:bg-neutral-250 [&_.ant-tabs-tab]:text-center [&_.ant-tabs-tab]:items-center [&_.ant-tabs-tab]:justify-center [&_.ant-tabs-tab]:py-2 [&_.ant-tabs-tab]:px-4 [&_.ant-tabs-tab]:mx-1 [&_.ant-tabs-tab]:text-neutral-300 [&_.ant-tabs-tab]:font-semibold [&_.ant-tabs-tab-active]:rounded [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:text-black [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:font-semibold [&_.ant-tabs-ink-bar]:bg-orange-500 [&_.ant-tabs-ink-bar]:h-1"
          activeKey={active}
          onChange={setActive}
          items={tabList}
        />
        <div className="flex gap-2 ml-2.5">
          <Button
            type="primary"
            className={"customPrimaryButton btn-md"}
            onClick={handlesyncTO}
            // loading={loading}
          >
            <span>
              <FiAlertTriangle />
            </span>
            Sync TO
          </Button>
          <Button
            type="primary"
            onClick={handleDownloadSAP}
            className={"customPrimaryButton btn-md"}>
            Download SAP
          </Button>
        </div>
      </div>
      <div>
        <div>
          <span>Data : </span>
          <strong>
            {""}
            {formatTanggalID(
              selectedDate ? selectedDate.format("YYYY-MM-DD") : "",
            )}
          </strong>
          <span className="float-right">
            (Last modified:{" "}
            {SummaryData?.last_modified
              ? new Date(SummaryData.last_modified * 1000).toLocaleString(
                  "id-ID",
                )
              : "N/A"}
            )<span> Status Produksi: </span>
            <Dropdown
              menu={{
                items: [
                  { key: "in-progress", label: "In progress" },
                  { key: "done", label: "Done" },
                ],
                onClick: ({ key }) => handleChangeStatus(key),
              }}>
              <Button type="default" className="btn-md" loading={statusLoading}>
                {currentStatus === "done" ? "Done" : "In progress"}
                <MdArrowForwardIos size={18} className="rotate-90 ml-1" />
              </Button>
            </Dropdown>
          </span>
        </div>
        {active === "utilitas_downtime" ? (
          <div className="grid gap-4 mt-4 max-w-full overflow-hidden">
            <div className="w-full overflow-hidden">
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold text-[20.16px]">Utilitas</div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    Config:{" "}
                    <span className="px-3 py-1 bg-[#e6e6e6] rounded text-[16.8px] font-normal">
                      {UtilitasData?.config_id || "N/A"}
                    </span>
                  </span>
                  <Button
                    type="primary"
                    className={"customPrimaryButton btn-md"}
                    onClick={() => {
                      setIsLoadConfigModalVisible(true);
                      if (utilityConfigs.length === 0) {
                        getUtilityConfigList();
                      }
                    }}>
                    Load Config
                  </Button>
                  <Button
                    type="primary"
                    className={"customPrimaryButton btn-md"}
                    onClick={() => setIsSaveConfigModalVisible(true)}
                    disabled={!UtilitasData?.config_id}>
                    Save
                  </Button>
                </div>
              </div>
              <div className="w-full overflow-x-auto overflow-y-hidden">
                <Spin spinning={utilitasLoading} tip="Loading Utilitas...">
                  <NPKTable
                    key="utilitas"
                    data={UtilitasData}
                    isLastRowSticky={false}
                    autoHeight={false}
                    maxHeight={400}
                    onCellClick={handleCellClick}
                    showAddButtonForNull={true}
                    onNullCellClick={handleNullCellClick}
                  />
                </Spin>
              </div>
            </div>

            <div className="w-full overflow-hidden">
              <div className="font-semibold text-[20.16px] mb-4">
                Top 3 Downtime
              </div>

              <Spin spinning={downtimeLoading} tip="Loading Downtime...">
                <div className="grid gap-4">
                  {DowntimeData && DowntimeData.length > 0 && (
                    <>
                      <div className="w-full overflow-hidden">
                        <div className="font-medium mb-2 text-base">Fuse 1</div>
                        <div className="w-full overflow-x-auto overflow-y-hidden">
                          <NPKTable
                            key="downtime-fuse1"
                            data={DowntimeData[0] || null}
                            isLastRowSticky={false}
                            autoHeight={false}
                            maxHeight={300}
                          />
                        </div>
                      </div>

                      <div className="w-full overflow-hidden">
                        <div className="font-medium mb-2 text-base">Fuse 2</div>
                        <div className="w-full overflow-x-auto overflow-y-hidden">
                          <NPKTable
                            key="downtime-fuse2"
                            data={DowntimeData[1] || null}
                            isLastRowSticky={false}
                            autoHeight={false}
                            maxHeight={300}
                          />
                        </div>
                      </div>

                      <div className="w-full overflow-hidden">
                        <div className="font-medium mb-2 text-base">
                          Blending
                        </div>
                        <div className="w-full overflow-x-auto overflow-y-hidden">
                          <NPKTable
                            key="downtime-fuse3"
                            data={DowntimeData[2] || null}
                            isLastRowSticky={false}
                            autoHeight={false}
                            maxHeight={300}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Spin>
            </div>
          </div>
        ) : (
          <Spin spinning={loading} tip="Loading data...">
            <NPKTable
              key={`summary-${active}`}
              data={SummaryData}
              isLastRowSticky={false}
            />
          </Spin>
        )}
      </div>

      <SyncToModal
        isVisible={isSyncModalVisible}
        onClose={handleSyncModalClose}
        // nama
        // onSave={handleSyncModalSave}
        selectedData={selectedDate ? selectedDate.format("YYYY-MM-DD") : ""}
      />

      <NPKUtilityModal
        open={isUDFModalOpen}
        onCancel={handleUDFModalClose}
        materialName={selectedCell?.materialName || ""}
        columnTitle={selectedCell?.columnTitle}
        unit={selectedCell?.unit}
        udfId={selectedCell?.udfId || null}
        cellValue={selectedCell?.value}
        onUpdateUDF={handleUpdateUDF}
        cellLocation={selectedCell?.location}
        nms={selectedCell?.nms}
        configId={selectedCell?.configId}
        cellKey={selectedCell?.cellKey}
      />

      <SaveConfigModal
        isVisible={isSaveConfigModalVisible}
        onCancel={() => setIsSaveConfigModalVisible(false)}
        onSave={handleSaveUtilityConfig}
        isSubmitting={isSavingConfig}
      />

      <LoadUtilityConfigModal
        isVisible={isLoadConfigModalVisible}
        onCancel={() => setIsLoadConfigModalVisible(false)}
        onSelect={handleApplyUtilityConfig}
        configList={utilityConfigs}
        isLoading={isLoadingConfigs}
        isApplying={isApplyingConfig}
      />
    </div>
  );
};

export default DailySummary;

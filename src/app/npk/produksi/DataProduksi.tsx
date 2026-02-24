"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import {
  Breadcrumb,
  Button,
  DatePicker,
  Dropdown,
  Switch,
  Tabs,
  message,
} from "antd";
import { MdArrowForwardIos } from "react-icons/md";
import Link from "next/link";
import NPKTable from "@/components/npk/NPK-table";
import { useDateContext } from "@/context/DateContext";
import { MdOutlineStickyNote2 } from "react-icons/md";
import { TfiDownload } from "react-icons/tfi";
import api from "@/utils/axios";
import OverwriteModal from "@/components/npk/produksi/OverwriteModal";
import SaveConfigModal from "@/components/npk/produksi/SaveConfigModal";

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

// Fungsi untuk format tanggal ke YYYY-MM-DD
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

type FilterKey = "TD" | "MTD" | "YTD" | "Input-Fuse-Formulation";

const DataProduksi = () => {
  const [active, setActive] = useState("Fuse 1");
  const [productionData, setProductionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { selectedDate } = useDateContext();
  const [modalEditVisible, setModalEditVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [selectedCellData, setSelectedCellData] = useState<any>(null);
  const [overwriteValues, setOverwriteValues] = useState<{
    newValue: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk Save Config Modal
  const [isSaveConfigVisible, setIsSaveConfigVisible] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // State untuk Load Config Dropdown
  const [configList, setConfigList] = useState<any[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);
  const [isApplyingConfig, setIsApplyingConfig] = useState(false);
  const [configDropdownOpen, setConfigDropdownOpen] = useState(false);
  const [filterKey, setFilterKey] = useState<FilterKey>("TD"); // Initialize filterKey with a default value
  const [isTotalOnly, setIsTotalOnly] = useState(false); // State untuk switch Total Only

  const handleresyncdata = async () => {
    try {
      setLoading(true);
      await api.post("/npk/daily/production/sync-data", null, {
        params: {
          tanggal: formatDateForAPI(selectedDate),
        },
      });
    } catch (error) {
      console.error("Error during resync:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellEdit = (record: any, dataIndex: any) => {
    const indexArray = dataIndex - 1;
    const item = record.originalRow.items[indexArray];

    setSelectedCellData(item);
    setModalEditVisible(true);
  };
  const handleCancel = () => {
    setModalEditVisible(false);
  };

  // Fungsi yang dijalankan saat tombol "Overwrite" di modal pertama ditekan
  const handleSave = (values: { newValue: number }) => {
    setOverwriteValues(values); // Simpan nilai baru sementara
    setModalEditVisible(false); // Tutup modal edit
    setIsConfirmVisible(true); // Buka modal konfirmasi
  };

  // Fungsi untuk menutup modal konfirmasi
  const handleConfirmCancel = () => {
    setIsConfirmVisible(false);
  };

  const handleConfirmSave = async () => {
    if (!selectedCellData || !overwriteValues) return;

    setIsSubmitting(true);
    try {
      if (filterKey === "Input-Fuse-Formulation") {
        await api.post("/npk/daily/production/fuse-formulation/edit", {
          cell_key: selectedCellData.cell_ref_key,
          value: overwriteValues.newValue,
        });
      } else {
        await api.post("/npk/daily/production/edit", {
          cell_key: selectedCellData.cell_ref_key,
          value: overwriteValues.newValue,
        });
      }
      setIsConfirmVisible(false);
      fetchProductData();
    } catch (error) {
      console.error("Failed to overwrite data:", error);
    } finally {
      setIsSubmitting(false); // Hentikan loading button
    }
  };

  // Handler untuk Save Config
  const handleSaveConfig = async (values: { save_name: string }) => {
    if (!productionData?.config_id) {
      message.error("No config ID found in current data");
      return;
    }

    setIsSavingConfig(true);
    try {
      await api.post("/npk/daily/production/fuse-formulation/save-as", {
        config_id: productionData.config_id,
        save_name: values.save_name,
      });
      message.success("Configuration saved successfully");
      setIsSaveConfigVisible(false);
    } catch (error: any) {
      console.error("Failed to save config:", error);
      message.error(
        error.response?.data?.message || "Failed to save configuration",
      );
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Handler untuk Load Config List
  const fetchConfigList = async () => {
    setIsLoadingConfigs(true);
    try {
      const res = await api.get(
        "/npk/daily/production/fuse-formulation/config-list",
        {
          params: {
            product_type: getProductType(active),
          },
        },
      );
      setConfigList(res.data || []);
    } catch (error) {
      console.error("Failed to load config list:", error);
      message.error("Failed to load configuration list");
    } finally {
      setIsLoadingConfigs(false);
    }
  };

  // Handler untuk Apply Config langsung tanpa modal
  const handleApplyConfig = async (config_id: string) => {
    setIsApplyingConfig(true);
    try {
      // Apply ke tanggal yang sama dengan selectedDate
      const target_tanggal = formatDateForAPI(selectedDate);

      await api.post("/npk/daily/production/fuse-formulation/apply", null, {
        params: {
          target_tanggal,
          product_type: getProductType(active),
          config_id,
        },
      });
      message.success("Configuration applied successfully");
      setConfigDropdownOpen(false);
      // Refresh data setelah apply
      fetchProductData();
    } catch (error: any) {
      console.error("Failed to apply config:", error);
      message.error(
        error.response?.data?.message || "Failed to apply configuration",
      );
    } finally {
      setIsApplyingConfig(false);
    }
  };

  // Handler untuk membuka dropdown dan fetch config list
  const handleLoadConfigDropdown = (open: boolean) => {
    setConfigDropdownOpen(open);
    if (open && configList.length === 0) {
      fetchConfigList();
    }
  };

  // Handler untuk Change Status
  const handleChangeStatus = async (status: "in_progress" | "done") => {
    try {
      setLoading(true);
      await api.post("/npk/daily/production/change-status", null, {
        params: {
          tanggal: formatDateForAPI(selectedDate),
          product_type: getProductType(active),
          data_type: "produksi",
          status: status,
        },
      });
      message.success(
        `Status changed to ${status === "in_progress" ? "In Progress" : "Done"}`,
      );
      // Refresh data untuk mendapatkan status terbaru
      fetchProductData();
    } catch (error: any) {
      console.error("Failed to change status:", error);
      message.error(error.response?.data?.message || "Failed to change status");
    } finally {
      setLoading(false);
    }
  };

  // Mapping untuk product_type
  const getProductType = (tabKey: string) => {
    const mapping: Record<string, string> = {
      "Fuse 1": "fuse_1",
      "Fuse 2": "fuse_2",
      Blending: "blending",
    };
    return mapping[tabKey] || "fuse_1";
  };

  const fetchProductData = async () => {
    try {
      setLoading(true);
      let res;
      if (filterKey === "Input-Fuse-Formulation") {
        res = await api.get(
          "/npk/daily/production/fuse-formulation/get-by-args",
          {
            params: {
              tanggal: formatDateForAPI(selectedDate),
              product_type: getProductType(active),
            },
          },
        );
      } else {
        res = await api.get("/npk/daily/production/get-by-args", {
          params: {
            tanggal: formatDateForAPI(selectedDate),
            date_type: filterKey,
            product_type: getProductType(active),
            shift: isTotalOnly ? "total" : "all",
          },
        });
      }

      const responseData = res.data;
      const dataAkhir = formatNumbersInData(responseData);
      setProductionData(dataAkhir);
    } catch (error) {
      console.error("Error fetching data:", error);
      message.error("Failed to fetch production data");
      setProductionData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchProductData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, active, filterKey, isTotalOnly]);

  const tabList = [
    { key: "Fuse 1", label: "Fuse 1" },
    { key: "Fuse 2", label: "Fuse 2" },
    { key: "Blending", label: "Blending" },
  ];

  const filters: { key: FilterKey; label: string }[] = [
    { key: "TD", label: "This Date" },
    { key: "MTD", label: "Month to Date" },
    { key: "YTD", label: "Years to Date" },
    { key: "Input-Fuse-Formulation", label: "Input Fuse Formulation" },
  ];

  // Map konten per filter
  const filterContent: Record<FilterKey, React.ReactNode> = {
    TD: (
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <span>Data:</span>
            <strong>
              {formatTanggalID(productionData?.tanggal || selectedDate)}
            </strong>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-neutral-700">
              (Last modified:{" "}
              {productionData?.last_modified
                ? new Date(productionData.last_modified * 1000).toLocaleString(
                    "id-ID",
                  )
                : "N/A"}
              )
            </span>
            <span className="text-neutral-700">Total only</span>
            <Switch
              checked={isTotalOnly}
              onChange={(checked) => setIsTotalOnly(checked)}
              className="ml-2"
            />
          </div>
        </div>
        {!loading ? (
          <NPKTable
            data={productionData}
            isLastRowSticky={true}
            onCellClick={handleCellEdit}
          />
        ) : (
          <div>Loading...</div>
        )}
      </div>
    ),
    MTD: (
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <span>Cumulative Month to Date:</span>
            <strong>
              1 - {formatTanggalID(productionData?.tanggal || selectedDate)}
            </strong>
          </div>

          <div className="text-neutral-700">
            (Last modified:{" "}
            {productionData?.last_modified
              ? new Date(productionData.last_modified * 1000).toLocaleString(
                  "id-ID",
                )
              : "N/A"}
            )
          </div>
        </div>
        {!loading ? (
          <NPKTable
            data={productionData}
            isLastRowSticky={true}
            onCellClick={handleCellEdit}
          />
        ) : (
          <div>Loading...</div>
        )}
      </div>
    ),
    YTD: (
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <span>Cumulative Years to Date:</span>
            <strong>
              1 Januari -{" "}
              {formatTanggalID(productionData?.tanggal || selectedDate)}
            </strong>
          </div>

          <div className="text-neutral-700">
            (Last modified:{" "}
            {productionData?.last_modified
              ? new Date(productionData.last_modified * 1000).toLocaleString(
                  "id-ID",
                )
              : "N/A"}
            )
          </div>
        </div>
        {!loading ? (
          <NPKTable
            data={productionData}
            isLastRowSticky={true}
            onCellClick={handleCellEdit}
          />
        ) : (
          <div>Loading...</div>
        )}
      </div>
    ),
    "Input-Fuse-Formulation": (
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <span>Ratio Konsumsi by Formulasi:</span>
            <strong>
              {formatTanggalID(productionData?.tanggal || selectedDate)}
            </strong>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-neutral-700">
              (Last modified:{" "}
              {productionData?.last_modified
                ? new Date(productionData.last_modified * 1000).toLocaleString(
                    "id-ID",
                  )
                : "N/A"}
              )
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="primary"
                onClick={() => setIsSaveConfigVisible(true)}
                disabled={!productionData?.config_id}
                className="h-9! px-3!">
                Save Config
              </Button>
              <Dropdown
                open={configDropdownOpen}
                onOpenChange={handleLoadConfigDropdown}
                menu={{
                  items:
                    configList.length > 0
                      ? configList.map((config) => ({
                          key: config.config_id,
                          label: (
                            <div className="min-w-[200px]">
                              <div className="font-semibold">
                                {config.config_name}
                              </div>
                              <div className="text-12 text-neutral-500">
                                {new Date(
                                  config.last_modified * 1000,
                                ).toLocaleString("id-ID")}
                              </div>
                            </div>
                          ),
                          disabled: isApplyingConfig,
                        }))
                      : [
                          {
                            key: "loading",
                            label: isLoadingConfigs
                              ? "Loading..."
                              : "No configurations available",
                            disabled: true,
                          },
                        ],
                  onClick: ({ key }) => {
                    if (key !== "loading") {
                      handleApplyConfig(key);
                    }
                  },
                }}
                trigger={["click"]}>
                <Button
                  type="default"
                  loading={isApplyingConfig}
                  className="h-9! px-3!">
                  Load Config
                  <MdArrowForwardIos className="ml-1 rotate-90" size={18} />
                </Button>
              </Dropdown>
            </div>
          </div>
        </div>
        {!loading ? (
          <NPKTable
            data={productionData}
            onCellClick={handleCellEdit}
            isLastRowSticky={true}
          />
        ) : (
          <div>Loading...</div>
        )}
      </div>
    ),
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <Breadcrumb
          separator={
            <MdArrowForwardIos
              size={16}
              className="inline-block align-middle"
            />
          }
          items={[
            {
              title: (
                <Link href="/processes" className="breadcrumbLink">
                  <span className="text-neutral-300 text-20 font-semibold">
                    Processes
                  </span>
                </Link>
              ),
            },
            {
              title: (
                <span className="text-neutral-900 text-20 font-semibold">
                  RawMat
                </span>
              ),
            },
          ]}
          className="customBreadcrumb separatorSpacing mb-4"
        />
      </div>

      <div className="flex justify-between items-center mb-[18px] mt-7">
        <div>
          <DatePicker
            disabled
            value={selectedDate}
            defaultValue={null}
            format="dddd, DD MMMM YYYY"
            className="[&_.ant-picker-input>input]:font-semibold"
          />
        </div>
      </div>

      {/* Tabs + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs
          activeKey={active}
          onChange={setActive}
          items={tabList}
          className="flex-1 min-w-[260px]"
        />

        <div className="flex items-center gap-2">
          <Button
            type="primary"
            className="h-11! px-4!"
            onClick={handleresyncdata}
            loading={loading}>
            Re-fetch Data
          </Button>
          <Button
            icon={<MdOutlineStickyNote2 />}
            className="h-11! w-11! p-0!"
            // style={{ marginTop: "16px" }}
          />
          <Button
            icon={<TfiDownload />}
            className="h-11! w-11! p-0!"
            // style={{ marginTop: "16px" }}
          />
        </div>
      </div>

      {/* Filter Row */}
      <div className="mt-3 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <Button
              key={f.key}
              type="primary"
              onClick={() => setFilterKey(f.key)}
              className={
                "h-9! px-3! " +
                (filterKey === f.key
                  ? "bg-secondary-300! hover:bg-secondary-500! border-0!"
                  : "bg-neutral-250! hover:bg-neutral-200! text-neutral-900! border! border-neutral-300!")
              }>
              {f.label}
            </Button>
          ))}

          {/* Legend selalu tampil */}
          <div className="ml-1 flex items-center gap-2">
            <div className="h-[18px] w-[18px] rounded bg-success" />
            <span className="font-medium">Overwritted data</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <p className="m-0">Status {active}:</p>
          <Dropdown
            menu={{
              items: [
                { key: "in_progress", label: "In progress" },
                { key: "done", label: "Done" },
              ],
              onClick: ({ key }) =>
                handleChangeStatus(key as "in_progress" | "done"),
            }}>
            <Button type="default" className="h-9! px-3!">
              {productionData?.status === "done"
                ? "Done"
                : productionData?.status === "in_progress"
                  ? "In Progress"
                  : "Not Started"}
              <MdArrowForwardIos className="ml-1 rotate-90" size={18} />
            </Button>
          </Dropdown>
        </div>
      </div>

      {/* Konten dinamis berdasarkan filter */}
      {filterContent[filterKey]}

      <OverwriteModal
        isVisible={modalEditVisible}
        isConfirmVisible={isConfirmVisible}
        selectedData={selectedCellData}
        isSubmitting={isSubmitting}
        overwriteValues={overwriteValues}
        onCancel={handleCancel}
        onSave={handleSave}
        onConfirmCancel={handleConfirmCancel}
        onConfirmSave={handleConfirmSave}
        title="Overwrite Data Produksi"
      />

      <SaveConfigModal
        isVisible={isSaveConfigVisible}
        onCancel={() => setIsSaveConfigVisible(false)}
        onSave={handleSaveConfig}
        isSubmitting={isSavingConfig}
      />
    </div>
  );
};

export default DataProduksi;

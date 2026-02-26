"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Breadcrumb, Button, DatePicker, Dropdown, Tabs, message } from "antd";
import { MdArrowForwardIos } from "react-icons/md";
import Link from "next/link";
import NPKTable from "@/components/npk/NPK-table";
import { useDateContext } from "@/context/DateContext";
import { MdOutlineStickyNote2 } from "react-icons/md";
import { TfiDownload } from "react-icons/tfi";
import api from "@/utils/axios";
import DowntimeModal from "@/components/npk/pengeluaran/DowntimeModal";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

type FilterKey = "fuse_1" | "fuse_2" | "blending";

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

const DataPengeluaran = () => {
  const [active, setActive] = useState("Pengapalan");
  const [DistributionData, setDistributionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { selectedDate } = useDateContext();
  const [filterKey, setFilterKey] = useState<FilterKey>("fuse_1");
  const [addDowntimeModalVisible, setAddDowntimeModalVisible] = useState(false);
  const [EditDowntimeModalVisible, setEditDowntimeModalVisible] =
    useState(false);
  const [editDowntimeRecord, setEditDowntimeRecord] = useState<any>(null);

  const stripSuffixFromRefKey = (refKey: unknown): string | null => {
    if (typeof refKey !== "string") return null;
    const parts = refKey.split("-");
    return parts.length > 1 ? parts.slice(0, -1).join("-") : refKey;
  };

  const deriveBaseKeyFromRecord = (record: any): string | null => {
    if (!record) return null;
    const items = record?.originalRow?.items;
    const targetSuffixes = ["-st", "-et", "-cause", "-category", "-minutes"];

    if (Array.isArray(items)) {
      const matched = items.find((item: any) => {
        const refKey = item?.cell_ref_key;
        if (typeof refKey !== "string") return false;
        const lowerRef = refKey.toLowerCase();
        return targetSuffixes.some((suffix) => lowerRef.endsWith(suffix));
      });

      if (matched?.cell_ref_key) {
        return stripSuffixFromRefKey(matched.cell_ref_key);
      }

      const firstWithRef = items.find(
        (item: any) => typeof item?.cell_ref_key === "string",
      );
      if (firstWithRef?.cell_ref_key) {
        return stripSuffixFromRefKey(firstWithRef.cell_ref_key);
      }
    }

    if (typeof record?.cell_ref_key === "string") {
      return stripSuffixFromRefKey(record.cell_ref_key);
    }

    return null;
  };

  const findRecordItem = (
    record: any,
    suffixes: string[],
    fallbackKeys: string[] = [],
  ): { value: any; cellRefKey?: string } | null => {
    if (!record) return null;

    const items = record?.originalRow?.items;
    if (Array.isArray(items)) {
      const lowerSuffixes = suffixes.map((suffix) => suffix.toLowerCase());
      const matchedItem = items.find((item: any) => {
        const refKey = item?.cell_ref_key;
        if (typeof refKey !== "string") return false;
        const lowerRef = refKey.toLowerCase();
        return lowerSuffixes.some((suffix) => lowerRef.endsWith(suffix));
      });

      if (matchedItem) {
        return {
          value: matchedItem.value,
          cellRefKey: matchedItem.cell_ref_key,
        };
      }
    }

    for (const key of fallbackKeys) {
      if (record?.[key] !== undefined) {
        return { value: record[key] };
      }
    }

    return null;
  };

  const toDayjsTime = (value: unknown): Dayjs | null => {
    if (value === null || value === undefined) return null;
    if (dayjs.isDayjs(value)) return value as Dayjs;

    if (typeof value === "number") {
      return dayjs.unix(value);
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
        const [hour = 0, minute = 0, second = 0] = trimmed
          .split(":")
          .map((part) => Number(part) || 0);
        const base = selectedDate ? dayjs(selectedDate) : dayjs();
        return base.hour(hour).minute(minute).second(second);
      }

      const cleaned = trimmed.replace(/[^0-9-]/g, "");
      if (!cleaned) return null;
      const parsed = Number(cleaned);
      if (Number.isNaN(parsed)) return null;
      return dayjs.unix(parsed);
    }

    return null;
  };

  const toUnixSeconds = (value: unknown): number | undefined => {
    const timeValue = toDayjsTime(value);
    if (timeValue) return timeValue.unix();
    return typeof value === "number" ? value : undefined;
  };

  const handleAddDowntime = () => {
    // Logic untuk menambah downtime record
    setAddDowntimeModalVisible(true);
  };
  const handleSubmitDowntime = async (values: any) => {
    try {
      const [start, end] = values.timeframe;
      const startUnix = start.unix();
      const endUnix = end.unix();

      const payload = {
        key: "",
        tanggal: formatDateForAPI(selectedDate),
        start_time: startUnix,
        end_time: endUnix,
        cause: values.penyebab,
        category_name: values.category,
        product_type: filterKey,
      };
      await api.post("/npk/daily/downtime/record", payload, {
        params: {
          mode: "add",
        },
      });
      setAddDowntimeModalVisible(false);
      await fetchProductData();
    } catch (error) {
      console.error("Error submitting downtime record:", error);
    }
  };

  const handleEditDowntime = async (values: any) => {
    try {
      const [start, end] = values.timeframe;
      const startUnix = start.unix();
      const endUnix = end.unix();

      // Extract key from cell_ref_key by removing the last suffix (e.g., -st, -nsadk)
      let key = "";
      if (editDowntimeRecord?.cellBaseKey) {
        key = editDowntimeRecord.cellBaseKey;
      } else {
        key = deriveBaseKeyFromRecord(editDowntimeRecord) ?? "";
      }

      const payload = {
        key: key,
        tanggal: formatDateForAPI(selectedDate),
        start_time: startUnix,
        end_time: endUnix,
        cause: values.penyebab,
        category_name: values.category,
        product_type: filterKey,
      };
      const resp = await api.post("/npk/daily/downtime/record", payload, {
        params: {
          mode: "edit",
        },
      });
      console.log("Edit response:", resp.data);
      setEditDowntimeModalVisible(false);
      setEditDowntimeRecord(null);
      fetchProductData();
    } catch (error) {
      console.error("Error submitting downtime record:", error);
    }
  };

  const handleEditRecord = (record: any) => {
    console.log("Edit record:", record);

    const startItem = findRecordItem(
      record,
      ["-st", "-start", "-start_time"],
      ["start_time", "1"],
    );
    const endItem = findRecordItem(
      record,
      ["-et", "-end", "-end_time"],
      ["end_time", "2"],
    );
    const causeItem = findRecordItem(record, ["-cause"], ["cause", "4"]);
    const categoryItem = findRecordItem(
      record,
      ["-category"],
      ["category_name", "category", "5"],
    );

    const startTime = toDayjsTime(startItem?.value);
    const endTime = toDayjsTime(endItem?.value);
    const causeValue = causeItem?.value ?? record?.cause ?? record?.["4"];
    const categoryValue =
      categoryItem?.value ??
      record?.category_name ??
      record?.category ??
      record?.["5"];

    const baseKey =
      stripSuffixFromRefKey(startItem?.cellRefKey) ??
      stripSuffixFromRefKey(endItem?.cellRefKey) ??
      stripSuffixFromRefKey(causeItem?.cellRefKey) ??
      stripSuffixFromRefKey(categoryItem?.cellRefKey) ??
      deriveBaseKeyFromRecord(record) ??
      "";

    setEditDowntimeRecord({
      ...record,
      timeframe:
        startTime && endTime && startTime.isValid() && endTime.isValid()
          ? [startTime, endTime]
          : undefined,
      penyebab: causeValue ?? undefined,
      category: categoryValue ?? undefined,
      cellBaseKey: baseKey || undefined,
    });
    setEditDowntimeModalVisible(true);
  };

  const handleDeleteRecord = async (record: any) => {
    try {
      // Extract key from cell_ref_key by removing the last suffix (e.g., -st, -nsadk)
      const key = deriveBaseKeyFromRecord(record) ?? "";

      const startItem = findRecordItem(
        record,
        ["-st", "-start", "-start_time"],
        ["start_time", "1"],
      );
      const endItem = findRecordItem(
        record,
        ["-et", "-end", "-end_time"],
        ["end_time", "2"],
      );
      const causeItem = findRecordItem(record, ["-cause"], ["cause", "4"]);
      const categoryItem = findRecordItem(
        record,
        ["-category"],
        ["category_name", "category", "5"],
      );

      const startUnix = toUnixSeconds(startItem?.value);
      const endUnix = toUnixSeconds(endItem?.value);
      const causeValue = causeItem?.value ?? record?.cause ?? record?.["4"];
      const categoryValue =
        categoryItem?.value ??
        record?.category_name ??
        record?.category ??
        record?.["5"];

      const payload = {
        key: key,
        tanggal: formatDateForAPI(selectedDate),
        start_time: startUnix,
        end_time: endUnix,
        cause: causeValue,
        category_name: categoryValue,
        product_type: filterKey,
      };

      const resp = await api.post("/npk/daily/downtime/record", payload, {
        params: {
          mode: "delete",
        },
      });
      console.log("Delete response:", resp.data);
      fetchProductData();
    } catch (error) {
      console.error("Error deleting downtime record:", error);
    }
  };

  // Handler untuk Change Status
  const handleChangeStatus = async (status: "in_progress" | "done") => {
    try {
      setLoading(true);
      const dataType = getProductType(active);

      // Jika data_type adalah downtime, tidak ada endpoint change-status
      if (dataType === "downtime") {
        return;
      }

      await api.post("/npk/daily/production/change-status", null, {
        params: {
          tanggal: formatDateForAPI(selectedDate),
          data_type: dataType,
          status: status,
        },
      });
      // Refresh data untuk mendapatkan status terbaru
      fetchProductData();
    } catch (error: any) {
      console.error("Failed to change status:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mapping untuk product_type
  const getProductType = (tabKey: string) => {
    const mapping: Record<string, string> = {
      Pengapalan: "pengapalan",
      Trucking: "trucking",
      Penerimaan: "penerimaan",
      Downtime: "downtime",
    };
    return mapping[tabKey] || "fuse_1";
  };

  const handleresyncdata = async () => {
    try {
      setLoading(true);
      await api.post("/npk/daily/distribution/sync-data", null, {
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

  const fetchProductData = async () => {
    try {
      setLoading(true);

      // Format tanggal dengan benar
      const formattedDate = formatDateForAPI(selectedDate);
      if (active === "Downtime") {
        const res = await api.get("/npk/daily/downtime/get-by-args", {
          params: {
            tanggal: formattedDate,
            product_type: filterKey,
          },
        });
        const formattedData = formatNumbersInData(res.data);
        setDistributionData(formattedData);
      } else {
        const res = await api.get("/npk/daily/distribution/get-by-args", {
          params: {
            tanggal: formattedDate,
            data_type: getProductType(active),
          },
        });
        const formattedData = formatNumbersInData(res.data);
        setDistributionData(formattedData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      message.error("Failed to fetch distribution data");
      setDistributionData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchProductData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, active, filterKey]);

  const tabList = [
    { key: "Pengapalan", label: "Pengapalan" },
    { key: "Trucking", label: "Trucking" },
    { key: "Penerimaan", label: "Penerimaan" },
    { key: "Downtime", label: "Downtime" },
  ];

  const filter: { key: FilterKey; label: string }[] = [
    { key: "fuse_1", label: "Fuse 1" },
    { key: "fuse_2", label: "Fuse 2" },
    { key: "blending", label: "Blending" },
  ];

  // Map konten per filter
  return (
    <div className="w-full">
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
                Data Pengeluaran, Penerimaan, dan Downtime
              </span>
            ),
          },
        ]}
        className="customBreadcrumb separatorSpacing mb-4"
      />

      <div className="mt-7 mb-6">
        <DatePicker
          disabled
          value={selectedDate}
          format="dddd, DD MMMM YYYY"
          className="[&_.ant-picker-input>input]:font-semibold"
        />
        {/* Debug info - remove in production */}
        <div className="mt-1 text-12 text-neutral-500" />
      </div>

      {/* Tabs + Actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <Tabs
          activeKey={active}
          onChange={setActive}
          items={tabList}
          className="flex-1 min-w-[260px] text-20 [&_.ant-tabs-nav::before]:h-1 [&_.ant-tabs-nav::before]:bg-neutral-250 [&_.ant-tabs-tab]:text-center [&_.ant-tabs-tab]:items-center [&_.ant-tabs-tab]:justify-center [&_.ant-tabs-tab]:py-2 [&_.ant-tabs-tab]:px-4 [&_.ant-tabs-tab]:mx-1 [&_.ant-tabs-tab]:text-neutral-300 [&_.ant-tabs-tab]:font-semibold [&_.ant-tabs-tab-active]:rounded [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:text-black [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:font-semibold [&_.ant-tabs-ink-bar]:bg-orange-500 [&_.ant-tabs-ink-bar]:h-1"
        />

        <div className="flex items-center gap-2">
          <Button
            className="bg-primary-300 border-primary-300 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-100 hover:bg-primary-700 hover:border-primary-700 active:bg-neutral-900 active:border-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300"
            onClick={handleresyncdata}
            loading={loading}>
            Re-fetch Data
          </Button>
          <Button
            icon={<MdOutlineStickyNote2 />}
            className="h-11! w-11! p-0!"
          />
          <Button icon={<TfiDownload />} className="h-11! w-11! p-0!" />
        </div>
      </div>

      {/* Konten dinamis berdasarkan filter */}
      <div>
        {active === "Downtime" ? (
          <div>
            <div className="mt-3 mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {filter.map((f) => (
                  <Button
                    key={f.key}
                    onClick={() => setFilterKey(f.key)}
                    className={
                      "bg-primary-300 border-primary-300 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-100 hover:bg-primary-700 hover:border-primary-700 active:bg-neutral-900 active:border-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300" +
                      (filterKey === f.key
                        ? "bg-secondary-300! hover:bg-secondary-500! border-0!"
                        : "bg-neutral-250! hover:bg-neutral-200! text-neutral-900! border! border-neutral-300!")
                    }>
                    {f.label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-neutral-700">
                  (Last modified:{" "}
                  {DistributionData?.last_modified
                    ? new Date(
                        DistributionData.last_modified * 1000,
                      ).toLocaleString("id-ID")
                    : "N/A"}
                  )
                </span>
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
                    {DistributionData?.status === "done"
                      ? "Done"
                      : DistributionData?.status === "in_progress"
                        ? "In Progress"
                        : "Not Started"}
                    <MdArrowForwardIos className="ml-1 rotate-90" size={18} />
                  </Button>
                </Dropdown>
              </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <span>Data:</span>
                <strong>
                  {formatTanggalID(DistributionData?.tanggal || selectedDate)}
                </strong>
              </div>
              <Button
                className=" bg-primary-300 border-primary-300 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-100 hover:bg-primary-700 hover:border-primary-700 active:bg-neutral-900 active:border-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300"
                onClick={handleAddDowntime}>
                Add Downtime Record
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <span>Data:</span>
              <strong>
                {formatTanggalID(DistributionData?.tanggal || selectedDate)}
              </strong>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-neutral-700">
                (Last modified:{" "}
                {DistributionData?.last_modified
                  ? new Date(
                      DistributionData.last_modified * 1000,
                    ).toLocaleString("id-ID")
                  : "N/A"}
                )
              </span>
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
                  {DistributionData?.status === "done"
                    ? "Done"
                    : DistributionData?.status === "in_progress"
                      ? "In Progress"
                      : "Not Started"}
                  <MdArrowForwardIos className="ml-1 rotate-90" size={18} />
                </Button>
              </Dropdown>
            </div>
          </div>
        )}
        {!loading ? (
          <NPKTable
            data={DistributionData}
            isLastRowSticky={true}
            onEdit={handleEditRecord}
            onDelete={handleDeleteRecord}
          />
        ) : (
          <div>Loading...</div>
        )}
      </div>
      {/* Modals */}
      <DowntimeModal
        isVisible={addDowntimeModalVisible}
        onCancel={() => setAddDowntimeModalVisible(false)}
        onAdd={handleSubmitDowntime}
        // kirim ke modal
        isSubmitting={false}
        title="Add Downtime Record"
      />
      <DowntimeModal
        isVisible={EditDowntimeModalVisible}
        onCancel={() => setEditDowntimeModalVisible(false)}
        onAdd={handleEditDowntime}
        isSubmitting={false}
        title="Edit Downtime Record"
        initialValues={editDowntimeRecord}
      />
    </div>
  );
};

export default DataPengeluaran;

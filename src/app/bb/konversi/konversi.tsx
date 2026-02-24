"use client";
import { useState, useEffect } from "react";
import { Breadcrumb, Button, DatePicker, Dropdown, message } from "antd";
import { MdArrowForwardIos } from "react-icons/md";
import { TfiDownload } from "react-icons/tfi";
import { MdOutlineStickyNote2 } from "react-icons/md";
import { Tabs } from "antd";
import Link from "next/link";
import { useDateContext } from "@/context/DateContext";
import BBTable from "@/components/bb/BB-table";
import api from "@/utils/axios";
import KonversiAccordion from "@/components/bb/konversi/KonversiAccordion";
import DowntimeModal from "@/components/bb/konversi/DowntimeModal";
import BBRawmatUdfModal from "@/components/bb/BBRawmatUdfModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CellItem {
  start_column_key: string | number;
  value?: string | number | null;
  cell_ref_key?: string;
  cellRefKey?: string;
  title?: string;
  columnTitle?: string;
  header_title?: string;
  nms?: string;
  /** populated on _cellMeta entries */
  materialName?: string;
  unit?: string;
  num_cols?: number;
  num_rows?: number;
  bg_color?: string;
  items?: CellItem[];
}

interface TableRow {
  index?: number;
  items: CellItem[];
  details?: Record<string, unknown>;
  key?: string;
  id?: string;
  originalRow?: TableRow;
  _cellMeta?: Record<string, CellItem>;
  nms?: string;
  [key: string]: unknown;
}

interface HeaderLevel {
  level: number;
  items: CellItem[];
}

interface TableData {
  row: TableRow[];
  header: HeaderLevel[];
  column_keys: (string | number)[];
  table_name?: string;
  config_id?: string;
  data_id?: string;
  status?: string;
  last_modified?: number;
  [key: string]: unknown;
}

interface DowntimeParentData {
  config_id?: string;
  data_id?: string;
  status?: string;
  last_modified?: number;
  downtime?: TableData;
  /** root-level header may exist on some API responses */
  header?: HeaderLevel[];
}

interface DowntimeInitialValues {
  key?: string | null;
  cause?: string;
  category_name?: string;
  start_time?: number;
  end_time?: number;
  factory?: string;
}

interface DowntimeFormValues {
  timeframe: [{ unix(): number }, { unix(): number }];
  cause: string;
  category: string;
  factory: string;
}

type SelectedCell = {
  value: number | null;
  location: string;
  udfId: string | null;
  unit: string;
  materialName: string;
  columnTitle: string;
  nms: string;
  configId: string;
  cellKey: string;
  dataId: string;
  types: string;
  downtimeKey?: string;
  downtimeType?: string;
};

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const err = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return err?.response?.data?.message || err?.message || fallback;
};

// ─────────────────────────────────────────────────────────────────────────────

const formatTanggalID = (iso: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const Konversi = () => {
  const { selectedDate } = useDateContext();
  const [active, setActive] = useState("Normal");
  const [normalData, setNormalData] = useState<TableData | null>(null);
  const [downtimeData, setDowntimeData] = useState<DowntimeParentData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isUDFModalOpen, setIsUDFModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  const extractMaterialInfo = (
    items: CellItem[],
    metaFromRow: CellItem | undefined,
    record: TableRow,
  ) => {
    const sortedItems = [...items].sort(
      (a, b) =>
        parseInt(String(a.start_column_key)) -
        parseInt(String(b.start_column_key)),
    );

    const materialNameItem = sortedItems.find(
      (it) => String(it?.start_column_key) === "1",
    );

    const materialName =
      metaFromRow?.materialName ||
      materialNameItem?.value ||
      record["1"] ||
      record["0"] ||
      "Unknown Item";

    const materialIndex = materialNameItem
      ? sortedItems.indexOf(materialNameItem)
      : -1;
    const unitItem =
      materialIndex !== -1 && materialIndex + 1 < sortedItems.length
        ? sortedItems[materialIndex + 1]
        : null;

    const unit = String(metaFromRow?.unit || unitItem?.value || "");

    return { materialName, unit };
  };

  const deriveDowntimeKeyFromRecord = (record: TableRow): string | null => {
    const row: TableRow = (record?.originalRow ?? record) as TableRow;
    const items = row?.items as CellItem[] | undefined;
    if (!Array.isArray(items) || items.length === 0) return null;

    const firstWithRef = items.find(
      (it) => typeof it?.cell_ref_key === "string" && it.cell_ref_key,
    );
    const refKey: string | undefined = firstWithRef?.cell_ref_key;
    if (!refKey) return null;

    // Example: "gliding_echo_Mv1K_393317-start_time" -> "gliding_echo_Mv1K_393317"
    const parts = refKey.split("-");
    if (parts.length <= 1) return refKey;
    return parts.slice(0, -1).join("-");
  };

  const fetchNormalData = async (tanggal: string) => {
    try {
      setLoading(true);
      const resp = await api.get(
        "/bb/daily/coal_conversion/normal/get-by-args",
        {
          params: { tanggal },
        },
      );
      setNormalData(resp.data);
    } catch (error: unknown) {
      console.error("Error fetching normal data:", error);
      message.error(getApiErrorMessage(error, "Failed to fetch Normal data"));
    } finally {
      setLoading(false);
    }
  };

  const fetchDowntimeData = async (tanggal: string) => {
    try {
      setLoading(true);
      const resp = await api.get(
        "/bb/daily/coal_conversion/downtime/get-by-args",
        {
          params: { tanggal },
        },
      );
      setDowntimeData(resp.data);
    } catch (error: unknown) {
      console.error("Error fetching downtime data:", error);
      message.error(getApiErrorMessage(error, "Failed to fetch Downtime data"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDate) return;
    const tanggal = selectedDate.format("YYYY-MM-DD");

    if (active === "Normal") {
      fetchNormalData(tanggal);
    } else if (active === "Downtime") {
      fetchDowntimeData(tanggal);
    }
  }, [active, selectedDate]);

  const tabList = [
    { key: "Normal", label: "Normal" },
    { key: "Downtime", label: "Downtime" },
    { key: "Output-summary", label: "Output Summary" },
  ];

  const transformDowntimeData = (data: TableData): TableData | null => {
    if (!data) return null;

    const newData: TableData = JSON.parse(JSON.stringify(data));

    const hasActions = newData.header.some((h) =>
      h.items.some(
        (item) =>
          item.title === "Actions" || item.start_column_key === "actions",
      ),
    );

    if (!hasActions) {
      const maxLevel = Math.max(...newData.header.map((h) => h.level));
      const level1 = newData.header.find((h) => h.level === 1);
      if (level1) {
        level1.items.push({
          start_column_key: "actions",
          title: "Actions",
          num_cols: 1,
          num_rows: maxLevel,
          bg_color: "#f0f0f0",
        });
      }

      if (Array.isArray(newData.row)) {
        newData.row.forEach((row) => {
          row.items.push({
            start_column_key: "actions",
            value: "[[EDIT]]",
          });
        });
        (newData.column_keys as (string | number)[]).push("actions");
      }
    }

    return newData;
  };

  const getInitialValuesFromRecord = (
    record: TableRow,
  ): DowntimeInitialValues => {
    if (!downtimeData?.header && !downtimeData?.downtime?.header) return {};

    const keyTitleMap: Record<string, string> = {};
    const traverse = (items: CellItem[]) => {
      items.forEach((item) => {
        if (item.num_cols === undefined || item.num_cols <= 1) {
          keyTitleMap[String(item.start_column_key)] =
            item.title || item.header_title || "";
        }
        if (item.items) traverse(item.items);
      });
    };
    const headers = downtimeData.header ?? downtimeData.downtime?.header ?? [];
    headers.forEach((h) => traverse(h.items));

    const values: DowntimeInitialValues = {};
    Object.keys(record).forEach((k) => {
      const title = keyTitleMap[k];
      if (!title) return;
      const val = String(record[k] ?? "");

      if (
        title.toLowerCase().includes("cause") ||
        title.toLowerCase().includes("penyebab")
      )
        values.cause = val;
      if (
        title.toLowerCase().includes("category") ||
        title.toLowerCase().includes("kategori")
      )
        values.category_name = val;
      if (title.toLowerCase().includes("start")) {
        if (val && selectedDate) {
          const [hh, mm] = String(val).split(":");
          values.start_time = selectedDate
            .hour(parseInt(hh))
            .minute(parseInt(mm))
            .second(0)
            .unix();
        }
      }
      if (
        title.toLowerCase().includes("end") ||
        title.toLowerCase().includes("selesai")
      ) {
        if (val && selectedDate) {
          const [hh, mm] = String(val).split(":");
          values.end_time = selectedDate
            .hour(parseInt(hh))
            .minute(parseInt(mm))
            .second(0)
            .unix();
        }
      }

      if (
        title.toLowerCase().includes("unit") ||
        title.toLowerCase().includes("pabrik") ||
        title.toLowerCase().includes("factory")
      ) {
        const v = String(val ?? "")
          .toLowerCase()
          .replace(/\s/g, "_");
        if (v) values.factory = v;
      }
    });

    // Extract record key
    values.key =
      deriveDowntimeKeyFromRecord(record) ??
      (record.originalRow as TableRow | undefined)?.key ??
      (record.originalRow as TableRow | undefined)?.id ??
      record.key;

    return values;
  };

  const [initialValues, setInitialValues] =
    useState<DowntimeInitialValues | null>(null);

  const handleCreate = () => {
    setModalMode("add");
    setInitialValues(null);
    setIsModalVisible(true);
  };

  const handleSaveDowntime = async (values: DowntimeFormValues) => {
    try {
      setIsSubmitting(true);
      const tanggal = selectedDate.format("YYYY-MM-DD");

      const payload = {
        mode: modalMode,
        key: modalMode === "edit" ? initialValues?.key : null,
        tanggal,
        start_time: values.timeframe[0].unix(),
        end_time: values.timeframe[1].unix(),
        cause: values.cause,
        category_name: values.category,
        factory: values.factory,
      };

      await api.post("/bb/daily/coal_conversion/downtime/edit", payload);

      message.success(
        `Successfully ${modalMode === "add" ? "added" : "updated"} downtime record`,
      );
      setIsModalVisible(false);
      fetchDowntimeData(tanggal);
    } catch (error: unknown) {
      console.error("Error saving downtime:", error);
      message.error(getApiErrorMessage(error, "Failed to save downtime"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentData =
    active === "Normal"
      ? normalData
      : active === "Downtime"
        ? downtimeData
        : null;

  const handleUpdateUDF = async () => {
    const tanggal = selectedDate.format("YYYY-MM-DD");
    if (active === "Normal") {
      fetchNormalData(tanggal);
    } else if (active === "Downtime") {
      fetchDowntimeData(tanggal);
    }
  };

  const handleBindUdf = async (udfId: string) => {
    if (!selectedCell) return;
    try {
      if (selectedCell.downtimeKey) {
        // Downtime Details Bind
        await api.post("/bb/daily/coal_conversion/downtime/edit-details", {
          config_id: selectedCell.configId,
          data_id: selectedCell.dataId,
          udf_id: udfId,
          downtime_type: selectedCell.downtimeType,
          types: selectedCell.types,
          cell_ref_key: selectedCell.cellKey,
          key: selectedCell.downtimeKey,
        });
      } else {
        // Normal Data Bind
        await api.post("/bb/daily/coal_conversion/normal/edit", {
          config_id: selectedCell.configId,
          data_id: selectedCell.dataId,
          udf_id: udfId,
          types: selectedCell.types,
          cell_ref_key: selectedCell.cellKey,
        });
      }

      message.success("Success bind UDF");
      setIsUDFModalOpen(false);
      handleUpdateUDF();
    } catch (error: unknown) {
      console.error("Error binding UDF:", error);
      message.error(
        `Failed to bind UDF: ${getApiErrorMessage(error, "Unknown error")}`,
      );
      throw error;
    }
  };

  const handleDowntimeDetailClick = async (
    parentRecord: TableRow,
    downtimeType: string,
    subRecord: TableRow,
    dataIndex: string,
    columnKey: string,
    types?: string,
  ) => {
    if (!parentRecord || !downtimeData) return;

    // Normalize types to snake_case
    // e.g. "Energy Compositions" -> "energy_compositions"
    const normalizedTypes = types
      ? types.toLowerCase().trim().replace(/\s+/g, "_")
      : "";

    try {
      const items: CellItem[] =
        (subRecord?.originalRow as TableRow | undefined)?.items || [];
      const metaFromRow = subRecord?._cellMeta?.[String(dataIndex)] as
        | CellItem
        | undefined;

      const { materialName, unit } = extractMaterialInfo(
        items,
        metaFromRow,
        subRecord,
      );

      const tanggal = selectedDate?.format("YYYY-MM-DD") || "";
      const payload = {
        udf: {
          name: `udf Downtime-${downtimeType}-${normalizedTypes}-${tanggal}`,
          code: "# Start coding your UDF here",
        },
        inputs: [],
      };

      const response = await api.post("/udf", payload);
      const newUdfData = response.data;

      if (!newUdfData || !newUdfData.udf) {
        message.error("Failed to create UDF");
        return;
      }

      const matchedItem: CellItem | undefined =
        metaFromRow ??
        items.find((it) => String(it?.start_column_key) === String(dataIndex));

      const cellRefKey =
        matchedItem?.cellRefKey ??
        matchedItem?.cell_ref_key ??
        columnKey ??
        String(dataIndex);

      const columnTitle =
        matchedItem?.columnTitle ?? matchedItem?.title ?? dataIndex;

      const downtimeKey =
        deriveDowntimeKeyFromRecord(parentRecord) ??
        parentRecord.originalRow?.key ??
        parentRecord.originalRow?.id ??
        parentRecord.key;

      if (!downtimeKey) {
        message.error(
          "Gagal menentukan downtime key dari data (cell_ref_key kosong).",
        );
        return;
      }

      setSelectedCell({
        value: null,
        location: `${materialName}-${columnTitle}`,
        udfId: newUdfData.udf._id,
        unit: unit,
        materialName: String(materialName),
        columnTitle: String(columnTitle),
        nms: String(subRecord.nms ?? matchedItem?.nms ?? ""),
        configId: String(downtimeData.config_id ?? ""),
        cellKey: String(cellRefKey),
        dataId: String(downtimeData.data_id ?? ""),
        types: normalizedTypes,
        downtimeKey,
        downtimeType: downtimeType,
      });

      setIsUDFModalOpen(true);
    } catch (error: unknown) {
      console.error("Error in handleDowntimeDetailClick:", error);
      message.error(`Failed: ${getApiErrorMessage(error, "Unknown error")}`);
    }
  };

  const handleNullCellClick = async (
    record: TableRow,
    dataIndex: string,
    columnKey: string,
    types?: string,
  ) => {
    if (!record || !normalData) return;

    try {
      const items: CellItem[] =
        (record?.originalRow as TableRow | undefined)?.items || [];
      const metaFromRow = record?._cellMeta?.[String(dataIndex)] as
        | CellItem
        | undefined;

      const { materialName, unit } = extractMaterialInfo(
        items,
        metaFromRow,
        record,
      );

      const tanggal = selectedDate?.format("YYYY-MM-DD") || "";

      const payload = {
        udf: {
          name: `udf Normal-${types}-${tanggal}`,
          code: "# Start coding your UDF here",
        },
        inputs: [],
      };

      const response = await api.post("/udf", payload);
      const newUdfData = response.data;

      if (!newUdfData || !newUdfData.udf) {
        message.error("Failed to create UDF: Invalid response");
        return;
      }

      const matchedItem: CellItem | undefined =
        metaFromRow ??
        items.find((it) => String(it?.start_column_key) === String(dataIndex));

      const cellRefKey =
        matchedItem?.cellRefKey ??
        matchedItem?.cell_ref_key ??
        columnKey ??
        String(dataIndex);

      const columnTitle =
        matchedItem?.columnTitle ?? matchedItem?.title ?? dataIndex;

      setSelectedCell({
        value: null,
        location: `${materialName}-${columnTitle}`,
        udfId: newUdfData.udf._id,
        unit: unit,
        materialName: String(materialName),
        columnTitle: String(columnTitle),
        nms: String(record.nms ?? matchedItem?.nms ?? ""),
        configId: String(normalData.config_id ?? ""),
        cellKey: String(cellRefKey),
        dataId: String(normalData.data_id ?? ""),
        types: types ?? "",
      });

      setIsUDFModalOpen(true);
      message.success("UDF created successfully. Opening editor...");
    } catch (error: unknown) {
      console.error("Error in handleNullCellClick:", error);
      message.error(
        `Failed to create UDF: ${getApiErrorMessage(error, "Unknown error")}`,
      );
    }
  };

  const expandedRowRender = (record: TableRow) => {
    const details = (record?.details ??
      (record?.originalRow as TableRow | undefined)?.details) as
      | Record<string, unknown>
      | undefined;
    if (!details) return null;

    const flattenDetails = (
      obj: unknown,
      prefix = "",
    ): Record<string, TableData> => {
      const flattened: Record<string, TableData> = {};
      if (!obj || typeof obj !== "object") return flattened;

      const o = obj as Record<string, unknown>;

      if (
        (o as { row?: unknown; header?: unknown }).row &&
        (o as { row?: unknown; header?: unknown }).header
      ) {
        return prefix ? { [prefix]: obj as TableData } : flattened;
      }

      Object.keys(o).forEach((key) => {
        const val = o[key];
        const cleanKey =
          key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
        const nextKey = prefix ? `${prefix} - ${cleanKey}` : cleanKey;

        if (val && typeof val === "object") {
          const v = val as { row?: unknown; header?: unknown };
          if (v.row && v.header) {
            flattened[nextKey] = val as TableData;
          } else {
            Object.assign(flattened, flattenDetails(val, nextKey));
          }
        }
      });
      return flattened;
    };

    const sectionOrder = ["shutdown", "startup"];
    const allKeys = Object.keys(details);
    const sortedKeys = allKeys.sort((a, b) => {
      const idxA = sectionOrder.indexOf(a.toLowerCase());
      const idxB = sectionOrder.indexOf(b.toLowerCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return (
      <div className="my-4">
        {sortedKeys.map((key) => {
          const sectionData = details[key];
          // Skip if empty or not object
          if (!sectionData || typeof sectionData !== "object") return null;

          // Flatten this section's data
          const flatData = flattenDetails(sectionData);

          // Skip if no tables found in this section
          if (Object.keys(flatData).length === 0) return null;

          const title =
            key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");

          const onDetailNullCellClick = (
            subRecord: TableRow,
            dataIndex: string,
            columnKey: string,
            types?: string,
          ) => {
            handleDowntimeDetailClick(
              record,
              key,
              subRecord,
              dataIndex,
              columnKey,
              types,
            );
          };

          return (
            <div key={key} className="mb-6">
              <div className="font-semibold text-base mb-2 text-[#262626]">
                {title}
              </div>
              <KonversiAccordion
                data={flatData}
                onNullCellClick={onDetailNullCellClick}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <Breadcrumb
        separator={<MdArrowForwardIos size={16} />}
        items={[
          {
            title: (
              <Link
                href="/bb"
                className="text-neutral-300 hover:text-neutral-900 transition-colors">
                <span className="text-2xl font-semibold">Boiler Batubara</span>
              </Link>
            ),
          },
          {
            title: (
              <span className="text-neutral-900 text-2xl font-semibold">
                Konversi Batubara dan Produksi Steam
              </span>
            ),
          },
        ]}
        className="[&_.ant-breadcrumb-separator]:mx-1.5 [&_.ant-breadcrumb-separator]:flex [&_.ant-breadcrumb-separator]:items-center"
      />

      <div className="flex justify-between items-center mb-[18px] mt-7">
        <div>
          <DatePicker
            disabled
            value={selectedDate}
            format="dddd, DD MMMM YYYY"
            className="[&_.ant-picker-input>input]:font-semibold"
          />
        </div>
      </div>
      {/* Tabs + Actions */}
      <div className="flex justify-between items-center gap-4">
        <Tabs
          activeKey={active}
          onChange={setActive}
          items={tabList}
          className="customTabs"
        />

        <div className="flex gap-2 mb-6">
          <Button icon={<MdOutlineStickyNote2 />} className="btn-lg mt-4" />
          <Button icon={<TfiDownload />} className="btn-lg mt-4" />
        </div>
      </div>

      {active !== "Output-summary" && (
        <div>
          <span>Data : </span>
          <strong>
            {formatTanggalID(
              selectedDate ? selectedDate.format("YYYY-MM-DD") : "",
            )}
          </strong>
          <span className="float-right">
            (Last modified:{" "}
            {currentData?.last_modified
              ? new Date(currentData.last_modified * 1000).toLocaleString(
                  "id-ID",
                )
              : "N/A"}
            )
          </span>
        </div>
      )}

      {active == "Normal" && (
        <>
          <div className="flex justify-between mt-4 items-center">
            <div className="flex items-center gap-3">
              <span className="font-semibold">
                Config:{" "}
                <span className="px-3 py-1 bg-[#e6e6e6] rounded text-[16.8px] font-normal">
                  {currentData?.config_id || "N/A"}
                </span>
              </span>
              <Button type="primary" className={"customPrimaryButton btn-md"}>
                Load Config
              </Button>
              <Button
                type="primary"
                className={"customPrimaryButton btn-md"}
                disabled={!currentData?.config_id}>
                Save
              </Button>
            </div>
            <div>
              <span> Status Produksi: </span>
              <Dropdown
                menu={{
                  items: [
                    { key: "in-progress", label: "In progress" },
                    { key: "done", label: "Done" },
                  ],
                }}>
                <Button type="default" className="btn-md">
                  {currentData?.status === "in_progress"
                    ? "In progress"
                    : currentData?.status === "done"
                      ? "Done"
                      : "Not started"}
                  <MdArrowForwardIos size={18} className="rotate-90 ml-1" />
                </Button>
              </Dropdown>
            </div>
          </div>

          <div className="mt-6">
            {loading ? (
              <div>Loading...</div>
            ) : (
              <KonversiAccordion
                data={normalData || {}}
                onNullCellClick={handleNullCellClick}
              />
            )}
          </div>
        </>
      )}
      {active == "Downtime" && (
        <>
          <div className="flex justify-between items-center mb-4 mt-4">
            <div />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Status Input General: </span>
                <Dropdown
                  menu={{
                    items: [
                      { key: "in-progress", label: "In progress" },
                      { key: "done", label: "Done" },
                    ],
                  }}>
                  <Button type="default" className="btn-md">
                    {currentData?.status === "in_progress"
                      ? "In progress"
                      : currentData?.status === "done"
                        ? "Done"
                        : "Not started"}
                    <MdArrowForwardIos size={18} className="rotate-90 ml-1" />
                  </Button>
                </Dropdown>
              </div>
              <Button
                type="primary"
                className={"customPrimaryButton btn-md"}
                onClick={handleCreate}>
                + Add Downtime
              </Button>
            </div>
          </div>

          <div className="mt-6">
            {loading ? (
              <div>Loading...</div>
            ) : downtimeData && downtimeData.downtime ? (
              <>
                <BBTable
                  data={transformDowntimeData(downtimeData.downtime)}
                  expandedRowRender={expandedRowRender}
                  showAddButtonForNull={true}
                  onEdit={(record) => {
                    const initVals = getInitialValuesFromRecord(record);
                    setInitialValues(initVals);
                    setModalMode("edit");
                    setIsModalVisible(true);
                  }}
                />

                <DowntimeModal
                  isVisible={isModalVisible}
                  onCancel={() => setIsModalVisible(false)}
                  onAdd={handleSaveDowntime}
                  isSubmitting={isSubmitting}
                  title={modalMode === "add" ? "Add Downtime" : "Edit Downtime"}
                  initialValues={initialValues}
                />
              </>
            ) : (
              <div className="text-center p-6 text-[#888]">No Data</div>
            )}
          </div>
        </>
      )}
      {active == "Output-summary" && (
        <div className="flex justify-between items-center mb-4">
          <div>
            <span>Data: </span>
            <strong>
              {formatTanggalID(
                selectedDate ? selectedDate.format("YYYY-MM-DD") : "",
              )}
            </strong>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#8c8c8c]">
              (Last modified:{" "}
              {currentData?.last_modified
                ? new Date(currentData.last_modified * 1000).toLocaleString(
                    "id-ID",
                  )
                : "N/A"}
              )
            </span>
            <div className="flex items-center gap-2">
              <span>Status Input General: </span>
              <Dropdown
                menu={{
                  items: [
                    { key: "in-progress", label: "In progress" },
                    { key: "done", label: "Done" },
                  ],
                }}>
                <Button type="default" className="btn-md">
                  In progress
                  <MdArrowForwardIos size={18} className="rotate-90 ml-1" />
                </Button>
              </Dropdown>
            </div>
          </div>
        </div>
      )}
      {/* UDF Modal for Normal Data */}
      <BBRawmatUdfModal
        open={isUDFModalOpen}
        onCancel={() => {
          setIsUDFModalOpen(false);
          setSelectedCell(null);
        }}
        materialName={selectedCell?.materialName || ""}
        columnTitle={selectedCell?.columnTitle}
        unit={selectedCell?.unit}
        udfId={selectedCell?.udfId}
        cellValue={selectedCell?.value}
        onUpdateUDF={handleUpdateUDF}
        onBindUdf={handleBindUdf}
        cellLocation={selectedCell?.location}
        nms={selectedCell?.nms}
        configId={selectedCell?.configId}
        cellKey={selectedCell?.cellKey}
        dataId={selectedCell?.dataId}
        types={selectedCell?.types}
      />
    </div>
  );
};

export default Konversi;

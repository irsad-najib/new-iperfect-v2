"use client";
import { useState, useEffect } from "react";
import { Breadcrumb, Button, DatePicker, Dropdown, message } from "antd";
import { MdArrowForwardIos } from "react-icons/md";
import { TfiDownload } from "react-icons/tfi";
import { MdOutlineStickyNote2 } from "react-icons/md";
import { Tabs } from "antd";
import Link from "next/link";
import { useDateContext } from "@/context/DateContext";
import RawmatAccordion from "@/components/bb/rawmat/RawmatAccordion";
import axiosInstance from "@/utils/axios";
import BBRawmatUdfModal from "@/components/bb/BBRawmatUdfModal";

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

const Rawmat = () => {
  const { selectedDate } = useDateContext();
  const [active, setActive] = useState("Input-general");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [generalData, setGeneralData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bb1Data, setBb1Data] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bb2Data, setBb2Data] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchGeneralData = async (tanggal: string) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        "/bb/daily/rawmat/data/get-by-args",
        {
          params: {
            tanggal,
            bb_id: "general",
          },
        },
      );
      setGeneralData(response.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      message.error(
        error.response?.data?.message || "Failed to fetch General data",
      );
      console.error("Error fetching General data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBB1Data = async (tanggal: string) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        "/bb/daily/rawmat/data/get-by-args",
        {
          params: {
            tanggal,
            bb_id: "1",
          },
        },
      );
      setBb1Data(response.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      message.error(
        error.response?.data?.message || "Failed to fetch BB-1 data",
      );
      console.error("Error fetching BB-1 data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBB2Data = async (tanggal: string) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        "/bb/daily/rawmat/data/get-by-args",
        {
          params: {
            tanggal,
            bb_id: "2",
          },
        },
      );
      setBb2Data(response.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      message.error(
        error.response?.data?.message || "Failed to fetch BB-2 data",
      );
      console.error("Error fetching BB-2 data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDate) return;

    const tanggal = selectedDate.format("YYYY-MM-DD");

    if (active === "Input-general") {
      fetchGeneralData(tanggal);
    } else if (active === "rawmat-bb-1") {
      fetchBB1Data(tanggal);
    } else if (active === "rawmat-bb-2") {
      fetchBB2Data(tanggal);
    }
  }, [selectedDate, active]);

  const tabList = [
    { key: "Input-general", label: "Input General" },
    { key: "rawmat-bb-1", label: "rawmat BB 1" },
    { key: "rawmat-bb-2", label: "rawmat BB 2" },
    { key: "Output-summary", label: "Output Summary" },
  ];

  const [isUDFModalOpen, setIsUDFModalOpen] = useState(false);
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
    dataId: string;
    types: string;
  } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const findColumnTitle = (dataIndex: string, tableData: any): string => {
    if (!tableData?.header) return dataIndex;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headerItems = tableData.header.flatMap((h: any) => h.items || []);
    const columnInfo = findColumnInHeader(headerItems);
    return columnInfo?.title || dataIndex;
  };

  const openUdfEditor = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: any,
    dataIndex: string,
    columnKey?: string,
    types?: string,
  ) => {
    if (!record) return;

    const currentData = getCurrentData();
    const metaFromRow = record?._cellMeta?.[String(dataIndex)];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = record?.originalRow?.items || [];
    const matchedItem =
      metaFromRow ||
      items.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (it: any) => String(it?.start_column_key) === String(dataIndex),
      );

    if (!matchedItem) return;

    const rowIndex = record["0"] || record.rowIndex || "";
    const columnTitle =
      matchedItem.columnTitle ||
      findColumnTitle(String(dataIndex), currentData);

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

    // Extract material name from column key "1" in row items
    const materialNameItem = items.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (it: any) => String(it?.start_column_key) === "1",
    );
    const materialName =
      materialNameItem?.value || rowIndex || "Unknown Material";

    // Extract unit from column key "3" in row items
    const unitItem = items.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (it: any) => String(it?.start_column_key) === "3",
    );
    const unit = unitItem?.value || "";

    setSelectedCell({
      value: Number.isNaN(numericValue) ? null : numericValue,
      location: `${rowIndex}-${columnTitle}`,
      udfId: matchedItem.udfId || matchedItem.udf_id || null,
      unit: unit,
      materialName: materialName,
      columnTitle: columnTitle,
      nms: record.nms || matchedItem.nms || "",
      configId: currentData?.config_id || "",
      cellKey: String(cellKey),
      dataId: currentData?.data_id || "",
      types: types || "",
    });

    setIsUDFModalOpen(true);
  };

  const handleCellClick = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: any,
    dataIndex: string,
    columnKey: string,
    types?: string,
  ) => {
    openUdfEditor(record, dataIndex, columnKey, types);
  };

  const handleNullCellClick = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: any,
    dataIndex: string,
    columnKey: string,
    types?: string,
  ) => {
    openUdfEditor(record, dataIndex, columnKey, types);
  };

  const handleUDFModalClose = () => {
    setIsUDFModalOpen(false);
    setSelectedCell(null);
  };

  const handleUpdateUDF = async () => {
    // Refresh data after UDF is updated
    const tanggal = selectedDate?.format("YYYY-MM-DD");
    if (!tanggal) return;

    if (active === "Input-general") {
      await fetchGeneralData(tanggal);
    } else if (active === "rawmat-bb-1") {
      await fetchBB1Data(tanggal);
    } else if (active === "rawmat-bb-2") {
      await fetchBB2Data(tanggal);
    }
  };

  const getCurrentData = () => {
    if (active === "Input-general") return generalData;
    if (active === "rawmat-bb-1") return bb1Data;
    if (active === "rawmat-bb-2") return bb2Data;
    return null;
  };

  const currentData = getCurrentData();

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
                rawmat Batubara dan Produksi Steam
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

      <div className="flex justify-between items-center gap-4">
        <Tabs
          activeKey={active}
          onChange={setActive}
          items={tabList}
          className="text-20 [&_.ant-tabs-nav::before]:h-1 [&_.ant-tabs-nav::before]:bg-neutral-250 [&_.ant-tabs-tab]:text-center [&_.ant-tabs-tab]:items-center [&_.ant-tabs-tab]:justify-center [&_.ant-tabs-tab]:py-2 [&_.ant-tabs-tab]:px-4 [&_.ant-tabs-tab]:mx-1 [&_.ant-tabs-tab]:text-neutral-300 [&_.ant-tabs-tab]:font-semibold [&_.ant-tabs-tab-active]:rounded [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:text-black [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:font-semibold [&_.ant-tabs-ink-bar]:bg-orange-500 [&_.ant-tabs-ink-bar]:h-1"
        />

        <div className="flex gap-2 mb-6">
          <Button icon={<MdOutlineStickyNote2 />} className="btn-lg mt-4" />
          <Button icon={<TfiDownload />} className="btn-lg mt-4" />
        </div>
      </div>

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
            ? new Date(currentData.last_modified * 1000).toLocaleString("id-ID")
            : "N/A"}
          )
        </span>
      </div>

      {active !== "Output-summary" && (
        <div className="flex justify-between mt-4 items-center">
          <div className="flex items-center gap-3">
            <span className="font-semibold">
              Config UDF:{" "}
              <span className="px-3 py-1 bg-[#e6e6e6] rounded text-[16.8px] font-normal">
                {currentData?.config_id
                  ? active === "Input-general"
                    ? "default_udf_BB_general"
                    : `default_udf_BB_${active === "rawmat-bb-1" ? "1" : "2"}`
                  : "N/A"}
              </span>
            </span>
            <Button type="primary" className={"customPrimaryButton btn-md"}>
              Load config
            </Button>
            <Button
              type="primary"
              className={"customPrimaryButton btn-md"}
              disabled={!currentData?.config_id}>
              Save
            </Button>
          </div>
          <div>
            <span> Status Input General: </span>
            <Dropdown
              menu={{
                items: [
                  { key: "in_progress", label: "In progress" },
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
      )}

      {(active === "Input-general" ||
        active === "rawmat-bb-1" ||
        active === "rawmat-bb-2") && (
        <div className="mt-6">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : currentData ? (
            <RawmatAccordion
              data={currentData}
              onCellClick={handleCellClick}
              onNullCellClick={handleNullCellClick}
            />
          ) : (
            <div className="text-center py-12 text-[#8c8c8c]">
              No data available for selected date
            </div>
          )}
        </div>
      )}

      {/* UDF Modal */}
      <BBRawmatUdfModal
        open={isUDFModalOpen}
        onCancel={handleUDFModalClose}
        materialName={selectedCell?.materialName || ""}
        columnTitle={selectedCell?.columnTitle}
        unit={selectedCell?.unit}
        udfId={selectedCell?.udfId}
        cellValue={selectedCell?.value}
        onUpdateUDF={handleUpdateUDF}
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

export default Rawmat;

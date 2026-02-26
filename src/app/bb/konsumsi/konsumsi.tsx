"use client";
import React, { useState } from "react";
import { Breadcrumb, Button, DatePicker, Dropdown, message } from "antd";
import { MdArrowForwardIos } from "react-icons/md";
import { TfiDownload } from "react-icons/tfi";
import { MdOutlineStickyNote2 } from "react-icons/md";
import { Tabs } from "antd";
import Link from "next/link";
import { useDateContext } from "@/context/DateContext";
import BBTable from "@/components/bb/BB-table";
import api from "@/utils/axios";
import BBRawmatUdfModal from "@/components/bb/BBRawmatUdfModal";

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

const Konsumsi = () => {
  const { selectedDate } = useDateContext();
  const [active, setActive] = useState("Produksi-steam");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [productionData, setProductionData] = useState<any>({});
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

  const fetchProductionData = React.useCallback(async () => {
    try {
      const resp = await api.get("/bb/daily/production/get-by-args", {
        params: {
          tanggal: selectedDate?.format("YYYY-MM-DD"),
        },
      });
      setProductionData(resp.data);
    } catch (error) {
      console.error("Error fetching production data:", error);
    }
  }, [selectedDate]);

  React.useEffect(() => {
    if (active === "Produksi-steam" && selectedDate) {
      fetchProductionData();
    }
  }, [active, selectedDate, fetchProductionData]);

  const KonsumsiData = {
    last_modified: 1697049600, // Contoh timestamp
  };

  const tabList = [
    { key: "Produksi-steam", label: "Produksi dan Distribusi Steam" },
    { key: "Konsumsi-bb-1", label: "Konsumsi BB 1" },
    { key: "Konsumsi-bb-2", label: "Konsumsi BB 2" },
  ];

  const openUdfEditor = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: any,
    dataIndex: string,
    columnKey?: string,
    types?: string,
  ) => {
    if (!record) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = record?.originalRow?.items || [];
    const metaFromRow = record?._cellMeta?.[String(dataIndex)];
    const matchedItem =
      metaFromRow ||
      items.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (it: any) => String(it?.start_column_key) === String(dataIndex),
      );

    if (!matchedItem) return;

    const rowIndex = record["0"] || record.rowIndex || "";
    const columnTitle =
      matchedItem.columnTitle || matchedItem?.title || dataIndex;

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
      configId: "",
      cellKey: String(cellKey),
      dataId: "",
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

  const handleUpdateUDF = async () => {
    // Refresh data after UDF is updated
    fetchProductionData();
  };

  const handleBindUdf = async (udfId: string) => {
    if (!selectedCell) return;
    try {
      await api.post("/bb/daily/production/data/edit", {
        tanggal: selectedDate?.format("YYYY-MM-DD"),
        types: selectedCell.types,
        cell_ref_key: selectedCell.cellKey,
        udf_id: udfId,
      });
      message.success("Success bind UDF");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error binding UDF:", error);
      message.error(
        `Failed to bind UDF: ${error.response?.data?.message || error.message}`,
      );
      throw error; // Re-throw to let the modal know it failed
    }
  };

  const handleNullCellClick = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: any,
    dataIndex: string,
    columnKey: string,
    types: string,
  ) => {
    if (!record) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = record?.originalRow?.items || [];
      const metaFromRow = record?._cellMeta?.[String(dataIndex)];

      // Extract material name from column key "1" in row items or fallback
      const materialNameItem = items.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (it: any) => String(it?.start_column_key) === "1",
      );
      const materialName =
        metaFromRow?.materialName ||
        materialNameItem?.value ||
        record["0"] ||
        "Unknown Material";

      // Extract unit from column key "3" in row items or fallback
      const unitItem = items.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (it: any) => String(it?.start_column_key) === "3",
      );
      const unit = metaFromRow?.unit || unitItem?.value || "";

      const tanggal = selectedDate?.format("YYYY-MM-DD") || "";

      // Auto create UDF
      console.log("Creating new UDF for", materialName);
      const payload = {
        udf: {
          name: `udf-konsumsi-${materialName}-${tanggal}`,
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

      // Prepare props for modal
      const matchedItem =
        metaFromRow ||
        items.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (it: any) => String(it?.start_column_key) === String(dataIndex),
        );

      const cellRefKey =
        matchedItem?.cellRefKey ||
        matchedItem?.cell_ref_key ||
        columnKey ||
        String(dataIndex);

      const columnTitle =
        matchedItem?.columnTitle || matchedItem?.title || dataIndex;

      setSelectedCell({
        value: null,
        location: `${record["0"]}-${columnTitle}`,
        udfId: newUdfData.udf._id, // Use the newly created UDF ID
        unit: unit,
        materialName: materialName,
        columnTitle: columnTitle,
        nms: record.nms || matchedItem?.nms || "",
        configId: "",
        cellKey: String(cellRefKey),
        dataId: "",
        types: types,
      });

      setIsUDFModalOpen(true);
      message.success("UDF created successfully. Opening editor...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error in handleNullCellClick:", error);
      message.error(
        `Failed to create UDF: ${
          error.response?.data?.message || error.message
        }`,
      );
    }
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
                Konsumsi Batubara dan Produksi Steam
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
          {""}
          {formatTanggalID(
            selectedDate ? selectedDate.format("YYYY-MM-DD") : "",
          )}
        </strong>
        <span className="float-right">
          (Last modified:{" "}
          {KonsumsiData?.last_modified
            ? new Date(KonsumsiData.last_modified * 1000).toLocaleString(
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
            }}>
            <Button type="default" className="btn-md">
              In progress
              <MdArrowForwardIos size={18} className="rotate-90 ml-1" />
            </Button>
          </Dropdown>
        </span>
      </div>

      {/* Content based on Active Tab */}
      {active === "Produksi-steam" && (
        <div className="mt-6">
          {/* Top Row: Balance Demin */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Left: Balance Denim Hari Ini */}
            <div>
              <h3 className="text-base font-semibold mb-4">
                Balance Denim Hari Ini
              </h3>
              <BBTable
                data={productionData?.today_balance_demin}
                isLastRowSticky={false}
                onCellClick={(r, d, c) =>
                  handleCellClick(r, d, c, "today_balance_demin")
                }
                onNullCellClick={(r, d, c) =>
                  handleNullCellClick(r, d, c, "today_balance_demin")
                }
                showAddButtonForNull={true}
              />
            </div>

            {/* Right: Rata-Rata Balance Denim */}
            <div>
              <h3 className="text-base font-semibold mb-4">
                Rata-Rata Balance Denim
              </h3>
              <BBTable
                data={productionData?.average_balance_demin}
                isLastRowSticky={false}
                onCellClick={(r, d, c) =>
                  handleCellClick(r, d, c, "average_balance_demin")
                }
                onNullCellClick={(r, d, c) =>
                  handleNullCellClick(r, d, c, "average_balance_demin")
                }
                showAddButtonForNull={true}
              />
            </div>
          </div>

          {/* Middle: Koreksi Produksi Steam */}
          <div className="mb-6">
            <h3 className="text-base font-semibold mb-4">
              Koreksi Produksi Steam
            </h3>
            <BBTable
              data={productionData?.steam_production_correction}
              isLastRowSticky={false}
              onCellClick={(r, d, c) =>
                handleCellClick(r, d, c, "steam_production_correction")
              }
              onNullCellClick={(r, d, c) =>
                handleNullCellClick(r, d, c, "steam_production_correction")
              }
              showAddButtonForNull={true}
            />
          </div>

          {/* Bottom Row: Produksi dan Distribusi BB 1 & 2 */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left: Produksi dan Distribusi BB 1 */}
            <div>
              <h3 className="text-base font-semibold mb-4">
                Produksi dan Distribusi BB 1
              </h3>
              <BBTable
                data={
                  productionData?.production_distribution_bb?.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (item: any) => item.bb_id === 1,
                  )?.data
                }
                isLastRowSticky={false}
                onCellClick={(r, d, c) =>
                  handleCellClick(r, d, c, "production_distribution_bb1")
                }
                onNullCellClick={(r, d, c) =>
                  handleNullCellClick(r, d, c, "production_distribution_bb1")
                }
                showAddButtonForNull={true}
              />
            </div>

            {/* Right: Produksi dan Distribusi BB 2 */}
            <div>
              <h3 className="text-base font-semibold mb-4">
                Produksi dan Distribusi BB 2
              </h3>
              <BBTable
                data={
                  productionData?.production_distribution_bb?.find(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (item: any) => item.bb_id === 2,
                  )?.data
                }
                isLastRowSticky={false}
                onCellClick={(r, d, c) =>
                  handleCellClick(r, d, c, "production_distribution_bb2")
                }
                onNullCellClick={(r, d, c) =>
                  handleNullCellClick(r, d, c, "production_distribution_bb2")
                }
                showAddButtonForNull={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* UDF Modal */}
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

export default Konsumsi;

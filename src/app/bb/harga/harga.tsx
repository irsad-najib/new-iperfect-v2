/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { Breadcrumb, Button, DatePicker, Tabs, Dropdown, message } from "antd";
import { MdArrowForwardIos, MdOutlineStickyNote2 } from "react-icons/md";
import { TfiDownload } from "react-icons/tfi";
import Link from "next/link";
import { useDateContext } from "@/context/DateContext";
import BBTable from "@/components/bb/BB-table";
import api from "@/utils/axios";
import EditGasPriceModal from "@/components/bb/harga/EditGasPriceModal";
import BBRawmatUdfModal from "@/components/bb/BBRawmatUdfModal";
import EditCoalDetailsModal from "@/components/bb/harga/EditCoalDetailsModal";

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

const Harga = () => {
  const { selectedDate } = useDateContext();
  const [active, setActive] = useState("Harga-gas");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [hargaGas, setHargaGas] = useState<any>([]);
  const [poDocuments, setPoDocuments] = useState<any>([]);
  const [hargaCoal, setHargaCoal] = useState<any>([]);
  const [coalTimeframe, setCoalTimeframe] = useState<"today" | "mtd">("today");
  const [isSyncUnloadingLoading, setIsSyncUnloadingLoading] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editTanggal, setEditTanggal] = useState<string>("");
  const [isUDFModalOpen, setIsUDFModalOpen] = useState(false);
  const [configData, setConfigData] = useState<any>(null);
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
  const [isEditCoalModalVisible, setIsEditCoalModalVisible] = useState(false);
  const [selectedDocNumber, setSelectedDocNumber] = useState<string | null>(
    null,
  );

  const tabList = [
    { key: "Harga-gas", label: "Harga Gas" },
    { key: "Harga-bb-coa", label: "Harga BB dan CoA" },
  ];

  const columnList = [
    { key: "po_number", label: "PO Number to CoA" },
    { key: "tipikal_batubara", label: "Tipikal Batubara" },
    { key: "perhitungan_hpb", label: "Perhitungan HPB" },
  ];

  // const handleCellEdit = (
  //   record: any,
  //   dataIndex: string,
  //   columnKey: string,
  // ) => {
  //   console.log(`Cell clicked:`, record, dataIndex, columnKey);
  //   // Implement your cell edit logic here
  // };

  const handlePoSelection = async (
    record: any,
    dataIndex: string,
    columnKey: string,
  ) => {
    console.log("PO Cell clicked:", record, dataIndex, columnKey);

    // Extract doc_number from cell metadata
    const items: any[] = record?.originalRow?.items || [];
    const firstItem = items.find((it: any) =>
      it?.cell_ref_key?.includes("-doc_num"),
    );

    let docNumber = null;
    if (firstItem?.cell_ref_key) {
      // Extract doc_number from cell_ref_key format: "695e1bf4bf6153cb9512ea9d-doc_num"
      const parts = firstItem.cell_ref_key.split("-doc_num");
      docNumber = parts[0];
    }

    if (!docNumber) {
      console.warn("No doc number found in record");
      return;
    }

    // Determine selected_data form columnKey or dataIndex
    // Example: "total", "vol", etc.
    const selectedData = columnKey || dataIndex;

    try {
      await api.post("/bb/daily/prices/coal-coa/edit-po-coal-qty", {
        po_id: String(docNumber),
        tanggal: selectedDate?.format("YYYY-MM-DD"),
        selected_data: selectedData,
      });
      message.success("PO quantity selection updated");
      // Refresh data
      HandlehargaCoal();
    } catch (error: any) {
      console.error("Error updating PO quantity selection:", error);
      message.error(
        `Failed to update selection: ${
          error.response?.data?.message || error.message
        }`,
      );
    }
  };

  const handleEdit = (record: any) => {
    console.log("Edit record:", record);

    // Extract doc_number from cell metadata
    const items: any[] = record?.originalRow?.items || [];
    const firstItem = items.find((it: any) =>
      it?.cell_ref_key?.includes("-doc_num"),
    );

    let docNumber = null;
    if (firstItem?.cell_ref_key) {
      // Extract doc_number from cell_ref_key format: "695e1bf4bf6153cb9512ea9d-doc_num"
      const parts = firstItem.cell_ref_key.split("-doc_num");
      docNumber = parts[0];
    }

    if (docNumber) {
      setSelectedDocNumber(String(docNumber));
      setIsEditCoalModalVisible(true);
    } else {
      message.warning("No doc number found in record");
    }
  };

  const handleEditCoalSuccess = () => {
    // Refresh data after successful edit
    HandlehargaCoal();
  };

  const handleEditgas = (record: any) => {
    console.log("Edit record:", record);
    // Open modal with selected date
    const tanggal = selectedDate?.format("YYYY-MM-DD") || "";
    setEditTanggal(tanggal);
    setIsEditModalVisible(true);
  };

  // const handleDelete = (record: any) => {
  //   console.log("Delete record:", record);
  //   // Implement your delete logic here
  // };

  const handleColumnToggle = (columnKey: string) => {
    setHiddenColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((key) => key !== columnKey)
        : [...prev, columnKey],
    );
  };

  const handleSelectAll = () => {
    if (hiddenColumns.length === columnList.length) {
      setHiddenColumns([]);
    } else {
      setHiddenColumns(columnList.map((col) => col.key));
    }
  };

  const handleCoalTimeframeChange = (timeframe: "today" | "mtd") => {
    setCoalTimeframe(timeframe);
  };

  const handleSyncUnloadingBB = async () => {
    const tanggal = selectedDate?.format("YYYY-MM-DD");
    if (!tanggal) {
      message.error("Tanggal tidak valid");
      return;
    }

    try {
      setIsSyncUnloadingLoading(true);
      const response = await api.post("/bb/unloading/sync-data", null, {
        params: { tanggal },
      });

      const note =
        response?.data?.note || response?.data?.message || "Sync success";
      message.success(note);

      if (active === "Harga-bb-coa") {
        HandlehargaCoal();
      }
    } catch (error: any) {
      console.error("Error syncing unloading BB:", error);
      message.error(
        error?.response?.data?.note ||
          error?.response?.data?.message ||
          error?.message ||
          "Sync failed",
      );
    } finally {
      setIsSyncUnloadingLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsEditModalVisible(false);
    setEditTanggal("");
  };

  const handleEditSuccess = () => {
    // Refresh data after successful edit
    HandlehargaGas();
  };

  const handleUpdateUDF = async () => {
    // Refresh data after UDF is updated
    HandlehargaCoal();
  };

  const handleBindUdf = async (udfId: string) => {
    if (!selectedCell) return;
    try {
      await api.post("/bb/daily/prices/coal-coa/edit_po_dcs", {
        key: selectedCell.cellKey,
        tanggal: selectedDate?.format("YYYY-MM-DD"),
        udf_id: udfId,
      });
      message.success("Success bind UDF");
    } catch (error: any) {
      console.error("Error binding UDF:", error);
      message.error(
        `Failed to bind UDF: ${error.response?.data?.message || error.message}`,
      );
      throw error; // Re-throw to let the modal know it failed
    }
  };

  const handleNullCellClick = async (
    record: any,
    dataIndex: string,
    columnKey: string,
    types: string,
  ) => {
    if (!record) return;

    try {
      const items: any[] = record?.originalRow?.items || [];
      const metaFromRow = record?._cellMeta?.[String(dataIndex)];

      // Extract material name from column key "1" in row items or fallback
      const materialNameItem = items.find(
        (it: any) => String(it?.start_column_key) === "1",
      );
      const materialName =
        metaFromRow?.materialName ||
        materialNameItem?.value ||
        record["0"] ||
        "Unknown Material";

      // Extract unit from column key "3" in row items or fallback
      const unitItem = items.find(
        (it: any) => String(it?.start_column_key) === "3",
      );
      const unit = metaFromRow?.unit || unitItem?.value || "";

      const tanggal = selectedDate?.format("YYYY-MM-DD") || "";

      // Auto create UDF
      console.log("Creating new UDF for", materialName);
      const payload = {
        udf: {
          name: `udf PO-${tanggal}`,
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
        configId: configData?.config_id || "",
        cellKey: String(cellRefKey),
        dataId: configData?.data_id || "",
        types: types,
      });

      setIsUDFModalOpen(true);
      message.success("UDF created successfully. Opening editor...");
    } catch (error: any) {
      console.error("Error in handleNullCellClick:", error);
      message.error(
        `Failed to create UDF: ${
          error.response?.data?.message || error.message
        }`,
      );
    }
  };

  const HandlehargaGas = React.useCallback(async () => {
    try {
      const data = await api.get("bb/daily/prices/gas/get-by-args", {
        params: { tanggal: selectedDate?.format("YYYY-MM-DD") },
      });
      setHargaGas(data.data);
    } catch (error) {
      console.error("Error fetching Harga Gas data:", error);
    }
  }, [selectedDate]);

  const HandlehargaCoal = React.useCallback(async () => {
    try {
      console.log("Fetching coal data with:", {
        tanggal: selectedDate?.format("YYYY-MM-DD"),
        timeframe: coalTimeframe,
      });
      const data = await api.get("bb/daily/prices/coal-coa/get-by-args", {
        params: {
          tanggal: selectedDate?.format("YYYY-MM-DD"),
          timeframe: coalTimeframe,
        },
      });
      console.log("Coal data received:", data.data);

      // Parse data untuk section 1 (PO Documents) dan section 2 (Coal Price)
      if (data.data.po_documents) {
        setPoDocuments(data.data.po_documents);
      }
      if (data.data.coal_price) {
        setHargaCoal(data.data.coal_price);
      }

      // Simpan config_id dan data_id jika ada
      if (data.data) {
        setConfigData({
          config_id: data.data.config_id,
          data_id: data.data.data_id,
        });
      }
    } catch (error) {
      console.error("Error fetching Harga Coal data:", error);
    }
  }, [selectedDate, coalTimeframe]);

  React.useEffect(() => {
    HandlehargaGas();
  }, [HandlehargaGas]);

  React.useEffect(() => {
    if (active === "Harga-bb-coa" && selectedDate) {
      HandlehargaCoal();
    }
  }, [selectedDate, active, HandlehargaCoal]);

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
                Harga Gas, PO BB, dan CoA
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
      {active === "Harga-gas" && (
        <>
          <div className="mb-6">
            <span>Data : </span>
            <strong>
              {""}
              {formatTanggalID(
                selectedDate ? selectedDate.format("YYYY-MM-DD") : "",
              )}
            </strong>
            <span className="float-right">
              (Last modified:{" "}
              {hargaGas?.last_modified
                ? new Date(hargaGas.last_modified * 1000).toLocaleString(
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
          <BBTable
            data={hargaGas}
            isLastRowSticky={true}
            onEdit={handleEditgas}
          />
        </>
      )}
      {active === "Harga-bb-coa" && (
        <>
          <div className="mb-6">
            <span>Data : </span>
            <strong>
              {""}
              {formatTanggalID(
                selectedDate ? selectedDate.format("YYYY-MM-DD") : "",
              )}
            </strong>
            <span className="float-right">
              (Last modified:{" "}
              {hargaGas?.last_modified
                ? new Date(hargaGas.last_modified * 1000).toLocaleString(
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
          <div className="mt-6">
            {/* Section 1: Dokumen PO dan Status Uploading */}
            <div className="px-6 py-4 rounded-lg mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="m-0 text-[20.16px] font-semibold">
                  Dokumen PO dan Status Uploading
                </h3>
                <div className="flex gap-2 items-center">
                  <Button
                    className={`btn-md font-semibold ${
                      coalTimeframe === "today"
                        ? "bg-[#F47920] border-[#F47920] text-[#F3F4F8]"
                        : "bg-transparent border-[#404252] text-[#13162A]"
                    }`}
                    onClick={() => handleCoalTimeframeChange("today")}>
                    This date
                  </Button>
                  <Button
                    className={`btn-md font-semibold ${
                      coalTimeframe === "mtd"
                        ? "bg-[#F47920] border-[#F47920] text-[#F3F4F8]"
                        : "bg-transparent border-[#404252] text-[#13162A]"
                    }`}
                    onClick={() => handleCoalTimeframeChange("mtd")}>
                    Month to date
                  </Button>
                  <div className="h-5 w-0.5 bg-[#ccc] mx-2"></div>
                  <Button
                    icon={
                      <span className="w-5 h-5 inline-flex items-center justify-center">
                        ⟳
                      </span>
                    }
                    className="customOtherButton btn-md"
                    loading={isSyncUnloadingLoading}
                    onClick={handleSyncUnloadingBB}
                  />
                  <Button
                    type="primary"
                    className={"customPrimaryButton btn-md"}>
                    + Import New PO
                  </Button>
                </div>
              </div>

              <BBTable
                data={poDocuments}
                isLastRowSticky={false}
                onCellClick={handlePoSelection}
                onNullCellClick={(r, d, c) =>
                  handleNullCellClick(r, d, c, "po_documents")
                }
                showAddButtonForNull={true}
              />
            </div>

            {/* Section 2: Perhitungan Harga Coal */}
            <div className="px-6 py-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="m-0 text-[20.16px] font-semibold">
                  Perhitungan Harga Coal
                </h3>
                <div className="flex gap-2 items-center">
                  <Button
                    className={`btn-md font-semibold ${
                      coalTimeframe === "today"
                        ? "bg-[#F47920] border-[#F47920] text-[#F3F4F8]"
                        : "bg-transparent border-[#404252] text-[#13162A]"
                    }`}
                    onClick={() => handleCoalTimeframeChange("today")}>
                    This date
                  </Button>
                  <Button
                    className={`btn-md font-semibold ${
                      coalTimeframe === "mtd"
                        ? "bg-[#F47920] border-[#F47920] text-[#F3F4F8]"
                        : "bg-transparent border-[#404252] text-[#13162A]"
                    }`}
                    onClick={() => handleCoalTimeframeChange("mtd")}>
                    Month to date
                  </Button>
                  <div className="h-5 w-0.5 bg-[#ccc] mx-2"></div>
                  <span className="flex items-center gap-1">
                    Hidden Columns:
                    <Dropdown
                      dropdownRender={() => (
                        <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.15)] p-[12px_16px] min-w-[200px]">
                          <div className="text-sm text-[#666] mb-2">
                            Select column to hide (0)
                          </div>
                          <div
                            className="flex items-center mb-2 cursor-pointer"
                            onClick={handleSelectAll}>
                            <input
                              type="checkbox"
                              checked={
                                hiddenColumns.length === columnList.length &&
                                columnList.length > 0
                              }
                              readOnly
                              className="mr-2 cursor-pointer w-4 h-4"
                            />
                            <span className="font-semibold">Select All</span>
                          </div>
                          <div className="border-t border-[#e8e8e8] pt-2 mt-2">
                            <div className="text-xs text-[#999] mb-2">
                              Columns:
                            </div>
                            {columnList.map((col) => (
                              <div
                                key={col.key}
                                className="flex items-center mb-1.5 cursor-pointer"
                                onClick={() => handleColumnToggle(col.key)}>
                                <input
                                  type="checkbox"
                                  checked={hiddenColumns.includes(col.key)}
                                  readOnly
                                  className="mr-2 cursor-pointer w-4 h-4"
                                />
                                <span>{col.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      trigger={["click"]}>
                      <Button className="customOtherButton btn-md">
                        {hiddenColumns.length} hidden
                        <MdArrowForwardIos
                          size={16}
                          className="rotate-90 ml-1"
                        />
                      </Button>
                    </Dropdown>
                  </span>
                </div>
              </div>

              <BBTable
                data={hargaCoal}
                isLastRowSticky={false}
                onEdit={handleEdit}
              />
            </div>
          </div>
        </>
      )}

      {/* Edit Gas Price Modal */}
      <EditGasPriceModal
        visible={isEditModalVisible}
        onClose={handleModalClose}
        tanggal={editTanggal}
        onSuccess={handleEditSuccess}
      />

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

      {/* Edit Coal Details Modal */}
      <EditCoalDetailsModal
        visible={isEditCoalModalVisible}
        onClose={() => {
          setIsEditCoalModalVisible(false);
          setSelectedDocNumber(null);
        }}
        docNumber={selectedDocNumber}
        selectedData={"total"}
        onSuccess={handleEditCoalSuccess}
      />
    </div>
  );
};

export default Harga;

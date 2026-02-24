import { Button, Select, Modal, Form, Input, message } from "antd";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { HiDownload, HiUpload } from "react-icons/hi";
import { MdFormatListNumbered, MdOutlineTableChart } from "react-icons/md";
import api from "@/utils/axios";
import NPKTable from "../NPK-table";
import { saveAs } from "file-saver";

interface SyncToModalProps {
  isVisible: boolean;
  onClose?: () => void;
  selectedData?: string;
}

const SyncToModal: React.FC<SyncToModalProps> = ({
  isVisible,
  onClose,
  selectedData,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState("form");
  const [selectedKomposisi, setSelectedKomposisi] = useState<number>(0);
  const [form] = Form.useForm();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [editCellData, setEditCellData] = useState<{
    rowIndex: number;
    columnKey: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sapdata = useCallback(async () => {
    try {
      const response = await api.get(
        "npk/daily/sap/template_order/get-by-args",
        { params: { tanggal: selectedData } },
      );
      setData(response.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [selectedData]);

  useEffect(() => {
    if (isVisible && selectedData) {
      sapdata();
    }
  }, [sapdata, isVisible, selectedData]);

  const sapEdit = async () => {
    try {
      const formValues = form.getFieldsValue();
      const currentKomposisi = data?.data?.[selectedKomposisi];

      if (!currentKomposisi) {
        message.error("Data komposisi tidak ditemukan!");
        return;
      }

      const { month, year } = extractMonthYear();

      const payload = {
        month: month || data?.month || "",
        year: year || data?.year || new Date().getFullYear(),
        data:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data?.data?.map((item: any, index: number) => {
            if (index === selectedKomposisi) {
              const table = item.table || {};
              return {
                npk_product_id: item.npk_product_id || "",
                name: item.name || "",
                process_order:
                  formValues.process_order || item.process_order || 0,
                res_number: formValues.res_number || item.res_number || 0,
                system_status:
                  formValues.system_status || item.system_status || "",
                mov_type: formValues.mov_type || item.mov_type || 0,
                table: {
                  column_keys: table.column_keys || [],
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  header: (table.header || []).map((headerLevel: any) => ({
                    level: headerLevel.level || 0,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    items: (headerLevel.items || []).map((headerItem: any) => ({
                      start_column_key: headerItem.start_column_key || "",
                      title: headerItem.title || "",
                      num_cols: headerItem.num_cols || 0,
                      num_rows: headerItem.num_rows || 0,
                      bg_color: headerItem.bg_color || "",
                      font_color: headerItem.font_color || "",
                    })),
                  })),
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  row: (table.row || []).map((row: any) => ({
                    index: row.index || "",
                    row_index: row.row_index || "",
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    items: (row.items || []).map((cellItem: any) => ({
                      start_column_key: cellItem.start_column_key || "",
                      value: cellItem.value !== undefined ? cellItem.value : 0,
                      cell_ref_key: cellItem.cell_ref_key || "",
                      overwrited: cellItem.overwrited || false,
                      original_value:
                        cellItem.original_value !== undefined
                          ? cellItem.original_value
                          : cellItem.value !== undefined
                            ? cellItem.value
                            : 0,
                      bg_color: cellItem.bg_color || "",
                      font_color: cellItem.font_color || "",
                    })),
                    bg_color: row.bg_color || "",
                    font_color: row.font_color || "",
                  })),
                },
              };
            }
            return {
              npk_product_id: item.npk_product_id || "",
              name: item.name || "",
              process_order: item.process_order || 0,
              res_number: item.res_number || 0,
              system_status: item.system_status || "",
              mov_type: item.mov_type || 0,
              table: item.table || {},
            };
          }) || [],
        last_modified: Math.floor(Date.now() / 1000),
        status: formValues.status || "in_progress",
      };

      await api.post("/npk/daily/sap/template_order/edit", payload);
      message.success("Template Order berhasil disimpan!");
      await sapdata();
    } catch (error) {
      console.error("Error updating data:", error);
      message.error("Gagal menyimpan Template Order!");
    }
  };

  const extractMonthYear = () => {
    let month = "";
    let year = new Date().getFullYear();

    if (selectedData) {
      const dateParts = selectedData.split("-");
      if (dateParts.length >= 2) {
        year = parseInt(dateParts[0], 10);
        month = dateParts[1];
      }
    }

    return { month, year };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cellclick = (record: any, dataIndex: string) => {
    const value = record[dataIndex];
    const rowIndex = record.dataIndex !== undefined ? record.dataIndex : 0;

    setEditCellData({ rowIndex, columnKey: dataIndex, value });
    editForm.setFieldsValue({ value: value });
    setEditModalVisible(true);
  };

  const handleEditSave = () => {
    const newValue = editForm.getFieldValue("value");

    if (editCellData && data?.data?.[selectedKomposisi]?.table?.row) {
      const newData = { ...data };
      const tableRows = [...(newData.data[selectedKomposisi].table.row || [])];

      if (tableRows[editCellData.rowIndex]) {
        const row = { ...tableRows[editCellData.rowIndex] };
        const items = [...(row.items || [])];

        const itemIndex = items.findIndex(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (item: any) => item.start_column_key === editCellData.columnKey,
        );

        if (itemIndex >= 0) {
          items[itemIndex] = {
            ...items[itemIndex],
            value: newValue,
            overwrited: true,
            original_value: items[itemIndex].value,
          };
          row.items = items;
          tableRows[editCellData.rowIndex] = row;
          newData.data[selectedKomposisi].table.row = tableRows;
          setData(newData);
          message.success("Cell berhasil diupdate!");
        }
      }
    }

    setEditModalVisible(false);
    setEditCellData(null);
    editForm.resetFields();
  };

  const handleEditCancel = () => {
    setEditModalVisible(false);
    setEditCellData(null);
    editForm.resetFields();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (
      !allowedTypes.includes(file.type) &&
      !["xlsx", "xls", "csv"].includes(fileExtension || "")
    ) {
      message.error(
        "File harus berformat Excel (.xlsx, .xls) atau CSV (.csv)!",
      );
      return;
    }

    const { month, year } = extractMonthYear();
    const formData = new FormData();
    formData.append("excel_file", file);

    try {
      message.loading({ content: "Uploading file...", key: "upload" });

      await api.post(
        `/npk/daily/sap/template_order/upload?month=${month}&year=${year}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      message.success({ content: "File berhasil diupload!", key: "upload" });
      await sapdata();
    } catch (error) {
      console.error("Error uploading file:", error);
      message.error({ content: "Gagal upload file!", key: "upload" });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownloadTemplate = async () => {
    const response = await api.get("/npk/daily/sap/download-template", {
      responseType: "blob",
    });
    const contentDisposition = response.headers["content-disposition"]?.trim();
    let filename = "Template-TO-SAP-NPK.xlsx"; // Fallback filename
    if (contentDisposition) {
      const matches = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);
      if (matches && matches[1]) {
        filename = matches[1];
      }
    }
    saveAs(response.data, filename);
  };

  // Update form values when komposisi changes
  useEffect(() => {
    if (data && Array.isArray(data.data) && data.data[selectedKomposisi]) {
      const item = data.data[selectedKomposisi];
      form.setFieldsValue({
        process_order: item.process_order || "",
        res_number: item.res_number || "",
        system_status: item.system_status || "",
        mov_type: item.mov_type || "",
        status: "Pending",
      });
    }
  }, [selectedKomposisi, data, form]);

  return (
    <>
      <Modal
        width={960}
        title="Sync Template Order SAP"
        visible={isVisible}
        onCancel={onClose}
        footer={null}>
        <div className="flex gap-4 items-center justify-between">
          <div className="flex flex-col bg-[#F1F2F3] p-2 rounded-[10px] w-full gap-1"></div>
          <Button
            type="primary"
            icon={<HiDownload />}
            onClick={handleDownloadTemplate}>
            Download Template
          </Button>
          <Button
            type="primary"
            icon={<HiUpload />}
            onClick={handleUploadClick}>
            Upload template order
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div className="mt-6 flex justify-between items-center gap-2 mb-6">
          <strong>Komposisi:</strong>
          <div className="flex gap-2 w-full">
            <Select
              className="w-full"
              options={
                data && Array.isArray(data.data)
                  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data.data.map((d: any, idx: number) => ({
                      label: d.name,
                      value: idx,
                    }))
                  : []
              }
              value={selectedKomposisi}
              onChange={setSelectedKomposisi}
            />
          </div>
          <div className="flex">
            <Button
              onClick={() => setState("form")}
              icon={<MdFormatListNumbered />}
              className={`btn-md customSecondaryButton${
                state === "form" ? " activeButton" : ""
              }`}
            />
            <Button
              onClick={() => setState("table")}
              icon={<MdOutlineTableChart />}
              className={`btn-md customSecondaryButton${
                state === "table" ? " activeButton" : ""
              }`}
            />
          </div>
        </div>
        {state === "form" && (
          <div>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                process_order:
                  data?.data?.[selectedKomposisi]?.process_order || "",
                res_number: data?.data?.[selectedKomposisi]?.res_number || "",
                system_status:
                  data?.data?.[selectedKomposisi]?.system_status || "",
                mov_type: data?.data?.[selectedKomposisi]?.mov_type || "",
                status: "Pending",
              }}>
              <Form.Item
                label="Process Order"
                name="process_order"
                rules={[
                  { required: true, message: "Isi nomor process order" },
                ]}>
                <input
                  placeholder="Isi nomor process order"
                  className="w-full h-14 rounded-[10px] border border-[#d9d9d9] px-3"
                />
              </Form.Item>
              <Form.Item
                label="Res Number"
                name="res_number"
                rules={[{ required: true, message: "Isi nomor res number" }]}>
                <input
                  placeholder="Isi nomor res number"
                  className="w-full h-14 rounded-[10px] border border-[#d9d9d9] px-3"
                />
              </Form.Item>
              <Form.Item
                label="System Status"
                name="system_status"
                rules={[{ required: true, message: "Isi system status" }]}>
                <input
                  placeholder="Isi system status"
                  className="w-full h-14 rounded-[10px] border border-[#d9d9d9] px-3"
                />
              </Form.Item>
              <Form.Item
                label="Mov Type"
                name="mov_type"
                rules={[{ required: true, message: "Isi system status" }]}>
                <input
                  placeholder="Isi system status"
                  className="w-full h-14 rounded-[10px] border border-[#d9d9d9] px-3"
                />
              </Form.Item>
            </Form>
          </div>
        )}
        {state === "table" && (
          <NPKTable
            data={data?.data?.[selectedKomposisi]?.table}
            isLastRowSticky={false}
            fixedLeftColumns={2}
            fixedRightColumns={0}
            onCellClick={cellclick}
          />
        )}
        <div className="flex justify-between gap-2 mt-6">
          <div>
            <span>Status: </span>
            <Select
              className="w-[200px]"
              options={[
                { label: "Pending", value: "Pending" },
                { label: "Completed", value: "Completed" },
              ]}
              defaultValue="Pending"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" onClick={sapEdit}>
              Save Template Order
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Value Modal */}
      <Modal
        title="Edit data"
        visible={editModalVisible}
        onCancel={handleEditCancel}
        footer={[
          <Button key="cancel" onClick={handleEditCancel}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={handleEditSave}>
            Save
          </Button>,
        ]}
        width={400}>
        <Form form={editForm} layout="vertical">
          <Form.Item label="Value" name="value">
            <Input placeholder="Enter value" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SyncToModal;

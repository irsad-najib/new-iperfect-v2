import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Button, Select, message } from "antd";
import { MdClose } from "react-icons/md";
import api from "@/utils/axios";

interface EditCoalDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  docNumber: string | null;
  selectedData: string;
  onSuccess: () => void;
}

const EditCoalDetailsModal: React.FC<EditCoalDetailsModalProps> = ({
  visible,
  onClose,
  docNumber,
  selectedData,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [poNumber, setPoNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [configUdfRow, setConfigUdfRow] = useState("");

  const fetchCoalDetails = React.useCallback(async () => {
    if (!docNumber) return;

    setLoading(true);
    try {
      const response = await api.get(
        "/bb/daily/prices/coal-coa/get-coal-details",
        {
          params: { po_id: docNumber },
        },
      );

      if (response.data) {
        const { po_number, supplier, config_udf_row, data } = response.data;
        setPoNumber(po_number || "");
        setSupplier(supplier || "");
        setConfigUdfRow(config_udf_row || "");

        // Set form values from data object
        form.setFieldsValue(data || {});
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error fetching coal details:", error);
      message.error(
        `Failed to fetch coal details: ${
          error.response?.data?.message || error.message
        }`,
      );
    } finally {
      setLoading(false);
    }
  }, [docNumber, form]);

  useEffect(() => {
    if (visible && docNumber) {
      fetchCoalDetails();
    }
  }, [visible, docNumber, fetchCoalDetails]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      await api.post("/bb/daily/prices/coal-coa/edit-coal-details", {
        doc_number: docNumber,
        data: values,
        selected_data: selectedData,
      });

      message.success("Coal details updated successfully");
      onSuccess();
      onClose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.errorFields) {
        message.error("Please fill in all required fields");
      } else {
        console.error("Error saving coal details:", error);
        message.error(
          `Failed to save coal details: ${
            error.response?.data?.message || error.message
          }`,
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Edit Config UDF and Value"
      open={visible}
      onCancel={handleCancel}
      closeIcon={<MdClose size={24} />}
      centered
      width={600}
      footer={[
        <Button key="cancel" onClick={handleCancel} className="btn-md">
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSave}
          loading={saving}
          className="bg-primary-300 border-primary-300 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-100 hover:bg-primary-700 hover:border-primary-700 active:bg-neutral-900 active:border-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300">
          Save
        </Button>,
      ]}>
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <>
          <div className="mb-4">
            <div className="mb-2">
              <strong>PO Number:</strong> {poNumber}
            </div>
            <div className="mb-2">
              <strong>Supplier:</strong> {supplier}
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label className="block mb-1">Config UDF Row</label>
              <Input value={configUdfRow} disabled />
            </div>
            <Button className="bg-transparent border border-neutral-700 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-900 hover:bg-secondary-300 hover:border-secondary-300 hover:text-neutral-100 active:bg-neutral-500 active:border-neutral-500 active:text-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300 disabled:text-[#eeeff1] mt-6">
              Load config
            </Button>
            <Button
              type="primary"
              className="bg-primary-300 border-primary-300 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-100 hover:bg-primary-700 hover:border-primary-700 active:bg-neutral-900 active:border-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300 mt-6"
              onClick={handleSave}
              loading={saving}>
              Save
            </Button>
          </div>

          <Form form={form} layout="vertical">
            <div className="grid grid-cols-3 gap-4">
              {/* Row 1 */}
              <Form.Item name="jenis_bb" label="Jenis BB">
                <Select placeholder="Pilih jenis BB">
                  <Select.Option value="option1">Option 1</Select.Option>
                  <Select.Option value="option2">Option 2</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="ash_content" label="Ash Content - %ADB">
                <Input type="number" placeholder="0" />
              </Form.Item>
              <Form.Item name="biaya_transportasi" label="Biaya Transportasi">
                <Input type="number" placeholder="33.4" />
              </Form.Item>

              {/* Row 2 */}
              <Form.Item name="hcv" label="HCV">
                <Input placeholder="5.4 kA" />
              </Form.Item>
              <Form.Item name="sulfur" label="Sulfur - %ADB">
                <Input type="number" placeholder="0" />
              </Form.Item>
              <Form.Item name="harga_po_bar_ton" label="Harga PO (Bar/Ton)">
                <Input type="number" placeholder="0" />
              </Form.Item>

              {/* Row 3 */}
              <Form.Item name="tonase" label="Tonase">
                <Input placeholder="Tonase" />
              </Form.Item>
              <Form.Item
                name="coal_calorific_value"
                label="Coal Calorific Value - ADB">
                <Input type="number" placeholder="4165" />
              </Form.Item>
              <Form.Item name="hba_sender_usd_ton" label="HBA Sender (USD/Ton)">
                <Input type="number" placeholder="0" />
              </Form.Item>

              {/* Row 4 */}
              <Form.Item name="po_number_2" label="PO Number">
                <Input placeholder="PO Number" />
              </Form.Item>
              <Form.Item name="total_moisture" label="Total Moisture - %ADB">
                <Input type="number" placeholder="33.4" />
              </Form.Item>
              <Form.Item name="hba_po_usd_ton" label="HBA PO (USD/Ton)">
                <Input type="number" placeholder="0" />
              </Form.Item>

              {/* Row 5 */}
              <Form.Item name="kurs_rp" label="Kurs (Rp)">
                <Input type="number" placeholder="23.54" />
              </Form.Item>
              <Form.Item name="kurs_po_rp" label="Kurs PO (Rp)">
                <Input type="number" placeholder="0" />
              </Form.Item>

              {/* Row 6 */}
              <Form.Item
                name="inherent_moisture"
                label="Inherent Moisture - %ADB">
                <Input type="number" placeholder="0" />
              </Form.Item>
              <Form.Item name="bb_usd" label="BB USD">
                <Input type="number" placeholder="4165" />
              </Form.Item>
            </div>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default EditCoalDetailsModal;

"use client";

import React, { useState, useEffect } from "react";
import { Modal, Input, Button, message } from "antd";
import api from "@/utils/axios";

interface EditGasPriceModalProps {
  visible: boolean;
  onClose: () => void;
  tanggal: string;
  onSuccess?: () => void;
}

interface GasPriceDetails {
  config_id: string;
  tanggal: string;
  components: string[];
  values: Record<string, number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const EditGasPriceModal: React.FC<EditGasPriceModalProps> = ({
  visible,
  onClose,
  tanggal,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [formData, setFormData] = useState<GasPriceDetails | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});

  // Fetch prefilled data when modal opens

  const fetchGasPriceDetails = React.useCallback(async () => {
    setFetchLoading(true);
    try {
      const response = await api.get("/bb/daily/prices/gas/details", {
        params: { tanggal },
      });

      if (response.data) {
        setFormData(response.data);
        setValues(response.data.values || {});
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error fetching gas price details:", error);
      message.error(
        error.response?.data?.message || "Failed to fetch gas price details",
      );
    } finally {
      setFetchLoading(false);
    }
  }, [tanggal]);

  // Fetch prefilled data when modal opens
  useEffect(() => {
    if (visible && tanggal) {
      fetchGasPriceDetails();
    }
  }, [visible, tanggal, fetchGasPriceDetails]);

  const handleInputChange = (component: string, value: string) => {
    const numValue = value === "" ? 0 : parseFloat(value);
    setValues((prev) => ({
      ...prev,
      [component]: numValue,
    }));
  };

  const handleSave = async () => {
    if (!formData) {
      message.error("No data to save");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        config_id: formData.config_id,
        tanggal: formData.tanggal,
        components: formData.components,
        values: values,
      };

      const response = await api.post("/bb/daily/prices/gas/edit", payload);

      message.success(
        response.data?.message || "Gas price updated successfully",
      );
      onSuccess?.();
      onClose();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error saving gas price:", error);
      message.error(
        error.response?.data?.message || "Failed to update gas price",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setValues({});
    setFormData(null);
    onClose();
  };

  // Define component labels for display
  const componentLabels: Record<string, string> = {
    "k1/s": "K1/s",
    k2: "K2",
    k3: "K3",
    k4: "K4",
    "1a": "1A",
    "k2/s": "K2/s",
  };

  return (
    <Modal
      title="Edit Harga gas hari ini"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={400}
      centered>
      {fetchLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="py-4">
          {formData?.components
            ?.filter((comp) => comp !== "action" && comp !== "average")
            .map((component) => (
              <div key={component} className="mb-4">
                <label className="block mb-1 text-sm font-medium text-[#13162A]">
                  {componentLabels[component] || component.toUpperCase()}
                </label>
                <Input
                  type="number"
                  value={values[component] || ""}
                  onChange={(e) => handleInputChange(component, e.target.value)}
                  placeholder="0"
                  step="0.01"
                  className="w-full h-10"
                />
              </div>
            ))}

          {/* Average field (read-only if needed) */}
          {formData?.values?.average !== undefined && (
            <div className="mb-4">
              <label className="block mb-1 text-sm font-medium text-[#13162A]">
                Average
              </label>
              <Input
                type="number"
                value={formData.values.average}
                disabled
                placeholder="0"
                className="w-full h-10 bg-[#F3F4F8]"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={handleCancel} className="btn-md h-10 px-6">
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={loading}
              className="bg-primary-300 border-primary-300 rounded px-4 h-9 flex items-center justify-center font-semibold text-neutral-100 hover:bg-primary-700 hover:border-primary-700 active:bg-neutral-900 active:border-neutral-900 disabled:bg-neutral-300 disabled:border-neutral-300">
              Save
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default EditGasPriceModal;

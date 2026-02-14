import React, { useState, useEffect } from "react";
import { Modal, Input, Button, List } from "antd";
import { MdClose, MdSearch } from "react-icons/md";
import Image from "next/image";
import api from "@/utils/axios";

interface UDFTemplate {
  udf_id: string;
  name: string;
  display_name: string;
}

interface AddUDFModalProps {
  visible: boolean;
  currentStep: number;
  onClose: () => void;
  onAddUDF: (name: string, template: string) => void;
  pipelineId: string;
  tanggal: string;
  childId: string;
  type: "cleansing" | "cleaning-lab" | "tie-in";
}

const AddUDFModal: React.FC<AddUDFModalProps> = ({
  visible,
  currentStep,
  onClose,
  type,
}) => {
  const [udfName, setUdfName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templates, setTemplates] = useState<UDFTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      try {
        let pipelineType = "cleaning";
        if (type === "cleaning-lab") pipelineType = "cleaning-lab";
        if (type === "tie-in") pipelineType = "tie-in";

        const response = await api.get<UDFTemplate[]>(
          `/pipeline/utils/available-udf?pipeline_type=${pipelineType}`,
        );

        setTemplates(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    if (visible) fetchTemplates();
  }, [visible, type]);

  const resetStates = () => {
    setUdfName("");
    setSearchTerm("");
    setSelectedTemplate(null);
  };

  const handleClose = () => {
    resetStates();
    onClose();
  };

  const filteredTemplates = templates.filter((template) =>
    template.display_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Modal
      title="Add UDF"
      open={visible && currentStep === 2}
      onCancel={handleClose}
      footer={null}
      closeIcon={<MdClose size={24} />}
      centered
      classNames={{
        header: "border-none px-6 py-4",
        body: "px-6 pb-6 pt-0 rounded-lg",
      }}>
      <div className="flex flex-col gap-4">
        {/* NAME SECTION */}
        <div>
          <h4 className="mb-2 font-semibold">Name</h4>
          <Input
            placeholder="Nama UDF"
            value={udfName}
            onChange={(e) => setUdfName(e.target.value)}
            className="h-10"
          />
        </div>

        {/* TEMPLATE SECTION */}
        <div>
          <h4 className="mb-2 font-semibold">Select UDF code template</h4>

          <Input
            prefix={<MdSearch size={18} className="text-gray-400" />}
            placeholder="Search by name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-3 h-10"
          />

          {/* Column Header */}
          <div className="flex justify-between text-sm text-[#13162a] mb-2 pr-[70px]">
            <span>Template name</span>
            <span>Last saved</span>
          </div>

          {/* Template List */}
          <List
            itemLayout="horizontal"
            loading={isLoading}
            dataSource={filteredTemplates}
            className="h-60 overflow-y-auto rounded-lg bg-[#f3f4f8]"
            renderItem={(item) => {
              const isSelected = selectedTemplate === item.udf_id;

              return (
                <List.Item
                  onClick={() => setSelectedTemplate(item.udf_id)}
                  className={`px-4 py-3 cursor-pointer flex items-center gap-4 transition 
                    ${
                      isSelected
                        ? "bg-[#ff6b35] text-white"
                        : "hover:bg-gray-100 text-[#13162a]"
                    }`}>
                  <div className="text-base font-medium flex-1">
                    {item.display_name}
                  </div>

                  <div className="flex items-center gap-2 text-base">
                    <Image
                      src="/images/avatar.png"
                      alt="User avatar"
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                </List.Item>
              );
            }}
          />
        </div>

        {/* BUTTON SECTION */}
        <div className="flex flex-col gap-2">
          <Button
            type="primary"
            block
            onClick={() => console.log("Add from template")}
            disabled={!udfName || !selectedTemplate}
            className="h-10 bg-blue-600! hover:bg-blue-500! disabled:bg-gray-400! disabled:text-gray-200!">
            Add new UDF from template
          </Button>

          <Button
            block
            onClick={() => console.log("Create blank")}
            disabled={!udfName || selectedTemplate !== null}
            className="h-10 border border-gray-300 hover:border-blue-500">
            Create new blank UDF
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddUDFModal;

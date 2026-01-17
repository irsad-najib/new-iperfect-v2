import React, { useState, useEffect } from "react";
import { Modal, Input, Button, List, message } from "antd";
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
  onClose: () => void;
  onAddUDF: (name: string, template: string) => void;
  pipelineId: string;
  tanggal: string;
  childId: string;
  type: "cleansing" | "cleaning-lab" | "tie-in";
}

const AddUDFModal: React.FC<AddUDFModalProps> = ({
  visible,
  onClose,
  onAddUDF,
  pipelineId,
  tanggal,
  childId,
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
        // Determine the pipeline type based on the type prop
        let pipelineType = "cleaning";
        if (type === "cleaning-lab") {
          pipelineType = "cleaning-lab";
        } else if (type === "tie-in") {
          pipelineType = "tie-in";
        }

        const response = await api.get<UDFTemplate[]>(
          `/pipeline/utils/available-udf?pipeline_type=${pipelineType}`
        );
        setTemplates(response.data);
      } catch (error) {
        console.error("Error fetching templates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (visible) {
      fetchTemplates();
    }
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

  const handleAddNewUDFForCleansing = async (template: string) => {
    if (template === "template" && selectedTemplate) {
      try {
        const requestBody = {
          pipeline_id: pipelineId,
          tanggal: tanggal,
          child_id: childId,
          udf_ids: {
            [udfName]: selectedTemplate,
          },
        };

        const response = await api.post("/pipeline/add-udf", requestBody);
        if (response.status === 200) {
          await onAddUDF(udfName, template);
          resetStates();
          onClose();
        }
      } catch (error) {
        console.error("Error adding UDF:", error);
        message.error("Failed to add UDF");
      }
    } else {
      try {
        // Create blank UDF first
        const createUdfResponse = await api.post("/udf", {
          udf: {
            _id: "string",
            name: udfName,
            code: "",
          },
          inputs: [],
        });

        if (
          createUdfResponse.status === 200 &&
          createUdfResponse.data.udf._id
        ) {
          // Add the newly created UDF to pipeline
          const addToPipelineResponse = await api.post("/pipeline/add-udf", {
            pipeline_id: pipelineId,
            tanggal: tanggal,
            child_id: childId,
            udf_ids: {
              [udfName]: createUdfResponse.data.udf._id,
            },
          });

          if (addToPipelineResponse.status === 200) {
            await onAddUDF(udfName, template);
            resetStates();
            onClose();
          }
        }
      } catch (error) {
        console.error("Error creating blank UDF:", error);
        message.error("Failed to create blank UDF");
      }
    }
  };

  const handleAddNewUDFForTieIn = async (template: string) => {
    if (template === "template" && selectedTemplate) {
      // Just pass the selected template's UDF ID
      await onAddUDF(selectedTemplate, template);
      resetStates();
      onClose();
    } else {
      // For blank UDF, create it first
      try {
        const createUdfResponse = await api.post("/udf", {
          udf: {
            _id: "string",
            name: udfName,
            code: "",
          },
          inputs: [],
        });

        if (
          createUdfResponse.status === 200 &&
          createUdfResponse.data.udf._id
        ) {
          await onAddUDF(createUdfResponse.data.udf._id, template);
          resetStates();
          onClose();
        }
      } catch (error) {
        console.error("Error creating blank UDF:", error);
        message.error("Failed to create blank UDF");
      }
    }
  };

  const handleAddNewUDF = async (template: string) => {
    if (type === "cleansing" || type === "cleaning-lab") {
      await handleAddNewUDFForCleansing(template);
    } else {
      await handleAddNewUDFForTieIn(template);
    }
  };

  const filteredTemplates = templates.filter((template) =>
    template.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal
      title="Add UDF"
      open={visible}
      onCancel={handleClose}
      footer={null}
      closeIcon={<MdClose size={28} />}>
      <div className="flex flex-col gap-4">
        <div>
          <h4 className="mb-2 font-semibold">Name</h4>
          <Input
            placeholder="Nama UDF"
            value={udfName}
            onChange={(e) => setUdfName(e.target.value)}
          />
        </div>
        <div>
          <h4 className="mb-2 font-semibold">Select UDF code template</h4>
          <Input
            prefix={<MdSearch size={20} />}
            placeholder="Search by name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex justify-between px-0 pr-[70px] py-2 text-neutral-900 text-14 rounded-t-md">
            <span>Template name</span>
            <span>Last saved</span>
          </div>
          <List
            className="h-60 overflow-y-auto rounded-lg bg-neutral-100"
            itemLayout="horizontal"
            loading={isLoading}
            dataSource={filteredTemplates}
            renderItem={(item) => (
              <List.Item
                className={`!py-[11px] !px-4 cursor-pointer flex items-center gap-4 hover:bg-neutral-200 ${
                  selectedTemplate === item.udf_id ? "!bg-secondary-300" : ""
                }`}
                onClick={() => setSelectedTemplate(item.udf_id)}>
                <div
                  className={`text-[16.8px] ${
                    selectedTemplate === item.udf_id
                      ? "text-white"
                      : "text-neutral-900"
                  }`}>
                  {item.display_name}
                </div>
                <div
                  className={`text-[16.8px] flex items-center gap-2 ml-auto ${
                    selectedTemplate === item.udf_id
                      ? "text-white"
                      : "text-neutral-900"
                  }`}>
                  <Image
                    src="/images/avatar.png"
                    alt="User avatar"
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </List.Item>
            )}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="primary"
            onClick={() => handleAddNewUDF("template")}
            block
            className="customPrimaryButton btn-md h-10"
            disabled={!udfName || !selectedTemplate}>
            Add new UDF from template
          </Button>
          <Button
            onClick={() => handleAddNewUDF("blank")}
            block
            className="customSecondaryButton btn-md h-10"
            disabled={!udfName || selectedTemplate !== null}>
            Create new blank UDF
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddUDFModal;

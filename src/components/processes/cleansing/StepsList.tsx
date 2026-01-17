"use client";

import React, { useState, useEffect } from "react";
import { Button, Switch, message, Modal } from "antd";
import {
  MdDragIndicator,
  MdDelete,
  MdEditNote,
  MdAdd,
  MdInfo,
} from "react-icons/md";
import { AiTwotoneEye } from "react-icons/ai";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api from "@/utils/axios";

interface Step {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

interface StepsListProps {
  onStepViewChange: (step: Step | null) => void;
  steps: Step[];
  pipelineId: string;
  date: string;
  onStepDeleted?: () => void;
  groupId: string;
  udfIdsMap: { [key: string]: string };
  onAddUDF: () => void;
}

const StepsList: React.FC<StepsListProps> = ({
  onStepViewChange,
  steps,
  pipelineId,
  date,
  onStepDeleted,
  groupId,
  udfIdsMap,
  onAddUDF,
}) => {
  const [stepData, setStepData] = useState<Step[]>(steps);
  const [activeViewStep, setActiveViewStep] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [stepToDelete, setStepToDelete] = useState<Step | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setStepData(steps);
  }, [steps]);

  useEffect(() => {
    if (steps.length > 0 && !activeViewStep) {
      const firstStep = steps[0];
      setActiveViewStep(firstStep.id);
      onStepViewChange(firstStep);
    }
  }, [steps, activeViewStep, onStepViewChange]);

  const handleViewClick = (step: Step) => {
    const newActiveStep = activeViewStep === step.id ? null : step.id;
    setActiveViewStep(newActiveStep);
    onStepViewChange(newActiveStep ? step : null);
  };

  const handleDeleteClick = (step: Step) => {
    setStepToDelete(step);
  };

  const handleDeleteConfirm = async () => {
    if (!stepToDelete) return;

    try {
      const udfKey = Object.entries(udfIdsMap).find(
        ([_, id]) => id === stepToDelete.id
      )?.[0];

      if (!udfKey) {
        message.error("Could not find UDF in pipeline configuration");
        return;
      }

      const response = await api.post("/pipeline/remove-udf", {
        pipeline_id: pipelineId,
        tanggal: date,
        child_id: groupId,
        udf_ids: [udfKey],
      });

      if (response.status === 200) {
        message.success("UDF deleted successfully");
        setStepData((prevSteps) =>
          prevSteps.filter((s) => s.id !== stepToDelete.id)
        );

        if (activeViewStep === stepToDelete.id) {
          setActiveViewStep(null);
          onStepViewChange(null);
        }
        onStepDeleted?.();
      }
    } catch (error) {
      console.error("Error deleting UDF:", error);
      message.error("Failed to delete UDF");
    } finally {
      setStepToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setStepToDelete(null);
  };

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const items = Array.from(stepData);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setStepData(items);

    // Create new udf_ids object with reordered keys as strings
    const newUdfIds: Record<string, string> = {};
    items.forEach((step) => {
      // Find the original key for this step
      const originalKey = Object.entries(udfIdsMap).find(
        ([_, id]) => id === step.id
      )?.[0];
      if (originalKey) {
        // Ensure the key is a string
        newUdfIds[String(originalKey)] = String(step.id);
      }
    });

    try {
      const response = await api.post("/pipeline/edit-udf", {
        pipeline_id: String(pipelineId),
        tanggal: String(date),
        child_id: String(groupId),
        udf_ids: newUdfIds,
      });

      if (response.status === 200) {
        message.success("Step order updated successfully");
      }
    } catch (error) {
      console.error("Error updating step order:", error);
      message.error("Failed to update step order");
      // Revert the order in UI if the API call fails
      setStepData(steps);
    }
  };

  if (!mounted) {
    return null;
  }

  const StepItem = ({ step, index, provided }: any) => (
    <div
      className="flex items-center gap-2 select-none"
      ref={provided.innerRef}
      {...provided.draggableProps}>
      <div className="w-9 h-9 rounded-full bg-neutral-200 text-neutral-900 flex items-center justify-center mr-4 text-20 font-semibold">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0 w-full">
        <div
          className={`flex items-center p-2 bg-white border border-neutral-200 rounded relative transition-all duration-200 w-full min-w-0 hover:border-neutral-300 hover:shadow-sm ${
            !step.active ? "bg-neutral-200 text-neutral-400" : ""
          }`}>
          <div
            className={`cursor-grab p-0 px-2 absolute left-0 top-0 bottom-0 flex items-center rounded-l-lg active:cursor-grabbing ${
              !step.active
                ? "bg-neutral-400 text-neutral-500"
                : "bg-secondary-300 text-secondary-500"
            }`}
            {...provided.dragHandleProps}>
            <MdDragIndicator size={24} className="text-white" />
          </div>
          <div className="flex items-center gap-3 flex-1 ml-8 px-3.5 py-2.5 text-20 min-w-0">
            <Switch
              className="customSwitch"
              checked={step.active}
              onChange={(checked) => {
                setStepData((prevData) =>
                  prevData.map((item) =>
                    item.id === step.id ? { ...item, active: checked } : item
                  )
                );
              }}
            />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-1">
              {step.name}
            </span>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button type="text" icon={<MdEditNote size={28} />} />
            <Button
              type="text"
              icon={<MdDelete size={24} />}
              onClick={() => handleDeleteClick(step)}
            />
            <Button
              type="text"
              className={activeViewStep === step.id ? "text-secondary-300" : ""}
              icon={<AiTwotoneEye size={22} />}
              onClick={() => handleViewClick(step)}
            />
            <Button type="text" icon={<HiOutlineDotsVertical size={24} />} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="steps">
          {(provided) => (
            <div
              className="flex flex-col gap-3 p-2 min-h-[100px]"
              {...provided.droppableProps}
              ref={provided.innerRef}>
              {stepData.map((step, index) => (
                <Draggable key={step.id} draggableId={step.id} index={index}>
                  {(provided) => (
                    <StepItem step={step} index={index} provided={provided} />
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              <div
                className="flex items-center justify-between px-6 py-4 mt-3 border-2 border-dashed border-neutral-200 rounded-lg cursor-pointer text-neutral-400 transition-all duration-300 hover:border-secondary-300 hover:text-secondary-300 group"
                onClick={onAddUDF}>
                <span className="text-[16.8px]">
                  Add new user defined function (UDF)
                </span>
                <div className="w-7 h-7 rounded-full bg-neutral-300 flex items-center justify-center text-neutral-100 transition-all duration-300 group-hover:bg-secondary-300 group-hover:text-white">
                  <MdAdd size={24} />
                </div>
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <MdInfo className="text-[#FF2624]" size={32} />
            <span>You are about to delete the current UDF</span>
          </div>
        }
        open={stepToDelete !== null}
        onCancel={handleDeleteCancel}
        footer={[
          <Button key="cancel" onClick={handleDeleteCancel}>
            Cancel
          </Button>,
          <Button
            key="delete"
            type="primary"
            danger
            onClick={handleDeleteConfirm}>
            Delete UDF
          </Button>,
        ]}>
        <p>{`Delete "${stepToDelete?.name || ""}" UDF`}</p>
      </Modal>
    </>
  );
};

export default StepsList;

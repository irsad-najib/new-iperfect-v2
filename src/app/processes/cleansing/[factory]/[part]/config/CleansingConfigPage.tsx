"use client";

/**
 * Cleansing Config Page - Pipeline configuration and UDF management interface
 *
 * This component provides comprehensive pipeline configuration management:
 * - Load different pipeline configurations
 * - View and edit pipeline steps
 * - Manage User-Defined Functions (UDFs)
 * - Add new UDFs to pipeline
 * - Set default configurations
 * - View UDF code in readonly mode
 *
 * Pipeline Structure:
 * Pipeline → Groups → Steps (UDFs)
 *
 * UDF Types:
 * - Cleansing UDFs (for part data)
 * - Lab UDFs (for lab data)
 *
 * @component
 * @responsive - Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
 */

import { useState, useEffect } from "react";
import { Breadcrumb, DatePicker, Button, Dropdown, message } from "antd";
import { MdArrowDropDown, MdArrowForwardIos } from "react-icons/md";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
// TODO: Create these cleansing components
import StepsList from "@/components/processes/cleansing/StepsList";
import CodeEditor from "@/components/processes/cleansing/CodeEditor";
import { useDateContext } from "@/context/DateContext";
import { useRouter } from "next/navigation";
import api from "@/utils/axios";
// TODO: Create these components
import AddUDFModal from "@/components/processes/cleansing/AddUDFModal";
import LoadConfigModal from "@/components/processes/cleansing/LoadConfigModal";

/**
 * Daily runner entity linking date to pipeline configuration
 */
interface DailyRunner {
  _id: string;
  tanggal: string;
  config_type: string; // "cleaning" or "cleaning-lab"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any[];
  pipeline_id: string;
  bagian_id: number;
}

/**
 * Pipeline configuration entity
 */
interface Pipeline {
  _id: string;
  name: string;
  default: boolean;
  pipeline_type: string;
  data: {
    group_id: string;
    name: string;
    udf_ids: {
      [key: string]: string; // step_key → udf_id mapping
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    child: any[];
  }[];
  createdAt: number;
  udf_data: {
    udf: {
      _id: string;
      name: string;
      code: string;
      createdAt: number;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inputs: any[];
  }[];
}

/**
 * UDF data with inputs configuration
 */
interface UDFData {
  udf: {
    _id: string;
    name: string;
    code: string;
    createdAt: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: any[];
}

/**
 * Step representation for UI
 */
interface Step {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

const CleansingConfigPage = () => {
  const { selectedDate, formattedDate } = useDateContext();
  const [selectedConfig, setSelectedConfig] = useState("default_configuration");
  const [activeUDF, setActiveUDF] = useState<string | null>(null);
  const [dailyRunner, setDailyRunner] = useState<DailyRunner | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUDF, setSelectedUDF] = useState<UDFData | null>(null);
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>([]);
  const [isAddUDFModalVisible, setIsAddUDFModalVisible] = useState(false);
  const [isLoadConfigModalVisible, setIsLoadConfigModalVisible] =
    useState(false);
  const factory = params.factory;
  const part = params.part;
  const factoryName =
    searchParams.get("factoryName") || `Pabrik ${params.factory}`;
  const partName = searchParams.get("partName") || params.part;

  // Check if the part is a lab
  const isLab =
    typeof partName === "string" && partName.toLowerCase().includes("lab");

  /**
   * Fetches daily runner and pipeline configuration on mount and date change
   * Uses different query params for lab vs part data
   */
  useEffect(() => {
    const fetchData = async () => {
      if (!formattedDate || !part) return;

      setLoading(true);
      try {
        // Lab data uses tipe=cleaning-lab and lab_id, part data uses tipe=cleaning and bagian_id
        const queryParams = isLab
          ? `tanggal=${formattedDate}&tipe=cleaning-lab&lab_id=${part}`
          : `tanggal=${formattedDate}&tipe=cleaning&bagian_id=${part}`;

        const dailyRunnerResponse = await api.get<DailyRunner>(
          `/daily_runner/get-by-args?${queryParams}`
        );

        if (dailyRunnerResponse.data) {
          setDailyRunner(dailyRunnerResponse.data);

          try {
            const pipelineResponse = await api.get<Pipeline>(
              `/pipeline/${dailyRunnerResponse.data.pipeline_id}?with_data=true`
            );

            if (pipelineResponse.data) {
              setPipeline(pipelineResponse.data);
              setSelectedConfig(pipelineResponse.data.name);

              if (pipelineResponse.data.data[0]?.udf_ids) {
                const udfDataMap = new Map<string, UDFData>();

                pipelineResponse.data.udf_data.forEach((udfData) => {
                  udfDataMap.set(udfData.udf._id, udfData);
                });

                const steps = Object.entries(
                  pipelineResponse.data.data[0].udf_ids
                ).map(([stepKey, udfId]) => ({
                  id: udfId,
                  name: udfDataMap.get(udfId)?.udf.name || stepKey,
                  code: udfDataMap.get(udfId)?.udf.code || "",
                  active: true,
                }));

                setSteps(steps);
              }
            }
          } catch (pipelineError) {
            console.error("Error fetching pipeline:", pipelineError);
            message.error("Failed to fetch pipeline configuration");
          }
        }
      } catch (error) {
        console.error("Error fetching daily runner:", error);
        message.error("Failed to fetch configuration data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formattedDate, part, isLab]);

  /**
   * Handles step selection to view UDF code
   *
   * @param step - Selected step or null to clear selection
   */
  const handleStepViewChange = (step: Step | null) => {
    setActiveUDF(step?.name || null);
    setSelectedUDF(
      step
        ? {
            udf: {
              _id: step.id,
              name: step.name,
              code: step.code,
              createdAt: 0,
            },
            inputs: [],
          }
        : null
    );
  };

  /**
   * Callback after step deletion - refreshes pipeline
   */
  const handleStepDeleted = () => {
    if (dailyRunner?.pipeline_id) {
      handleLoadPipeline(dailyRunner.pipeline_id);
    }
  };

  /**
   * Loads a specific pipeline configuration
   * Fetches full pipeline data with UDFs
   *
   * @param selectedPipelineId - Pipeline _id to load
   */
  const handleLoadPipeline = async (selectedPipelineId: string) => {
    setLoading(true);
    try {
      const response = await api.get<Pipeline>(
        `/pipeline/${selectedPipelineId}?with_data=true`
      );
      if (response.data) {
        setPipeline(response.data);
        setSelectedConfig(response.data.name);

        if (response.data.data[0]?.udf_ids) {
          const udfDataMap = new Map<string, UDFData>();

          response.data.udf_data.forEach((udfData) => {
            udfDataMap.set(udfData.udf._id, udfData);
          });

          const steps = Object.entries(response.data.data[0].udf_ids).map(
            ([stepKey, udfId]) => ({
              id: udfId,
              name: udfDataMap.get(udfId)?.udf.name || stepKey,
              code: udfDataMap.get(udfId)?.udf.code || "",
              active: true,
            })
          );

          setSteps(steps);
        }
      }
    } catch (error) {
      console.error("Error loading configuration:", error);
      message.error("Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Opens load configuration modal
   */
  const handleLoadConfig = () => {
    setIsLoadConfigModalVisible(true);
  };

  /**
   * Callback after UDF addition - refreshes pipeline
   *
   * @param _name - UDF name (unused)
   * @param _template - UDF template/code (unused)
   */
  const handleAddUDF = async () => {
    if (dailyRunner?.pipeline_id) {
      await handleLoadPipeline(dailyRunner.pipeline_id);

      try {
        const pipelineResponse = await api.get<Pipeline>(
          `/pipeline/${dailyRunner.pipeline_id}`
        );
        if (pipelineResponse.data && pipelineResponse.data.data[0]?.udf_ids) {
          const udfIds = Object.values(pipelineResponse.data.data[0].udf_ids);
          const udfPromises = udfIds.map((udfId) =>
            api.get<UDFData>(`/udf/${udfId}`)
          );

          const udfResponses = await Promise.all(udfPromises);
          const udfDataMap = new Map<string, UDFData>();

          udfResponses.forEach((response, index) => {
            udfDataMap.set(udfIds[index], response.data);
          });

          const updatedSteps = Object.entries(
            pipelineResponse.data.data[0].udf_ids
          ).map(([stepKey, udfId]) => ({
            id: udfId,
            name: udfDataMap.get(udfId)?.udf.name || stepKey,
            code: udfDataMap.get(udfId)?.udf.code || "",
            active: true,
          }));

          setSteps(updatedSteps);
        }
      } catch (error) {
        console.error("Error updating steps after UDF addition:", error);
        message.error("Failed to update steps list");
      }
    }
  };

  /**
   * Sets current pipeline as default for this part/lab
   * API endpoint: POST /pipeline/set-default
   */
  const handleSetDefault = async () => {
    if (!pipeline) return;
    try {
      const payload = {
        pipeline_id: pipeline._id,
        pipeline_type: pipeline.pipeline_type,
      };

      // Use lab_id for lab data, bagian_id for part data
      if (isLab) {
        Object.assign(payload, { lab_id: part });
      } else {
        Object.assign(payload, { bagian_id: part });
      }

      await api.post("/pipeline/set-default", payload);
      message.success("Successfully set as default configuration");
    } catch (error) {
      console.error("Error setting default configuration:", error);
      message.error("Failed to set default configuration");
    }
  };

  const breadcrumbItems = [
    {
      title: (
        <Link className="breadcrumbLink" href="/processes">
          <span className="linkText">Processes</span>
        </Link>
      ),
    },
    {
      title: (
        <Link className="breadcrumbLink" href="/processes/cleansing">
          <span className="linkText">Cleansing</span>
        </Link>
      ),
    },
    { title: <span>{factoryName}</span> },
    { title: <span className="lastBreadcrumbItem">{partName}</span> },
    { title: <span className="lastBreadcrumbItem">Configuration</span> },
  ];

  /**
   * Navigates to UDF edit page with all necessary params
   */
  const handleEditUDF = () => {
    if (!selectedUDF || !pipeline) return;

    const currentGroup = pipeline.data[0];
    const idsName = Object.entries(currentGroup.udf_ids).find(
      ([id]) => id === selectedUDF.udf._id
    )?.[0];

    if (!idsName) {
      message.error("Could not find UDF in pipeline configuration");
      return;
    }

    // Store UDF code in sessionStorage for edit page
    sessionStorage.setItem("temp_udf_code", selectedUDF.udf.code);

    const queryParams = new URLSearchParams({
      factoryName: factoryName.toString(),
      partName: (partName ?? part ?? "").toString(),
      udfName: selectedUDF.udf.name,
      udfId: selectedUDF.udf._id,
      pipelineId: pipeline._id,
      groupId: currentGroup.group_id,
      idsName: idsName,
      isLab: isLab.toString(),
    });

    router.push(
      `/processes/cleansing/${factory}/${part}/config/edit-udf?${queryParams.toString()}`
    );
  };

  return (
    <div className="px-4 py-4 sm:px-5 md:px-6 lg:px-8 h-full">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        separator={<MdArrowForwardIos size={16} />}
        items={breadcrumbItems}
        className="customBreadcrumb separatorSpacing"
      />

      {/* Header Section - Responsive flex layout */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center my-7 gap-4">
        {/* Date Picker */}
        <div className="flex items-center gap-3">
          <span></span>
          <DatePicker
            disabled
            value={selectedDate}
            format="dddd, DD MMMM YYYY"
            className="boldDatePicker"
          />
        </div>

        {/* Config Controls - Stack on mobile */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <span className="whitespace-nowrap">Config:</span>
          <div className="w-full sm:w-fit min-w-[200px] px-[11px] py-1 border border-[#d9d9d9] rounded-md bg-[#f5f5f5]">
            {loading ? "Loading..." : pipeline?.name || selectedConfig}
          </div>
          <Button
            type="default"
            loading={loading}
            onClick={handleLoadConfig}
            disabled={!dailyRunner?.pipeline_id}>
            Load
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: "1",
                  label: "Save as Default",
                  disabled: !pipeline,
                  onClick: handleSetDefault,
                },
                {
                  key: "2",
                  label: "Save Changes",
                  disabled: !pipeline,
                },
              ],
            }}>
            <Button type="primary" disabled={loading || !pipeline}>
              Save <MdArrowDropDown />
            </Button>
          </Dropdown>
        </div>
      </div>

      {/* Divider */}
      <hr className="my-5 border-none border-t border-[#d9d9d9]" />

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-5 h-[calc(100%-150px)] overflow-hidden">
        {/* Steps Section - Left Column */}
        <div className="w-full lg:w-2/5">
          <div className="flex justify-between items-center mb-4 text-[20.16px] font-semibold">
            <span>Steps</span>
          </div>
          <StepsList
            onStepViewChange={handleStepViewChange}
            steps={steps}
            pipelineId={pipeline?._id || ""}
            date={formattedDate || ""}
            onStepDeleted={handleStepDeleted}
            groupId={pipeline?.data[0]?.group_id || ""}
            udfIdsMap={pipeline?.data[0]?.udf_ids || {}}
            onAddUDF={() => setIsAddUDFModalVisible(true)}
          />
        </div>

        {/* Code Editor Section - Right Column */}
        <div className="flex flex-col gap-[13px] w-full lg:w-3/5">
          {/* UDF Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap">UDF:</span>
              <div className="w-fit min-w-[200px] px-[11px] py-1 border border-[#d9d9d9] rounded-md bg-[#f5f5f5]">
                {loading
                  ? "Loading..."
                  : selectedUDF?.udf.name || "No UDF selected"}
              </div>
            </div>
            <Button
              type="default"
              onClick={handleEditUDF}
              disabled={!activeUDF || loading}>
              Edit UDF
            </Button>
          </div>

          {/* Code Editor Component */}
          <CodeEditor
            selectedUDF={
              !selectedUDF ? "No UDF selected" : selectedUDF.udf.code
            }
            loading={loading}
          />
        </div>
      </div>

      {/* Load Config Modal */}
      <LoadConfigModal
        visible={isLoadConfigModalVisible}
        onClose={() => setIsLoadConfigModalVisible(false)}
        onLoadConfig={handleLoadPipeline}
        dailyRunner={dailyRunner}
      />

      {/* Add UDF Modal */}
      <AddUDFModal
        visible={isAddUDFModalVisible}
        onClose={() => setIsAddUDFModalVisible(false)}
        onAddUDF={handleAddUDF}
        pipelineId={pipeline?._id || ""}
        tanggal={formattedDate || ""}
        childId={pipeline?.data[0]?.group_id || ""}
        type={isLab ? "cleaning-lab" : "cleansing"}
      />
    </div>
  );
};

export default CleansingConfigPage;

"use client";

import React, { useState, useRef } from "react";
import { Breadcrumb, DatePicker, Button, Upload, message } from "antd";
import { MdArrowForwardIos, MdOutlineFileUpload } from "react-icons/md";
import { AiOutlineCheck, AiOutlineLoading3Quarters } from "react-icons/ai";
import { HiDownload } from "react-icons/hi";
import Link from "next/link";
import DataInputTable, {
  DataInputTableRef,
} from "@/component/processes/DataInputTable";
import UploadDataModal from "@/component/processes/UploadDataModal";
import ConfirmationModal from "@/component/processes/ConfirmationModal";
import { useRouter } from "next/navigation";
import { useDateContext } from "@/context/DateContext";
import api from "@/utils/axios";
import { saveAs } from "file-saver";
import { HiHome } from "react-icons/hi2";

const InputDataPage: React.FC = () => {
  const [selectedRowKey, setSelectedRowKey] = useState<number | null>(1);
  const { selectedDate, formattedDate, externalData, loading, error } =
    useDateContext();
  const router = useRouter();
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDirectConfirmVisible, setIsDirectConfirmVisible] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dataTableRef = useRef<DataInputTableRef>(null);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const handleDownloadTemplate = async () => {
    if (selectedRowKey !== null) {
      const profileData = externalData.find((r) => r.key === selectedRowKey);
      if (profileData) {
        setLoadingTemplate(true);
        try {
          const response = await api.get(
            `/external_data/${profileData.profile_id}/template`,
            {
              responseType: "blob",
            }
          );
          const contentDisposition =
            response.headers["content-disposition"]?.trim();
          let filename = "defaultDownload.xlsx"; // Fallback filename
          if (contentDisposition) {
            const matches = /filename\s*=\s*"?([^";]+)"?/i.exec(
              contentDisposition
            );
            if (matches && matches[1]) {
              filename = matches[1];
            }
          }
          saveAs(response.data, filename);
        } catch (error) {
          console.error("Failed to download template:", error);
        } finally {
          setLoadingTemplate(false);
        }
      }
    }
  };

  const handleDownloadData = async () => {
    const profileData = externalData.find((r) => r.key === selectedRowKey);
    if (profileData) {
      setLoadingDownload(true);
      try {
        const response = await api.get(
          `/external_data/${profileData.profile_id}/download_excel?tanggal=${formattedDate}`
        );
        const contentDisposition =
          response.headers["content-disposition"]?.trim();
        let filename = "defaultDownload.xlsx"; // Fallback filename
        if (contentDisposition) {
          const matches = /filename\s*=\s*"?([^";]+)"?/i.exec(
            contentDisposition
          );
          if (matches && matches[1]) {
            filename = matches[1];
          }
        }
        saveAs(response.data, filename);
      } catch (error) {
        console.error("Failed to download data:", error);
      } finally {
        setLoadingDownload(false);
      }
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFileSelect = async (info: any) => {
    if (info.file.status === "error") {
      message.error(`${info.file.name} file upload failed.`);
      return;
    }

    if (info.file.status === "done") {
      setUploadedFileName(info.file.name);
      setUploadedFile(info.file);

      if (selectedRowKey !== null) {
        const profileData = externalData.find((r) => r.key === selectedRowKey);
        if (profileData) {
          setIsUploading(true);
          try {
            const response = await api.get(
              `/external_data_profile/${profileData.profile_id}`
            );
            const profileType = response.data.type;

            if (profileType === "monthly") {
              // For monthly type, show date range modal
              setIsModalVisible(true);
            } else if (profileType === "daily") {
              // For daily type, show confirmation modal
              setIsDirectConfirmVisible(true);
            }
          } catch (error) {
            console.error("Failed to fetch profile type:", error);
            message.error(
              "Failed to determine profile type. Please try again."
            );
          } finally {
            setIsUploading(false);
          }
        }
      }
    }
  };

  const handleDirectUpload = async () => {
    if (!uploadedFile || selectedRowKey === null) {
      message.error("No file or profile selected");
      return;
    }

    const profileData = externalData.find((r) => r.key === selectedRowKey);
    if (!profileData) {
      message.error("Profile data not found");
      return;
    }

    setIsSubmitting(true);
    setIsDirectConfirmVisible(false);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("excel_file", uploadedFile.originFileObj);

      // Add the same date for both start_date and end_date
      formData.append("start_date", formattedDate);
      formData.append("end_date", formattedDate);

      // Send the request
      const response = await api.post(
        `/external_data/${profileData.profile_id}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200) {
        message.success(`${uploadedFileName} uploaded successfully!`);

        // Refresh data table
        if (dataTableRef.current && profileData.profile_id) {
          await dataTableRef.current.fetchData(
            profileData.profile_id,
            formattedDate
          );
        }
      } else {
        message.error(
          `Upload failed: ${response.data.message || "Unknown error"}`
        );
      }
    } catch (err) {
      console.error("Failed to upload file:", err);
      message.error(
        `Upload failed: ${
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (err as any)?.response?.data?.message ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (err as any)?.message ||
          "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
      // Reset state
      setUploadedFile(null);
      setUploadedFileName("");
    }
  };

  const handleDirectConfirmCancel = () => {
    setIsDirectConfirmVisible(false);
    setUploadedFile(null);
    setUploadedFileName("");
  };

  const handleUploadSuccess = async () => {
    // Close the modal
    setIsModalVisible(false);

    // Reset state
    setUploadedFile(null);
    setUploadedFileName("");

    // Refresh data table
    if (selectedRowKey !== null) {
      const profileData = externalData.find((r) => r.key === selectedRowKey);
      if (profileData && dataTableRef.current) {
        await dataTableRef.current.fetchData(
          profileData.profile_id,
          formattedDate
        );
      }
    }
  };

  const handleModalCancel = () => {
    setUploadedFile(null);
    setUploadedFileName("");
    setIsModalVisible(false);
  };

  const beforeUpload = (file: File) => {
    const isXlsx =
      file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (!isXlsx) {
      message.error("You can only upload XLSX files!");
    }
    return isXlsx;
  };

  return (
    <div className="p-4 sm:p-5">
      <Breadcrumb
        separator={
          <MdArrowForwardIos
            size={16}
            className="align-middle inline-block"
            style={{ verticalAlign: "middle" }}
          />
        }
        items={[
          {
            title: (
              <Link href="/daily-routines " className="breadcrumbLink">
                <span className="text-neutral-300 text-20 font-semibold">
                  <HiHome className="inline-block mr-1 mb-0.5" />
                </span>
              </Link>
            ),
          },
          {
            title: (
              <Link href="/processes" className="breadcrumbLink">
                <span className="text-neutral-300 text-20 font-semibold">
                  Processes
                </span>
              </Link>
            ),
          },
          {
            title: (
              <span className="text-neutral-900 text-20 font-semibold">
                Input data
              </span>
            ),
          },
        ]}
        className="customBreadcrumb separatorSpacing mb-4"
      />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start mt-7 mb-6 gap-3">
        <DatePicker
          disabled
          value={selectedDate}
          format="dddd, DD MMMM YYYY"
          className="boldDatePicker w-full sm:w-[273px]"
        />
      </div>
      <div className="flex flex-col lg:flex-row rounded-lg overflow-hidden">
        {/* Data Column */}
        <div className="flex flex-col w-full lg:w-[287px] lg:flex-none">
          <div className="bg-neutral-250 p-3 font-semibold border border-neutral-300 flex justify-center items-center text-base sm:text-lg lg:text-20 h-[45px] shrink-0">
            Data
          </div>
          <div className="max-h-[300px] lg:max-h-none overflow-y-auto">
            {externalData.map((record) => (
              <div
                key={record.key}
                className={`bg-white flex items-center p-3 sm:p-4 cursor-pointer border-b border-l lg:border-l border-neutral-300 transition-colors ${
                  record.key === selectedRowKey
                    ? "bg-neutral-100"
                    : "hover:bg-neutral-50"
                }`}
                onClick={() =>
                  setSelectedRowKey(
                    record.key === selectedRowKey ? null : record.key
                  )
                }>
                <div className="mr-3 shrink-0">
                  {record.completed === 1 ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-primary-300 rounded-full flex items-center justify-center">
                      <AiOutlineCheck
                        color="#F3F4F8"
                        size={14}
                        className="sm:w-4 sm:h-4"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <AiOutlineLoading3Quarters className="w-5 h-5 sm:w-6 sm:h-6 text-secondary-300" />
                    </div>
                  )}
                </div>
                <span
                  className={`flex-1 text-sm sm:text-base ${
                    record.key === selectedRowKey
                      ? "font-semibold"
                      : "font-normal"
                  }`}>
                  {record.profile_name}
                </span>
                <MdArrowForwardIos className="text-neutral-900 shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            ))}
          </div>
        </div>

        {/* Viewer Column */}
        <div className="flex flex-col flex-1 mt-4 lg:mt-0">
          <div className="bg-neutral-250 p-3 font-semibold border border-neutral-300 flex justify-center items-center text-base sm:text-lg lg:text-20 h-[45px] shrink-0">
            Viewer
          </div>
          <div className="bg-white p-3 sm:p-4 flex flex-1 flex-col justify-between overflow-y-auto border-r border-b border-l border-neutral-300 min-h-[500px] lg:h-[700px]">
            {selectedRowKey !== null ? (
              <>
                <div className="flex flex-1 flex-col">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    {/* Download Buttons Row */}
                    <div className="flex flex-col sm:flex-row gap-2 lg:flex-1">
                      <Button
                        type="default"
                        icon={
                          <HiDownload size={18} className="sm:w-5 sm:h-5" />
                        }
                        className="flex items-center justify-center bg-secondary-300 text-white border-0 hover:bg-secondary-500 h-9 sm:h-10 text-sm sm:text-base font-semibold rounded"
                        onClick={handleDownloadData}
                        loading={loadingDownload}>
                        Download data
                      </Button>
                      <Button
                        type="default"
                        icon={
                          <HiDownload size={18} className="sm:w-5 sm:h-5" />
                        }
                        onClick={handleDownloadTemplate}
                        loading={loadingTemplate}
                        className="flex items-center justify-center bg-secondary-300 text-white border-0 hover:bg-secondary-500 h-9 sm:h-10 text-sm sm:text-base font-semibold rounded">
                        Download template
                      </Button>
                    </div>

                    {/* Profile Info */}
                    <div className="flex flex-col items-center text-center py-2 lg:px-4 lg:shrink-0">
                      <span className="text-sm sm:text-base font-medium text-neutral-900">
                        {
                          externalData.find((r) => r.key === selectedRowKey)
                            ?.profile_name
                        }
                      </span>
                      <span className="text-neutral-500 text-xs font-normal">
                        {`Version ${
                          externalData.find((r) => r.key === selectedRowKey)
                            ?.version
                        }`}
                      </span>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex flex-col sm:flex-row gap-2 lg:flex-1 lg:justify-end">
                      <Upload
                        showUploadList={false}
                        onChange={handleFileSelect}
                        accept=".xlsx"
                        beforeUpload={beforeUpload}>
                        <Button
                          type="default"
                          icon={
                            <MdOutlineFileUpload
                              size={18}
                              className="sm:w-5 sm:h-5"
                            />
                          }
                          className="flex items-center justify-center border border-neutral-700 text-neutral-900 hover:border-secondary-300 hover:text-secondary-300 h-9 sm:h-10 text-sm sm:text-base font-semibold rounded w-full"
                          loading={isUploading}>
                          Upload template
                        </Button>
                      </Upload>
                      <Button className="border border-neutral-700 text-neutral-900 hover:border-secondary-300 hover:text-secondary-300 h-9 sm:h-10 text-sm sm:text-base font-semibold rounded">
                        Refresh
                      </Button>
                      <Button
                        type="primary"
                        onClick={() => {
                          router.push(
                            `/processes/input-data/edit?key=${selectedRowKey}`
                          );
                        }}
                        className="bg-primary-300 hover:bg-primary-500 border-0 h-9 sm:h-10 text-sm sm:text-base font-semibold rounded">
                        Edit
                      </Button>
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4 lg:mx-0 lg:px-0">
                    <DataInputTable
                      ref={dataTableRef}
                      readOnly={true}
                      profileDataId={
                        externalData.find((r) => r.key === selectedRowKey)
                          ?.profile_id
                      }
                      tanggal={formattedDate}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-neutral-500 text-sm sm:text-base">
                  Select an item to view content
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      <UploadDataModal
        isVisible={isModalVisible}
        onCancel={handleModalCancel}
        uploadedFileName={uploadedFileName}
        uploadedFile={uploadedFile}
        profileId={
          externalData.find((r) => r.key === selectedRowKey)?.profile_id
        }
        onSuccess={handleUploadSuccess}
      />

      <ConfirmationModal
        isVisible={isDirectConfirmVisible}
        onOk={handleDirectUpload}
        onCancel={handleDirectConfirmCancel}
        confirmLoading={isSubmitting}
      />
    </div>
  );
};

export default InputDataPage;

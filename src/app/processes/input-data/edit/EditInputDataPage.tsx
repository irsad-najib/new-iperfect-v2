"use client";

import React, { useState, Suspense, useRef } from "react";
import { Breadcrumb, DatePicker, Button, Switch, message } from "antd";
import { MdArrowForwardIos, MdRestartAlt, MdOutlineUndo } from "react-icons/md";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DataInputTable from "@/components/processes/input-data/DataInputTable";
import { useDateContext } from "@/context/DateContext";
import { useRouter } from "next/navigation";
import { HiHome } from "react-icons/hi";

const SearchParamsWrapper: React.FC<{
  children: (key: number) => React.ReactNode;
}> = ({ children }) => {
  const searchParams = useSearchParams();
  const selectedRowKey = Number(searchParams.get("key"));
  return <>{children(selectedRowKey)}</>;
};

const EditInputDataPage: React.FC = () => {
  const { selectedDate, formattedDate, externalData, refreshData } =
    useDateContext();
  const [autoSave, setAutoSave] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const saveRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const router = useRouter();

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      if (saveRef.current) {
        await saveRef.current();
        await refreshData();
        message.success(`Data saved successfully!`, 2);
        router.push("/processes/input-data");
      }
    } catch (error) {
      // Handle error, maybe show an error message
      console.error("Failed to save:", error);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsWrapper>
        {(selectedRowKey) => (
          <div className="p-4 sm:px-5 sm:py-4">
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
                    <Link href="/daily-routines" className="breadcrumbLink">
                      <span className="text-neutral-300 text-20 font-semibold">
                        <HiHome className="inline-block mr-1 mb-0.5" />
                      </span>
                    </Link>
                  ),
                },
                {
                  title: (
                    <Link
                      href="/processes"
                      className="no-underline text-inherit bg-transparent">
                      <span className="inline-block">Processes</span>
                    </Link>
                  ),
                },
                {
                  title: (
                    <Link
                      href="/processes/input-data"
                      className="no-underline text-inherit bg-transparent">
                      <span className="inline-block">Input data</span>
                    </Link>
                  ),
                },
                {
                  title: <span className="font-semibold">Edit</span>,
                },
              ]}
              className="[&_.ant-breadcrumb-link]:font-normal [&_.ant-breadcrumb-link:hover]:bg-transparent [&_.ant-breadcrumb-separator]:mx-1.5 [&_.ant-breadcrumb-separator]:flex [&_.ant-breadcrumb-separator]:items-center mb-4"
            />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between mb-4">
              <DatePicker
                disabled
                value={selectedDate}
                format="dddd, DD MMMM YYYY"
                className="boldDatePicker w-full sm:w-[273px]"
              />
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-17 font-semibold">
                  Autosave
                </span>
                <Switch
                  className="customSwitch"
                  checked={autoSave}
                  onChange={(checked) => setAutoSave(checked)}
                />
              </div>
            </div>
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-5">
              <div className="hidden lg:block lg:flex-1"></div>
              <div className="flex flex-col items-center text-center lg:shrink-0">
                <span className="text-xl sm:text-2xl font-semibold text-neutral-900">
                  {
                    externalData.find((r) => r.key === selectedRowKey)
                      ?.profile_name
                  }
                </span>
                <span className="text-neutral-500 text-xs font-normal">
                  {`Version ${
                    externalData.find((r) => r.key === selectedRowKey)?.version
                  }`}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 lg:flex-1 lg:justify-end">
                <Button
                  icon={<MdOutlineUndo size={20} className="sm:w-6 sm:h-6" />}
                  className="border border-neutral-700 text-neutral-900 hover:border-secondary-300 hover:text-secondary-300 h-10 sm:h-11 text-sm sm:text-base font-semibold rounded"
                />
                <Button
                  icon={<MdRestartAlt size={20} className="sm:w-6 sm:h-6" />}
                  className="border border-neutral-700 text-neutral-900 hover:border-secondary-300 hover:text-secondary-300 h-10 sm:h-11 text-sm sm:text-base font-semibold rounded"
                />
                <Button
                  type="primary"
                  onClick={() => {}}
                  className="border border-neutral-700 text-neutral-900 hover:border-secondary-300 hover:text-secondary-300 h-10 sm:h-11 text-sm sm:text-base font-semibold rounded bg-white hover:bg-white">
                  Paste
                </Button>
                <Button
                  type="primary"
                  onClick={handleSave}
                  loading={saveLoading}
                  className="bg-primary-300 hover:bg-primary-500 border-0 h-10 sm:h-11 text-sm sm:text-base font-semibold rounded">
                  Save
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5 lg:mx-0 lg:px-0">
              <DataInputTable
                readOnly={false}
                tanggal={formattedDate}
                profileDataId={
                  externalData.find((r) => r.key === selectedRowKey)?.profile_id
                }
                onSave={saveRef}
              />
            </div>
            {/* <TestTable /> */}
          </div>
        )}
      </SearchParamsWrapper>
    </Suspense>
  );
};

export default EditInputDataPage;

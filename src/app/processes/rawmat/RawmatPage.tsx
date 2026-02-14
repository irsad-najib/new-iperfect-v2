"use client";
// import React from "react";
import { Breadcrumb, Button, DatePicker } from "antd";
import { MdArrowForwardIos, MdSettings, MdRestartAlt } from "react-icons/md";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDateContext } from "@/context/DateContext";
import RawmatTable from "@/components/processes/rawmat/RawmatTable";

const RawmatPage = () => {
  const router = useRouter();
  const { selectedDate, setSelectedDate } = useDateContext();
  return (
    <div>
      <div className="flex items-center justify-between">
        <Breadcrumb
          separator={<MdArrowForwardIos size={16} />}
          items={[
            {
              title: (
                <Link
                  href="/processes"
                  className="text-neutral-300 hover:text-neutral-900 transition-colors">
                  <span className="text-2xl font-semibold">Processes</span>
                </Link>
              ),
            },
            {
              title: (
                <span className="text-neutral-900 text-2xl font-semibold">
                  RawMat
                </span>
              ),
            },
          ]}
          className="[&_.ant-breadcrumb-separator]:mx-1.5 [&_.ant-breadcrumb-separator]:flex [&_.ant-breadcrumb-separator]:items-center"
        />
      </div>
      <div className="flex justify-between items-center mb-[18px] mt-7">
        <div>
          <DatePicker
            disabled
            value={selectedDate}
            onChange={(date) => {
              if (date) setSelectedDate(date);
            }}
            defaultValue={null}
            format="dddd, DD MMMM YYYY"
            className="[&_.ant-picker-input>input]:font-semibold"
          />
        </div>
        <div className="flex gap-3">
          <Button
            type="primary"
            className="bg-primary-300 hover:bg-primary-500! border-0 h-11 text-20 rounded-lg font-semibold flex items-center gap-2"
            onClick={() => router.push("/processes/rawmat/rawmat-config")}>
            <MdSettings size={28} />
            Set config
          </Button>
          <Button
            type="primary"
            className="bg-danger hover:bg-danger! border-0 h-11 text-20 rounded-lg font-semibold flex items-center gap-2">
            <MdRestartAlt size={28} />
            Reset all
          </Button>
        </div>
      </div>
      <RawmatTable
        formattedDate={
          selectedDate ? selectedDate.format("dddd, DD MMMM YYYY") : ""
        }
      />
    </div>
  );
};
export default RawmatPage;

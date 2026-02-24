"use client";
import React, { useState } from "react";
import { Breadcrumb, Button, DatePicker, Dropdown } from "antd";
import { MdArrowForwardIos } from "react-icons/md";
import { Tabs } from "antd";
import Link from "next/link";
import { useDateContext } from "@/context/DateContext";
import BBTable from "@/components/bb/BB-table";
import api from "@/utils/axios";

const formatTanggalID = (iso: string) => {
  if (!iso) return "";
  // Pastikan pakai format YYYY-MM-DD
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso; // fallback kalau invalid
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

const DailySummary = () => {
  const { selectedDate } = useDateContext();
  const [active, setActive] = useState("Konsumsi");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchPerformanceData = async (tanggal: string) => {
    try {
      setLoading(true);
      const resp = await api.get(
        "/bb/daily/summary/performance_figure/get-by-args",
        {
          params: { tanggal },
        },
      );
      setPerformanceData(resp.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error fetching performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!selectedDate) return;
    const tanggal = selectedDate.format("YYYY-MM-DD");

    if (active === "Performance_figure") {
      fetchPerformanceData(tanggal);
    }
  }, [active, selectedDate]);

  const SummaryData = {
    last_modified: 1697049600, // Contoh timestamp
  };

  const tabList = [
    { key: "Konsumsi", label: "Konsumsi" },
    { key: "Produksi_energi", label: "Produksi dan Energi" },
    { key: "Distribusi_stock", label: "Distribusi dan Stock" },
    { key: "Performance_figure", label: "Performance Figure" },
  ];

  // const handleCellEdit = (rowIndex: number, dataIndex: string) => {
  //   console.log(`Cell edited at row ${rowIndex}, column ${dataIndex}`);
  //   // Implement your cell edit logic here
  // };

  // const currentData = active === "Performance_figure" ? performanceData : null;

  return (
    <div>
      <Breadcrumb
        separator={<MdArrowForwardIos size={16} />}
        items={[
          {
            title: (
              <Link
                href="/bb"
                className="text-neutral-300 hover:text-neutral-900 transition-colors">
                <span className="text-2xl font-semibold">Boiler Batubara</span>
              </Link>
            ),
          },
          {
            title: (
              <span className="text-neutral-900 text-2xl font-semibold">
                Batubara dan Produksi Steam
              </span>
            ),
          },
        ]}
        className="[&_.ant-breadcrumb-separator]:mx-1.5 [&_.ant-breadcrumb-separator]:flex [&_.ant-breadcrumb-separator]:items-center"
      />

      <div className="flex justify-between items-center mb-[18px] mt-7">
        <div>
          <DatePicker
            disabled
            value={selectedDate}
            format="dddd, DD MMMM YYYY"
            className="[&_.ant-picker-input>input]:font-semibold"
          />
        </div>
      </div>
      {/* Tabs + Actions */}
      <div className="flex justify-between items-center gap-4">
        <Tabs
          activeKey={active}
          onChange={setActive}
          items={tabList}
          className="customTabs"
        />

        <Button
          type="primary"
          //   onClick={handleDownloadSAP}
          className={"customPrimaryButton btn-md"}>
          Download SAP
        </Button>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <span>Data: </span>
          <strong>
            {formatTanggalID(
              selectedDate ? selectedDate.format("YYYY-MM-DD") : "",
            )}
          </strong>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#8c8c8c]">
            (Last modified:{" "}
            {SummaryData?.last_modified
              ? new Date(SummaryData.last_modified * 1000).toLocaleString(
                  "id-ID",
                )
              : "N/A"}
            )
          </span>
          <div className="flex items-center gap-2">
            <span>Status Input General: </span>
            <Dropdown
              menu={{
                items: [
                  { key: "in-progress", label: "In progress" },
                  { key: "done", label: "Done" },
                ],
              }}>
              <Button type="default" className="btn-md">
                In progress
                <MdArrowForwardIos size={18} className="rotate-90 ml-1" />
              </Button>
            </Dropdown>
          </div>
        </div>
      </div>

      {active === "Performance_figure" && (
        <div className="mt-6">
          {loading ? (
            <div>Loading...</div>
          ) : performanceData ? (
            <BBTable data={performanceData} />
          ) : (
            <div className="text-center p-6 text-[#888]">No Data</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DailySummary;

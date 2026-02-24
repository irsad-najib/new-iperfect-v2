"use client";
import React, { useEffect } from "react";
import { Breadcrumb, Button, DatePicker, message } from "antd";
import { MdArrowForwardIos } from "react-icons/md";
import Link from "next/link";
import { useDateContext } from "@/context/DateContext";
import Search from "antd/es/input/Search";
import BBTable from "@/components/bb/BB-table";
import api from "@/utils/axios";

const CounterCheck = () => {
  const { selectedDate } = useDateContext();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [counterData, setCounterData] = React.useState<any>([]);

  useEffect(() => {
    const CounterCheckData = async () => {
      console.log("Fetching Counter Check Data DCS...");
      try {
        const data = await api.get("bb/daily/counter_check_dcs/get-by-args", {
          params: { tanggal: selectedDate?.format("YYYY-MM-DD") },
        });
        setCounterData(data.data);
        console.log(data.data);
        return data;
      } catch (error) {
        message.error("Failed to fetch Counter Check Data DCS");
        console.error("Error fetching Counter Check Data DCS:", error);
      }
    };

    CounterCheckData();
  }, [selectedDate]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCellEdit = async (record: any, dataIndex: string) => {
    console.log(`Cell clicked at row ${record.dataIndex}, column ${dataIndex}`);

    // Check if the cell has selected property (checkbox cell)
    const cellMeta = record._cellColors?.[dataIndex];
    if (cellMeta && cellMeta.selected !== undefined) {
      // Toggle selected state
      const newSelected = !cellMeta.selected;

      // Update local state immediately for better UX
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCounterData((prevData: any) => {
        const newData = { ...prevData };
        const row = newData.row[record.dataIndex];
        const item = row.items.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (item: any) => item.start_column_key === dataIndex,
        );
        if (item) {
          item.selected = newSelected;
        }
        return newData;
      });

      // Send edit request to API
      try {
        const requestBody = {
          column_keys: counterData.column_keys,
          header: counterData.header,
          row: counterData.row,
        };

        const response = await api.post(
          "bb/daily/counter_check_dcs/edit",
          requestBody,
        );

        if (response.data.message) {
          message.success(response.data.message);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        message.error(
          error.response?.data?.message || "Failed to save changes",
        );
        // Revert the change on error
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setCounterData((prevData: any) => {
          const newData = { ...prevData };
          const row = newData.row[record.dataIndex];
          const item = row.items.find(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (item: any) => item.start_column_key === dataIndex,
          );
          if (item) {
            item.selected = !newSelected; // Revert back
          }
          return newData;
        });
      }
    }
  };
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
                Counter Check Data DCS
              </span>
            ),
          },
        ]}
        className="[&_.ant-breadcrumb-separator]:mx-1.5 [&_.ant-breadcrumb-separator]:flex [&_.ant-breadcrumb-separator]:items-center"
      />

      <div className="mt-7 mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <DatePicker
            disabled
            value={selectedDate}
            format="dddd, DD MMMM YYYY"
            className="[&_.ant-picker-input>input]:font-semibold"
          />
          <Search placeholder="Search" />
        </div>
        <Button type="primary">Re-sync data</Button>
      </div>

      <BBTable
        data={counterData}
        isLastRowSticky={true}
        onCellClick={handleCellEdit}
      />
    </div>
  );
};

export default CounterCheck;

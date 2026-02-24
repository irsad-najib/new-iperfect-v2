"use client";
import React, { useState } from "react";
import { Collapse } from "antd";
import { MdKeyboardArrowRight } from "react-icons/md";
import BBTable from "@/components/bb/BB-table";

interface KonversiAccordionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any; // Dynamic data object
  onCellClick?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: any,
    dataIndex: string,
    columnKey: string,
    types?: string,
  ) => void;
  onNullCellClick?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: any,
    dataIndex: string,
    columnKey: string,
    types?: string,
  ) => void;
}

const KonversiAccordion: React.FC<KonversiAccordionProps> = ({
  data,
  onCellClick,
  onNullCellClick,
}) => {
  const [activeKey, setActiveKey] = useState<string | string[]>([]);

  // Identify keys that should be excluded (metadata keys)
  const excludedKeys = [
    "status",
    "last_modified",
    "config_id",
    "data_id",
    "tanggal",
    "message",
  ];

  // Helper function to calculate total MMBTU (if applicable)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calculateTotalMMBTU = (tableData: any) => {
    if (!tableData || !tableData.row || !Array.isArray(tableData.row)) {
      return 0;
    }

    let total = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tableData.row.forEach((row: any) => {
      if (row.items && Array.isArray(row.items)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        row.items.forEach((item: any) => {
          if (
            item.cell_ref_key &&
            item.cell_ref_key.includes("mmbtu") &&
            typeof item.value === "number"
          ) {
            total += item.value;
          }
        });
      }
    });

    return total;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countItems = (tableData: any) => {
    if (!tableData || !tableData.row || !Array.isArray(tableData.row)) {
      return 0;
    }
    return tableData.row.length;
  };

  // Dynamically generate items based on data keys
  const items = Object.keys(data || {})
    .filter((key) => !excludedKeys.includes(key))
    .filter((key) => {
      // Ensure the value looks like a table object (has row and header)
      const val = data[key];
      return val && typeof val === "object" && val.row && val.header;
    })
    .map((key, index) => {
      const sectionData = data[key];
      const types = key; // Use the key as the type identifier

      // Extract label from table_name or format the key
      const label =
        sectionData?.table_name ||
        key
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

      // Optional extra content (like Rawmat)
      let extraContent = null;
      // We can enable extra content based on specific keys if needed
      // For now, let's show it if there are rows
      if (sectionData.row && sectionData.row.length > 0) {
        // Only show MMBTU if meaningful (optional logic)
        const mmbtu = calculateTotalMMBTU(sectionData);
        if (mmbtu > 0) {
          extraContent = (
            <div className="flex items-center gap-4">
              <span className="bg-[#1890ff] text-white px-3 py-0.5 rounded-full text-sm font-medium min-w-6 text-center">
                {countItems(sectionData)}
              </span>
              <span className="text-[#595959] text-sm font-medium">
                Total MMBTU: {mmbtu.toFixed(2)}
              </span>
            </div>
          );
        }
      }

      return {
        key: String(index + 1),
        label: (
          <div className="flex items-center gap-3">
            <span>{label}</span>
          </div>
        ),
        children: (
          <div className="relative z-0">
            <BBTable
              data={sectionData}
              onCellClick={(rec, di, ck) => onCellClick?.(rec, di, ck, types)}
              showAddButtonForNull={true}
              onNullCellClick={(rec, di, ck) =>
                onNullCellClick?.(rec, di, ck, types)
              }
              autoHeight={false}
            />
          </div>
        ),
        extra: extraContent,
      };
    });

  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-[#8c8c8c] text-sm">
        No data sections found.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Collapse
        activeKey={activeKey}
        onChange={setActiveKey}
        expandIcon={({ isActive }) => (
          <div
            style={{
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              backgroundColor: isActive ? "#ff8c00" : "#f5f5f5",
              transition: "all 0.3s",
            }}>
            <MdKeyboardArrowRight
              size={20}
              style={{
                transform: isActive ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.3s",
                color: isActive ? "#ffffff" : "#262626",
              }}
            />
          </div>
        )}
        items={items.map((item) => ({
          key: item.key,
          label: (
            <div className="flex justify-between items-center w-full">
              {item.label}
              {item.extra && (
                <div
                  className="flex items-center gap-4 mr-2"
                  onClick={(e) => e.stopPropagation()}>
                  {item.extra}
                </div>
              )}
            </div>
          ),
          children: item.children,
        }))}
        className="
          bg-transparent border-none relative z-999
          [&_.ant-collapse-item]:mb-0
          [&_.ant-collapse-item]:border-0
          [&_.ant-collapse-item]:border-b-2
          [&_.ant-collapse-item]:border-b-[#d9d9d9]
          [&_.ant-collapse-item]:rounded-none!
          [&_.ant-collapse-item]:overflow-visible
          [&_.ant-collapse-item]:bg-[#f5f5f5]
          [&_.ant-collapse-header]:p-[16px_20px]!
          [&_.ant-collapse-header]:bg-[#f5f5f5]
          [&_.ant-collapse-header]:font-semibold!
          [&_.ant-collapse-header]:text-base!
          [&_.ant-collapse-header]:items-center!
          hover:[&_.ant-collapse-header]:bg-[#ebebeb]
          [&_.ant-collapse-content]:border-t-0
          [&_.ant-collapse-content]:bg-transparent
          [&_.ant-collapse-content]:overflow-visible!
          [&_.ant-collapse-content-box]:p-0!
          [&_.ant-collapse-content-box]:overflow-visible!
        "
      />
    </div>
  );
};

export default KonversiAccordion;

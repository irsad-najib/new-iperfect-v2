"use client";
import React, { useState } from "react";
import { Collapse } from "antd";
import { MdKeyboardArrowRight } from "react-icons/md";
import BBTable from "@/components/bb/BB-table";

interface CellItem {
  cell_ref_key?: string;
  value?: number | string | null;
}

interface TableRow {
  items?: CellItem[];
}

interface SectionData {
  table_name?: string;
  row?: TableRow[];
}

interface RawmatData {
  input_materials?: SectionData;
  steam_production_distribution?: SectionData;
  input_rawmat?: SectionData;
  output_rawmat?: SectionData;
  other?: SectionData;
  check_balance?: SectionData;
  rpf?: SectionData;
}

interface RawmatAccordionProps {
  data: RawmatData;
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

const RawmatAccordion: React.FC<RawmatAccordionProps> = ({
  data,
  onCellClick,
  onNullCellClick,
}) => {
  const [activeKey, setActiveKey] = useState<string | string[]>([]);

  const calculateTotalMMBTU = (tableData: SectionData): number => {
    if (!tableData.row || !Array.isArray(tableData.row)) return 0;

    let total = 0;
    tableData.row.forEach((row) => {
      row.items?.forEach((item) => {
        if (
          item.cell_ref_key?.includes("mmbtu") &&
          typeof item.value === "number"
        ) {
          total += item.value;
        }
      });
    });
    return total;
  };

  const countItems = (tableData: SectionData): number =>
    tableData.row?.length ?? 0;

  const sectionsWithExtra: (keyof RawmatData)[] = [
    "input_rawmat",
    "output_rawmat",
  ];

  const dataKeys = (Object.keys(data) as (keyof RawmatData)[]).filter(
    (key) => data[key] != null && typeof data[key] === "object",
  );

  const items = dataKeys.map((key, index) => {
    const sectionData = data[key] as SectionData;

    const label =
      sectionData.table_name ||
      String(key)
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    const extraContent = sectionsWithExtra.includes(key) ? (
      <div className="flex items-center gap-4">
        <span className="bg-blue-500 text-white px-3 py-0.5 rounded-full text-sm font-medium min-w-6 text-center">
          {countItems(sectionData)}
        </span>
        <span className="text-gray-600 text-sm font-medium">
          Total MMBTU: {calculateTotalMMBTU(sectionData).toFixed(2)}
        </span>
      </div>
    ) : null;

    return {
      key: String(index + 1),
      label,
      children: (
        <BBTable
          data={sectionData}
          onCellClick={(rec, di, ck) => onCellClick?.(rec, di, ck, String(key))}
          showAddButtonForNull={true}
          onNullCellClick={(rec, di, ck) =>
            onNullCellClick?.(rec, di, ck, String(key))
          }
          autoHeight={false}
        />
      ),
      extra: extraContent,
    };
  });

  return (
    <div className="mt-6">
      <Collapse
        activeKey={activeKey}
        onChange={setActiveKey}
        bordered={false}
        className="bg-transparent"
        expandIcon={({ isActive }) => (
          <div
            className="flex items-center justify-center w-8 h-8 rounded-md transition-all duration-300"
            style={{ backgroundColor: isActive ? "#ff8c00" : "#f5f5f5" }}>
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
          className:
            "!mb-0 !border-0 !border-b-2 !border-gray-300 !rounded-none !overflow-hidden !bg-gray-100",
          styles: {
            header: {
              padding: "16px 20px",
              background: "#f5f5f5",
              fontWeight: 600,
              fontSize: 16,
            },
            body: { padding: 0 },
          },
          label: (
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-3">
                <span>{item.label}</span>
              </div>
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
      />
    </div>
  );
};

export default RawmatAccordion;

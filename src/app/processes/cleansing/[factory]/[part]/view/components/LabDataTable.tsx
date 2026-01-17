"use client";

/**
 * LabDataTable Component - Dynamic laboratory test data table
 *
 * This component renders laboratory test results in a hierarchical table format with:
 * - Dynamic column generation based on test times
 * - Nested header structure: Unit → Parameter → Test Times
 * - Support for multiple spec tests per parameter
 * - Automatic column grouping and spanning
 * - Row highlighting for different parameters
 * - Responsive horizontal scrolling
 *
 * Data Structure:
 * - Units (e.g., PKT, UGM, NPK-02)
 * - Parameters per unit (e.g., Temperature, pH, Density)
 * - Spec tests per parameter
 * - Multiple test times with values
 *
 * Example:
 * Unit: PKT
 *   Parameter: Temperature
 *     Spec: temp_top
 *       Times: [07:00, 14:00, 21:00]
 *     Spec: temp_bottom
 *       Times: [07:00, 14:00, 21:00]
 *
 * @component
 * @responsive - Horizontal scroll enabled for wide nested structure
 */

import React from "react";
import { Table, Empty, Spin, Button } from "antd";
import type { ColumnGroupType, ColumnType } from "antd/es/table";
import { MdOutlineStickyNote2 } from "react-icons/md";

/**
 * Single test result data point
 */
interface DataPoint {
  value: number;
  time: string;
  is_same?: boolean;
}

/**
 * Lab specification test result
 */
interface LabSpec {
  id_spec_uji: number;
  nama_spec_uji: string;
  data: DataPoint[];
}

/**
 * Raw lab data entity from API
 */
interface RawLabData {
  _id: string;
  tanggal: string;
  id_item: number;
  tag_name: string;
  item_name: string;
  data: LabSpec[];
  cleaned: boolean;
  lab_id: number;
}

/**
 * Flat table row structure for display
 */
interface LabDataRow {
  key: string;
  unit: string;
  parameter: string;
  spec: string;
  name_alias?: string;
  [key: string]: string | number | undefined; // Dynamic time columns
}

/**
 * Props for LabDataTable component
 */
interface LabDataTableProps {
  rawLabData: RawLabData[];
  isRawDataLoading: boolean;
  error: string | null;
  filterOption: "all" | "affected";
  currentPage: number;
  pageSize: number;
  factoryName: string;
  partName: string;
  onViewLogs: (alias: string) => void;
  onPageChange: (page: number, size: number) => void;
}

const LabDataTable: React.FC<LabDataTableProps> = ({
  rawLabData,
  isRawDataLoading,
  error,
  currentPage,
  pageSize,
  onViewLogs,
  onPageChange,
}) => {
  /**
   * Transforms nested lab data into flat table rows
   * Each spec becomes one row with dynamic time columns
   */
  const transformLabData = (): LabDataRow[] => {
    if (!rawLabData || rawLabData.length === 0) return [];

    const rows: LabDataRow[] = [];

    rawLabData.forEach((item) => {
      item.data.forEach((spec) => {
        const row: LabDataRow = {
          key: `${item.tag_name}-${spec.nama_spec_uji}`,
          unit: item.tag_name,
          parameter: item.item_name,
          spec: spec.nama_spec_uji,
          name_alias: item.tag_name,
        };

        // Add time-value pairs as dynamic columns
        spec.data.forEach((dataPoint) => {
          row[dataPoint.time] = dataPoint.value;
        });

        rows.push(row);
      });
    });

    return rows;
  };

  /**
   * Collects all unique test times across all specs
   * Used to generate time columns
   */
  const getAllTimes = (): string[] => {
    if (!rawLabData || rawLabData.length === 0) return [];

    const timesSet = new Set<string>();

    rawLabData.forEach((item) => {
      item.data.forEach((spec) => {
        spec.data.forEach((dataPoint) => {
          timesSet.add(dataPoint.time);
        });
      });
    });

    // Sort times chronologically (HH:MM format)
    return Array.from(timesSet).sort((a, b) => {
      const [hourA, minA] = a.split(":").map(Number);
      const [hourB, minB] = b.split(":").map(Number);
      return hourA * 60 + minA - (hourB * 60 + minB);
    });
  };

  /**
   * Calculates row span for unit column
   * Spans all specs for that unit/tag_name
   */
  const getUnitRowSpan = (tagName: string): number => {
    const item = rawLabData.find((item) => item.tag_name === tagName);
    if (!item) return 0;

    return item.data.length;
  };

  /**
   * Generates table columns with nested headers and row spanning
   * Structure: [Unit | Parameter | Spec | Time1 | Time2 | ... | Actions]
   */
  const generateColumns = (): (
    | ColumnType<LabDataRow>
    | ColumnGroupType<LabDataRow>
  )[] => {
    const times = getAllTimes();
    transformLabData(); // Called for side effects

    // Track which rows have been spanned
    const spannedUnits = new Set<string>();

    return [
      {
        title: "Unit",
        dataIndex: "unit",
        key: "unit",
        fixed: "left",
        width: 120,
        className: "font-semibold",
        onCell: (record: LabDataRow) => {
          const tagName = record.unit as string;

          if (spannedUnits.has(tagName)) {
            return { rowSpan: 0 };
          }

          spannedUnits.add(tagName);
          const rowSpan = getUnitRowSpan(tagName);

          return {
            rowSpan: rowSpan,
            style: {
              backgroundColor: "#e6e6e6",
              textAlign: "center",
              verticalAlign: "middle",
              padding: "8px",
              fontWeight: 600,
            },
          };
        },
      },
      {
        title: "Parameter",
        dataIndex: "parameter",
        key: "parameter",
        fixed: "left",
        width: 150,
        className: "font-semibold",
        onCell: () => ({
          style: {
            backgroundColor: "#f1f2f3",
            textAlign: "center",
            verticalAlign: "middle",
            padding: "8px",
            fontWeight: 600,
          },
        }),
      },
      {
        title: "Spec",
        dataIndex: "spec",
        key: "spec",
        fixed: "left",
        width: 150,
        onCell: () => ({
          style: {
            backgroundColor: "#f5f5f5",
            textAlign: "center",
            padding: "8px",
          },
        }),
      },
      ...times.map((time) => ({
        title: time,
        dataIndex: time,
        key: time,
        width: 100,
        onCell: () => ({
          style: {
            backgroundColor: "#eeeff1",
            textAlign: "center" as const,
            padding: "8px",
          },
        }),
        render: (value: number) => (value !== undefined ? value : "-"),
      })),
      {
        title: "Action",
        key: "action",
        fixed: "right" as const,
        width: 100,
        onCell: () => ({
          style: {
            backgroundColor: "#f5f5f5",
            textAlign: "center",
            padding: "8px",
          },
        }),
        render: (_: unknown, record: LabDataRow) => (
          <Button
            type="text"
            icon={<MdOutlineStickyNote2 size={20} />}
            onClick={() => {
              if (record.name_alias) {
                onViewLogs(record.name_alias);
              }
            }}
            className="flex items-center justify-center"
          />
        ),
      },
    ];
  };

  if (isRawDataLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh] flex-col gap-4">
        <Spin size="large" />
        <p className="text-base text-neutral-500 m-0">Loading lab data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Empty description={error} />
      </div>
    );
  }

  if (!rawLabData || rawLabData.length === 0) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Empty description="No lab data available" />
      </div>
    );
  }

  const dataSource = transformLabData();

  return (
    <Table
      className="bg-white [&_.ant-table-thead>tr>th]:bg-[#e6e6e6] [&_.ant-table-thead>tr>th]:text-center [&_.ant-table-thead>tr>th]:p-2 [&_.ant-table-thead>tr>th]:text-[16.8px] [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-tbody>tr>td]:text-center [&_.ant-table-measure-row]:hidden"
      columns={generateColumns()}
      dataSource={dataSource}
      pagination={{
        current: currentPage,
        pageSize: pageSize,
        total: dataSource.length,
        showSizeChanger: true,
        pageSizeOptions: ["10", "25", "50", "100"],
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} of ${total} items`,
        onChange: onPageChange,
      }}
      scroll={{ x: "max-content", y: 600 }}
      bordered
    />
  );
};

export default LabDataTable;

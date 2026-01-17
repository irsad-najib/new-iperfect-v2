"use client";

/**
 * DataTable Component - Advanced hourly data table with editing capabilities
 *
 * This component displays time-series data in a table format with:
 * - 25 hourly columns (00:00 to 24:00)
 * - Summary columns: Total, Difference, Average, TDA
 * - Cell-level editing with overwrite modal
 * - Cell-level revert with revert modal
 * - Color-coded cells:
 *   - Orange (#F47920): Affected by cleansing
 *   - Green (#00AD17): User-modified values
 *   - Default (#f1f2f3): Normal values
 * - Hover effects and edit icons
 * - Search highlighting
 *
 * Data Types Supported:
 * - Raw DCS: Original DCS values
 * - Raw Adpro: Original Adpro values
 * - Cleaned: Values after cleansing pipeline
 * - Overwrited: User-modified values
 *
 * @component
 * @responsive - Horizontal scroll enabled for wide table
 */

import React, { useState } from "react";
import { Table } from "antd";
import type { ColumnType } from "antd/es/table";
import { MdEdit } from "react-icons/md";
import type { CleanData, RawData } from "@/types";

/**
 * Overwrite modification record
 */
interface OverwriteData {
  tag: string;
  data_field: string;
  value_before: number;
  value_after: number;
  formula: string;
}

/**
 * Table row structure for display
 */
interface DataTableRow {
  key: string;
  tag: string;
  unit: string | number | undefined;
  [key: string]: string | number | undefined; // Dynamic time columns and summary fields
}

/**
 * Props for DataTable component
 */
interface DataTableProps {
  rawDCSData: RawData[];
  rawAdproData: RawData[];
  cleanedData: CleanData[];
  modifiedData: CleanData[];
  isRawDataLoading: boolean;
  isCleanDataLoading: boolean;
  error: string | null;
  searchText: string;
  filterOption: "all" | "affected";
  currentPage: number;
  pageSize: number;
  factoryName: string;
  partName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCellClick: (record: any, hour: number | string) => void;
  onRevertClick: (
    record: CleanData,
    hour: number | string
  ) => void | Promise<void>;
  onViewLogs: (alias: string) => void;
  onPageChange: (page: number, size: number) => void;
}

const DataTable: React.FC<DataTableProps> = ({
  cleanedData,
  searchText,
  onCellClick,
}) => {
  const [overwriteData] = useState<OverwriteData[]>([]);

  /**
   * Transforms API data into table rows format
   * Converts hours object into individual columns
   */
  const transformData = (): DataTableRow[] => {
    const data: RawData[] | CleanData[] = cleanedData;
    if (!data) return [];

    return data.map((item, index) => {
      const row: DataTableRow = {
        key: `${item.tag}-${index}`,
        tag: item.tag,
        unit: item.unit,
        total: item.total,
        difference: item.difference,
        average: item.average,
        tda: item.tda,
      };

      // Add hourly columns
      if (item.hours) {
        Object.keys(item.hours).forEach((time) => {
          row[time] = item.hours[time];
        });
      }

      return row;
    });
  };

  /**
   * Checks if a cell has been modified by user overwrite
   */
  const isModifiedCell = (tag: string, field: string): boolean => {
    return overwriteData.some(
      (overwrite) => overwrite.tag === tag && overwrite.data_field === field
    );
  };

  /**
   * Checks if a cell was affected by cleansing pipeline
   * Only applicable for clean data
   */
  const isAffectedCell = (tag: string, field: string): boolean => {
    const cleanItem = cleanedData.find((item) => item.tag === tag);
    if (!cleanItem) return false;

    // Check if field is in affected times (hourly columns)
    if (cleanItem.affected_times?.includes(field)) return true;

    // Check if field is in affected fields (summary columns)
    if (cleanItem.affected_fields?.includes(field)) return true;

    return false;
  };

  /**
   * Checks if cell value matches search term
   */
  const matchesSearch = (value: string | number): boolean => {
    if (!searchText) return false;
    return String(value).toLowerCase().includes(searchText.toLowerCase());
  };

  /**
   * Generates cell styling based on state (modified, affected, searched, default)
   */
  const getCellStyle = (
    tag: string,
    field: string,
    value: string | number
  ): React.CSSProperties => {
    const isModified = isModifiedCell(tag, field);
    const isAffected = isAffectedCell(tag, field);
    const isSearched = matchesSearch(value);

    // Priority: Modified > Affected > Searched > Default
    if (isModified) {
      // Green background for user-modified cells
      return {
        backgroundColor: "#00AD17",
        color: "white",
        cursor: "pointer",
        position: "relative",
        textAlign: "center",
        padding: "8px",
      };
    }

    if (isAffected) {
      // Orange background for cleansing-affected cells
      return {
        backgroundColor: "#F47920",
        color: "white",
        cursor: "pointer",
        textAlign: "center",
        padding: "8px",
      };
    }

    if (isSearched) {
      // Yellow highlight for search matches
      return {
        backgroundColor: "#ffeb3b",
        textAlign: "center",
        padding: "8px",
      };
    }

    // Default styling
    return {
      backgroundColor: "#f1f2f3",
      textAlign: "center",
      padding: "8px",
    };
  };

  /**
   * Handles cell click based on cell state
   * - Modified cells → revert modal
   * - Affected/default cells → overwrite modal
   */
  const handleCellClick = (tag: string, field: string) => {
    onCellClick({ tag }, field);
  };

  /**
   * Renders cell content with optional edit icon for modified cells
   */
  const renderCellContent = (value: number, isModified: boolean) => {
    if (isModified) {
      return (
        <div className="relative group">
          <span>{value}</span>
          <MdEdit
            className="absolute top-1/2 -translate-y-1/2 right-2 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            size={16}
          />
        </div>
      );
    }

    return <span>{value}</span>;
  };

  /**
   * Fixed columns: Tag and Unit
   */
  const fixedColumns: ColumnType<DataTableRow>[] = [
    {
      title: "Tag",
      dataIndex: "tag",
      key: "tag",
      fixed: "left",
      width: 200,
      className: "font-semibold",
      onCell: () => ({
        style: {
          backgroundColor: "#e6e6e6",
          textAlign: "left",
          padding: "8px",
        },
      }),
    },
    {
      title: "Unit",
      dataIndex: "unit",
      key: "unit",
      fixed: "left",
      width: 100,
      onCell: () => ({
        style: {
          backgroundColor: "#f1f2f3",
          textAlign: "center",
          padding: "8px",
        },
      }),
    },
  ];

  /**
   * Generates 25 hourly columns (00:00 to 24:00)
   */
  const timeColumns: ColumnType<DataTableRow>[] = Array.from(
    { length: 25 },
    (_, i) => {
      const hour = String(i).padStart(2, "0");
      const timeKey = `${hour}:00`;

      return {
        title: timeKey,
        dataIndex: timeKey,
        key: timeKey,
        width: 100,
        onCell: (record: DataTableRow) => {
          const value = record[timeKey] as number;
          const isModified = isModifiedCell(record.tag, timeKey);
          const isAffected = isAffectedCell(record.tag, timeKey);
          const isClickable = isModified || isAffected;

          return {
            style: getCellStyle(record.tag, timeKey, value),
            onClick: isClickable
              ? () => handleCellClick(record.tag, timeKey)
              : undefined,
          };
        },
        render: (value: number, record: DataTableRow) => {
          const isModified = isModifiedCell(record.tag, timeKey);

          return renderCellContent(value, isModified);
        },
      };
    }
  );

  /**
   * Summary columns: Total, Difference, Average, TDA
   */
  const summaryColumns: ColumnType<DataTableRow>[] = [
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      width: 120,
      onCell: (record: DataTableRow) => {
        const value = record.total as number;
        const isModified = isModifiedCell(record.tag, "total");
        const isAffected = isAffectedCell(record.tag, "total");
        const isClickable = isModified || isAffected;

        return {
          style: getCellStyle(record.tag, "total", value),
          onClick: isClickable
            ? () => handleCellClick(record.tag, "total")
            : undefined,
        };
      },
      render: (value: number, record: DataTableRow) => {
        const isModified = isModifiedCell(record.tag, "total");

        return renderCellContent(value, isModified);
      },
    },
    {
      title: "Difference",
      dataIndex: "difference",
      key: "difference",
      width: 120,
      onCell: (record: DataTableRow) => {
        const value = record.difference as number;
        const isModified = isModifiedCell(record.tag, "difference");
        const isAffected = isAffectedCell(record.tag, "difference");
        const isClickable = isModified || isAffected;

        return {
          style: getCellStyle(record.tag, "difference", value),
          onClick: isClickable
            ? () => handleCellClick(record.tag, "difference")
            : undefined,
        };
      },
      render: (value: number, record: DataTableRow) => {
        const isModified = isModifiedCell(record.tag, "difference");

        return renderCellContent(value, isModified);
      },
    },
    {
      title: "Average",
      dataIndex: "average",
      key: "average",
      width: 120,
      onCell: (record: DataTableRow) => {
        const value = record.average as number;
        const isModified = isModifiedCell(record.tag, "average");
        const isAffected = isAffectedCell(record.tag, "average");
        const isClickable = isModified || isAffected;

        return {
          style: getCellStyle(record.tag, "average", value),
          onClick: isClickable
            ? () => handleCellClick(record.tag, "average")
            : undefined,
        };
      },
      render: (value: number, record: DataTableRow) => {
        const isModified = isModifiedCell(record.tag, "average");

        return renderCellContent(value, isModified);
      },
    },
    {
      title: "TDA",
      dataIndex: "tda",
      key: "tda",
      width: 120,
      onCell: (record: DataTableRow) => {
        const value = record.tda as number;
        const isModified = isModifiedCell(record.tag, "tda");
        const isAffected = isAffectedCell(record.tag, "tda");
        const isClickable = isModified || isAffected;

        return {
          style: getCellStyle(record.tag, "tda", value),
          onClick: isClickable
            ? () => handleCellClick(record.tag, "tda")
            : undefined,
        };
      },
      render: (value: number, record: DataTableRow) => {
        const isModified = isModifiedCell(record.tag, "tda");

        return renderCellContent(value, isModified);
      },
    },
  ];

  const allColumns = [...fixedColumns, ...timeColumns, ...summaryColumns];

  return (
    <Table
      className="bg-white [&_.ant-table-thead>tr>th]:bg-[#e6e6e6] [&_.ant-table-thead>tr>th]:text-center [&_.ant-table-thead>tr>th]:p-2 [&_.ant-table-thead>tr>th]:text-[16.8px] [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-tbody>tr>td]:p-0 [&_.ant-table-measure-row]:hidden"
      columns={allColumns}
      dataSource={transformData()}
      pagination={false}
      scroll={{ x: "max-content", y: 600 }}
      bordered
    />
  );
};

export default DataTable;

import { Table, Button } from "antd";
import { MdEditNote, MdDelete, MdAddCircle } from "react-icons/md";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/**
 * ============================================================
 * BBTable Component
 * ============================================================
 * Features:
 * - Dynamic multi-level header
 * - Fixed left & right columns
 * - Sticky last row support
 * - Dynamic API-based coloring (cell + row fallback)
 * - Hover highlight
 * - Expandable rows (custom icon)
 *
 * Styling Architecture:
 * - Pure Tailwind utility classes
 * - API colors override Tailwind using CSSOM setProperty(...,'important')
 * - No external CSS dependency
 *
 * IMPORTANT:
 * AntD fixed columns inject background styles.
 * To ensure API color wins, we override via DOM style.setProperty.
 */

interface BBTableProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCellClick?: (record: any, dataIndex: string, columnKey: string) => void;
  fixedLeftColumns?: number;
  fixedRightColumns?: number;
  isLastRowSticky?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdit?: (record: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDelete?: (record: any) => void;
  maxHeight?: number | string;
  autoHeight?: boolean;
  offsetFromBottom?: number;
  onNullCellClick?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: any,
    dataIndex: string,
    columnKey: string,
  ) => void;
  showAddButtonForNull?: boolean;
  expandedRowRender?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: any,
    index: number,
    indent: number,
    expanded: boolean,
  ) => React.ReactNode;
}

type HoveredCell = { rowKey: string | number; dataIndex: string | number };

const BBTable = ({
  data,
  onCellClick,
  fixedLeftColumns = 1,
  fixedRightColumns = 1,
  isLastRowSticky = false,
  onEdit,
  onDelete,
  maxHeight,
  autoHeight = true,
  offsetFromBottom = 100,
  onNullCellClick,
  showAddButtonForNull = false,
  expandedRowRender,
}: BBTableProps) => {
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState<number>(600);
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  /**
   * ============================================================
   * Dynamic Height Calculation
   * ============================================================
   */
  useEffect(() => {
    if (!autoHeight) return;

    const calculateHeight = () => {
      if (tableWrapperRef.current) {
        const rect = tableWrapperRef.current.getBoundingClientRect();
        const available = window.innerHeight - rect.top - offsetFromBottom;
        setTableHeight(Math.max(300, available));
      }
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);

    return () => {
      window.removeEventListener("resize", calculateHeight);
    };
  }, [autoHeight, offsetFromBottom]);

  /**
   * ============================================================
   * Expand Toggle Logic
   * ============================================================
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleToggleExpand = useCallback((record: any) => {
    const key = record.key;
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  if (!data?.row || !data?.header) {
    return <div className="p-4 text-gray-500">No data available</div>;
  }

  /**
   * ============================================================
   * Transform DataSource
   * ============================================================
   */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const dataSource = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.row.map((row: any, index: number) => ({
      key: row.index,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...row.items.reduce((acc: any, item: any) => {
        acc[item.start_column_key] = item.value;
        return acc;
      }, {}),
      isLastRow: index === data.row.length - 1,
      isTonaseRow: row.row_index?.toLowerCase()?.includes("tonase"),
      originalRow: row,
    }));
  }, [data]);

  /**
   * ============================================================
   * Build Simple Columns (Leaf Only for Simplicity)
   * ============================================================
   */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const columns = useMemo(() => {
    if (!data.column_keys) return [];

    return data.column_keys.map((key: string, index: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const col: any = {
        title: key,
        dataIndex: key,
        key,
        align: "center",
        width: 110,
      };

      /**
       * ============================================================
       * Render Logic (Actions + Null Button)
       * ============================================================
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      col.render = (value: any, record: any) => {
        if (value === "actions") {
          return (
            <div className="flex justify-center gap-2">
              <Button
                type="text"
                icon={<MdEditNote size={20} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(record);
                }}
              />
              <Button
                type="text"
                icon={<MdDelete size={20} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(record);
                }}
              />
            </div>
          );
        }

        if (showAddButtonForNull && value == null) {
          return (
            <Button
              type="text"
              icon={<MdAddCircle size={20} />}
              onClick={() => onNullCellClick?.(record, key, key)}
            />
          );
        }

        return value;
      };

      /**
       * ============================================================
       * Cell Styling (Tailwind + Dynamic API override)
       * ============================================================
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      col.onCell = (record: any) => {
        let className =
          "px-2 py-2 text-center align-middle text-sm border border-gray-400";

        if (record.isTonaseRow) {
          className += " bg-[#f47920] text-white font-bold";
        }

        const style: React.CSSProperties = {};

        const isHovered =
          hoveredCell?.rowKey === record.key && hoveredCell?.dataIndex === key;

        if (isHovered) {
          style.backgroundColor = "#777986";
          style.color = "#ffffff";
        }

        return {
          className,
          style,
          onClick: () => onCellClick?.(record, key, key),
          onMouseEnter: () =>
            setHoveredCell({
              rowKey: record.key,
              dataIndex: key,
            }),
          onMouseLeave: () => setHoveredCell(null),
        };
      };

      /**
       * ============================================================
       * Fixed Column Logic
       * ============================================================
       */
      if (index < fixedLeftColumns) {
        col.fixed = "left";
      }

      if (index >= data.column_keys.length - fixedRightColumns) {
        col.fixed = "right";
      }

      return col;
    });
  }, [
    data,
    hoveredCell,
    onEdit,
    onDelete,
    onCellClick,
    fixedLeftColumns,
    fixedRightColumns,
    showAddButtonForNull,
    onNullCellClick,
  ]);

  return (
    <div
      ref={tableWrapperRef}
      className="
        relative
        z-1
        overflow-hidden
        [&_.ant-table-body::-webkit-scrollbar]:w-2
        [&_.ant-table-body::-webkit-scrollbar-thumb]:bg-gray-400
        [&_.ant-table-body::-webkit-scrollbar-thumb]:rounded
        [&_.ant-table-body::-webkit-scrollbar-track]:bg-gray-100
      ">
      <Table
        columns={columns}
        dataSource={dataSource}
        bordered
        size="small"
        pagination={false}
        scroll={
          autoHeight
            ? { x: "max-content", y: maxHeight ?? tableHeight }
            : { x: "max-content" }
        }
        expandable={
          expandedRowRender
            ? {
                expandedRowRender,
                expandedRowKeys: expandedKeys,
                onExpand: (_, record) => handleToggleExpand(record),
                showExpandColumn: false,
              }
            : undefined
        }
        rowClassName={(record) => {
          const classes = [];

          if (isLastRowSticky && record.isLastRow) {
            classes.push("sticky bottom-0 z-10 bg-white");
          }

          return classes.join(" ");
        }}
      />
    </div>
  );
};

export default BBTable;

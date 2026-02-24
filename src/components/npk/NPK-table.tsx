import { Table, Button } from "antd";
import { MdEditNote, MdDelete, MdAddCircle } from "react-icons/md";
import { useState, useEffect, useRef } from "react";

/* =====================================================
   TYPES
===================================================== */

interface NPKTableProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCellClick?: (record: any, dataIndex: string, columnKey?: string) => void;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onNullCellClick?: (record: any, dataIndex: string, columnKey: string) => void;
  showAddButtonForNull?: boolean;
}

type HoveredCell = { rowKey: string | number; dataIndex: string | number };

/* =====================================================
   COMPONENT
===================================================== */

const NPKTable = ({
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
}: NPKTableProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState<number>(600);
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);

  /* =====================================================
     AUTO HEIGHT
  ===================================================== */

  useEffect(() => {
    if (!autoHeight) return;

    const calculate = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const available = window.innerHeight - rect.top - offsetFromBottom;
      setTableHeight(Math.max(300, available));
    };

    calculate();
    window.addEventListener("resize", calculate);
    return () => window.removeEventListener("resize", calculate);
  }, [autoHeight, offsetFromBottom]);

  const scrollY =
    typeof maxHeight !== "undefined"
      ? maxHeight
      : autoHeight
        ? tableHeight
        : 600;

  if (!data || !data.header || !Array.isArray(data.row)) {
    return (
      <div className="bg-neutral-100 text-neutral-700 text-14 p-4 rounded-lg">
        No data available
      </div>
    );
  }

  /* =====================================================
     COLUMN BUILDER
  ===================================================== */

  const getFixedSide = (
    index: number,
    total: number,
  ): "left" | "right" | undefined => {
    const leftCount = Math.max(0, fixedLeftColumns ?? 0);
    const rightCount = Math.max(0, fixedRightColumns ?? 0);

    if (total <= 0) return undefined;

    const safeLeft = Math.min(leftCount, total);
    const safeRight = Math.min(rightCount, Math.max(0, total - safeLeft));

    if (index < safeLeft) return "left";
    if (index >= total - safeRight) return "right";
    return undefined;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headerItems: any[] = data.header[1]?.items ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = headerItems.map((item: any, index: number) => ({
    title: (
      <div
        className="text-14 font-semibold text-center"
        style={{
          backgroundColor: item.bg_color,
          color: item.font_color,
        }}>
        {item.title}
      </div>
    ),
    dataIndex: item.start_column_key,
    align: "center" as const,
    width: 120,
    fixed: getFixedSide(index, headerItems.length),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (value: any, record: any) => {
      if (value?.toString()?.toLowerCase() === "actions") {
        return (
          <div className="flex justify-center gap-2">
            <Button
              type="text"
              icon={<MdEditNote size={20} />}
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(record);
              }}
              className="text-primary-300"
            />
            <Button
              type="text"
              icon={<MdDelete size={20} />}
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(record);
              }}
              className="text-danger"
            />
          </div>
        );
      }

      if (showAddButtonForNull && (value === null || value === undefined)) {
        return (
          <Button
            type="text"
            icon={<MdAddCircle size={20} />}
            className="text-primary-300"
            onClick={() =>
              onNullCellClick?.(
                record,
                item.start_column_key,
                item.start_column_key,
              )
            }
          />
        );
      }

      return value;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onCell: (record: any) => {
      const isHovered =
        hoveredCell?.rowKey === record.key &&
        hoveredCell?.dataIndex === item.start_column_key;

      return {
        className: `
          text-12
          px-2 py-1
          text-center
          border border-neutral-200
          ${record.isTonaseRow ? "bg-secondary-300 text-white font-semibold" : ""}
          ${
            isLastRowSticky && record.isLastRow
              ? "sticky bottom-0 z-20 bg-primary-700 text-white"
              : ""
          }
          ${isHovered ? "bg-neutral-500 text-white" : ""}
        `,
        onClick: () =>
          onCellClick?.(record, item.start_column_key, item.start_column_key),
        onMouseEnter: () =>
          setHoveredCell({
            rowKey: record.key,
            dataIndex: item.start_column_key,
          }),
        onMouseLeave: () => setHoveredCell(null),
      };
    },
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataSource = data.row.map((row: any, index: number) => ({
    ...row,
    key: row.index ?? index,
    isLastRow: index === data.row.length - 1,
    isTonaseRow: row.row_index?.toLowerCase?.().includes("tonase"),
  }));

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div ref={wrapperRef} className="relative">
      <Table
        columns={columns}
        dataSource={dataSource}
        bordered
        size="small"
        pagination={false}
        scroll={{ x: "max-content", y: scrollY }}
        className="
          bg-white
          rounded-xl
          shadow-sm
          text-neutral-700
        "
        rowClassName={(record) => `
          ${
            record.isTonaseRow
              ? "bg-secondary-300 text-white font-semibold"
              : ""
          }
        `}
      />
    </div>
  );
};

export default NPKTable;

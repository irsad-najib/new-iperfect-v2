import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import "handsontable/dist/handsontable.full.min.css";
import { registerAllModules } from "handsontable/registry";
import { HotTable } from "@handsontable/react";
import { HotTableClass } from "@handsontable/react";
import type Handsontable from "handsontable";
import api from "@/utils/axios";

registerAllModules();

interface DataInputTableProps {
  readOnly?: boolean;
  profileDataId?: string;
  tanggal?: string;
  onSave?: React.MutableRefObject<(() => Promise<void>) | undefined>;
}

export interface DataInputTableRef {
  fetchData: (profileDataId: string, tanggal: string) => Promise<void>;
}

interface ApiResponse {
  _id: string;
  header: Array<Array<{ label: string; colspan: number }>>;
  colconfig: Array<{ width: number; type: string; numericFormat?: undefined }>;
  data: Array<Array<number>>;
}

const DataInputTable = forwardRef<DataInputTableRef, DataInputTableProps>(
  ({ readOnly = true, profileDataId, tanggal, onSave }, ref) => {
    const hotRef = useRef<HotTableClass>(null);
    const [data, setData] = useState<ApiResponse["data"]>([]);
    const [header, setHeader] = useState<ApiResponse["header"]>([]);
    const [colconfig, setColconfig] = useState<ApiResponse["colconfig"]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async (profileDataId: string, tanggal: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get<ApiResponse>(
          `/external_data/${profileDataId}/${tanggal}`
        );
        setData(response.data.data);
        setHeader(response.data.header);
        setColconfig(response.data.colconfig);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while fetching data"
        );
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // Expose fetchData method to parent component
    useImperativeHandle(ref, () => ({
      fetchData,
    }));

    useEffect(() => {
      if (profileDataId && tanggal) {
        fetchData(profileDataId, tanggal);
      }
    }, [profileDataId, tanggal]);

    const saveData = useCallback(async () => {
      try {
        await api.post(`/external_data/${profileDataId}/${tanggal}`, {
          _id: profileDataId,
          header: header,
          colconfig: colconfig,
          data: data,
        });
      } catch (err) {
        console.error("Error saving data:", err);
        throw err;
      }
    }, [data, header, colconfig, profileDataId, tanggal]);

    useEffect(() => {
      if (onSave) {
        onSave.current = saveData;
      }
    }, [onSave, saveData]);

    useEffect(() => {
      const handleKeyDown = async (e: KeyboardEvent) => {
        if (!hotRef.current) return;

        const hotInstance = hotRef.current.hotInstance;
        if (!hotInstance) return;

        if ((e.ctrlKey || e.metaKey) && e.key === "c") {
          const copyPlugin = hotInstance.getPlugin("copyPaste");
          if (copyPlugin && copyPlugin.isEnabled()) {
            copyPlugin.copy();
            e.preventDefault();
          }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === "v") {
          e.preventDefault();
          try {
            // Check if we have clipboard permission
            if (navigator.clipboard && navigator.clipboard.readText) {
              const clipboardText = await navigator.clipboard.readText();
              if (clipboardText) {
                const selection = hotInstance.getSelected();
                if (selection && selection.length > 0) {
                  const [startRow, startCol] = selection[0];

                  // Parse clipboard data (assuming tab-separated or comma-separated)
                  const rows = clipboardText
                    .split("\n")
                    .filter((row) => row.trim());
                  const pasteData = rows.map((row) =>
                    row.split("\t").length > 1
                      ? row.split("\t")
                      : row.split(",")
                  );

                  // Paste data starting from selected cell
                  pasteData.forEach((rowData, rowIndex) => {
                    rowData.forEach((cellValue, colIndex) => {
                      const targetRow = startRow + rowIndex;
                      const targetCol = startCol + colIndex;

                      if (
                        targetRow < data.length &&
                        targetCol < data[targetRow].length
                      ) {
                        hotInstance.setDataAtCell(
                          targetRow,
                          targetCol,
                          cellValue
                        );
                      }
                    });
                  });
                }
              }
            } else {
              // Fallback: let Handsontable handle it natively
              const copyPlugin = hotInstance.getPlugin("copyPaste");
              if (copyPlugin && copyPlugin.isEnabled()) {
                copyPlugin.paste();
              }
            }
          } catch (error) {
            console.warn("Clipboard access failed, trying fallback:", error);
            // Fallback to Handsontable's native paste
            const copyPlugin = hotInstance.getPlugin("copyPaste");
            if (copyPlugin && copyPlugin.isEnabled()) {
              copyPlugin.paste();
            }
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [data]);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
      <div style={{ width: "100%", overflowX: "auto" }}>
        <HotTable
          ref={hotRef}
          data={data}
          colHeaders={false}
          rowHeaders={false}
          copyPaste={true}
          height="575px"
          width="100%"
          licenseKey="non-commercial-and-evaluation"
          columns={colconfig}
          contextMenu={true}
          multiColumnSorting={true}
          filters={true}
          dropdownMenu={true}
          readOnly={readOnly}
          nestedHeaders={header}
          afterChange={(changes: Handsontable.CellChange[] | null) => {
            if (changes) {
              changes.forEach((change) => {
                const [row, col, , newValue] = change as [
                  number,
                  number,
                  unknown,
                  number
                ];
                const newData = [...data];
                newData[row][col] = newValue;
                setData(newData);

                localStorage.setItem("tableData", JSON.stringify(newData));
              });
            }
          }}
        />
      </div>
    );
  }
);

DataInputTable.displayName = "DataInputTable";

export default DataInputTable;

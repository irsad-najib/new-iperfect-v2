import api from "./axios";

export interface ExecuteUdfParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: any[];
  code: string;
  tanggal: string;
}

export interface UdfLogEntry {
  level: string;
  message: string;
  code: string | null;
}

export interface UdfResult {
  result_output: number | null;
  std_out: string;
  log: UdfLogEntry[];
  error: string | null;
  traceback: string | null;
}

export const executeUdf = async (params: ExecuteUdfParams) => {
  try {
    const response = await api.post("/utils/execute-udf", params);
    return response.data;
  } catch (error) {
    console.error("Error executing UDF:", error);
    throw error;
  }
};

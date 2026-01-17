/**
 * Cleansing Service
 * Handles all cleansing process-related API calls
 */

import api from "@/utils/axios";
import { Factory, Part, Lab, CleansingStatus } from "@/types";

/**
 * Get all factories
 */
export async function getFactories(): Promise<Factory[]> {
  const response = await api.get<Factory[]>("/daily_amur/utils/factories");
  return response.data;
}

/**
 * Get parts/sections for a factory
 */
export async function getParts(pabrikId: number): Promise<Part[]> {
  const response = await api.get<Part[]>(`/daily_amur/utils/parts/${pabrikId}`);
  return response.data;
}

/**
 * Get labs for a factory
 */
export async function getLabs(pabrikId: number): Promise<Lab[]> {
  const response = await api.get<Lab[]>(`/daily_amur/utils/lab/${pabrikId}`);
  return response.data;
}

/**
 * Get cleansing status
 */
export async function getCleansingStatus(
  tanggal: string
): Promise<CleansingStatus[]> {
  const response = await api.get<CleansingStatus[]>(
    "/daily_amur/cleansing/all-status",
    {
      params: { tanggal },
    }
  );
  return response.data;
}

/**
 * Run cleansing process for specific parts
 */
export async function runCleansing(tanggal: string, bagianIds: number[]) {
  const response = await api.post("/daily_amur/cleansing/run", null, {
    params: {
      tanggal,
      bagian_ids: JSON.stringify(bagianIds),
    },
  });
  return response.data;
}

/**
 * Stop cleansing process
 */
export async function stopCleansing(jobId: string) {
  const response = await api.post("/daily_amur/cleansing/stop", null, {
    params: { job_id: jobId },
  });
  return response.data;
}

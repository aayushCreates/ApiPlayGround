import { apiClient } from "./axios";
import type { HistoryItem } from "../types";

export const historyApi = {
  create: async (data: Partial<HistoryItem> & { specId?: string }): Promise<HistoryItem> => {
    const res = await apiClient.post("/history", data);
    return res.data;
  },

  getAll: async (params?: { limit?: number; specId?: string }): Promise<HistoryItem[]> => {
    const res = await apiClient.get("/history", { params });
    return res.data;
  },

  getById: async (id: string): Promise<HistoryItem> => {
    const res = await apiClient.get(`/history/${id}`);
    return res.data;
  },

  clearAll: async (): Promise<void> => {
    await apiClient.delete("/history");
  },
};

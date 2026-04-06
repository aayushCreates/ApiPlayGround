import { apiClient } from "./axios";
import type { Collection, SavedRequest } from "../types";

export const collectionsApi = {
  create: async (data: { specId: string; name: string }): Promise<Collection> => {
    const res = await apiClient.post("/collections", data);
    return res.data;
  },

  getAll: async (params?: { specId?: string }): Promise<Collection[]> => {
    const res = await apiClient.get("/collections", { params });
    return res.data;
  },

  addRequest: async (
    collectionId: string,
    data: Omit<SavedRequest, "id" | "collectionId">
  ): Promise<SavedRequest> => {
    const res = await apiClient.post(`/collections/${collectionId}/requests`, data);
    return res.data;
  },

  removeRequest: async (collectionId: string, requestId: string): Promise<void> => {
    await apiClient.delete(`/collections/${collectionId}/requests/${requestId}`);
  },
};

import { apiClient } from "./axios";
import type { Spec } from "../types";

export const specsApi = {
  create: async (data: {
    name: string;
    content: string;
    parsedUrl?: string;
    description?: string;
  }): Promise<Spec> => {
    const res = await apiClient.post("/specs", data);
    return res.data;
  },

  createManual: async (data: {
    name: string;
    method: string;
    url: string;
  }): Promise<Spec> => {
    const res = await apiClient.post("/specs/manual", data);
    return res.data;
  },

  getAll: async (): Promise<Spec[]> => {
    const res = await apiClient.get("/specs");
    return res.data;
  },

  getById: async (id: string): Promise<Spec> => {
    const res = await apiClient.get(`/specs/${id}`);
    return res.data;
  },

  getByShareToken: async (token: string): Promise<Spec> => {
    const res = await apiClient.get(`/specs/share/${token}`);
    return res.data;
  },

  update: async (
    id: string,
    data: { 
      name?: string; 
      description?: string; 
      isPublic?: boolean;
      content?: string;
      parsedUrl?: string;
      variables?: Record<string, string>;
    }
  ): Promise<Spec> => {
    const res = await apiClient.patch(`/specs/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/specs/${id}`);
  },
};

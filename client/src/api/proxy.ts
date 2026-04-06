import { apiClient } from "./axios";

export const proxyApi = {
  proxy: async (data: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<any> => {
    const res = await apiClient.post("/proxy", data);
    return res.data;
  },
};

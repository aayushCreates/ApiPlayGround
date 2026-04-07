import { apiClient } from "./axios";
import type { AiExplanationResult, AiDebugResult } from "../types";

export const aiApi = {
  explain: async (data: {
    method: string;
    path: string;
    endpointData: unknown;
    specContent: string;
  }): Promise<AiExplanationResult> => {
    const res = await apiClient.post("/ai/explain", data);
    return res.data;
  },

  debugError: async (data: {
    requestDetails: unknown;
    responseDetails: unknown;
    endpointData: unknown;
  }): Promise<AiDebugResult> => {
    const res = await apiClient.post("/ai/debug", data);
    return res.data;
  },
};

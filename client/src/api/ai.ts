import { apiClient } from "./axios";
import type { AiExplanationResult } from "../types";

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
};

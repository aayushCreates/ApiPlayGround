import { Request, Response, NextFunction } from "express";
import axios from "axios";

export const proxyRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { method, url, headers, body } = req.body;

    if (!url || typeof url !== "string" || !url.match(/^https?:\/\//)) {
      return res.status(400).json({ message: "Valid URL starting with http/https is required" });
    }

    const normalizedUrl = url.toLowerCase();
    if (normalizedUrl.includes("localhost") || normalizedUrl.includes("127.0.0.")) {
      return res.status(403).json({ message: "Internal IPs are blocked." });
    }

    const startTime = Date.now();
    try {
      const axiosResponse = await axios({
        method,
        url,
        data: body,
        headers: headers ? { ...headers, host: undefined } : undefined, // Avoid host header issues
        validateStatus: () => true, // resolve on any status
        timeout: 30000,
      });

      const latencyMs = Date.now() - startTime;

      res.json({
        statusCode: axiosResponse.status,
        statusText: axiosResponse.statusText,
        headers: axiosResponse.headers,
        body: axiosResponse.data,
        latencyMs,
      });
    } catch (axiosError: any) {
      const latencyMs = Date.now() - startTime;
      res.json({
        statusCode: 0,
        statusText: axiosError.message,
        headers: {},
        body: null,
        latencyMs,
        isError: true,
        errorMessage: axiosError.message,
      });
    }
  } catch (error) {
    next(error);
  }
};

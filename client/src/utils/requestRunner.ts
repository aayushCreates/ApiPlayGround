import { proxyApi } from "../api";
import type { RequestConfig, RequestResult } from "../types";

export const buildFullUrl = (config: RequestConfig): string => {
  let url = config.baseUrl;
  if (url.endsWith("/")) url = url.slice(0, -1);

  let path = config.path;
  
  // Replace path variables e.g., {userId}
  for (const [key, value] of Object.entries(config.pathParams)) {
    // Regex matches {key} or :key
    const regex = new RegExp(`({${key}}|:${key})`, 'g');
    path = path.replace(regex, encodeURIComponent(value));
  }

  // Build query string
  const urlObj = new URL(`${url}${path}`);
  for (const [key, val] of Object.entries(config.queryParams)) {
    if (val.enabled) {
      urlObj.searchParams.append(key, val.value);
    }
  }

  return urlObj.toString();
};

export const executeRequest = async (config: RequestConfig): Promise<RequestResult> => {
  const fullUrl = buildFullUrl(config);
  
  // Construct headers
  const headers: Record<string, string> = {};
  for (const [key, val] of Object.entries(config.headers)) {
    if (val.enabled) {
      headers[key] = val.value;
    }
  }

  if (config.bodyContentType && config.body) {
    if (!headers["content-type"] && !headers["Content-Type"]) {
      headers["Content-Type"] = config.bodyContentType;
    }
  }

  // Attach Authentication
  if (config.authType === "bearer" && config.authBearer) {
    headers["Authorization"] = `Bearer ${config.authBearer}`;
  } else if (config.authType === "basic" && config.authBasicUser) {
    const credentials = btoa(`${config.authBasicUser}:${config.authBasicPass}`);
    headers["Authorization"] = `Basic ${credentials}`;
  } else if (config.authType === "apikey" && config.authApiKeyName && config.authApiKeyValue) {
    headers[config.authApiKeyName] = config.authApiKeyValue;
  }

  // For localhost, the proxy blocks it. We can attempt a direct fetch first if it's CORS friendly,
  // but to preserve latency metrics consistency, we always route to the proxy api.
  // Wait, if it's localhost, the backend proxy block rejects it for SSRF. 
  // If it's blocked by SSRF, we must fetch directly! 
  
  const isLocalhost = fullUrl.includes("localhost") || fullUrl.includes("127.0.0.1");

  if (isLocalhost) {
    return _directFetch(config.method, fullUrl, headers, config.body);
  }

  try {
    const res = await proxyApi.proxy({
      method: config.method,
      url: fullUrl,
      headers,
      body: config.body || undefined
    });

    if (res.isError) {
      return {
        statusCode: 0,
        statusText: "Network Error",
        headers: {},
        body: null,
        rawBody: "",
        latencyMs: res.latencyMs || 0,
        size: "0 B",
        timestamp: new Date(),
        isError: true,
        errorMessage: res.errorMessage,
        isCorsError: res.errorMessage.toLowerCase().includes("cors") || res.errorMessage.toLowerCase().includes("network"),
      };
    }

    const resSize = JSON.stringify(res.body)?.length || 0;
    
    return {
      statusCode: res.statusCode,
      statusText: res.statusText,
      headers: res.headers,
      body: res.body,
      rawBody: typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2) || "",
      latencyMs: res.latencyMs,
      size: `${(resSize / 1024).toFixed(2)} KB`,
      timestamp: new Date(),
      isError: false,
    };
  } catch (error: any) {
    return {
      statusCode: 0,
      statusText: "Proxy Error",
      headers: {},
      body: null,
      rawBody: "",
      latencyMs: 0,
      size: "0 B",
      timestamp: new Date(),
      isError: true,
      errorMessage: error.message || "Failed to reach proxy",
    };
  }
};

const _directFetch = async (method: string, url: string, headers: Record<string, string>, body?: string): Promise<RequestResult> => {
  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body: ["GET", "HEAD"].includes(method.toUpperCase()) ? undefined : body,
    });

    const latencyMs = Date.now() - startTime;
    const responseText = await response.text();
    let responseBody = responseText;
    try {
      responseBody = JSON.parse(responseText);
    } catch (e) {
       // Leave it as text
    }

    const resHeaders: Record<string, string> = {};
    response.headers.forEach((val, key) => {
      resHeaders[key] = val;
    });

    return {
      statusCode: response.status,
      statusText: response.statusText,
      headers: resHeaders,
      body: responseBody,
      rawBody: responseText,
      latencyMs,
      size: `${(responseText.length / 1024).toFixed(2)} KB`,
      timestamp: new Date(),
      isError: false,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    return {
      statusCode: 0,
      statusText: "Network Error",
      headers: {},
      body: null,
      rawBody: "",
      latencyMs,
      size: "0 B",
      timestamp: new Date(),
      isError: true,
      errorMessage: error.message || "Browser blocked the request (CORS/Network error)",
      isCorsError: true,
    };
  }
}

import { useSpec } from "../../context/SpecContext";
import { Send, Settings2, Loader2, Copy, Check, Trash2, PlusCircle, Sparkles, Edit2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { proxyApi } from "../../api/proxy";
import { historyApi } from "../../api/history";
import { aiApi } from "../../api/ai";
import ReactMarkdown from "react-markdown";

interface ResponseData {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  latencyMs: number;
  isError?: boolean;
  errorMessage?: string;
}

interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

export function Playground() {
  const { state: specState, dispatch: specDispatch } = useSpec();
  const ep = specState.selectedEndpoint;

  const derivedUrl = useMemo(() => {
    if (!ep) return "";
    const base = specState.baseUrl || "";
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const cleanPath = ep.path.startsWith('/') ? ep.path : `/${ep.path}`;
    return `${cleanBase}${cleanPath}`;
  }, [ep, specState.baseUrl]);

  const [requestUrl, setRequestUrl] = useState("");
  const [lastDerivedUrl, setLastDerivedUrl] = useState("");
  if (derivedUrl !== lastDerivedUrl) {
    setLastDerivedUrl(derivedUrl);
    setRequestUrl(derivedUrl);
  }

  // Request state
  const [activeTab, setActiveTab] = useState<"params" | "headers" | "auth" | "body">("params");
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string; enabled: boolean }>>([
    { key: "Content-Type", value: "application/json", enabled: true },
  ]);
  const [requestBody, setRequestBody] = useState("");
  const [authType, setAuthType] = useState<"none" | "bearer">("none");
  const [bearerToken, setBearerToken] = useState("");

  // Parameter State
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<QueryParam[]>([]);

  // Base URL editing
  const [showBaseUrlEditor, setShowBaseUrlEditor] = useState(false);
  const [editableBaseUrl, setEditableBaseUrl] = useState(specState.baseUrl);

  // Sync editable base url when context baseUrl changes (e.g. switching endpoints)
  useEffect(() => {
    setEditableBaseUrl(specState.baseUrl);
  }, [specState.baseUrl]);

  const handleBaseUrlSave = () => {
    specDispatch({ type: "SET_BASE_URL", payload: editableBaseUrl });
    setShowBaseUrlEditor(false);
  };

  // Reset all request state when switching endpoints
  useEffect(() => {
    setPathParams({});
    setQueryParams([]);
    setCustomHeaders([{ key: "Content-Type", value: "application/json", enabled: true }]);
    setRequestBody("");
    setAuthType("none");
    setBearerToken("");
    setResponse(null);
    setIsSending(false);
    setCopied(false);
    setDebugResult(null);
    setIsDebugging(false);
    setShowBaseUrlEditor(false);
    // When the endpoint changes, the derivedUrl will trigger the URL reset automatically
  }, [ep?.id, specState.activeModuleId]);

  // Rebuild URL when parameters change
  const rebuildUrl = (newPathParams: Record<string, string>, newQueryParams: QueryParam[]) => {
    if (!ep) return;
    const base = specState.baseUrl || "";
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    let path = ep.path;

    // Replace path params like {userId}
    Object.entries(newPathParams).forEach(([key, val]) => {
      path = path.replace(`{${key}}`, encodeURIComponent(val || `{${key}}`));
    });

    // Build query string
    const queryParts = newQueryParams
      .filter(p => p.enabled && p.key.trim())
      .map(p => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`);
    
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    setRequestUrl(`${cleanBase}${cleanPath}${qs}`);
  };

  const handlePathParamChange = (name: string, value: string) => {
    const updated = { ...pathParams, [name]: value };
    setPathParams(updated);
    rebuildUrl(updated, queryParams);
  };

  const handleQueryParamChange = (index: number, field: keyof QueryParam, value: string | boolean) => {
    const updated = queryParams.map((p, i) => 
      i === index ? { ...p, [field]: value } : p
    );
    setQueryParams(updated);
    rebuildUrl(pathParams, updated);
  };

  const addQueryParam = () => {
    const updated = [...queryParams, { key: "", value: "", enabled: true }];
    setQueryParams(updated);
  };

  const removeQueryParam = (index: number) => {
    const updated = queryParams.filter((_, i) => i !== index);
    setQueryParams(updated);
    rebuildUrl(pathParams, updated);
  };

  // Parse parameters from manually edited URL
  const parseParamsFromUrl = (url: string) => {
    if (!ep) return;
    
    // Parse query params
    try {
      const qIndex = url.indexOf('?');
      const newQueryParams: QueryParam[] = [];
      if (qIndex !== -1) {
        const searchParams = new URLSearchParams(url.slice(qIndex));
        searchParams.forEach((value, key) => {
          newQueryParams.push({ key, value, enabled: true });
        });
      }
      setQueryParams(newQueryParams);
    } catch { /* URL error, ignore sync */ }

    // Parse path params
    const pathParamNames = ep.parameters.filter(p => p.in === "path").map(p => p.name);
    if (pathParamNames.length > 0) {
      const base = specState.baseUrl || "";
      const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
      const urlPath = url.split('?')[0].replace(cleanBase, '');

      let regexStr = ep.path;
      const paramOrder: string[] = [];
      regexStr = regexStr.replace(/\{([^}]+)\}/g, (_match, paramName) => {
        paramOrder.push(paramName);
        return '([^/]+)';
      });

      try {
        const regex = new RegExp(`^${regexStr}$`);
        const match = urlPath.match(regex);
        if (match) {
          const newPathParams: Record<string, string> = { ...pathParams };
          paramOrder.forEach((name, i) => {
            newPathParams[name] = decodeURIComponent(match[i + 1]);
          });
          setPathParams(newPathParams);
        }
      } catch { /* Regex error, ignore sync */ }
    }
  };

  const handleUrlChange = (newUrl: string) => {
    setRequestUrl(newUrl);
    parseParamsFromUrl(newUrl);
  };

  // Response state
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [debugResult, setDebugResult] = useState<string | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);

  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'get': return 'text-method-get border-method-get/30 bg-method-get/10';
      case 'post': return 'text-method-post border-method-post/30 bg-method-post/10';
      case 'put': return 'text-method-put border-method-put/30 bg-method-put/10';
      case 'delete': return 'text-method-delete border-method-delete/30 bg-method-delete/10';
      case 'patch': return 'text-method-patch border-method-patch/30 bg-method-patch/10';
      default: return 'text-secondary border-border bg-surface';
    }
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return 'text-danger';
    if (status >= 200 && status < 300) return 'text-success';
    if (status >= 300 && status < 400) return 'text-warning';
    if (status >= 400 && status < 500) return 'text-warning';
    if (status >= 500) return 'text-danger';
    return 'text-secondary';
  };

  const handleSend = async () => {
    if (!ep || !requestUrl.trim()) return;
    setIsSending(true);
    setResponse(null);
    setDebugResult(null);

    try {
      const activeModule = specState.modules.find(m => m.id === specState.activeModuleId);
      const variables = activeModule?.variables || {};

      const interpolate = (str: string) => {
        if (!str) return str;
        return str.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          const varName = key.trim();
          return variables[varName] !== undefined ? variables[varName] : match;
        });
      };

      const finalUrl = interpolate(requestUrl);

      const headers: Record<string, string> = {};
      customHeaders.forEach(h => {
        if (h.enabled && h.key.trim()) {
          headers[interpolate(h.key.trim())] = interpolate(h.value);
        }
      });
      if (authType === "bearer" && bearerToken.trim()) {
        headers["Authorization"] = `Bearer ${interpolate(bearerToken)}`;
      }

      const finalBody = ["post", "put", "patch"].includes(ep.method.toLowerCase()) && requestBody.trim()
          ? interpolate(requestBody)
          : undefined;

      const result: ResponseData = await proxyApi.proxy({
        method: ep.method.toUpperCase(),
        url: finalUrl,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body: finalBody,
      });

      setResponse(result);

      try {
        await historyApi.create({
          method: ep.method,
          url: requestUrl,
          requestHeaders: headers,
          requestBody: requestBody || null,
          statusCode: result.statusCode || null,
          responseBody: typeof result.body === "string" ? result.body : JSON.stringify(result.body),
          responseHeaders: result.headers || null,
          latencyMs: result.latencyMs || null,
        });
      } catch { /* History silent */ }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setResponse({
        statusCode: 0,
        statusText: "Error",
        headers: {},
        body: null,
        latencyMs: 0,
        isError: true,
        errorMessage: msg,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDebug = async () => {
    if (!response || !ep) return;
    setIsDebugging(true);
    setDebugResult(null);

    const activeModule = specState.modules.find(m => m.id === specState.activeModuleId);
    const variables = activeModule?.variables || {};

    const interpolate = (str: string) => {
      if (!str) return str;
      return str.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const varName = key.trim();
        return variables[varName] !== undefined ? variables[varName] : match;
      });
    };

    const finalUrl = interpolate(requestUrl);
    const headers: Record<string, string> = {};
    customHeaders.forEach(h => {
      if (h.enabled && h.key.trim()) {
        headers[interpolate(h.key.trim())] = interpolate(h.value);
      }
    });
    if (authType === "bearer" && bearerToken.trim()) {
      headers["Authorization"] = `Bearer ${interpolate(bearerToken)}`;
    }

    const finalBody = ["post", "put", "patch"].includes(ep.method.toLowerCase()) && requestBody.trim()
        ? interpolate(requestBody)
        : undefined;

    try {
      const res = await aiApi.debugError({
        requestDetails: {
          url: finalUrl,
          method: ep.method.toUpperCase(),
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          body: finalBody,
        },
        responseDetails: response,
        endpointData: ep,
      });
      setDebugResult(res.markdown);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failure executing AI debug";
      setDebugResult(`**Error initiating debug:** ${msg}`);
    } finally {
      setIsDebugging(false);
    }
  };

  const handleCopyResponse = () => {
    if (!response) return;
    const text = typeof response.body === "string"
      ? response.body
      : JSON.stringify(response.body, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatResponseBody = (body: unknown): string => {
    if (body === null || body === undefined) return "No response body";
    if (typeof body === "string") {
      try {
        return JSON.stringify(JSON.parse(body), null, 2);
      } catch {
        return body;
      }
    }
    return JSON.stringify(body, null, 2);
  };

  if (!ep) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-base text-secondary p-8 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
        <Settings2 className="w-16 h-16 opacity-20 mb-6" />
        <h2 className="text-2xl font-bold text-primary mb-2">Ready to test APIs?</h2>
        <p className="max-w-md text-sm leading-relaxed text-secondary/80">
          Create a module, import an OpenAPI specification, then select an endpoint to start configuring and sending requests.
        </p>
      </div>
    );
  }

  const pathParamDefinitions = ep.parameters.filter(p => p.in === "path");

  return (
    <div className="flex flex-col h-full bg-base overflow-hidden relative">
       {/* URL BAR */}
       <header className="flex flex-col border-b border-border bg-surface/50 shrink-0">
          {/* Base URL Row (Collapsible/Editable) */}
          <div className="flex items-center px-4 h-8 bg-elevated/30 border-b border-border/50 gap-2">
            <span className="text-[10px] font-bold text-secondary uppercase tracking-tight">Base URL:</span>
            {!showBaseUrlEditor ? (
              <div className="flex items-center gap-2 group max-w-[400px]">
                <span className="text-[10px] font-mono text-primary/70 truncate">
                  {specState.baseUrl || "None set"}
                </span>
                <button 
                  onClick={() => setShowBaseUrlEditor(true)}
                  className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-base rounded cursor-pointer"
                >
                  <Edit2 className="w-2.5 h-2.5 text-accent" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 max-w-[500px]">
                <input 
                  type="text"
                  value={editableBaseUrl}
                  onChange={(e) => setEditableBaseUrl(e.target.value)}
                  className="h-6 flex-1 bg-base border border-accent/30 rounded px-2 text-[10px] font-mono text-primary outline-none focus:border-accent"
                  placeholder="https://api.example.com"
                  autoFocus
                />
                <button 
                  onClick={handleBaseUrlSave}
                  className="h-6 px-3 bg-accent text-white text-[10px] font-bold rounded hover:bg-accent-hover cursor-pointer"
                >
                  Save
                </button>
                <button 
                  onClick={() => {
                    setShowBaseUrlEditor(false);
                    setEditableBaseUrl(specState.baseUrl);
                  }}
                  className="h-6 px-3 bg-base text-secondary text-[10px] font-bold rounded hover:bg-elevated cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="h-16 flex items-center px-4 gap-3">
             <div className={`px-3 py-1.5 rounded-md border font-bold text-xs uppercase tracking-wider ${getMethodColor(ep.method)}`}>
               {ep.method}
             </div>
             <div className="flex-1 flex items-center bg-elevated border border-border-subtle rounded-md px-3 h-10 shadow-inner group transition-colors focus-within:border-accent">
                <input
                  type="text"
                  className="flex-1 bg-transparent border-none outline-none text-primary font-mono text-sm"
                  value={requestUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://api.example.com/v1/endpoint"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                />
             </div>
             <button
               onClick={handleSend}
               disabled={isSending || !requestUrl.trim()}
               className="h-10 px-6 bg-accent hover:bg-accent-hover active:bg-accent/80 text-white font-medium rounded-md flex items-center gap-2 transition-all shadow-lg shadow-accent/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
               {isSending ? "Sending..." : "Send"}
             </button>
          </div>
       </header>

       <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
         {/* REQUEST PANE */}
        <section className="flex-1 flex flex-col border-b xl:border-b-0 xl:border-r border-border min-h-0 bg-base">
           {/* TABS */}
           <div className="h-10 border-b border-border bg-surface/30 flex px-2 overflow-x-auto shrink-0 ">
             {(["params", "headers", "auth", "body"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 text-xs font-medium border-b-2 transition-all capitalize cursor-pointer ${activeTab === tab ? 'text-accent border-accent' : 'text-secondary border-transparent hover:text-primary'}`}
                >
                  {tab}
                </button>
             ))}
           </div>

           {/* PARAMS TAB CONTENT */}
           <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
              {activeTab === "params" && (
                <>
                  {/* Path Parameters Section */}
                  {pathParamDefinitions.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                         <h3 className="text-[11px] font-bold text-secondary uppercase tracking-wider">Path Variables</h3>
                      </div>
                      {pathParamDefinitions.map(p => (
                        <div key={p.name} className="flex items-center gap-3 p-3 rounded-lg bg-surface/30 border border-border-subtle group hover:border-accent/30 transition-colors">
                           <div className="flex flex-col gap-1 flex-1 min-w-0">
                              <span className="text-sm font-mono text-primary flex items-center gap-2">
                                 {p.name}
                                 {p.required && <span className="text-[9px] text-danger font-bold uppercase">Required</span>}
                              </span>
                              {p.description && <span className="text-[10px] text-secondary/60 truncate">{p.description}</span>}
                           </div>
                           <input
                             type="text"
                             className="w-48 px-3 py-1.5 text-sm bg-base border border-border rounded-md outline-none focus:border-accent text-primary font-mono transition-colors"
                             value={pathParams[p.name] || ""}
                             onChange={(e) => handlePathParamChange(p.name, e.target.value)}
                             placeholder={`Enter ${p.name}...`}
                           />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Query Parameters Section */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                       <h3 className="text-[11px] font-bold text-secondary uppercase tracking-wider">Query Params</h3>
                       <button 
                         onClick={addQueryParam}
                         className="text-[11px] text-accent hover:text-accent-hover transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                       >
                         <PlusCircle className="w-3.5 h-3.5" />
                         Add Param
                       </button>
                    </div>
                    {queryParams.length === 0 ? (
                      <div className="h-24 flex flex-col items-center justify-center border border-dashed border-border rounded-lg bg-surface/20">
                         <p className="text-xs text-secondary/40">No query parameters added yet</p>
                         <button onClick={addQueryParam} className="mt-2 text-[10px] text-accent hover:underline cursor-pointer">Add one now</button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {queryParams.map((p, i) => (
                           <div key={i} className="flex items-center gap-2 group">
                              <input
                                type="checkbox"
                                checked={p.enabled}
                                onChange={(e) => handleQueryParamChange(i, "enabled", e.target.checked)}
                                className="accent-accent shrink-0 rounded cursor-pointer"
                              />
                              <input
                                type="text"
                                className="flex-1 px-3 py-1.5 text-sm bg-base border border-border rounded-md outline-none focus:border-accent text-primary font-mono"
                                value={p.key}
                                onChange={(e) => handleQueryParamChange(i, "key", e.target.value)}
                                placeholder="Key"
                              />
                              <input
                                type="text"
                                className="flex-1 px-3 py-1.5 text-sm bg-base border border-border rounded-md outline-none focus:border-accent text-primary font-mono"
                                value={p.value}
                                onChange={(e) => handleQueryParamChange(i, "value", e.target.value)}
                                placeholder="Value"
                              />
                              <button 
                                onClick={() => removeQueryParam(i)}
                                className="p-1.5 text-secondary/40 hover:text-danger hover:bg-danger/10 rounded-md transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Other Tabs */}
              {activeTab === "headers" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">Request Headers</h3>
                    <button onClick={() => setCustomHeaders([...customHeaders, { key: "", value: "", enabled: true }])} className="text-xs text-accent hover:underline cursor-pointer">+ Add Header</button>
                  </div>
                  {customHeaders.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 group">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={(e) => setCustomHeaders(customHeaders.map((header, idx) => idx === i ? { ...header, enabled: e.target.checked } : header))}
                        className="accent-accent shrink-0"
                      />
                      <input
                        type="text"
                        value={h.key}
                        onChange={(e) => setCustomHeaders(customHeaders.map((header, idx) => idx === i ? { ...header, key: e.target.value } : header))}
                        placeholder="Header name"
                        className="flex-1 px-2 py-1.5 text-sm bg-base border border-border rounded-md outline-none focus:border-accent text-primary font-mono"
                      />
                      <input
                        type="text"
                        value={h.value}
                        onChange={(e) => setCustomHeaders(customHeaders.map((header, idx) => idx === i ? { ...header, value: e.target.value } : header))}
                        placeholder="Value"
                        className="flex-1 px-2 py-1.5 text-sm bg-base border border-border rounded-md outline-none focus:border-accent text-primary font-mono"
                      />
                      <button onClick={() => setCustomHeaders(customHeaders.filter((_, idx) => idx !== i))} className="text-secondary/40 hover:text-danger p-1 opacity-0 group-hover:opacity-100 cursor-pointer">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "auth" && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">Authorization</h3>
                  <div className="flex flex-col gap-3 max-w-md">
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[10px] text-secondary font-medium uppercase tracking-tighter">Auth Type</label>
                       <select
                         value={authType}
                         onChange={(e) => setAuthType(e.target.value as "none" | "bearer")}
                         className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg outline-none focus:border-accent text-primary cursor-pointer"
                       >
                         <option value="none">No Auth</option>
                         <option value="bearer">Bearer Token</option>
                       </select>
                    </div>
                    {authType === "bearer" && (
                      <div className="flex flex-col gap-1.5">
                         <label className="text-[10px] text-secondary font-medium uppercase tracking-tighter">Token</label>
                         <input
                           type="text"
                           value={bearerToken}
                           onChange={(e) => setBearerToken(e.target.value)}
                           placeholder="Paste your token here..."
                           className="w-full px-3 py-2 text-sm bg-base border border-border rounded-lg outline-none focus:border-accent text-primary font-mono"
                         />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "body" && (
                <div className="flex-1 flex flex-col gap-3 min-h-[300px]">
                   <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">Request Body (JSON)</h3>
                      <button 
                        onClick={() => { try { setRequestBody(JSON.stringify(JSON.parse(requestBody), null, 2)); } catch { /* ignore */ } }}
                        className="text-[10px] text-accent hover:underline cursor-pointer"
                      >
                        Beautify
                      </button>
                   </div>
                   <textarea
                     value={requestBody}
                     onChange={(e) => setRequestBody(e.target.value)}
                     placeholder='{"name": "example", "active": true}'
                     className="flex-1 bg-surface/50 border border-border rounded-xl p-4 text-sm font-mono text-primary outline-none focus:border-accent transition-colors resize-none "
                   />
                </div>
              )}
           </div>
        </section>

        {/* RESPONSE PANE */}
        <section className="flex-1 flex flex-col min-h-[400px] xl:min-h-0 bg-surface/20">
           {/* RESPONSE HEADER */}
           <div className="h-10 border-b border-border bg-surface/30 flex items-center justify-between px-4 shrink-0">
             <span className="text-xs font-medium text-secondary">Response</span>
             <div className="flex items-center gap-3">
               {response && (
                 <>
                   <span className={`text-[10px] font-bold bg-surface border border-border px-1.5 py-0.5 rounded ${getStatusColor(response.statusCode)}`}>
                     {response.statusCode === 0 ? "ERR" : response.statusCode} {response.statusText}
                   </span>
                   <span className="text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded text-secondary">
                     {response.latencyMs}ms
                   </span>
                   <button
                     onClick={handleCopyResponse}
                     className="p-1 text-secondary hover:text-primary transition-colors cursor-pointer"
                     title="Copy response"
                   >
                     {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                   </button>
                 </>
               )}
               {!response && (
                 <>
                   <span className="text-[10px] bg-surface border border-border px-1.5 rounded text-secondary">Status: -</span>
                   <span className="text-[10px] bg-surface border border-border px-1.5 rounded text-secondary">Time: -</span>
                 </>
               )}
             </div>
           </div>

           {/* RESPONSE CONTENT */}
           <div className="flex-1 overflow-y-auto p-4 flex flex-col">
             {isSending && (
               <div className="flex-1 flex flex-col items-center justify-center">
                 <Loader2 className="w-8 h-8 text-accent animate-spin mb-3" />
                 <p className="text-sm text-secondary">Sending request...</p>
               </div>
             )}

             {!isSending && !response && (
               <div className="flex-1 flex flex-col items-center justify-center text-center">
                 <div className="w-16 h-16 rounded-2xl bg-elevated border border-border flex items-center justify-center mb-4 transform -rotate-12">
                   <Send className="w-6 h-6 text-secondary/40" />
                 </div>
                 <p className="text-sm text-secondary font-medium">Ready to test</p>
                 <p className="text-xs text-secondary/60 mt-1 max-w-xs text-center">
                   Fill in your parameters and hit Send to see the results.
                 </p>
               </div>
             )}

             {!isSending && response && (
               <div className="flex flex-col gap-3 flex-1">
                 {(response.isError || response.statusCode >= 400 || response.statusCode === 0) && (
                   <div className="flex flex-col gap-3">
                     <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm flex items-center justify-between">
                       <div>
                         <span className="font-semibold">{response.statusCode === 0 ? "Network Error" : "Error"}: </span>
                         {response.errorMessage || response.statusText || "Request failed"}
                       </div>
                       <button
                         onClick={handleDebug}
                         disabled={isDebugging}
                         className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                       >
                         {isDebugging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                         {isDebugging ? "Analyzing..." : "Debug with AI"}
                       </button>
                     </div>
                     {debugResult && (
                       <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg text-primary text-sm flex flex-col gap-2">
                         <div className="flex items-center gap-2 mb-1 border-b border-accent/10 pb-2 text-accent font-bold">
                           <Sparkles className="w-4 h-4" />
                           AI Debug Assistant
                         </div>
                         <div className="prose prose-sm prose-invert max-w-none text-primary/80">
                           <ReactMarkdown>{debugResult}</ReactMarkdown>
                         </div>
                       </div>
                     )}
                   </div>
                 )}
                 <pre className="flex-1 p-4 bg-base border border-border rounded-lg text-sm font-mono text-primary overflow-auto whitespace-pre-wrap break-words ">
                   {formatResponseBody(response.body)}
                 </pre>
               </div>
             )}
           </div>
        </section>
      </div>
    </div>
  );
}

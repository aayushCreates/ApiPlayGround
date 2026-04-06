// ─── HTTP ─────────────────────────────────────────────────────────

export type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "head"
  | "options";

// ─── OpenAPI Parsed Types ─────────────────────────────────────────

export interface ParsedSpec {
  info: {
    title: string;
    description?: string;
    version: string;
  };
  servers: Array<{ url: string; description?: string }>;
  tags: Array<{ name: string; description?: string }>;
  endpoints: ParsedEndpoint[];
  rawSpec: object;
}

export interface ParsedEndpoint {
  id: string; // `${method}:${path}`
  method: HttpMethod;
  path: string; // e.g. /users/{userId}
  summary?: string;
  description?: string;
  tags: string[];
  parameters: ParsedParameter[];
  requestBody?: ParsedRequestBody;
  responses: Record<string, ParsedResponse>;
  security?: string[];
  deprecated?: boolean;
}

export interface ParsedParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  description?: string;
  schema: JsonSchema;
  example?: unknown;
}

export interface ParsedRequestBody {
  required: boolean;
  description?: string;
  content: Record<string, { schema: JsonSchema; example?: unknown }>;
}

export interface ParsedResponse {
  description: string;
  content?: Record<string, { schema: JsonSchema; example?: unknown }>;
}

export interface JsonSchema {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: unknown[];
  example?: unknown;
  $ref?: string;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  nullable?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
}

// ─── Request Builder ──────────────────────────────────────────────

export interface RequestConfig {
  method: HttpMethod;
  baseUrl: string;
  path: string;
  pathParams: Record<string, string>;
  queryParams: Record<string, { value: string; enabled: boolean }>;
  headers: Record<string, { value: string; enabled: boolean }>;
  body: string;
  bodyContentType: string;
  authType: "none" | "bearer" | "basic" | "apikey";
  authBearer: string;
  authBasicUser: string;
  authBasicPass: string;
  authApiKeyName: string;
  authApiKeyValue: string;
}

export interface RequestResult {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  rawBody: string;
  latencyMs: number;
  size: string;
  timestamp: Date;
  isError: boolean;
  errorMessage?: string;
  isCorsError?: boolean;
}

// ─── Modules ──────────────────────────────────────────────────────

export interface Module {
  id: string;          // local uuid
  name: string;
  specDbId: string;    // Spec row id from backend
  parsedSpec: ParsedSpec | null;
  rawContent: string;
  isOpen: boolean;     // sidebar collapsed/expanded
}

// ─── SpecContext ──────────────────────────────────────────────────

export interface SpecContextState {
  modules: Module[];
  activeModuleId: string | null;
  selectedEndpoint: ParsedEndpoint | null;
  baseUrl: string;
  isParsing: boolean;
  parseError: string | null;
}

export type SpecAction =
  | { type: "SET_MODULES"; payload: Module[] }
  | { type: "ADD_MODULE"; payload: Module }
  | { type: "DELETE_MODULE"; payload: string }         // module id
  | { type: "TOGGLE_MODULE"; payload: string }         // module id
  | { type: "SET_ACTIVE_MODULE"; payload: string }     // module id
  | { type: "SELECT_ENDPOINT"; payload: { endpoint: ParsedEndpoint; moduleId: string; baseUrl: string } }
  | { type: "PARSE_START" }
  | { type: "PARSE_ERROR"; payload: string }
  | { type: "SET_BASE_URL"; payload: string }
  | { type: "RESET" };

// ─── Saved Data ───────────────────────────────────────────────────

export interface Spec {
  id: string;
  name: string;
  description: string | null;
  content: string;
  parsedUrl: string | null;
  isPublic: boolean;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryItem {
  id: string;
  method: HttpMethod;
  url: string;
  statusCode: number | null;
  latencyMs: number | null;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  responseBody: string | null;
  responseHeaders: Record<string, string> | null;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  specId: string;
  requests: SavedRequest[];
  createdAt: string;
}

export interface SavedRequest {
  id: string;
  collectionId: string;
  name: string;
  method: HttpMethod;
  path: string;
  parameters: {
    path: Record<string, string>;
    query: Record<string, string>;
    header: Record<string, string>;
  };
  requestBody: string | null;
}

export interface AiExplanationResult {
  explanation: string;
  cached: boolean;
}

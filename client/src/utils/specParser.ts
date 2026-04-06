import SwaggerParser from "@apidevtools/swagger-parser";
import yaml from "js-yaml";
import type { ParsedSpec, HttpMethod, ParsedEndpoint, ParsedParameter, ParsedRequestBody, ParsedResponse } from "../types";

export const parseRawSpec = (input: string): any => {
  try {
    return JSON.parse(input);
  } catch (e) {
    return yaml.load(input);
  }
};

export const transformSpec = async (rawInput: string): Promise<ParsedSpec> => {
  const parsed = parseRawSpec(rawInput);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid OpenAPI specification format");
  }

  // Dereference $refs using SwaggerParser
  const cloned = JSON.parse(JSON.stringify(parsed));
  const api = (await SwaggerParser.dereference(cloned)) as any;

  const info = api.info || { title: "Unknown API", version: "1.0.0" };
  const servers = api.servers || [];
  const tags = api.tags || [];
  const endpoints: ParsedEndpoint[] = [];

  if (api.paths) {
    for (const [path, methods] of Object.entries(api.paths)) {
      for (const [method, details] of Object.entries(methods as any)) {
        // Skip common non-http-method fields in paths object (like parameters or $ref)
        if (!["get", "post", "put", "patch", "delete", "options", "head"].includes(method.toLowerCase())) {
          continue;
        }
        
        const endpointId = `${method.toUpperCase()}:${path}`;
        
        // Parse parameters
        const parameters: ParsedParameter[] = (((details as any).parameters || []) as any[]).map((p: any) => ({
          name: p.name,
          in: p.in,
          required: p.required || false,
          description: p.description,
          schema: p.schema || {},
          example: p.example || p.schema?.example || undefined,
        }));

        // Combine path-level parameters
        if ((methods as any).parameters) {
          (methods as any).parameters.forEach((pathParam: any) => {
            if (!parameters.find((p) => p.name === pathParam.name && p.in === pathParam.in)) {
              parameters.push({
                name: pathParam.name,
                in: pathParam.in,
                required: pathParam.required || false,
                description: pathParam.description,
                schema: pathParam.schema || {},
                example: pathParam.example || pathParam.schema?.example || undefined,
              });
            }
          });
        }

        // Parse Request Body
        let requestBody: ParsedRequestBody | undefined = undefined;
        if ((details as any).requestBody) {
          const reqBody = (details as any).requestBody;
          const contentOutput: Record<string, any> = {};
          
          if (reqBody.content) {
            for (const [contentType, contentDetails] of Object.entries(reqBody.content as any)) {
              contentOutput[contentType] = {
                schema: (contentDetails as any).schema || {},
                example: (contentDetails as any).example || (contentDetails as any).schema?.example || generateExampleFromSchema((contentDetails as any).schema)
              };
            }
          }

          requestBody = {
            required: reqBody.required || false,
            description: reqBody.description,
            content: contentOutput,
          };
        }

        // Parse Responses
        const responses: Record<string, ParsedResponse> = {};
        if ((details as any).responses) {
          for (const [status, resDetails] of Object.entries((details as any).responses as any)) {
            const contentOutput: Record<string, any> = {};
            if ((resDetails as any).content) {
              for (const [contentType, contentDetails] of Object.entries((resDetails as any).content as any)) {
                contentOutput[contentType] = {
                  schema: (contentDetails as any).schema || {},
                  example: (contentDetails as any).example || (contentDetails as any).schema?.example || generateExampleFromSchema((contentDetails as any).schema)
                };
              }
            }
            responses[status] = {
              description: (resDetails as any).description || "",
              content: Object.keys(contentOutput).length > 0 ? contentOutput : undefined
            };
          }
        }

        endpoints.push({
          id: endpointId,
          method: method as HttpMethod,
          path,
          summary: (details as any).summary,
          description: (details as any).description,
          tags: (details as any).tags || [],
          parameters,
          requestBody,
          responses,
          security: (details as any).security,
          deprecated: (details as any).deprecated || false,
        });
      }
    }
  }

  return {
    info,
    servers,
    tags,
    endpoints,
    rawSpec: parsed,
  };
};

// Extremely basic example generator for a dereferenced schema
export const generateExampleFromSchema = (schema: any): any => {
  if (!schema) return undefined;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  switch (schema.type) {
    case "string":
      return schema.enum ? schema.enum[0] : "example_string";
    case "number":
    case "integer":
      return schema.enum ? schema.enum[0] : 0;
    case "boolean":
      return true;
    case "array":
      return schema.items ? [generateExampleFromSchema(schema.items)] : [];
    case "object":
      if (schema.properties) {
        const obj: any = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = generateExampleFromSchema(propSchema);
        }
        return obj;
      }
      return {};
    default:
      // If it has properties but no type set
      if (schema.properties) {
        const obj: any = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = generateExampleFromSchema(propSchema);
        }
        return obj;
      }
      return undefined;
  }
};

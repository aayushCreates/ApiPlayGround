import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";
import { prisma } from "../config/db";
import { generateAiResponse } from "../services/ai.service";

export const explainEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { method, path, endpointData, specContent } = req.body;

    // Create a deterministic hash for caching
    const hashInput = encodeURIComponent(
      `${method}:${path}:${(specContent || "").slice(0, 500)}`
    );
    const endpointHash = Buffer.from(hashInput).toString("base64");

    const cached = await prisma.aiExplanation.findUnique({
      where: { endpointHash },
    });

    if (cached) {
      return res.json({ explanation: cached.explanation, cached: true });
    }

    const rateLimitKey = `ai_explain:${req.clerkId}`;
    const requests = await redis.incr(rateLimitKey);
    if (requests === 1) {
      await redis.expire(rateLimitKey, 3600); // 1 hour
    }
    if (requests > 20) {
      return res
        .status(429)
        .json({ message: "AI explanations rate limit exceeded (20/hour)." });
    }

    const summary = endpointData?.summary || "Not provided";
    const description = endpointData?.description || "Not provided";
    const parameters = endpointData?.parameters || [];
    const requestBody = endpointData?.requestBody;
    const responses = endpointData?.responses || {};

    const prompt = `You are an API documentation expert helping a developer understand an endpoint.

Endpoint: ${method} ${path}
Summary: ${summary}
Description: ${description}

Parameters:
${parameters
  .map(
    (p: any) =>
      `- ${p.name} (${p.in}, ${
        p.required ? "required" : "optional"
      }): ${p.description ?? ""}`
  )
  .join("\n")}

Request Body Schema:
${requestBody ? safeStringify(processLargeData(requestBody, 2000)) : "None"}

Response Schemas:
${safeStringify(processLargeData(responses, 3000))}

Provide a developer-focused explanation with these exact sections:
## What it does
2-3 sentences in plain English.

## When to use it
3 bullet points of common real-world use cases.

## Parameters
For each parameter: what it does and an example value.

## Example request body
Valid JSON with realistic values (if applicable).

## Success response
What a 200/201 response looks like.

## Watch out for
2-3 common errors or gotchas.

Be specific and practical. No filler text.`;

    const explanationText = await generateAiResponse(prompt);

    await prisma.aiExplanation.create({
      data: {
        endpointHash,
        explanation: explanationText,
      },
    });

    res.json({ explanation: explanationText, cached: false });
  } catch (error) {
    next(error);
  }
};

const safeStringify = (obj: unknown): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

/**
 * Truncates and filters large data to stay within AI context limits.
 * Handles both JSON objects and raw strings.
 */
const processLargeData = (data: unknown, maxChars = 6000): any => {
  if (!data) return data;

  // 1. Handle Strings (Head + Tail sampling)
  if (typeof data === "string") {
    if (data.length <= maxChars) return data;
    const half = Math.floor(maxChars / 2);
    return `${data.slice(0, half)}\n\n--- [TRUNCATED ${data.length - maxChars} CHARACTERS] ---\n\n${data.slice(-half)}`;
  }

  // 2. Handle Objects (JSON filtering)
  if (typeof data === "object") {
    const str = JSON.stringify(data);
    if (str.length <= maxChars) return data;

    // If it's an object, we recursively pick important keys
    const pickImportant = (obj: any, depth = 0): any => {
      if (depth > 3 || obj === null || typeof obj !== 'object') return obj;
      
      const importantKeys = ['message', 'error', 'stack', 'status', 'code', 'details', 'name', 'summary', 'description'];
      const result: any = {};
      
      // First pass: pick known important keys
      for (const key of Object.keys(obj)) {
        if (importantKeys.includes(key.toLowerCase())) {
          result[key] = obj[key];
        }
      }

      // If we still have space, add other keys but limit their size
      if (JSON.stringify(result).length < maxChars / 2) {
        for (const key of Object.keys(obj)) {
          if (!result[key]) {
            const val = obj[key];
            if (Array.isArray(val)) {
              result[key] = val.length > 5 ? [...val.slice(0, 5), `... (${val.length - 5} more items)`] : val;
            } else if (typeof val === 'object') {
              result[key] = pickImportant(val, depth + 1);
            } else {
              result[key] = val;
            }
          }
        }
      }

      return result;
    };

    const filtered = pickImportant(data);
    const filteredStr = JSON.stringify(filtered, null, 2);
    
    // If filtered JSON is still too big, fallback to head/tail string sampling
    if (filteredStr.length > maxChars) {
      return processLargeData(filteredStr, maxChars);
    }
    return filtered;
  }

  return data;
};

export const debugError = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { requestDetails, responseDetails, endpointData } = req.body;

    const rateLimitKey = `ai_debug:${req.clerkId}`;
    const requests = await redis.incr(rateLimitKey);
    if (requests === 1) {
      await redis.expire(rateLimitKey, 3600); // 1 hour
    }
    if (requests > 40) {
      return res
        .status(429)
        .json({ message: "AI debug rate limit exceeded (40/hour)." });
    }

    // Removed manual trimming in favor of processLargeData inside the prompt builder

    // ── Fetch Recent Failures for Context ──
    let historyContext = "";
    try {
      const recentFailures = await prisma.requestHistory.findMany({
        where: {
          clerkId: req.clerkId || "",
          url: requestDetails?.url || "",
          statusCode: { gte: 400 },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { statusCode: true, responseBody: true, createdAt: true },
      });

      if (recentFailures.length > 0) {
        historyContext = "\n### Recent Failure History for this Endpoint\n" + 
          recentFailures.map(f => {
            const shortBody = processLargeData(f.responseBody || "No body", 150);
            return `- [Status ${f.statusCode}] caught at ${f.createdAt.toISOString()}: ${shortBody}`;
          }).join("\n");
      }
    } catch (e) {
      console.warn("Failed to fetch history context:", e);
    }

    const prompt = `You are an expert API debugging assistant.
A developer tried to make an API request but encountered an error.
Analyze the request, response, and expected endpoint schema to determine the problem.

### Expected Endpoint Schema
${endpointData ? safeStringify(processLargeData(endpointData, 3000)) : "Not provided"}

### Executed Request
${safeStringify(processLargeData(requestDetails, 2000))}

### Received Response (Error)
${safeStringify(processLargeData(responseDetails, 6000))}
${historyContext}

Provide your response in GitHub Flavored Markdown with these sections:
1. **Error Diagnosis**: Explain exactly why it failed (e.g. 401 Unauthorized, 400 Bad Request structure).
2. **Detection Check**:
    - Are there *wrong headers*? (e.g., missing specific Content-Type)
    - Are there *missing params*? (e.g., query params, path params out of bounds)
    - Are there *auth issues*? (e.g., missing Bearer token, invalid token syntax)
3. **Suggested Fix**: Provide the exact fix the user should make (e.g. "Add a query parameter ?status=active" or "Change the request body to ..."). Provide code blocks if necessary.

Be practical, direct, and helpful.`;

    const markdown = await generateAiResponse(prompt);

    res.json({ markdown });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "AI service unavailable";
    console.error("Debug AI error:", msg);
    res.status(502).json({ message: msg });
  }
};


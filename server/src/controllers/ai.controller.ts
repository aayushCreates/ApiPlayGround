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
${requestBody ? JSON.stringify(requestBody, null, 2) : "None"}

Response Schemas:
${JSON.stringify(responses, null, 2)}

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

    // Trim large response bodies to avoid bloating the prompt
    const trimmedResponse = {
      ...(responseDetails || {}),
      body: typeof responseDetails?.body === "string"
        ? responseDetails.body.slice(0, 2000)
        : responseDetails?.body,
    };

    const prompt = `You are an expert API debugging assistant.
A developer tried to make an API request but encountered an error.
Analyze the request, response, and expected endpoint schema to determine the problem.

### Expected Endpoint Schema
${endpointData ? safeStringify(endpointData) : "Not provided"}

### Executed Request
${safeStringify(requestDetails)}

### Received Response (Error)
${safeStringify(trimmedResponse)}

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


import { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../config/db";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const explanationText =
      (msg.content[0] as unknown as { text: string }).text || "";

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

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

interface ProviderResult {
  provider: string;
  text: string;
}

export const generateAiResponse = async (prompt: string): Promise<string> => {
  const errors: string[] = [];

  // 1. Anthropic Claude (Primary)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });


      console.log("Anthropic response: ", msg);

      const text = (msg.content[0] as unknown as { text: string }).text || "";
      if (text) {
        console.log("✓ AI response from: Anthropic Claude");
        return text;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("✗ Anthropic failed:", msg);
      errors.push(`Anthropic: ${msg}`);
    }
  } else {
    errors.push("Anthropic: API key not configured");
  }

  // 2. Google Gemini (Secondary)
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      console.log("Gemini response: ", text);
      if (text) {
        console.log("✓ AI response from: Google Gemini");
        return text;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("✗ Gemini failed:", msg);
      errors.push(`Gemini: ${msg}`);
    }
  } else {
    errors.push("Gemini: API key not configured");
  }

  // 3. OpenAI ChatGPT (Tertiary)
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      console.log("OpenAI response: ", completion);
      const text = completion.choices[0].message?.content || "";
      if (text) {
        console.log("✓ AI response from: OpenAI GPT");
        return text;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("✗ OpenAI failed:", msg);
      errors.push(`OpenAI: ${msg}`);
    }
  } else {
    errors.push("OpenAI: API key not configured");
  }

  console.error("All AI providers failed:", errors);
  throw new Error(`All AI providers failed. Details: ${errors.join(" | ")}`);
};

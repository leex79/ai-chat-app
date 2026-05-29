import { GoogleGenAI } from "@google/genai";

export const MODEL = process.env.LLM_MODEL ?? "gemini-2.5-flash-lite";

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. .env.local을 확인해 주세요.");
  }
  return new GoogleGenAI({ apiKey });
}

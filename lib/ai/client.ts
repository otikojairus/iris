// OpenAI client + config, driven entirely by environment variables so the appliance
// stays portable. When OPENAI_API_KEY is absent the app degrades gracefully to the
// deterministic editor (see interpretEdit) — no AI calls are made.

import OpenAI from "openai";

export const AI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || "",
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  baseURL: process.env.OPENAI_BASE_URL || undefined,
};

export function isAiEnabled(): boolean {
  return AI_CONFIG.apiKey.trim().length > 0;
}

let client: OpenAI | null = null;

/** Lazily construct the OpenAI client (returns null when no key is configured). */
export function getAiClient(): OpenAI | null {
  if (!isAiEnabled()) return null;
  if (!client) {
    client = new OpenAI({ apiKey: AI_CONFIG.apiKey, baseURL: AI_CONFIG.baseURL });
  }
  return client;
}

// AI client + config, driven entirely by environment variables so the appliance
// stays portable. Supports Anthropic (Claude) and OpenAI. When neither key is set
// the app degrades gracefully to the deterministic editor — no AI calls are made.

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type AiProvider = "anthropic" | "openai";

const anthropicKey = () => (process.env.ANTHROPIC_API_KEY || "").trim();
const openaiKey = () => (process.env.OPENAI_API_KEY || "").trim();

function resolveProvider(): AiProvider | null {
  const forced = (process.env.IRIS_AI_PROVIDER || "").trim().toLowerCase();
  if (forced === "anthropic" && anthropicKey()) return "anthropic";
  if (forced === "openai" && openaiKey()) return "openai";
  if (anthropicKey()) return "anthropic";
  if (openaiKey()) return "openai";
  return null;
}

export const AI_CONFIG = {
  get provider(): AiProvider | null {
    return resolveProvider();
  },
  get apiKey(): string {
    return resolveProvider() === "anthropic" ? anthropicKey() : openaiKey();
  },
  get model(): string {
    if (resolveProvider() === "anthropic") {
      return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
    }
    return process.env.OPENAI_MODEL || "gpt-4o-mini";
  },
  get baseURL(): string | undefined {
    return process.env.OPENAI_BASE_URL || undefined;
  },
};

export function isAiEnabled(): boolean {
  return resolveProvider() !== null;
}

/** Hard cap on a single AI request so a hanging endpoint can't stall generation. */
export const AI_REQUEST_TIMEOUT_MS = 60_000;

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function getOpenAiClient(): OpenAI | null {
  if (!openaiKey()) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: openaiKey(),
      baseURL: AI_CONFIG.baseURL,
      timeout: AI_REQUEST_TIMEOUT_MS,
      maxRetries: 1,
    });
  }
  return openaiClient;
}

function getAnthropicClient(): Anthropic | null {
  if (!anthropicKey()) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: anthropicKey(),
      timeout: AI_REQUEST_TIMEOUT_MS,
      maxRetries: 1,
    });
  }
  return anthropicClient;
}

export type CompleteJsonOptions = {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
};

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : trimmed).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI response was not JSON.");
  return JSON.parse(body.slice(start, end + 1));
}

async function completeAnthropicJson(opts: CompleteJsonOptions): Promise<unknown> {
  const client = getAnthropicClient();
  if (!client) throw new Error("Anthropic is not configured.");
  const message = await client.messages.create({
    model: AI_CONFIG.model,
    max_tokens: opts.maxTokens ?? 8192,
    temperature: opts.temperature ?? 0.4,
    system: `${opts.system}\n\nReturn ONLY a valid JSON object. No markdown fences, no commentary.`,
    messages: [{ role: "user", content: opts.user }],
  });
  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .filter(Boolean)
    .join("\n");
  return parseJsonObject(text || "{}");
}

async function completeOpenAiJson(opts: CompleteJsonOptions): Promise<unknown> {
  const client = getOpenAiClient();
  if (!client) throw new Error("OpenAI is not configured.");
  const completion = await client.chat.completions.create({
    model: AI_CONFIG.model,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  });
  return parseJsonObject(completion.choices[0]?.message?.content || "{}");
}

/** JSON completion against whichever provider is configured (Anthropic preferred). */
export async function completeJson<T>(opts: CompleteJsonOptions): Promise<T> {
  const provider = resolveProvider();
  if (provider === "anthropic") return (await completeAnthropicJson(opts)) as T;
  if (provider === "openai") return (await completeOpenAiJson(opts)) as T;
  throw new Error("No AI provider is configured.");
}

/** Short hint used in chat replies when AI is not configured. */
export function aiSetupHint(): string {
  return "an ANTHROPIC_API_KEY (or OPENAI_API_KEY)";
}

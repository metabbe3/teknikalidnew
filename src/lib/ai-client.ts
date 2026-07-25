/**
 * Shared AI client — OpenAI-compatible router.
 *
 * All AI calls in the codebase should go through this module instead of
 * instantiating SDK clients directly. This makes it trivial to swap providers.
 *
 * Env vars (kept as ANTHROPIC_* for backward compatibility with docker-compose):
 *   ANTHROPIC_BASE_URL   — router endpoint (e.g. http://host.docker.internal:20128/v1)
 *   ANTHROPIC_AUTH_TOKEN — API key (or "not-needed" if router is open)
 *   ANTHROPIC_MODEL      — model name (e.g. qd/qmodel_latest)
 *   API_TIMEOUT_MS       — request timeout (default 120s)
 */

import OpenAI from "openai";

/**
 * Create a configured OpenAI-compatible client.
 */
export function createAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.ANTHROPIC_AUTH_TOKEN || "not-needed",
    baseURL: process.env.ANTHROPIC_BASE_URL || "http://localhost:20128/v1",
    timeout: Number(process.env.API_TIMEOUT_MS) || 120_000,
  });
}

/**
 * Convenience: single-shot chat completion.
 * Returns the assistant's text response.
 */
export async function aiChat(
  system: string,
  user: string,
  maxTokens: number = 4000,
): Promise<string> {
  const client = createAIClient();
  const model = process.env.ANTHROPIC_MODEL || "qd/qmodel_latest";

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

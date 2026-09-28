/**
 * Shared AI client — Anthropic Messages API, via an OpenAI-shaped shim.
 *
 * Routes every call through `@anthropic-ai/sdk` (Z.ai's Anthropic-compatible
 * endpoint) but exposes the `.chat.completions.create()` surface the rest of the
 * codebase already uses, so callers need no changes. System messages are lifted to
 * the Anthropic top-level `system` param; the text response is wrapped back as
 * `{ choices: [{ message: { content } }] }`.
 *
 * Env vars (kept as ANTHROPIC_* for backward compatibility with docker-compose):
 *   ANTHROPIC_BASE_URL   — e.g. https://api.z.ai/api/anthropic
 *   ANTHROPIC_AUTH_TOKEN — API key
 *   ANTHROPIC_MODEL      — e.g. glm-5.2
 *   API_TIMEOUT_MS       — request timeout (default 120s)
 */
import Anthropic from "@anthropic-ai/sdk";

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIClient {
  chat: {
    completions: {
      create(opts: {
        model: string;
        max_tokens?: number;
        temperature?: number;
        messages: AIChatMessage[];
      }, requestOptions?: { signal?: AbortSignal }): Promise<{ choices: { message: { content: string } }[] }>;
    };
  };
}

/**
 * Create an Anthropic-backed client with an OpenAI-shaped call surface.
 */
export function createAIClient(): AIClient {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_AUTH_TOKEN || "not-needed",
    baseURL: process.env.ANTHROPIC_BASE_URL || "https://api.z.ai/api/anthropic",
    timeout: Number(process.env.API_TIMEOUT_MS) || 120_000,
  });

  return {
    chat: {
      completions: {
        async create(opts, requestOptions?) {
          const systemMsg = opts.messages.find((m) => m.role === "system");
          const turns = opts.messages
            .filter((m) => m.role !== "system")
            .map((m) => ({
              role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
              content: m.content,
            }));

          const resp = await anthropic.messages.create(
            {
              model: opts.model,
              max_tokens: opts.max_tokens ?? 4096,
              // GLM emits long thinking blocks that eat the output budget (article
              // calls came back 0 chars, stop_reason max_tokens). Disabling thinking
              // is both the fix and ~7x cheaper on output tokens.
              thinking: { type: "disabled" },
              ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
              ...(systemMsg ? { system: systemMsg.content } : {}),
              messages: turns,
            },
            requestOptions?.signal ? { signal: requestOptions.signal } : undefined,
          );

          const text = resp.content
            .map((b) => (b.type === "text" ? (b as { text: string }).text : ""))
            .join("");

          return { choices: [{ message: { content: text } }] };
        },
      },
    },
  };
}

/**
 * Convenience: single-shot chat completion. Returns the assistant's text response.
 */
export async function aiChat(system: string, user: string, maxTokens: number = 4000): Promise<string> {
  const client = createAIClient();
  const model = process.env.ANTHROPIC_MODEL || "glm-5.2";

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error(`AI returned no choices: ${JSON.stringify(response).slice(0, 300)}`);
    }

    return response.choices[0]?.message?.content ?? "";
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`AI call failed: ${msg}`);
  }
}

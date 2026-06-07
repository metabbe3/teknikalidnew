import Anthropic from "@anthropic-ai/sdk";
import type { AgentType, AgentJobPayload, AgentJobResult, AgentConfigRow } from "../agent-hub.types";
import { agentHubRepository } from "../agent-hub.repository";

export interface ChainedJobSpec {
  agentType: AgentType;
  payload: AgentJobPayload;
  priority?: number;
}

export interface AgentRunContext {
  jobId: string;
  agentType: AgentType;
  payload: AgentJobPayload;
}

export abstract class BaseAgent {
  abstract readonly type: AgentType;
  abstract readonly label: string;

  /** Default system prompt — can be overridden via AgentConfig.systemPrompt */
  protected getDefaultSystemPrompt(): string {
    return "";
  }

  abstract execute(payload: AgentJobPayload): Promise<AgentJobResult>;

  /**
   * Optional hook: called after a job completes successfully.
   * Return an array of job specs to chain as follow-up jobs.
   */
  onComplete?(_result: AgentJobResult, _parentJobId: string): Promise<ChainedJobSpec[]>;

  /**
   * Load config from DB. Returns null if no config exists.
   */
  protected async loadConfig(): Promise<AgentConfigRow | null> {
    return agentHubRepository.getConfig(this.type);
  }

  /**
   * Get the effective system prompt — DB override if set, otherwise the code default.
   */
  protected async getSystemPrompt(): Promise<string> {
    const config = await this.loadConfig();
    return config?.systemPrompt || this.getDefaultSystemPrompt();
  }

  /**
   * Get agent-specific config (e.g., autoApply, maxArticles).
   */
  protected async getAgentConfig(): Promise<Record<string, unknown> | null> {
    const config = await this.loadConfig();
    return config?.config ?? null;
  }

  protected async callAI(system: string, user: string, maxTokens = 4000): Promise<string> {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
      baseURL: process.env.ANTHROPIC_BASE_URL,
      timeout: 120_000,
    });
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");
  }

  protected truncateForAudit(value: string, maxLen = 300): string {
    if (value.length <= maxLen) return value;
    return value.slice(0, maxLen) + `... [${value.length} chars total]`;
  }

  protected parseJsonResponse(text: string): Record<string, unknown> | null {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

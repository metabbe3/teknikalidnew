import { DomainError } from "@/lib/domain-error";
import {
  RateLimitError,
  ExternalServiceError,
} from "@/lib/common-errors";

export class BotNotInitializedError extends DomainError {
  constructor() { super("Bot user not initialized", 500); }
}

export class DailyLimitExceededError extends RateLimitError {
  constructor(type: string) { super(`Daily ${type} limit exceeded`); }
}

export class AIGenerationError extends ExternalServiceError {
  constructor(msg: string) { super("AI", msg); }
}

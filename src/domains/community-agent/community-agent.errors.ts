import { DomainError } from "@/lib/domain-error";

export class BotNotInitializedError extends DomainError {
  constructor() { super("Bot user not initialized", 500); }
}

export class DailyLimitExceededError extends DomainError {
  constructor(type: string) { super(`Daily ${type} limit exceeded`, 429); }
}

export class AIGenerationError extends DomainError {
  constructor(msg: string) { super(msg, 500); }
}

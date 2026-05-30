import { DomainError } from "@/lib/domain-error";

export class ReputationError extends DomainError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}

export class UserNotFoundError extends ReputationError {
  constructor() {
    super("User not found", 404);
  }
}

export class DailyAlreadyClaimedError extends ReputationError {
  constructor() {
    super("Already claimed today", 409);
  }
}

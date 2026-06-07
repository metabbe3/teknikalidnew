import { DomainError } from "@/lib/domain-error";

export class QuestionNotFoundError extends DomainError {
  constructor() {
    super("Question not found", 404);
  }
}

export class DuplicateVoteError extends DomainError {
  constructor() {
    super("You have already voted on this question", 409);
  }
}

export class FAQGenerationError extends DomainError {
  constructor(reason: string) {
    super(`FAQ generation failed: ${reason}`, 500);
  }
}

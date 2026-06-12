import {
  NotFoundError,
  AlreadyExistsError,
  ExternalServiceError,
} from "@/lib/common-errors";

export class QuestionNotFoundError extends NotFoundError {
  constructor() {
    super("Question");
  }
}

export class DuplicateVoteError extends AlreadyExistsError {
  constructor() {
    super("Vote");
  }
}

export class FAQGenerationError extends ExternalServiceError {
  constructor(reason: string) {
    super("FAQ generation", reason);
  }
}

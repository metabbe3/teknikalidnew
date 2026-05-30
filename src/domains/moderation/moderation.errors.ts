import { DomainError } from "@/lib/domain-error";

export class ModerationError extends DomainError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}

export class MissingFieldsError extends ModerationError {
  constructor() {
    super("targetType, targetId, and reason are required", 400);
  }
}

export class InvalidTargetTypeError extends ModerationError {
  constructor() {
    super("Invalid targetType. Must be POST or COMMENT", 400);
  }
}

export class InvalidReasonError extends ModerationError {
  constructor() {
    super("Invalid reason. Must be SPAM, ABUSE, MISINFORMATION, or OTHER", 400);
  }
}

export class TargetNotFoundError extends ModerationError {
  constructor(type: "post" | "comment") {
    super(`Target ${type} not found`, 404);
  }
}

export class ReportNotFoundError extends ModerationError {
  constructor() {
    super("Report not found", 404);
  }
}

export class ReportAlreadyReviewedError extends ModerationError {
  constructor() {
    super("Report has already been reviewed", 400);
  }
}

export class InvalidActionError extends ModerationError {
  constructor() {
    super("Action must be 'delete', 'dismiss', or 'ban'", 400);
  }
}

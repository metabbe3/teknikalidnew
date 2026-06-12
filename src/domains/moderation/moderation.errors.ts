import { DomainError } from "@/lib/domain-error";
import { NotFoundError, ValidationError } from "@/lib/common-errors";

export class MissingFieldsError extends ValidationError {
  constructor() {
    super("targetType, targetId, and reason are required");
  }
}

export class InvalidTargetTypeError extends ValidationError {
  constructor() {
    super("Invalid targetType. Must be POST or COMMENT");
  }
}

export class InvalidReasonError extends ValidationError {
  constructor() {
    super("Invalid reason. Must be SPAM, ABUSE, MISINFORMATION, or OTHER");
  }
}

export class TargetNotFoundError extends NotFoundError {
  constructor(type: "post" | "comment") {
    super(`Target ${type}`);
  }
}

export class ReportNotFoundError extends NotFoundError {
  constructor() {
    super("Report");
  }
}

export class ReportAlreadyReviewedError extends DomainError {
  constructor() {
    super("Report has already been reviewed", 400);
  }
}

export class InvalidActionError extends ValidationError {
  constructor() {
    super("Action must be 'delete', 'dismiss', or 'ban'");
  }
}

import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/common-errors";

export class PostNotFoundError extends NotFoundError {
  constructor() {
    super("Post");
  }
}

export class CommentNotFoundError extends NotFoundError {
  constructor() {
    super("Comment");
  }
}

export class ContentRequiredError extends ValidationError {
  constructor() {
    super("Content is required");
  }
}

export class ContentTooLongError extends ValidationError {
  constructor(max: number) {
    super(`Content must be ${max} characters or less`);
  }
}

export class InvalidTickerError extends ValidationError {
  constructor() {
    super("Invalid ticker tag");
  }
}

export class InvalidPredictionError extends ValidationError {
  constructor() {
    super("Invalid prediction direction");
  }
}

export class InvalidPredictionTargetError extends ValidationError {
  constructor() {
    super("Invalid prediction target");
  }
}

export class NotAuthorizedError extends ForbiddenError {
  constructor() {
    super();
  }
}

export class MissingPostIdOrTickerError extends ValidationError {
  constructor() {
    super("Either postId or stockTicker must be provided");
  }
}

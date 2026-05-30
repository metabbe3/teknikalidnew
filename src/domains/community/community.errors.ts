import { DomainError } from "@/lib/domain-error";

export class CommunityError extends DomainError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}

export class PostNotFoundError extends CommunityError {
  constructor() {
    super("Post not found", 404);
  }
}

export class CommentNotFoundError extends CommunityError {
  constructor() {
    super("Comment not found", 404);
  }
}

export class ContentRequiredError extends CommunityError {
  constructor() {
    super("Content is required", 400);
  }
}

export class ContentTooLongError extends CommunityError {
  constructor(max: number) {
    super(`Content must be ${max} characters or less`, 400);
  }
}

export class InvalidTickerError extends CommunityError {
  constructor() {
    super("Invalid ticker tag", 400);
  }
}

export class InvalidPredictionError extends CommunityError {
  constructor() {
    super("Invalid prediction direction", 400);
  }
}

export class InvalidPredictionTargetError extends CommunityError {
  constructor() {
    super("Invalid prediction target", 400);
  }
}

export class NotAuthorizedError extends CommunityError {
  constructor() {
    super("Not authorized", 403);
  }
}

export class MissingPostIdOrTickerError extends CommunityError {
  constructor() {
    super("Either postId or stockTicker must be provided", 400);
  }
}

import { DomainError } from "@/lib/domain-error";

export class SocialError extends DomainError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}

export class SelfFollowError extends SocialError {
  constructor() {
    super("Cannot follow yourself", 400);
  }
}

export class InvalidTargetError extends SocialError {
  constructor() {
    super("Invalid target", 400);
  }
}

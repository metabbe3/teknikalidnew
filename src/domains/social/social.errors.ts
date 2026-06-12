import { DomainError } from "@/lib/domain-error";
import { ValidationError } from "@/lib/common-errors";

export class SelfFollowError extends DomainError {
  constructor() {
    super("Cannot follow yourself", 400);
  }
}

export class InvalidTargetError extends ValidationError {
  constructor() {
    super("Invalid target");
  }
}

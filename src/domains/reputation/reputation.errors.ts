import { NotFoundError, AlreadyExistsError } from "@/lib/common-errors";

export class UserNotFoundError extends NotFoundError {
  constructor() {
    super("User");
  }
}

export class DailyAlreadyClaimedError extends AlreadyExistsError {
  constructor() {
    super("Daily reward");
  }
}

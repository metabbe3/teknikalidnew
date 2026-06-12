import { AlreadyExistsError } from "@/lib/common-errors";

export {
  NotAuthenticatedError,
  AccountSuspendedError,
  AdminRequiredError,
  ValidationError,
} from "@/lib/common-errors";

export class EmailTakenError extends AlreadyExistsError {
  constructor() {
    super("Email");
  }
}

export class UsernameTakenError extends AlreadyExistsError {
  constructor() {
    super("Username");
  }
}

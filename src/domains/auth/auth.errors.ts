import { DomainError } from "@/lib/domain-error";

export class AuthError extends DomainError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}

export class NotAuthenticatedError extends AuthError {
  constructor() { super("Not authenticated", 401); }
}

export class AccountSuspendedError extends AuthError {
  constructor() { super("Account suspended", 401); }
}

export class AdminRequiredError extends AuthError {
  constructor() { super("Admin access required", 403); }
}

export class EmailTakenError extends AuthError {
  constructor() { super("Email sudah terdaftar", 409); }
}

export class UsernameTakenError extends AuthError {
  constructor() { super("Username is already taken", 409); }
}

export class ValidationError extends AuthError {
  constructor(message: string) { super(message, 400); }
}

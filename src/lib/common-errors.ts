import { DomainError } from "@/lib/domain-error";

/**
 * Shared error classes used across multiple domains.
 * Domain-specific error files should import from here for common patterns
 * and keep only truly domain-specific errors locally.
 */

// ── 4xx Client Errors ──────────────────────────────────────────────

export class NotFoundError extends DomainError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class NotAuthenticatedError extends DomainError {
  constructor() {
    super("Not authenticated", 401);
  }
}

export class AccountSuspendedError extends DomainError {
  constructor() {
    super("Account suspended", 401);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Not authorized") {
    super(message, 403);
  }
}

export class AdminRequiredError extends DomainError {
  constructor() {
    super("Admin access required", 403);
  }
}

export class AlreadyExistsError extends DomainError {
  constructor(resource: string) {
    super(`${resource} already exists`, 409);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 400);
  }
}

// ── 5xx Server Errors ──────────────────────────────────────────────

export class ExternalServiceError extends DomainError {
  constructor(service: string, reason: string) {
    super(`${service} failed: ${reason}`, 500);
  }
}

export class ServiceUnavailableError extends DomainError {
  constructor(message: string) {
    super(message, 503);
  }
}

// ── 429 Rate Limit ─────────────────────────────────────────────────

export class RateLimitError extends DomainError {
  constructor(message: string) {
    super(message, 429);
  }
}

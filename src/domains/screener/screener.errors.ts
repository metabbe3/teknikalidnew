import { DomainError } from "@/lib/domain-error";

export class ScreenerNotFoundError extends DomainError {
  constructor() {
    super("Saved screener not found", 404);
  }
}

export class ScreenerLimitError extends DomainError {
  constructor() {
    super("Maximum 10 saved screeners allowed", 400);
  }
}

export class ScreenerNameExistsError extends DomainError {
  constructor(name: string) {
    super(`Screener "${name}" already exists`, 409);
  }
}

export class AlertNotFoundError extends DomainError {
  constructor() {
    super("Alert not found", 404);
  }
}

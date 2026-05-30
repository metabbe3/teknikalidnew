import { DomainError } from "@/lib/domain-error";

export class NotificationError extends DomainError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}

export class NotificationNotFoundError extends NotificationError {
  constructor() {
    super("Notification not found", 404);
  }
}

import { NotFoundError } from "@/lib/common-errors";

export class NotificationNotFoundError extends NotFoundError {
  constructor() {
    super("Notification");
  }
}

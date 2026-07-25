import { DomainError } from "@/lib/domain-error";

export class ThesisNotFoundError extends DomainError {
  constructor() {
    super("Thesis not found", 404);
  }
}

import { DomainError } from "@/lib/domain-error";

export class ArticleNotFoundError extends DomainError {
  constructor() {
    super("Article not found", 404);
  }
}

export class ArticleGenerationError extends DomainError {
  constructor(reason: string) {
    super(`Article generation failed: ${reason}`, 500);
  }
}

export class DuplicateSlugError extends DomainError {
  constructor(slug: string) {
    super(`Article with slug "${slug}" already exists`, 409);
  }
}

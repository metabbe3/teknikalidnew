import {
  NotFoundError,
  ExternalServiceError,
  AlreadyExistsError,
  ValidationError,
} from "@/lib/common-errors";

export class ArticleNotFoundError extends NotFoundError {
  constructor() {
    super("Article");
  }
}

export class ArticleGenerationError extends ExternalServiceError {
  constructor(reason: string) {
    super("Article generation", reason);
  }
}

export class DuplicateSlugError extends AlreadyExistsError {
  constructor(slug: string) {
    super(`Article with slug "${slug}"`);
  }
}

export class PublishedArticleDeleteError extends ValidationError {
  constructor() {
    super("Artikel PUBLISHED tidak bisa dihapus — unpublish dulu");
  }
}

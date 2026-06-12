import {
  ServiceUnavailableError,
  ExternalServiceError,
  ValidationError,
  NotFoundError,
} from "@/lib/common-errors";

export class ComfyUIUnavailableError extends ServiceUnavailableError {
  constructor() {
    super("Image generation is currently unavailable");
  }
}

export class ImageGenerationFailedError extends ExternalServiceError {
  constructor(reason?: string) {
    super("Image generation", reason || "Unknown error");
  }
}

export class InvalidPromptError extends ValidationError {
  constructor() {
    super("Prompt is required and must be under 2000 characters");
  }
}

export class ImageJobNotFoundError extends NotFoundError {
  constructor() {
    super("Image generation job");
  }
}

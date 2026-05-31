import { DomainError } from "@/lib/domain-error";

export class ComfyUIUnavailableError extends DomainError {
  constructor() {
    super("Image generation is currently unavailable", 503);
  }
}

export class ImageGenerationFailedError extends DomainError {
  constructor(reason?: string) {
    super(reason || "Image generation failed", 500);
  }
}

export class InvalidPromptError extends DomainError {
  constructor() {
    super("Prompt is required and must be under 2000 characters", 400);
  }
}

export class ImageJobNotFoundError extends DomainError {
  constructor() {
    super("Image generation job not found", 404);
  }
}

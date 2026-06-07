import { DomainError } from "@/lib/domain-error";

export class AgentHubError extends DomainError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}

export class AgentJobNotFoundError extends AgentHubError {
  constructor(id: string) {
    super(`Agent job not found: ${id}`, 404);
  }
}

export class InvalidAgentTypeError extends AgentHubError {
  constructor(type: string) {
    super(`Invalid agent type: ${type}`, 400);
  }
}

export class AgentAlreadyRunningError extends AgentHubError {
  constructor(type: string) {
    super(`Agent already has a running job: ${type}`, 409);
  }
}

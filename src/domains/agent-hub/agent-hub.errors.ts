import {
  NotFoundError,
  ValidationError,
  AlreadyExistsError,
} from "@/lib/common-errors";

export class AgentJobNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Agent job ${id}`);
  }
}

export class InvalidAgentTypeError extends ValidationError {
  constructor(type: string) {
    super(`Invalid agent type: ${type}`);
  }
}

export class AgentAlreadyRunningError extends AlreadyExistsError {
  constructor(type: string) {
    super(`Running job for agent ${type}`);
  }
}

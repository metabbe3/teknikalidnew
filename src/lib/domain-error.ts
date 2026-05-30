export class DomainError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
  }
}

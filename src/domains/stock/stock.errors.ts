import { DomainError } from "@/lib/domain-error";

export class StockError extends DomainError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}

export class StockNotFoundError extends StockError {
  constructor(ticker: string) {
    super(`Stock not found: ${ticker}`, 404);
  }
}

export class InsufficientDataError extends StockError {
  constructor(ticker: string) {
    super(`Not enough data for ${ticker}`, 400);
  }
}

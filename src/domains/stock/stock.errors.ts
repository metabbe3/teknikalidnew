import { DomainError } from "@/lib/domain-error";
import { NotFoundError } from "@/lib/common-errors";

export class StockNotFoundError extends NotFoundError {
  constructor(ticker: string) {
    super(`Stock ${ticker}`);
  }
}

export class InsufficientDataError extends DomainError {
  constructor(ticker: string) {
    super(`Not enough data for ${ticker}`, 400);
  }
}

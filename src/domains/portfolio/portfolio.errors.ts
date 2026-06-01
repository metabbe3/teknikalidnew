import { DomainError } from "@/lib/domain-error";

export class PortfolioError extends DomainError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}

export class HoldingNotFoundError extends PortfolioError {
  constructor(ticker: string) {
    super(`${ticker} tidak ditemukan di portofolio`, 404);
  }
}

export class PortfolioPrivateError extends PortfolioError {
  constructor() {
    super("Portofolio ini bersifat privat", 403);
  }
}

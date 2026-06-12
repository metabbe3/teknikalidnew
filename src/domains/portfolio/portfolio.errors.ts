import {
  NotFoundError,
  ForbiddenError,
} from "@/lib/common-errors";

export class HoldingNotFoundError extends NotFoundError {
  constructor(ticker: string) {
    super(`${ticker} di portofolio`);
  }
}

export class PortfolioPrivateError extends ForbiddenError {
  constructor() {
    super("Portofolio ini bersifat privat");
  }
}

import { NotFoundError, AlreadyExistsError } from "@/lib/common-errors";

export class StockAlreadyInWatchlistError extends AlreadyExistsError {
  constructor(ticker: string) {
    super(`Stock ${ticker}`);
  }
}

export class StockNotInWatchlistError extends NotFoundError {
  constructor(ticker: string) {
    super(`Stock ${ticker} in watchlist`);
  }
}

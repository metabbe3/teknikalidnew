import { DomainError } from "@/lib/domain-error";

export class WatchlistError extends DomainError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}

export class StockAlreadyInWatchlistError extends WatchlistError {
  constructor(ticker: string) {
    super(`${ticker} sudah ada di daftar pantauan`, 409);
  }
}

export class StockNotInWatchlistError extends WatchlistError {
  constructor(ticker: string) {
    super(`${ticker} tidak ditemukan di daftar pantauan`, 404);
  }
}

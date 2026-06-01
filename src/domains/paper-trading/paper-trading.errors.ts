import { DomainError } from "@/lib/domain-error";

export class AccountNotFoundError extends DomainError {
  constructor() {
    super("Akun simulasi tidak ditemukan", 404);
  }
}

export class InsufficientBalanceError extends DomainError {
  constructor(needed: number, available: number) {
    super(`Saldo tidak cukup. Butuh ${needed}, tersedia ${available}`, 400);
  }
}

export class PositionNotFoundError extends DomainError {
  constructor() {
    super("Posisi tidak ditemukan", 404);
  }
}

export class OrderNotFoundError extends DomainError {
  constructor() {
    super("Order tidak ditemukan", 404);
  }
}

export class InvalidOrderError extends DomainError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AccountAlreadyExistsError extends DomainError {
  constructor() {
    super("Akun simulasi sudah ada", 409);
  }
}

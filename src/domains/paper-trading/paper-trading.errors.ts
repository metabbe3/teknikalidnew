import { DomainError } from "@/lib/domain-error";
import {
  NotFoundError,
  ValidationError,
  AlreadyExistsError,
} from "@/lib/common-errors";

export class AccountNotFoundError extends NotFoundError {
  constructor() {
    super("Akun simulasi");
  }
}

export class InsufficientBalanceError extends DomainError {
  constructor(needed: number, available: number) {
    super(`Saldo tidak cukup. Butuh ${needed}, tersedia ${available}`, 400);
  }
}

export class PositionNotFoundError extends NotFoundError {
  constructor() {
    super("Posisi");
  }
}

export class OrderNotFoundError extends NotFoundError {
  constructor() {
    super("Order");
  }
}

export class InvalidOrderError extends ValidationError {
  constructor(message: string) {
    super(message);
  }
}

export class AccountAlreadyExistsError extends AlreadyExistsError {
  constructor() {
    super("Akun simulasi");
  }
}

import type { Wallet } from "@/domain/cashback/types";
import type { RecurringPayment } from "@/domain/recurring/payment";
import type { SpendLine } from "@/domain/spending";

/**
 * Интерфейс намеренно асинхронный, хотя первый адаптер (localStorage) работает
 * синхронно. Это ничего не стоит сейчас и делает замену на IndexedDB или на
 * серверное хранилище правкой одной строки — без изменений в компонентах.
 */
export interface Repository<T extends { id: string }> {
  list(): Promise<readonly T[]>;
  get(id: string): Promise<T | undefined>;
  put(entity: T): Promise<void>;
  putMany(entities: readonly T[]): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface StorageAdapter {
  readonly id: "localStorage" | "indexedDB" | "memory";
  read(collection: string): Promise<unknown>;
  write(collection: string, value: unknown): Promise<void>;
  remove(collection: string): Promise<void>;
  /** Изменения из других вкладок. */
  subscribeExternal(listener: (collection: string) => void): () => void;
}

export type LoadStatus = "loading" | "ready" | "error";

export interface Settings {
  readonly currency: "KZT" | "USD" | "EUR" | "RUB";
  readonly upcomingWindowDays: number;
}

export const DEFAULT_SETTINGS: Settings = {
  currency: "KZT",
  upcomingWindowDays: 30,
};

export const DEFAULT_WALLET: Wallet = { cards: [], includeIndividual: false };

/** Формат файла резервной копии. */
export interface BackupFile {
  readonly app: "finora";
  readonly version: number;
  readonly exportedAt: string;
  readonly payments: readonly RecurringPayment[];
  readonly settings: Settings;
  /** Появились во второй версии; в копиях первой их нет. */
  readonly wallet?: Wallet;
  readonly spendLines?: readonly SpendLine[];
}

/** 2 — добавлены кошелёк и статьи трат. Копии версии 1 читаются как прежде. */
export const BACKUP_VERSION = 2;

export interface ImportReport {
  readonly imported: number;
  readonly skipped: number;
  readonly errors: readonly string[];
}

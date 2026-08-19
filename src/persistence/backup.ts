/**
 * Экспорт и импорт данных.
 *
 * В приложении без сервера это единственный способ пережить «очистить данные
 * браузера» и перенести данные на другое устройство. Поэтому резервная копия
 * появляется в том же этапе, что и первая запись, а не «когда-нибудь потом».
 */

import type { Wallet } from "@/domain/cashback/types";
import type { RecurringPayment } from "@/domain/recurring/payment";
import type { SpendLine } from "@/domain/spending";
import { backupSchema, parsePaymentsLenient } from "./schema";
import { BACKUP_VERSION, type BackupFile, type ImportReport, type Settings } from "./types";

export function buildBackup(
  payments: readonly RecurringPayment[],
  settings: Settings,
  extra: { wallet?: Wallet; spendLines?: readonly SpendLine[] } = {},
): BackupFile {
  return {
    app: "finora",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    payments,
    settings,
    wallet: extra.wallet,
    spendLines: extra.spendLines,
  };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export function backupFileName(now: Date = new Date()): string {
  const stamp = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `finora-${stamp}.json`;
}

export interface ParsedBackup {
  readonly ok: boolean;
  readonly payments: readonly RecurringPayment[];
  readonly settings: Settings | null;
  /** Отсутствуют в копиях первой версии — тогда остаются пустыми. */
  readonly wallet: Wallet | null;
  readonly spendLines: readonly SpendLine[];
  readonly report: ImportReport;
}

/**
 * Разбирает файл резервной копии.
 *
 * Сначала пробуем строгую схему целого файла; если не подошла — пытаемся
 * вытащить хотя бы список платежей построчно. Пользователю лучше получить
 * девять записей из десяти, чем сообщение «файл повреждён».
 */
export function parseBackup(input: unknown): ParsedBackup {
  const strict = backupSchema.safeParse(input);

  if (strict.success) {
    return {
      ok: true,
      payments: strict.data.payments as RecurringPayment[],
      settings: strict.data.settings,
      wallet: strict.data.wallet ?? null,
      spendLines: (strict.data.spendLines ?? []) as SpendLine[],
      report: { imported: strict.data.payments.length, skipped: 0, errors: [] },
    };
  }

  const candidate =
    input && typeof input === "object" && "payments" in input
      ? (input as { payments: unknown }).payments
      : input;

  const { valid, errors } = parsePaymentsLenient(candidate);

  if (valid.length === 0) {
    return {
      ok: false,
      payments: [],
      settings: null,
      wallet: null,
      spendLines: [],
      report: {
        imported: 0,
        skipped: errors.length,
        errors: errors.length > 0 ? errors : ["Файл не похож на резервную копию Finora"],
      },
    };
  }

  return {
    ok: true,
    payments: valid as RecurringPayment[],
    settings: null,
    wallet: null,
    spendLines: [],
    report: { imported: valid.length, skipped: errors.length, errors },
  };
}

/** Объединяет импортируемые записи с текущими по id. */
export function mergePayments(
  current: readonly RecurringPayment[],
  incoming: readonly RecurringPayment[],
): RecurringPayment[] {
  const byId = new Map(current.map((p) => [p.id, p]));
  for (const p of incoming) {
    const existing = byId.get(p.id);
    // При конфликте побеждает более свежая запись.
    if (!existing || p.updatedAt >= existing.updatedAt) byId.set(p.id, p);
  }
  return [...byId.values()];
}

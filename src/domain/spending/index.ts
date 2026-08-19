import type { Currency } from "@/domain/money";

/**
 * ПОЧЕМУ ЭТО ОТДЕЛЬНАЯ СУЩНОСТЬ, А НЕ «ПЛАТЁЖ С ПЛАВАЮЩЕЙ СУММОЙ».
 *
 * Основной кэшбэк живёт там, где нет регулярного платежа: продукты, АЗС,
 * такси, кафе. У таких трат нет ни даты списания, ни периодичности — только
 * привычная сумма за месяц. Затолкать их в `RecurringPayment` значило бы
 * выдумать им `RecurrenceRule` и сломать «ближайшие списания» и календарь,
 * куда они посыпались бы как настоящие платежи.
 *
 * Общее у них с платежами ровно одно — код категории и сумма в месяц.
 * Именно на этом уровне (`SpendItem`) их и объединяет движок подбора.
 */

export const SPEND_LINE_SCHEMA_VERSION = 1;

export interface SpendLine {
  readonly id: string;
  readonly schemaVersion: number;
  /** «Продукты», «Бензин», «Такси» — как человек сам называет статью. */
  readonly title: string;
  readonly mccCode: string;
  readonly monthlyMinor: number;
  readonly currency: Currency;
  /** Если статья привязана к конкретной сети — «Small», «Arbuz». */
  readonly merchantId?: string;
  readonly note?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function newSpendLineId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createSpendLine(
  fields: Partial<SpendLine> & { title: string; mccCode: string; monthlyMinor: number },
): SpendLine {
  const now = new Date().toISOString();
  return {
    id: newSpendLineId(),
    schemaVersion: SPEND_LINE_SCHEMA_VERSION,
    currency: "KZT",
    createdAt: now,
    updatedAt: now,
    ...fields,
  };
}

/** Сколько человек тратит в месяц по всем статьям одной валюты. */
export function monthlySpendTotalMinor(
  lines: readonly SpendLine[],
  currency: Currency = "KZT",
): number {
  let total = 0;
  for (const line of lines) {
    if (line.currency !== currency) continue;
    total += line.monthlyMinor;
  }
  return total;
}

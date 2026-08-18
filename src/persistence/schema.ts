/**
 * Схемы для НЕДОВЕРЕННОГО входа: всё, что прочитано из localStorage или
 * импортировано файлом. Пользователь мог отредактировать хранилище руками,
 * а файл — прийти из другой версии приложения.
 *
 * Справочные данные в `src/data/**` через zod НЕ проходят: это литералы
 * TypeScript, которые уже проверил компилятор. Их целостность проверяется
 * тестами, чтобы в бандл не попало ни байта лишней валидации.
 */

import { z } from "zod";
import { isCivilDate } from "@/domain/time";
import { BACKUP_VERSION } from "./types";

const civilDate = z.string().refine(isCivilDate, { message: "Ожидается дата в формате ГГГГ-ММ-ДД" });

const currency = z.enum(["KZT", "USD", "EUR", "RUB"]);

const recurrence = z.object({
  anchor: civilDate,
  unit: z.enum(["day", "week", "month", "year"]),
  every: z.number().int().positive().max(1000),
  onShortMonth: z.enum(["lastDay", "skip"]).optional(),
  endsOn: civilDate.optional(),
  maxOccurrences: z.number().int().positive().optional(),
});

const paymentBase = {
  id: z.string().min(1),
  schemaVersion: z.number().int().nonnegative(),
  title: z.string().min(1).max(200),
  amountMinor: z.number().int(),
  currency,
  amountKind: z.enum(["fixed", "variable"]),
  recurrence,
  categoryId: z.string().max(100),
  bankId: z.string().max(100).optional(),
  cardLabel: z.string().max(100).optional(),
  status: z.enum(["active", "paused", "cancelled"]),
  note: z.string().max(2000).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
};

const subscription = z.object({
  ...paymentBase,
  kind: z.literal("subscription"),
  vendor: z.string().max(200).optional(),
  plan: z.string().max(200).optional(),
  trialEndsAt: civilDate.optional(),
  cancelUrl: z.string().max(2000).optional(),
});

const fixedExpense = z.object({
  ...paymentBase,
  kind: z.literal("fixedExpense"),
  expenseType: z.enum([
    "housing",
    "utilities",
    "loan",
    "insurance",
    "telecom",
    "education",
    "transport",
    "childcare",
    "other",
  ]),
  provider: z.string().max(200).optional(),
  accountRef: z.string().max(200).optional(),
});

export const paymentSchema = z.discriminatedUnion("kind", [subscription, fixedExpense]);
export const paymentsSchema = z.array(paymentSchema);

export const settingsSchema = z.object({
  currency,
  upcomingWindowDays: z.number().int().min(1).max(365),
});

export const backupSchema = z.object({
  app: z.literal("finora"),
  version: z.number().int().min(1).max(BACKUP_VERSION),
  exportedAt: z.string(),
  payments: paymentsSchema,
  settings: settingsSchema,
});

/**
 * Разбирает массив записей, отбрасывая битые вместо того, чтобы уронить всё.
 * Одна испорченная подписка не должна стоить пользователю остальных данных.
 */
export function parsePaymentsLenient(input: unknown): {
  valid: z.infer<typeof paymentsSchema>;
  errors: string[];
} {
  if (!Array.isArray(input)) return { valid: [], errors: ["Ожидался список записей"] };

  const valid: z.infer<typeof paymentsSchema> = [];
  const errors: string[] = [];

  for (const [i, raw] of input.entries()) {
    const parsed = paymentSchema.safeParse(raw);
    if (parsed.success) valid.push(parsed.data);
    else errors.push(`Запись №${i + 1}: ${parsed.error.issues[0]?.message ?? "неверный формат"}`);
  }

  return { valid, errors };
}

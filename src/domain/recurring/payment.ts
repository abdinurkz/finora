/**
 * Подписки и фиксированные расходы — ОДНА сущность с дискриминатором.
 *
 * Структурно это один и тот же объект: название, сумма, валюта, периодичность,
 * день платежа, категория, способ оплаты, статус. Различия семантические:
 * подписку можно отменить и у неё есть поставщик услуги, коммуналку отменить
 * нельзя и её сумма плавает от сезона.
 *
 * Общая модель выбрана потому, что главный сценарий их всё равно объединяет:
 * «что спишется в ближайшие 30 дней» и «сколько уходит в месяц» требуют одного
 * отсортированного списка. Две таблицы означали бы дублирование слияния
 * и сортировки в дашборде, календаре, итогах и экспорте — а расходятся они
 * ровно в трёх полях.
 */

import type { Currency } from "@/domain/money";
import { type Rounding, roundWith } from "@/domain/money";
import { type CivilDate, compare, diffDays } from "@/domain/time";
import { type RecurrenceRule, monthlyEquivalentMinor, nextOccurrence, occurrencesBetween } from "./index";

/**
 * 2 — добавлено необязательное поле `mccCode`.
 *
 * Записи версии 1 МИГРАЦИИ НЕ ТРЕБУЮТ: изменение чисто аддитивное, а код
 * категории при отсутствии поля выводится автоматически (см. domain/cashback).
 * Проставлять версию задним числом нельзя ещё и потому, что слияние резервных
 * копий разрешает конфликты по `updatedAt`, и перештамповка сделала бы
 * локальную запись «свежее» действительно более новой импортированной.
 */
export const PAYMENT_SCHEMA_VERSION = 2;

export type PaymentStatus = "active" | "paused" | "cancelled";

/** Не все «фиксированные» расходы фиксированы: коммуналка зимой и летом разная. */
export type AmountKind = "fixed" | "variable";

interface RecurringPaymentBase {
  readonly id: string;
  readonly schemaVersion: number;
  readonly title: string;
  readonly amountMinor: number;
  readonly currency: Currency;
  readonly amountKind: AmountKind;
  readonly recurrence: RecurrenceRule;
  readonly categoryId: string;
  /**
   * Код категории торговой точки. Необязателен: если его нет, он выводится
   * по мерчанту или по категории — старые записи работают без переразметки.
   * Заполняется только когда пользователь поправил код вручную.
   */
  readonly mccCode?: string;
  readonly bankId?: string;
  readonly cardLabel?: string;
  readonly status: PaymentStatus;
  readonly note?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Subscription extends RecurringPaymentBase {
  readonly kind: "subscription";
  readonly vendor?: string;
  readonly plan?: string;
  readonly trialEndsAt?: CivilDate;
  readonly cancelUrl?: string;
}

export type ExpenseType =
  | "housing"
  | "utilities"
  | "loan"
  | "insurance"
  | "telecom"
  | "education"
  | "transport"
  | "childcare"
  | "other";

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  housing: "Аренда и жильё",
  utilities: "Коммунальные услуги",
  loan: "Кредиты и рассрочки",
  insurance: "Страхование",
  telecom: "Связь и интернет",
  education: "Образование",
  transport: "Транспорт",
  childcare: "Дети",
  other: "Прочее",
};

export interface FixedExpense extends RecurringPaymentBase {
  readonly kind: "fixedExpense";
  readonly expenseType: ExpenseType;
  readonly provider?: string;
  /** Лицевой счёт у поставщика услуги. */
  readonly accountRef?: string;
}

export type RecurringPayment = Subscription | FixedExpense;
export type PaymentKind = RecurringPayment["kind"];

export const SUBSCRIPTION_CATEGORIES = [
  "Видео и музыка",
  "Игры",
  "Софт и сервисы",
  "Облако и хранилище",
  "Обучение",
  "Спорт и здоровье",
  "Доставка",
  "Прочее",
] as const;

/* ── Производные величины ───────────────────────────────────────── */

export function isActive(payment: RecurringPayment, on: CivilDate): boolean {
  if (payment.status !== "active") return false;
  const { endsOn } = payment.recurrence;
  if (endsOn !== undefined && compare(on, endsOn) > 0) return false;
  return true;
}

/** Сумма всех активных платежей в пересчёте на месяц. */
export function monthlyTotalMinor(
  payments: readonly RecurringPayment[],
  on: CivilDate,
  currency: Currency = "KZT",
  mode: Rounding = "halfUp",
): number {
  let total = 0;
  for (const p of payments) {
    if (!isActive(p, on)) continue;
    if (p.currency !== currency) continue;
    total += monthlyEquivalentMinor(p.amountMinor, p.recurrence, mode);
  }
  return total;
}

/** Годовой эквивалент — «во сколько это обходится за год». */
export function yearlyTotalMinor(
  payments: readonly RecurringPayment[],
  on: CivilDate,
  currency: Currency = "KZT",
  mode: Rounding = "halfUp",
): number {
  return roundWith(monthlyTotalMinor(payments, on, currency, mode) * 12, mode);
}

export interface UpcomingPayment {
  readonly payment: RecurringPayment;
  readonly date: CivilDate;
  readonly daysUntil: number;
}

/** Ближайшие списания, отсортированные по дате. */
export function upcomingPayments(
  payments: readonly RecurringPayment[],
  from: CivilDate,
  withinDays = 30,
): UpcomingPayment[] {
  const out: UpcomingPayment[] = [];

  for (const payment of payments) {
    if (!isActive(payment, from)) continue;
    const date = nextOccurrence(payment.recurrence, from, true);
    if (date === null) continue;
    const daysUntil = diffDays(from, date);
    if (daysUntil > withinDays) continue;
    out.push({ payment, date, daysUntil });
  }

  return out.sort((a, b) => compare(a.date, b.date) || a.payment.title.localeCompare(b.payment.title, "ru"));
}

/** Все списания внутри периода — для календаря платежей. */
export function paymentsBetween(
  payments: readonly RecurringPayment[],
  from: CivilDate,
  to: CivilDate,
): UpcomingPayment[] {
  const out: UpcomingPayment[] = [];

  for (const payment of payments) {
    if (payment.status === "cancelled") continue;
    for (const date of occurrencesBetween(payment.recurrence, from, to)) {
      out.push({ payment, date, daysUntil: diffDays(from, date) });
    }
  }

  return out.sort((a, b) => compare(a.date, b.date) || a.payment.title.localeCompare(b.payment.title, "ru"));
}

/** Разбивка месячной суммы по категориям — для дашборда. */
export function totalsByCategory(
  payments: readonly RecurringPayment[],
  on: CivilDate,
  currency: Currency = "KZT",
): { category: string; monthlyMinor: number }[] {
  const map = new Map<string, number>();

  for (const p of payments) {
    if (!isActive(p, on)) continue;
    if (p.currency !== currency) continue;
    const key = p.kind === "fixedExpense" ? EXPENSE_TYPE_LABELS[p.expenseType] : p.categoryId;
    map.set(key, (map.get(key) ?? 0) + monthlyEquivalentMinor(p.amountMinor, p.recurrence));
  }

  return [...map.entries()]
    .map(([category, monthlyMinor]) => ({ category, monthlyMinor }))
    .sort((a, b) => b.monthlyMinor - a.monthlyMinor);
}

/* ── Создание ───────────────────────────────────────────────────── */

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createPayment(
  kind: PaymentKind,
  fields: Partial<RecurringPayment> & { recurrence: RecurrenceRule; title: string; amountMinor: number },
): RecurringPayment {
  const now = new Date().toISOString();
  const base = {
    id: newId(),
    schemaVersion: PAYMENT_SCHEMA_VERSION,
    currency: "KZT" as Currency,
    amountKind: "fixed" as AmountKind,
    categoryId: "Прочее",
    status: "active" as PaymentStatus,
    createdAt: now,
    updatedAt: now,
    ...fields,
  };

  return kind === "subscription"
    ? ({ ...base, kind: "subscription" } as Subscription)
    : ({ expenseType: "other" as ExpenseType, ...base, kind: "fixedExpense" } as FixedExpense);
}

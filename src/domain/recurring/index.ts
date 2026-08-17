/**
 * Повторяющиеся платежи: подписки и фиксированные расходы.
 *
 * Ключевое решение — каждое вхождение считается ОТ ЯКОРЯ по его номеру,
 * а не итеративным прибавлением месяца к предыдущему вхождению.
 *
 * Итеративный способ даёт тихий дрейф: 31 января → 28 февраля → 28 марта,
 * и платёж навсегда «залипает» на 28-м числе. Якорный способ на третьем шаге
 * снова даёт 31 марта, потому что каждое вхождение — это `якорь + n месяцев`.
 */

import {
  type CivilDate,
  addDays,
  addMonthsClamped,
  civil,
  compare,
  daysInMonth,
  dayOfMonth,
  diffDays,
  diffMonths,
  parts,
} from "@/domain/time";
import { type Rounding, roundWith } from "@/domain/money";

export type RecurrenceUnit = "day" | "week" | "month" | "year";

/** Что делать, если якорное число не существует в целевом месяце (31-е в феврале). */
export type ShortMonthRule = "lastDay" | "skip";

export interface RecurrenceRule {
  /** Дата первого платежа. Все остальные отсчитываются от неё. */
  readonly anchor: CivilDate;
  readonly unit: RecurrenceUnit;
  /** Каждые N единиц: 1 — ежемесячно, 3 — раз в квартал. */
  readonly every: number;
  readonly onShortMonth?: ShortMonthRule;
  readonly endsOn?: CivilDate;
  readonly maxOccurrences?: number;
}

export const UNIT_LABELS: Record<RecurrenceUnit, string> = {
  day: "день",
  week: "неделя",
  month: "месяц",
  year: "год",
};

/** Человекочитаемое описание периодичности: «раз в 3 месяца», «ежемесячно». */
export function describeRecurrence(rule: RecurrenceRule): string {
  const { unit, every } = rule;
  if (every === 1) {
    return { day: "ежедневно", week: "еженедельно", month: "ежемесячно", year: "ежегодно" }[unit];
  }
  const forms: Record<RecurrenceUnit, [string, string]> = {
    day: ["дня", "дней"],
    week: ["недели", "недель"],
    month: ["месяца", "месяцев"],
    year: ["года", "лет"],
  };
  const [few, many] = forms[unit];
  const word = every % 10 >= 2 && every % 10 <= 4 && (every % 100 < 12 || every % 100 > 14) ? few : many;
  return `раз в ${every} ${word}`;
}

/**
 * n-е вхождение, считая от якоря (n = 0 — сам якорь).
 * Всегда O(1), без накопления ошибки.
 */
export function nthOccurrence(rule: RecurrenceRule, n: number): CivilDate | null {
  if (n < 0) return null;
  if (rule.maxOccurrences !== undefined && n >= rule.maxOccurrences) return null;

  const step = rule.every * n;
  let date: CivilDate;

  switch (rule.unit) {
    case "day":
      date = addDays(rule.anchor, step);
      break;
    case "week":
      date = addDays(rule.anchor, step * 7);
      break;
    case "month":
      date = addMonthsClamped(rule.anchor, step);
      break;
    case "year":
      date = addMonthsClamped(rule.anchor, step * 12);
      break;
  }

  if (rule.endsOn !== undefined && compare(date, rule.endsOn) > 0) return null;
  return date;
}

/**
 * Было ли вхождение зажато по короткому месяцу.
 * При правиле "skip" такие вхождения выпадают из графика.
 */
function wasClamped(rule: RecurrenceRule, occurrence: CivilDate): boolean {
  if (rule.unit !== "month" && rule.unit !== "year") return false;
  return dayOfMonth(occurrence) !== dayOfMonth(rule.anchor);
}

function isSkipped(rule: RecurrenceRule, occurrence: CivilDate): boolean {
  return rule.onShortMonth === "skip" && wasClamped(rule, occurrence);
}

/** Оценка номера вхождения на дату — стартовая точка, дальше корректируется. */
function estimateIndex(rule: RecurrenceRule, date: CivilDate): number {
  switch (rule.unit) {
    case "day":
      return Math.floor(diffDays(rule.anchor, date) / rule.every);
    case "week":
      return Math.floor(diffDays(rule.anchor, date) / (rule.every * 7));
    case "month":
      return Math.floor(diffMonths(rule.anchor, date) / rule.every);
    case "year":
      return Math.floor(diffMonths(rule.anchor, date) / (rule.every * 12));
  }
}

/**
 * Ближайшее вхождение строго после `after` (или начиная с него, если `inclusive`).
 * Индекс вычисляется напрямую, поэтому вызов не зависит от того,
 * насколько далеко якорь в прошлом.
 */
export function nextOccurrence(
  rule: RecurrenceRule,
  after: CivilDate,
  inclusive = false,
): CivilDate | null {
  const start = Math.max(0, estimateIndex(rule, after) - 1);
  const limit = rule.maxOccurrences ?? Number.MAX_SAFE_INTEGER;

  // Небольшой запас на случай пропусков по короткому месяцу.
  for (let n = start; n < start + 64 && n < limit; n++) {
    const occurrence = nthOccurrence(rule, n);
    if (occurrence === null) return null;
    if (isSkipped(rule, occurrence)) continue;

    const cmp = compare(occurrence, after);
    if (cmp > 0 || (inclusive && cmp === 0)) return occurrence;
  }
  return null;
}

/** Предыдущее вхождение строго раньше `before`. */
export function previousOccurrence(rule: RecurrenceRule, before: CivilDate): CivilDate | null {
  const start = estimateIndex(rule, before) + 1;
  for (let n = start; n >= 0; n--) {
    const occurrence = nthOccurrence(rule, n);
    if (occurrence === null) continue;
    if (isSkipped(rule, occurrence)) continue;
    if (compare(occurrence, before) < 0) return occurrence;
  }
  return null;
}

/** Все вхождения в полуинтервале [from, to]. Границы включительно. */
export function occurrencesBetween(
  rule: RecurrenceRule,
  from: CivilDate,
  to: CivilDate,
): CivilDate[] {
  const out: CivilDate[] = [];
  if (compare(from, to) > 0) return out;

  const start = Math.max(0, estimateIndex(rule, from) - 1);
  const limit = rule.maxOccurrences ?? Number.MAX_SAFE_INTEGER;

  for (let n = start; n < limit; n++) {
    const occurrence = nthOccurrence(rule, n);
    if (occurrence === null) break;
    if (compare(occurrence, to) > 0) break;
    if (compare(occurrence, from) < 0) continue;
    if (isSkipped(rule, occurrence)) continue;
    out.push(occurrence);

    if (out.length > 5000) break; // защита от бесконечного цикла на битом правиле
  }
  return out;
}

/** Вхождения внутри конкретного месяца — для календаря платежей. */
export function occurrencesInMonth(rule: RecurrenceRule, y: number, m: number): CivilDate[] {
  return occurrencesBetween(rule, civil(y, m, 1), civil(y, m, daysInMonth(y, m)));
}

/** Сколько раз платёж пройдёт за календарный год. */
export function occurrenceCountInYear(rule: RecurrenceRule, y: number): number {
  return occurrencesBetween(rule, civil(y, 1, 1), civil(y, 12, 31)).length;
}

/**
 * Приведение суммы к месячному эквиваленту.
 *
 * Без этого годовая подписка за 120 000 ₸ либо попадёт в «расходы месяца»
 * целиком, либо выпадет совсем — оба варианта делают итог бессмысленным.
 */
export function monthlyEquivalentMinor(
  amountMinor: number,
  rule: RecurrenceRule,
  mode: Rounding = "halfUp",
): number {
  const perMonth = (() => {
    switch (rule.unit) {
      case "day":
        return (365 / 12) / rule.every;
      case "week":
        return (52 / 12) / rule.every;
      case "month":
        return 1 / rule.every;
      case "year":
        return 1 / (12 * rule.every);
    }
  })();
  return roundWith(amountMinor * perMonth, mode);
}

/** Годовой эквивалент — для сравнения «что дороже за год». */
export function yearlyEquivalentMinor(
  amountMinor: number,
  rule: RecurrenceRule,
  mode: Rounding = "halfUp",
): number {
  return roundWith(monthlyEquivalentMinor(amountMinor, rule, mode) * 12, mode);
}

/** Число дней до ближайшего платежа. `null`, если платежей больше нет. */
export function daysUntilNext(rule: RecurrenceRule, from: CivilDate): number | null {
  const next = nextOccurrence(rule, from, true);
  return next === null ? null : diffDays(from, next);
}

/** Строит месячное правило по числу месяца. */
export function monthlyOn(day: number, startYear: number, startMonth: number): RecurrenceRule {
  const safeDay = Math.min(day, daysInMonth(startYear, startMonth));
  return {
    anchor: civil(startYear, startMonth, safeDay),
    unit: "month",
    every: 1,
    onShortMonth: "lastDay",
  };
}

/** Число месяца, на которое приходится платёж (по якорю, до зажатия). */
export function paymentDayOfMonth(rule: RecurrenceRule): number {
  return parts(rule.anchor).d;
}

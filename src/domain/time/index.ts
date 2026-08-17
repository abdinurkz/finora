/**
 * Календарные даты без времени и без таймзоны.
 *
 * `CivilDate` — это строка 'YYYY-MM-DD'. Объект `Date` не покидает этот модуль.
 * Причина: `new Date(2026, 0, 31).toISOString().slice(0, 10)` в Алматы (UTC+5)
 * вернёт '2026-01-30' — классический сдвиг на сутки. Внутри работаем с номером
 * дня (целое), наружу отдаём строку.
 */

export type CivilDate = string;

const CIVIL_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isCivilDate(value: string): boolean {
  if (!CIVIL_RE.test(value)) return false;
  const { y, m, d } = parts(value);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function assertCivilDate(value: string, label = "дата"): asserts value is CivilDate {
  if (!isCivilDate(value)) {
    throw new Error(`${label}: ожидался формат YYYY-MM-DD, получено «${value}»`);
  }
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Собирает дату из компонентов. Месяц — 1..12, а не 0..11. */
export function civil(y: number, m: number, d: number): CivilDate {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

export function parts(date: CivilDate): { y: number; m: number; d: number } {
  return {
    y: Number(date.slice(0, 4)),
    m: Number(date.slice(5, 7)),
    d: Number(date.slice(8, 10)),
  };
}

export function year(date: CivilDate): number {
  return Number(date.slice(0, 4));
}

export function month(date: CivilDate): number {
  return Number(date.slice(5, 7));
}

export function dayOfMonth(date: CivilDate): number {
  return Number(date.slice(8, 10));
}

const MS_PER_DAY = 86_400_000;

/** Число дней от эпохи. Используется для арифметики и сравнения. */
export function toDayNumber(date: CivilDate): number {
  const { y, m, d } = parts(date);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

export function fromDayNumber(n: number): CivilDate {
  const dt = new Date(n * MS_PER_DAY);
  return civil(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function daysInMonth(y: number, m: number): number {
  return m === 2 && isLeapYear(y) ? 29 : MONTH_LENGTHS[m - 1];
}

export function daysInYear(y: number): number {
  return isLeapYear(y) ? 366 : 365;
}

export function addDays(date: CivilDate, n: number): CivilDate {
  return fromDayNumber(toDayNumber(date) + n);
}

/**
 * Прибавляет месяцы, зажимая день по длине целевого месяца.
 * 2026-01-31 + 1 мес → 2026-02-28 (в високосный год → 29 февраля).
 *
 * Ровно то, чего НЕ делает нативный `setUTCMonth`: он для 31 января + 1 месяц
 * выдаёт 3 марта, молча перескакивая через февраль.
 */
export function addMonthsClamped(date: CivilDate, n: number): CivilDate {
  const { y, m, d } = parts(date);
  const totalMonths = y * 12 + (m - 1) + n;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  return civil(targetYear, targetMonth, Math.min(d, daysInMonth(targetYear, targetMonth)));
}

export function addYearsClamped(date: CivilDate, n: number): CivilDate {
  return addMonthsClamped(date, n * 12);
}

export function endOfMonth(date: CivilDate): CivilDate {
  const { y, m } = parts(date);
  return civil(y, m, daysInMonth(y, m));
}

export function startOfMonth(date: CivilDate): CivilDate {
  const { y, m } = parts(date);
  return civil(y, m, 1);
}

/** Число дней между датами: положительное, если `to` позже `from`. */
export function diffDays(from: CivilDate, to: CivilDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

/** Полных месяцев между датами. */
export function diffMonths(from: CivilDate, to: CivilDate): number {
  const a = parts(from);
  const b = parts(to);
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.d < a.d) months -= 1;
  return months;
}

export function compare(a: CivilDate, b: CivilDate): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function min(a: CivilDate, b: CivilDate): CivilDate {
  return a <= b ? a : b;
}

export function max(a: CivilDate, b: CivilDate): CivilDate {
  return a >= b ? a : b;
}

export function isBefore(a: CivilDate, b: CivilDate): boolean {
  return a < b;
}

export function isAfter(a: CivilDate, b: CivilDate): boolean {
  return a > b;
}

/** День недели: 0 — воскресенье, 1 — понедельник, … 6 — суббота. */
export function weekday(date: CivilDate): number {
  const dt = new Date(toDayNumber(date) * MS_PER_DAY);
  return dt.getUTCDay();
}

/** Возраст в полных годах на указанную дату. */
export function ageOn(birthDate: CivilDate, on: CivilDate): number {
  const b = parts(birthDate);
  const o = parts(on);
  let age = o.y - b.y;
  if (o.m < b.m || (o.m === b.m && o.d < b.d)) age -= 1;
  return age;
}

/**
 * Базы начисления процентов.
 * Банки редко публикуют используемую базу, а разница между ACT/365 и 30/360 —
 * это реальные деньги. Поэтому база всегда явный, видимый в интерфейсе параметр.
 */
export type DayCount = "ACT/365" | "ACT/360" | "ACT/ACT" | "30/360";

export const DAY_COUNT_LABELS: Record<DayCount, string> = {
  "ACT/365": "фактические дни / 365",
  "ACT/360": "фактические дни / 360",
  "ACT/ACT": "фактические дни / фактические в году",
  "30/360": "30 дней в месяце / 360",
};

/** Доля года между датами по выбранной базе. */
export function yearFraction(from: CivilDate, to: CivilDate, dayCount: DayCount): number {
  switch (dayCount) {
    case "ACT/360":
      return diffDays(from, to) / 360;

    case "ACT/ACT": {
      // Период режется по годам: дни каждого года делятся на его собственную длину.
      let total = 0;
      let cursor = from;
      while (cursor < to) {
        const y = year(cursor);
        const yearEnd = civil(y + 1, 1, 1);
        const segmentEnd = min(yearEnd, to);
        total += diffDays(cursor, segmentEnd) / daysInYear(y);
        cursor = segmentEnd;
      }
      return total;
    }

    case "30/360": {
      const a = parts(from);
      const b = parts(to);
      const d1 = Math.min(a.d, 30);
      const d2 = d1 === 30 ? Math.min(b.d, 30) : b.d;
      return (360 * (b.y - a.y) + 30 * (b.m - a.m) + (d2 - d1)) / 360;
    }

    case "ACT/365":
    default:
      return diffDays(from, to) / 365;
  }
}

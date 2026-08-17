/**
 * Деньги — всегда целое число минорных единиц (тиынов, центов).
 *
 * Причина простая: `0.1 + 0.2 !== 0.3`. В расписании вклада на 60 периодов
 * плавающая точка накапливает расхождение, и итог перестаёт сходиться с суммой
 * строк таблицы. Все суммы в коде именуются с суффиксом `Minor`.
 *
 * Максимум реалистичной суммы (10 млрд ₸ = 10^12 тиын) на три порядка ниже
 * Number.MAX_SAFE_INTEGER, поэтому bigint не нужен.
 */

import type { Rounding } from "./types";

export * from "./types";

/** Применяет режим округления к дробному числу. */
export function roundWith(value: number, mode: Rounding): number {
  switch (mode) {
    case "down":
      return Math.trunc(value);
    case "up":
      return value < 0 ? Math.floor(value) : Math.ceil(value);
    case "halfEven": {
      const floor = Math.floor(value);
      const diff = value - floor;
      if (diff > 0.5) return floor + 1;
      if (diff < 0.5) return floor;
      return floor % 2 === 0 ? floor : floor + 1;
    }
    case "halfUp":
    default:
      // Math.round округляет -0.5 к нулю, а не «от нуля». Приводим к симметричному поведению.
      return value < 0 ? -Math.round(-value) : Math.round(value);
  }
}

/** 1234.56 → 123456 */
export function fromMajor(major: number): number {
  return Math.round(major * 100);
}

/** 123456 → 1234.56 */
export function toMajor(minor: number): number {
  return minor / 100;
}

export function add(a: number, b: number): number {
  return a + b;
}

export function sub(a: number, b: number): number {
  return a - b;
}

export function sum(values: readonly number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/**
 * Умножает сумму на ставку и округляет по политике.
 * `unit: "major"` округляет до целого тенге — так делают некоторые банки.
 */
export function mulRate(
  minor: number,
  rate: number,
  mode: Rounding,
  unit: "minor" | "major" = "minor",
): number {
  const raw = minor * rate;
  if (unit === "major") return roundWith(raw / 100, mode) * 100;
  return roundWith(raw, mode);
}

/**
 * Делит сумму по весам так, чтобы части сложились ровно в исходную сумму.
 * Остаток от округления раздаётся по одному тиыну частям с наибольшей
 * отброшенной дробью — ни один тиын не теряется и не появляется из ниоткуда.
 */
export function allocate(minor: number, weights: readonly number[]): number[] {
  const totalWeight = sum(weights);
  if (totalWeight === 0) return weights.map(() => 0);

  const exact = weights.map((w) => (minor * w) / totalWeight);
  const floored = exact.map((v) => Math.floor(v));
  let remainder = minor - sum(floored);

  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floored];
  let k = 0;
  while (remainder > 0 && order.length > 0) {
    result[order[k % order.length].i] += 1;
    remainder -= 1;
    k += 1;
  }
  return result;
}

/** Защита от того, что в сумму просочилось дробное значение. */
export function assertMinor(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(
      `${label}: ожидалось целое число минорных единиц, получено ${value}. ` +
        `Похоже, где-то деньги посчитаны в дробях.`,
    );
  }
}

export function clampMinor(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

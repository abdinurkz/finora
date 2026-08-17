/**
 * Разбор чисел, введённых или вставленных пользователем.
 *
 * Реальный ввод в русской локали выглядит как «1 234,56», причём пробел —
 * неразрывный (U+00A0) или узкий неразрывный (U+202F), если сумму скопировали
 * с сайта банка. `parseFloat("1 234,56")` вернёт 1 — то есть молча съест
 * три порядка. Отсюда собственный парсер.
 */

/** Всё, что в разных источниках выступает разделителем разрядов. */
const GROUP_SEPARATORS = /[\s   ']/g;

export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: "empty" | "invalid" };

/** Разбирает десятичное число: принимает и запятую, и точку как разделитель дробной части. */
export function parseDecimal(input: string): ParseResult {
  const cleaned = input.replace(GROUP_SEPARATORS, "").replace(",", ".").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return { ok: false, reason: "empty" };
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return { ok: false, reason: "invalid" };

  const value = Number(cleaned);
  if (!Number.isFinite(value)) return { ok: false, reason: "invalid" };
  return { ok: true, value };
}

/**
 * Разбирает денежную сумму в минорные единицы (тиыны).
 * «1 234,56» → 123456. Дробная часть длиннее двух знаков округляется.
 */
export function parseMoneyToMinor(input: string): ParseResult {
  const parsed = parseDecimal(input);
  if (!parsed.ok) return parsed;
  return { ok: true, value: Math.round(parsed.value * 100) };
}

/**
 * Разбирает процентную ставку в долю: «16,5» → 0.165.
 * Знак % допускается и отбрасывается.
 */
export function parseRate(input: string): ParseResult {
  const parsed = parseDecimal(input.replace("%", ""));
  if (!parsed.ok) return parsed;
  return { ok: true, value: parsed.value / 100 };
}

/** Значение по умолчанию, когда ввод пустой или битый. */
export function parseDecimalOr(input: string, fallback: number): number {
  const parsed = parseDecimal(input);
  return parsed.ok ? parsed.value : fallback;
}

export function parseMoneyToMinorOr(input: string, fallback: number): number {
  const parsed = parseMoneyToMinor(input);
  return parsed.ok ? parsed.value : fallback;
}

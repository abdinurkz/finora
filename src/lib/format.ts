/**
 * Единая точка форматирования.
 *
 * Локаль зафиксирована как `ru-KZ`, а не `ru-RU`: только она отдаёт символ ₸.
 * `ru-RU` для KZT рендерит ISO-код «KZT», что выглядит как сломанный шрифт.
 *
 * Таймзона зафиксирована как `Asia/Almaty` явно. Голые `toLocaleString()` /
 * `toLocaleDateString()` запрещены: сервер и браузер могут разойтись в ICU и
 * дать рассинхрон гидратации.
 */

import type { Currency } from "@/domain/money/types";

const LOCALE = "ru-KZ";
const TIME_ZONE = "Asia/Almaty";

/** Intl-форматтеры дороги в создании — держим по одному на конфигурацию. */
function memo<K extends string, V>(make: (key: K) => V): (key: K) => V {
  const cache = new Map<K, V>();
  return (key: K) => {
    let hit = cache.get(key);
    if (hit === undefined) {
      hit = make(key);
      cache.set(key, hit);
    }
    return hit;
  };
}

const currencyFormatter = memo<string, Intl.NumberFormat>((key) => {
  const [currency, fractionDigits] = key.split(":");
  const digits = Number(fractionDigits);
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
});

const decimalFormatter = memo<string, Intl.NumberFormat>((key) => {
  const [min, max] = key.split(":").map(Number);
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
});

const dateFormatter = memo<string, Intl.DateTimeFormat>((key) => {
  const preset: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: "numeric", month: "short", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric" },
    dayMonth: { day: "numeric", month: "long" },
    monthYear: { month: "long", year: "numeric" },
  };
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, ...preset[key] });
});

/** Количество знаков после запятой у валюты. Для ₸ показываем целые: копейки в UI только шумят. */
const FRACTION_DIGITS: Record<Currency, number> = {
  KZT: 0,
  USD: 2,
  EUR: 2,
  RUB: 0,
};

/** Форматирует сумму, заданную в минорных единицах (тиынах/центах). */
export function formatMoney(
  minor: number,
  currency: Currency = "KZT",
  opts: { fractionDigits?: number } = {},
): string {
  const digits = opts.fractionDigits ?? FRACTION_DIGITS[currency];
  const major = minor / 100;
  return currencyFormatter(`${currency}:${digits}`).format(major);
}

/** Компактная запись для дашборда: 1 250 000 ₸ → «1,25 млн ₸». */
export function formatMoneyCompact(minor: number, currency: Currency = "KZT"): string {
  const major = minor / 100;
  const abs = Math.abs(major);
  if (abs >= 1_000_000) return `${formatDecimal(major / 1_000_000, 0, 2)} млн ${currencySymbol(currency)}`;
  if (abs >= 10_000) return `${formatDecimal(major / 1000, 0, 0)} тыс ${currencySymbol(currency)}`;
  return formatMoney(minor, currency);
}

export function currencySymbol(currency: Currency): string {
  const parts = currencyFormatter(`${currency}:0`).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}

export function formatDecimal(value: number, min = 0, max = 2): string {
  return decimalFormatter(`${min}:${max}`).format(value);
}

/** Ставка: 0.165 → «16,5 %». Принимает долю, не проценты. */
export function formatRate(ratio: number, max = 2): string {
  return `${formatDecimal(ratio * 100, 0, max)} %`;
}

/** Разница в процентных пунктах со знаком: +1,5 п.п. */
export function formatRateDelta(ratio: number, max = 2): string {
  const sign = ratio > 0 ? "+" : "";
  return `${sign}${formatDecimal(ratio * 100, 0, max)} п.п.`;
}

/**
 * Форматирует CivilDate ('YYYY-MM-DD'). Дата разбирается по компонентам,
 * а не через `new Date(string)`, чтобы не поймать сдвиг на сутки.
 */
export function formatDate(civil: string, preset: "short" | "long" | "dayMonth" | "monthYear" = "short"): string {
  const [y, m, d] = civil.split("-").map(Number);
  return dateFormatter(preset).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

const PLURAL_RULES = new Intl.PluralRules(LOCALE);

/** Русское склонение: 1 день / 2 дня / 5 дней. */
export function plural(n: number, forms: { one: string; few: string; many: string }): string {
  const rule = PLURAL_RULES.select(n);
  if (rule === "one") return forms.one;
  if (rule === "few") return forms.few;
  return forms.many;
}

export function formatDays(n: number): string {
  return `${formatDecimal(n)} ${plural(n, { one: "день", few: "дня", many: "дней" })}`;
}

export function formatMonths(n: number): string {
  return `${formatDecimal(n)} ${plural(n, { one: "месяц", few: "месяца", many: "месяцев" })}`;
}

export function formatYears(n: number): string {
  return `${formatDecimal(n)} ${plural(n, { one: "год", few: "года", many: "лет" })}`;
}

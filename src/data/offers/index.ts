import { type YearMonth, compareYearMonth } from "@/domain/time";
import type { CashbackOffer } from "../types";
import { OFFERS_2026_08 } from "./2026-08";

/**
 * Подборки категорий по месяцам.
 *
 * Каждый месяц — отдельный файл: банки публикуют новый список, старый при этом
 * не перестаёт быть правдой про свой месяц. Так история сохраняется бесплатно,
 * а добавление месяца сводится к одному импорту.
 */
export const ALL_OFFERS: readonly CashbackOffer[] = [...OFFERS_2026_08];

/** Периоды, за которые вообще есть данные, — от свежего к старому. */
export const OFFER_PERIODS: readonly YearMonth[] = [
  ...new Set(ALL_OFFERS.map((o) => o.period)),
].sort((a, b) => compareYearMonth(b, a));

export const LATEST_PERIOD: YearMonth | undefined = OFFER_PERIODS[0];

export function offersForPeriod(period: YearMonth): CashbackOffer[] {
  return ALL_OFFERS.filter((o) => o.period === period);
}

export function offerById(id: string): CashbackOffer | undefined {
  return ALL_OFFERS.find((o) => o.id === id);
}

/**
 * Подборка на месяц указанной даты, а если её нет — самая свежая из тех,
 * что раньше. Возвращает и сам период: интерфейс обязан сказать, за какой
 * месяц показаны категории, иначе августовские проценты будут выглядеть
 * как сентябрьские.
 */
export function offersOn(period: YearMonth): { period?: YearMonth; offers: CashbackOffer[] } {
  const available = OFFER_PERIODS.find((p) => compareYearMonth(p, period) <= 0);
  return { period: available, offers: available ? offersForPeriod(available) : [] };
}

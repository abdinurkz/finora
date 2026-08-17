import type { CivilDate } from "@/domain/time";

const TIME_ZONE = "Asia/Almaty";

/**
 * Сегодняшняя дата в Алматы как CivilDate.
 *
 * Локаль `en-CA` выбрана намеренно: она форматирует дату ровно как YYYY-MM-DD,
 * что избавляет от ручной сборки строки и от сдвига на сутки, который даёт
 * `toISOString()` для локально сконструированных дат.
 *
 * Вызывать только на клиенте или в скриптах. В Server Component это сделает
 * страницу зависящей от момента рендера — «сегодня» всегда считается после
 * монтирования.
 */
export function todayCivil(now: Date = new Date()): CivilDate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

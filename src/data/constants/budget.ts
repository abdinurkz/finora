import type { DatedSeries, SourceRef } from "@/domain/registry";

/**
 * Показатели, утверждаемые законом о республиканском бюджете.
 * Меняются каждый январь, иногда — в середине года.
 *
 * Все денежные значения хранятся в МИНОРНЫХ единицах (тиынах), как и везде
 * в приложении: 4 325 ₸ → 432_500.
 */

const BUDGET_LAW_2026: SourceRef = {
  title: "Закон РК «О республиканском бюджете на 2026–2028 годы» № 239-VIII",
  publisher: "Парламент РК",
  legalRef: "№ 239-VIII от 08.12.2025",
  retrievedAt: "2026-08-17",
  url: "https://adilet.zan.kz/rus/docs/Z2500000239",
};

/** МРП — месячный расчётный показатель. К нему привязаны сотни величин в законах. */
export const MRP: DatedSeries<number> = {
  key: "mrp",
  label: "МРП",
  unit: "KZT",
  description: "Месячный расчётный показатель. Базовая единица индексации в законодательстве РК.",
  entries: [
    {
      value: 369_200,
      effectiveFrom: "2024-01-01",
      effectiveTo: "2025-01-01",
      confidence: "unverified",
      note: "Историческое значение, внесено без сверки с первоисточником.",
    },
    {
      value: 393_200,
      effectiveFrom: "2025-01-01",
      effectiveTo: "2026-01-01",
      confidence: "unverified",
      note: "Историческое значение, внесено без сверки с первоисточником.",
    },
    {
      value: 432_500,
      effectiveFrom: "2026-01-01",
      confidence: "verified",
      source: BUDGET_LAW_2026,
    },
  ],
};

/** МЗП — минимальный размер заработной платы. */
export const MZP: DatedSeries<number> = {
  key: "mzp",
  label: "МЗП",
  unit: "KZT",
  description: "Минимальный размер заработной платы, утверждаемый законом о республиканском бюджете.",
  entries: [
    {
      value: 8_500_000,
      effectiveFrom: "2024-01-01",
      effectiveTo: "2026-01-01",
      confidence: "unverified",
      note: "Историческое значение, внесено без сверки с первоисточником.",
    },
    {
      value: 8_500_000,
      effectiveFrom: "2026-01-01",
      confidence: "verified",
      source: BUDGET_LAW_2026,
    },
  ],
};

/** Прожиточный минимум — база для расчёта социальных выплат. */
export const SUBSISTENCE_MINIMUM: DatedSeries<number> = {
  key: "subsistenceMinimum",
  label: "Прожиточный минимум",
  unit: "KZT",
  entries: [
    {
      value: 5_085_100,
      effectiveFrom: "2026-01-01",
      confidence: "verified",
      source: BUDGET_LAW_2026,
    },
  ],
};

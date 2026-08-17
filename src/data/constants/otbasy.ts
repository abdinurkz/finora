import type { DatedSeries, SourceRef } from "@/domain/registry";

const OTBASY: SourceRef = {
  title: "Что такое оценочный показатель",
  publisher: "АО «Отбасы банк»",
  retrievedAt: "2026-08-17",
  url: "https://hcsbk.kz/ru/most-important/helpful-information/performance-indicator/",
};

/** Ставка вознаграждения по депозиту в Отбасы банке. */
export const OTBASY_DEPOSIT_RATE: DatedSeries<number> = {
  key: "otbasy.depositRate",
  label: "Ставка по депозиту Отбасы",
  unit: "ratio",
  entries: [
    {
      value: 0.02,
      effectiveFrom: "2024-01-01",
      confidence: "verified",
      source: OTBASY,
    },
  ],
};

/** Минимальный ОП для промежуточного жилищного займа. */
export const OTBASY_OP_INTERMEDIATE: DatedSeries<number> = {
  key: "otbasy.op.intermediate",
  label: "Порог ОП для промежуточного займа",
  unit: "count",
  entries: [
    {
      value: 5,
      effectiveFrom: "2024-01-01",
      confidence: "verified",
      source: OTBASY,
    },
  ],
};

/** Минимальный ОП для жилищного займа по сниженной ставке. */
export const OTBASY_OP_HOUSING: DatedSeries<number> = {
  key: "otbasy.op.housing",
  label: "Порог ОП для жилищного займа",
  unit: "count",
  entries: [
    {
      value: 16,
      effectiveFrom: "2024-01-01",
      confidence: "verified",
      source: OTBASY,
    },
  ],
};

/** Доля договорной суммы, которую нужно накопить. */
export const OTBASY_MIN_SAVINGS_SHARE: DatedSeries<number> = {
  key: "otbasy.minSavingsShare",
  label: "Минимальная доля накоплений от договорной суммы",
  unit: "ratio",
  entries: [
    {
      value: 0.5,
      effectiveFrom: "2024-01-01",
      confidence: "verified",
      source: OTBASY,
    },
  ],
};

/**
 * Государственная премия — начисляется на накопления за год.
 *
 * НЕ ПОДТВЕРЖДЕНО. Правила премии пересматривались в 2026 году, и ни ставка,
 * ни потолок в этой сборке с первоисточником не сверялись. В расчёте премия
 * по умолчанию выключена, а при включении результат помечается как недостоверный.
 */
export const OTBASY_STATE_PREMIUM_RATE: DatedSeries<number> = {
  key: "otbasy.statePremium.rate",
  label: "Ставка государственной премии",
  unit: "ratio",
  description: "Начисляется государством на сумму накоплений за календарный год.",
  entries: [
    {
      value: 0.2,
      effectiveFrom: "2024-01-01",
      confidence: "unverified",
      note: "Правила госпремии менялись в 2026 году. Значение требует сверки с Отбасы банком.",
    },
  ],
};

/** Годовой потолок государственной премии, в МРП. */
export const OTBASY_STATE_PREMIUM_CAP_MRP: DatedSeries<number> = {
  key: "otbasy.statePremium.capMrp",
  label: "Потолок государственной премии за год",
  unit: "count",
  entries: [
    {
      value: 200,
      effectiveFrom: "2024-01-01",
      confidence: "unverified",
      note: "Требует сверки: потолок премии в 2026 году мог измениться.",
    },
  ],
};

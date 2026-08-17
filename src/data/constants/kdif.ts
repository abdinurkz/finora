import type { DatedSeries, SourceRef } from "@/domain/registry";
import type { DepositKind } from "@/domain/deposit/types";
import type { Currency } from "@/domain/money";

const KDIF: SourceRef = {
  title: "Гарантия КФГД",
  publisher: "Казахстанский фонд гарантирования депозитов",
  retrievedAt: "2026-08-17",
  url: "https://kdif.kz/depozity-i-garantiya/garantiya/",
};

export type KdifKey = `${DepositKind}:${Currency}`;

export interface KdifLimits {
  /** Суммы в тиынах. */
  readonly byKindAndCurrency: Readonly<Partial<Record<KdifKey, number>>>;
  /** Применяется, если точного сочетания нет. */
  readonly fallbackMinor: number;
}

/**
 * Гарантия КФГД различается по виду вклада и валюте — единой цифры «20 млн» не существует.
 * Сберегательные вклады в тенге защищены сильнее всего, валютные — слабее всего.
 * Гарантия действует на каждый банк отдельно.
 */
export const KDIF_LIMITS: DatedSeries<KdifLimits> = {
  key: "kdif.limits",
  label: "Гарантия КФГД",
  unit: "KZT",
  description: "Максимальная сумма возмещения на одного вкладчика в одном банке.",
  entries: [
    {
      value: {
        byKindAndCurrency: {
          "savings:KZT": 2_000_000_000, // 20 млн ₸
          "term:KZT": 1_000_000_000, // 10 млн ₸
          "demand:KZT": 1_000_000_000, // 10 млн ₸
          "accumulative:KZT": 1_000_000_000, // 10 млн ₸
          "savings:USD": 500_000_000, // 5 млн ₸ в эквиваленте
          "term:USD": 500_000_000,
          "demand:USD": 500_000_000,
          "accumulative:USD": 500_000_000,
          "savings:EUR": 500_000_000,
          "term:EUR": 500_000_000,
          "demand:EUR": 500_000_000,
          "accumulative:EUR": 500_000_000,
        },
        fallbackMinor: 500_000_000,
      },
      effectiveFrom: "2026-01-01",
      confidence: "verified",
      source: KDIF,
      display: "20 / 10 / 5 млн ₸",
      note:
        "Сберегательные вклады в тенге — 20 млн ₸, срочные и несрочные в тенге — 10 млн ₸, " +
        "любые валютные — 5 млн ₸ в эквиваленте. Гарантия действует на каждый банк отдельно.",
    },
  ],
};

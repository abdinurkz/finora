import {
  type Confidence,
  type DatedSeries,
  type Resolved,
  resolveOr,
  worstOf,
} from "@/domain/registry";
import type { CivilDate } from "@/domain/time";
import type { TaxPolicy } from "@/domain/deposit/types";

import { MRP, MZP, SUBSISTENCE_MINIMUM } from "./budget";
import { KDIF_LIMITS, type KdifLimits } from "./kdif";
import { DEPOSIT_INTEREST_TAX } from "./tax";

export * from "./budget";
export * from "./kdif";
export * from "./tax";

/**
 * Полный список серий — используется страницей «Данные и источники»,
 * которая рендерится прямо из реестра и поэтому не может разойтись с реальностью.
 */
export const ALL_SERIES: readonly DatedSeries<unknown>[] = [
  MRP,
  MZP,
  SUBSISTENCE_MINIMUM,
  KDIF_LIMITS,
  DEPOSIT_INTEREST_TAX,
] as DatedSeries<unknown>[];

export interface ConstantSet {
  readonly asOf: CivilDate;

  readonly mrp: Resolved<number>;
  readonly mzp: Resolved<number>;
  readonly subsistenceMinimum: Resolved<number>;

  readonly kdifLimits: Resolved<KdifLimits>;

  readonly depositInterestTax: Resolved<TaxPolicy>;

  /** Худшая достоверность по всему набору. */
  readonly worstConfidence: Confidence;
  /** Серии, для которых на эту дату не нашлось записи и подставлен запасной вариант. */
  readonly placeholders: readonly Resolved<unknown>[];
}

/**
 * Набор констант на конкретную дату.
 *
 * Запасные значения нужны, чтобы приложение не падало на датах вне реестра;
 * `resolveOr` помечает их достоверностью `placeholder`, и это состояние
 * доходит до интерфейса через `worstConfidence`.
 */
export function getConstantSet(asOf: CivilDate): ConstantSet {
  const set = {
    asOf,
    mrp: resolveOr(MRP, asOf, 432_500),
    mzp: resolveOr(MZP, asOf, 8_500_000),
    subsistenceMinimum: resolveOr(SUBSISTENCE_MINIMUM, asOf, 5_085_100),

    kdifLimits: resolveOr(KDIF_LIMITS, asOf, {
      byKindAndCurrency: {},
      fallbackMinor: 500_000_000,
    }),

    depositInterestTax: resolveOr(DEPOSIT_INTEREST_TAX, asOf, { kind: "none" } as TaxPolicy),
  };

  // Список собирается явно, а не через Object.values: там лежит ещё и `asOf`,
  // и перечисление вручную не даст молча потерять новую константу при рефакторинге.
  const all: Resolved<unknown>[] = [
    set.mrp,
    set.mzp,
    set.subsistenceMinimum,
    set.kdifLimits,
    set.depositInterestTax,
  ] as Resolved<unknown>[];

  return {
    ...set,
    worstConfidence: worstOf(...all),
    placeholders: all.filter((r) => r.confidence === "placeholder"),
  };
}

/** Гарантия КФГД для конкретного вида вклада и валюты. */
export function kdifLimitFor(limits: KdifLimits, kind: string, currency: string): number {
  return limits.byKindAndCurrency[`${kind}:${currency}` as keyof typeof limits.byKindAndCurrency]
    ?? limits.fallbackMinor;
}

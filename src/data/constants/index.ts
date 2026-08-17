import {
  type Confidence,
  type DatedSeries,
  type Resolved,
  resolveOr,
  worstOf,
} from "@/domain/registry";
import type { CivilDate } from "@/domain/time";
import type { TaxPolicy } from "@/domain/deposit/types";

import { BASE_PENSION_MIN, MRP, MZP, SUBSISTENCE_MINIMUM } from "./budget";
import {
  CONTRIBUTION_CAP_MZP,
  OPVR_BIRTH_CUTOFF,
  OPVR_RATE,
  OPV_RATE,
  PAYOUT_YEARS,
  RETIREMENT_AGE_FEMALE,
  RETIREMENT_AGE_MALE,
} from "./pension";
import { KDIF_LIMITS, type KdifLimits } from "./kdif";
import {
  OTBASY_DEPOSIT_RATE,
  OTBASY_MIN_SAVINGS_SHARE,
  OTBASY_OP_HOUSING,
  OTBASY_OP_INTERMEDIATE,
  OTBASY_STATE_PREMIUM_CAP_MRP,
  OTBASY_STATE_PREMIUM_RATE,
} from "./otbasy";
import { DEPOSIT_INTEREST_TAX } from "./tax";

export * from "./budget";
export * from "./pension";
export * from "./kdif";
export * from "./otbasy";
export * from "./tax";

/**
 * Полный список серий — используется страницей «Данные и источники»,
 * которая рендерится прямо из реестра и поэтому не может разойтись с реальностью.
 */
export const ALL_SERIES: readonly DatedSeries<unknown>[] = [
  MRP,
  MZP,
  BASE_PENSION_MIN,
  SUBSISTENCE_MINIMUM,
  OPV_RATE,
  OPVR_RATE,
  CONTRIBUTION_CAP_MZP,
  OPVR_BIRTH_CUTOFF,
  RETIREMENT_AGE_MALE,
  RETIREMENT_AGE_FEMALE,
  PAYOUT_YEARS,
  KDIF_LIMITS,
  OTBASY_DEPOSIT_RATE,
  OTBASY_OP_INTERMEDIATE,
  OTBASY_OP_HOUSING,
  OTBASY_MIN_SAVINGS_SHARE,
  OTBASY_STATE_PREMIUM_RATE,
  OTBASY_STATE_PREMIUM_CAP_MRP,
  DEPOSIT_INTEREST_TAX,
] as DatedSeries<unknown>[];

export interface ConstantSet {
  readonly asOf: CivilDate;

  readonly mrp: Resolved<number>;
  readonly mzp: Resolved<number>;
  readonly basePensionMin: Resolved<number>;
  readonly subsistenceMinimum: Resolved<number>;

  readonly opvRate: Resolved<number>;
  readonly opvrRate: Resolved<number>;
  readonly contributionCapMzp: Resolved<number>;
  readonly opvrBirthCutoff: Resolved<string>;
  readonly retirementAgeMale: Resolved<number>;
  readonly retirementAgeFemale: Resolved<number>;
  readonly payoutYears: Resolved<number>;

  readonly kdifLimits: Resolved<KdifLimits>;

  readonly otbasyDepositRate: Resolved<number>;
  readonly otbasyOpIntermediate: Resolved<number>;
  readonly otbasyOpHousing: Resolved<number>;
  readonly otbasyMinSavingsShare: Resolved<number>;
  readonly otbasyStatePremiumRate: Resolved<number>;
  readonly otbasyStatePremiumCapMrp: Resolved<number>;

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
    basePensionMin: resolveOr(BASE_PENSION_MIN, asOf, 3_559_600),
    subsistenceMinimum: resolveOr(SUBSISTENCE_MINIMUM, asOf, 5_085_100),

    opvRate: resolveOr(OPV_RATE, asOf, 0.1),
    opvrRate: resolveOr(OPVR_RATE, asOf, 0.05),
    contributionCapMzp: resolveOr(CONTRIBUTION_CAP_MZP, asOf, 50),
    opvrBirthCutoff: resolveOr(OPVR_BIRTH_CUTOFF, asOf, "1975-01-01"),
    retirementAgeMale: resolveOr(RETIREMENT_AGE_MALE, asOf, 63),
    retirementAgeFemale: resolveOr(RETIREMENT_AGE_FEMALE, asOf, 63),
    payoutYears: resolveOr(PAYOUT_YEARS, asOf, 20),

    kdifLimits: resolveOr(KDIF_LIMITS, asOf, {
      byKindAndCurrency: {},
      fallbackMinor: 500_000_000,
    }),

    otbasyDepositRate: resolveOr(OTBASY_DEPOSIT_RATE, asOf, 0.02),
    otbasyOpIntermediate: resolveOr(OTBASY_OP_INTERMEDIATE, asOf, 5),
    otbasyOpHousing: resolveOr(OTBASY_OP_HOUSING, asOf, 16),
    otbasyMinSavingsShare: resolveOr(OTBASY_MIN_SAVINGS_SHARE, asOf, 0.5),
    otbasyStatePremiumRate: resolveOr(OTBASY_STATE_PREMIUM_RATE, asOf, 0.2),
    otbasyStatePremiumCapMrp: resolveOr(OTBASY_STATE_PREMIUM_CAP_MRP, asOf, 200),

    depositInterestTax: resolveOr(DEPOSIT_INTEREST_TAX, asOf, { kind: "none" } as TaxPolicy),
  };

  // Список собирается явно, а не через Object.values: там лежит ещё и `asOf`,
  // и перечисление вручную не даст молча потерять новую константу при рефакторинге.
  const all: Resolved<unknown>[] = [
    set.mrp,
    set.mzp,
    set.basePensionMin,
    set.subsistenceMinimum,
    set.opvRate,
    set.opvrRate,
    set.contributionCapMzp,
    set.opvrBirthCutoff,
    set.retirementAgeMale,
    set.retirementAgeFemale,
    set.payoutYears,
    set.kdifLimits,
    set.otbasyDepositRate,
    set.otbasyOpIntermediate,
    set.otbasyOpHousing,
    set.otbasyMinSavingsShare,
    set.otbasyStatePremiumRate,
    set.otbasyStatePremiumCapMrp,
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

/**
 * Расписание банковского вклада.
 *
 * Все суммы — целые тиыны, округление выполняется на каждом начислении.
 * Инвариант, который проверяется тестом: итоговый остаток в точности равен
 * сумме внесённого и чистого вознаграждения, без расхождения в тиынах.
 */

import { type Resolved, buildAssumptions } from "@/domain/registry";
import { mulRate, roundWith } from "@/domain/money";
import { addMonthsClamped, compare, diffDays, yearFraction } from "@/domain/time";
import { type ConstantSet, kdifLimitFor } from "@/data/constants";
import { type CashFlow, IRR_METHOD, xirr } from "./xirr";
import type {
  CalcWarning,
  Compounding,
  DepositPeriod,
  DepositResult,
  DepositScenario,
  KdifAssessment,
  RateSchedule,
} from "./types";

export * from "./types";
export * from "./xirr";

/** Через сколько месяцев происходит капитализация. Infinity — только в конце срока. */
function capitalizationStep(compounding: Compounding): number {
  switch (compounding) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "semiannual":
      return 6;
    case "annual":
      return 12;
    case "none":
    case "atMaturity":
    default:
      return Number.POSITIVE_INFINITY;
  }
}

/**
 * Ставка на конкретный месяц при конкретном остатке.
 * Лестничные ставки имеют приоритет над суммовыми диапазонами:
 * если банк задал и то и другое, срок — более специфичное условие.
 */
export function resolveRate(rates: RateSchedule, month: number, balanceMinor: number): number {
  if (rates.steps && rates.steps.length > 0) {
    let applicable = rates.base;
    for (const step of rates.steps) {
      if (month >= step.fromMonth) applicable = step.rate;
    }
    return applicable;
  }

  if (rates.amountBands && rates.amountBands.length > 0) {
    for (const band of rates.amountBands) {
      const aboveMin = balanceMinor >= band.minMinor;
      const belowMax = band.maxMinor === undefined || balanceMinor < band.maxMinor;
      if (aboveMin && belowMax) return band.rate;
    }
  }

  return rates.base;
}

function assessKdif(
  peakBalanceMinor: number,
  scenario: DepositScenario,
  constants: ConstantSet,
): KdifAssessment {
  const limitMinor = kdifLimitFor(constants.kdifLimits.value, scenario.kind, scenario.currency);
  const uncovered = Math.max(0, peakBalanceMinor - limitMinor);
  return {
    limitMinor,
    covered: uncovered === 0,
    uncoveredMinor: uncovered,
    source: constants.kdifLimits as Resolved<unknown>,
  };
}

export function buildDepositSchedule(
  scenario: DepositScenario,
  constants: ConstantSet,
): DepositResult {
  const warnings: CalcWarning[] = [];
  const periods: DepositPeriod[] = [];
  const flows: CashFlow[] = [];

  const {
    principalMinor,
    termMonths,
    startDate,
    dayCount,
    rounding,
    compounding,
    payoutMode,
    constraints,
    monthlyTopUpMinor = 0,
  } = scenario;

  const step = capitalizationStep(compounding);
  const taxRate = scenario.tax.kind === "flat" ? scenario.tax.rate : 0;

  /* ── Проверка ограничений продукта ───────────────────────────── */

  if (constraints?.minAmountMinor !== undefined && principalMinor < constraints.minAmountMinor) {
    warnings.push({
      code: "BELOW_MIN_AMOUNT",
      message: "Сумма меньше минимальной по условиям вклада.",
      severity: "error",
    });
  }
  if (constraints?.maxAmountMinor !== undefined && principalMinor > constraints.maxAmountMinor) {
    warnings.push({
      code: "ABOVE_MAX_AMOUNT",
      message: "Сумма больше максимальной по условиям вклада.",
      severity: "warning",
    });
  }

  const hasTopUps = monthlyTopUpMinor > 0 || scenario.flows.some((f) => f.amountMinor > 0);
  if (hasTopUps && constraints?.topUpAllowed === false) {
    warnings.push({
      code: "TOPUP_NOT_ALLOWED",
      message: "Пополнение не предусмотрено условиями вклада.",
      severity: "error",
    });
  }
  if (scenario.flows.some((f) => f.amountMinor < 0) && constraints?.partialWithdrawalAllowed === false) {
    warnings.push({
      code: "WITHDRAWAL_NOT_ALLOWED",
      message: "Частичное изъятие не предусмотрено условиями вклада.",
      severity: "error",
    });
  }

  /* ── Расписание ──────────────────────────────────────────────── */

  let balance = principalMinor;
  let accruedUncapitalized = 0;
  let totalInterestGross = 0;
  let totalTax = 0;
  let totalPaidOut = 0;
  let totalContributed = principalMinor;
  let peakBalance = principalMinor;

  flows.push({ date: startDate, amountMinor: -principalMinor });

  for (let m = 1; m <= termMonths; m++) {
    const from = addMonthsClamped(startDate, m - 1);
    const to = addMonthsClamped(startDate, m);
    const days = diffDays(from, to);

    /* Движения в начале периода: регулярное пополнение и разовые операции. */
    let periodFlows = 0;

    const cutoff = constraints?.topUpCutoffMonths;
    const topUpAllowedNow = cutoff === undefined || m <= cutoff;
    if (monthlyTopUpMinor > 0) {
      if (topUpAllowedNow) {
        periodFlows += monthlyTopUpMinor;
      } else if (m === (cutoff ?? 0) + 1) {
        warnings.push({
          code: "TOPUP_AFTER_CUTOFF",
          message: `Пополнения принимаются только первые ${cutoff} мес. — дальше они не учитываются.`,
          severity: "info",
        });
      }
    }

    for (const flow of scenario.flows) {
      if (compare(flow.date, from) >= 0 && compare(flow.date, to) < 0) {
        periodFlows += flow.amountMinor;
      }
    }

    const openingBalance = balance;
    balance += periodFlows;

    if (periodFlows !== 0) {
      flows.push({ date: from, amountMinor: -periodFlows });
      if (periodFlows > 0) totalContributed += periodFlows;
    }

    if (constraints?.minBalanceMinor !== undefined && balance < constraints.minBalanceMinor) {
      warnings.push({
        code: "BELOW_MIN_BALANCE",
        message: "Остаток опустился ниже неснижаемого — банк может пересчитать ставку.",
        severity: "warning",
      });
    }

    /* Начисление. Некапитализированное вознаграждение процентов не приносит. */
    const rate = resolveRate(scenario.rates, m, balance);
    const fraction = yearFraction(from, to, dayCount);
    const interestGross = mulRate(balance, rate * fraction, rounding.interest, rounding.unit);
    const tax = taxRate > 0 ? roundWith(interestGross * taxRate, rounding.tax) : 0;
    const interestNet = interestGross - tax;

    totalInterestGross += interestGross;
    totalTax += tax;

    let capitalized = 0;
    let paidOut = 0;

    if (payoutMode === "payout") {
      paidOut = interestNet;
      totalPaidOut += paidOut;
      if (paidOut !== 0) flows.push({ date: to, amountMinor: paidOut });
    } else {
      accruedUncapitalized += interestNet;
      const isBoundary = Number.isFinite(step) && m % step === 0;
      if (isBoundary) {
        capitalized = accruedUncapitalized;
        balance += capitalized;
        accruedUncapitalized = 0;
      }
    }

    peakBalance = Math.max(peakBalance, balance + accruedUncapitalized);

    periods.push({
      index: m,
      from,
      to,
      days,
      openingBalanceMinor: openingBalance,
      flowsMinor: periodFlows,
      appliedRate: rate,
      interestAccruedMinor: interestGross,
      interestCapitalizedMinor: capitalized,
      interestPaidOutMinor: paidOut,
      taxWithheldMinor: tax,
      closingBalanceMinor: balance + accruedUncapitalized,
    });
  }

  /* Остаток некапитализированного вознаграждения выплачивается в конце срока. */
  const finalBalance = balance + accruedUncapitalized;
  const maturity = addMonthsClamped(startDate, termMonths);
  flows.push({ date: maturity, amountMinor: finalBalance });

  const totalInterestNet = totalInterestGross - totalTax;

  /* ── Эффективная ставка ──────────────────────────────────────── */

  const irr = xirr(flows, dayCount);
  if (!irr.converged) {
    warnings.push({
      code: "IRR_NOT_CONVERGED",
      message: "Эффективную ставку не удалось рассчитать для этого набора условий.",
      severity: "warning",
    });
  }

  /* ── Гарантия КФГД ───────────────────────────────────────────── */

  const kdif = assessKdif(peakBalance, scenario, constants);
  if (!kdif.covered) {
    warnings.push({
      code: "EXCEEDS_KDIF",
      message: "Часть суммы выходит за пределы гарантии КФГД по этому виду вклада.",
      severity: "warning",
    });
  }

  return {
    periods,
    totalContributedMinor: totalContributed,
    totalInterestGrossMinor: totalInterestGross,
    totalTaxMinor: totalTax,
    totalInterestNetMinor: totalInterestNet,
    totalPaidOutMinor: totalPaidOut,
    finalBalanceMinor: finalBalance,
    nominalAnnualRate: scenario.rates.base,
    effectiveAnnualRate: irr.converged ? irr.rate : scenario.rates.base,
    effectiveRateMethod: IRR_METHOD,
    effectiveRateConverged: irr.converged,
    kdif,
    warnings,
    assumptions: buildAssumptions(
      [constants.kdifLimits as Resolved<unknown>, constants.depositInterestTax as Resolved<unknown>],
      [IRR_METHOD],
    ),
  };
}

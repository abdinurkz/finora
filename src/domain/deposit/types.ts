import type { Currency, RoundingPolicy } from "@/domain/money";
import type { CivilDate, DayCount } from "@/domain/time";
import type { Assumptions, MethodRef, Resolved } from "@/domain/registry";

/** Виды вкладов по классификации, принятой в Казахстане. */
export type DepositKind = "demand" | "term" | "savings" | "accumulative";

export const DEPOSIT_KIND_LABELS: Record<DepositKind, string> = {
  demand: "Несрочный",
  term: "Срочный",
  savings: "Сберегательный",
  accumulative: "Накопительный",
};

export const DEPOSIT_KIND_HINTS: Record<DepositKind, string> = {
  demand: "Снятие в любой момент, ставка минимальная",
  term: "Фиксированный срок, снятие досрочно снижает ставку",
  savings: "Самая высокая ставка и повышенная гарантия КФГД, досрочное снятие ограничено",
  accumulative: "Пополняемый вклад, рассчитан на регулярные взносы",
};

/** Периодичность капитализации вознаграждения. */
export type Compounding = "none" | "monthly" | "quarterly" | "semiannual" | "annual" | "atMaturity";

export const COMPOUNDING_LABELS: Record<Compounding, string> = {
  none: "Без капитализации",
  monthly: "Ежемесячно",
  quarterly: "Ежеквартально",
  semiannual: "Раз в полгода",
  annual: "Ежегодно",
  atMaturity: "В конце срока",
};

/** Капитализировать вознаграждение или выплачивать на карту. */
export type PayoutMode = "capitalize" | "payout";

/** Ставка может зависеть от срока и от суммы — в Казахстане это обычное дело. */
export interface RateSchedule {
  readonly base: number;
  /** Лестничные ставки: с какого месяца действует какая ставка. */
  readonly steps?: readonly { readonly fromMonth: number; readonly rate: number }[];
  /** Ставка по диапазону суммы вклада. */
  readonly amountBands?: readonly {
    readonly minMinor: number;
    readonly maxMinor?: number;
    readonly rate: number;
  }[];
}

export type TaxPolicy =
  | { readonly kind: "none" }
  | { readonly kind: "flat"; readonly rate: number };

/** Пополнение или частичное изъятие в середине срока. */
export interface ScheduledFlow {
  readonly date: CivilDate;
  /** Положительное — пополнение, отрицательное — изъятие. */
  readonly amountMinor: number;
}

export interface DepositConstraints {
  readonly minAmountMinor?: number;
  readonly maxAmountMinor?: number;
  readonly topUpAllowed?: boolean;
  readonly partialWithdrawalAllowed?: boolean;
  /** После этого месяца пополнения уже не принимаются. */
  readonly topUpCutoffMonths?: number;
  readonly minBalanceMinor?: number;
}

export interface DepositScenario {
  readonly currency: Currency;
  readonly kind: DepositKind;
  readonly principalMinor: number;
  readonly rates: RateSchedule;
  readonly startDate: CivilDate;
  readonly termMonths: number;
  readonly compounding: Compounding;
  readonly payoutMode: PayoutMode;
  readonly dayCount: DayCount;
  readonly flows: readonly ScheduledFlow[];
  /** Регулярное пополнение каждый месяц — самый частый сценарий. */
  readonly monthlyTopUpMinor?: number;
  readonly tax: TaxPolicy;
  readonly rounding: RoundingPolicy;
  readonly constraints?: DepositConstraints;
}

export interface DepositPeriod {
  readonly index: number;
  readonly from: CivilDate;
  readonly to: CivilDate;
  readonly days: number;
  readonly openingBalanceMinor: number;
  readonly flowsMinor: number;
  readonly appliedRate: number;
  readonly interestAccruedMinor: number;
  readonly interestCapitalizedMinor: number;
  readonly interestPaidOutMinor: number;
  readonly taxWithheldMinor: number;
  readonly closingBalanceMinor: number;
}

export type WarningCode =
  | "BELOW_MIN_AMOUNT"
  | "ABOVE_MAX_AMOUNT"
  | "TOPUP_NOT_ALLOWED"
  | "TOPUP_AFTER_CUTOFF"
  | "WITHDRAWAL_NOT_ALLOWED"
  | "BELOW_MIN_BALANCE"
  | "EXCEEDS_KDIF"
  | "IRR_NOT_CONVERGED";

export interface CalcWarning {
  readonly code: WarningCode;
  readonly message: string;
  readonly severity: "info" | "warning" | "error";
}

export interface KdifAssessment {
  readonly limitMinor: number;
  readonly covered: boolean;
  readonly uncoveredMinor: number;
  readonly source: Resolved<unknown> | null;
}

export interface DepositResult {
  readonly periods: readonly DepositPeriod[];
  readonly totalContributedMinor: number;
  readonly totalInterestGrossMinor: number;
  readonly totalTaxMinor: number;
  readonly totalInterestNetMinor: number;
  readonly totalPaidOutMinor: number;
  readonly finalBalanceMinor: number;
  readonly nominalAnnualRate: number;
  /** ГЭСВ — считается по фактическому денежному потоку. */
  readonly effectiveAnnualRate: number;
  readonly effectiveRateMethod: MethodRef;
  readonly effectiveRateConverged: boolean;
  readonly kdif: KdifAssessment;
  readonly warnings: readonly CalcWarning[];
  readonly assumptions: Assumptions;
}

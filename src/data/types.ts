import type { Currency } from "@/domain/money";
import type { Compounding, DepositKind, PayoutMode } from "@/domain/deposit/types";
import type { CivilDate, DayCount } from "@/domain/time";
import type { Confidence } from "@/domain/registry";

export type BankKind = "bvu" | "development";

export interface Bank {
  readonly id: string;
  readonly name: string;
  readonly legalName?: string;
  readonly kind: BankKind;
  readonly siteUrl: string;
  readonly isKdifMember: boolean;
  readonly verifiedAt: CivilDate;
}

export interface DepositProduct {
  readonly id: string;
  readonly bankId: string;
  readonly name: string;
  readonly kind: DepositKind;
  readonly currency: Currency;
  readonly termMonths: number;
  readonly minAmountMinor?: number;
  readonly topUpAllowed: boolean;
  readonly topUpCutoffMonths?: number;
  readonly partialWithdrawalAllowed: boolean;
  readonly compounding: Compounding;
  readonly payoutMode: PayoutMode;
  /** База начисления — банки её почти никогда не публикуют, поэтому это допущение. */
  readonly dayCount: DayCount;
  readonly productUrl: string;
  readonly verifiedAt: CivilDate;
}

/**
 * Ставки хранятся отдельно от продукта и только ДОБАВЛЯЮТСЯ: запись никогда
 * не правится на месте, вместо этого появляется новая с более поздней датой.
 * Так «дата актуальности» становится частью структуры, а история ставок
 * получается бесплатно.
 */
export interface RateRecord {
  readonly id: string;
  readonly productId: string;
  readonly nominalAnnualRate: number;
  /** ГЭСВ в том виде, в каком её публикует сам банк — для сверки с нашим расчётом. */
  readonly publishedEffectiveRate?: number;
  readonly verifiedAt: CivilDate;
  readonly sourceUrl: string;
  readonly confidence: Confidence;
  readonly note?: string;
  readonly supersededAt?: CivilDate;
}

export interface CashbackCategory {
  readonly label: string;
  readonly rate: number;
  readonly capMinor?: number;
  readonly conditions?: string;
}

export interface CashbackProgram {
  readonly id: string;
  readonly bankId: string;
  readonly name: string;
  readonly kind: "cashback" | "bonus" | "miles";
  readonly cardProduct?: string;
  readonly baseRate?: number;
  readonly categories: readonly CashbackCategory[];
  /** Категории меняются каждый месяц — как у Kaspi Bonus. */
  readonly rotates: boolean;
  readonly monthlyCapMinor?: number;
  readonly redemption: "cash" | "bonus-only" | "partner-only";
  readonly sourceUrl: string;
  readonly verifiedAt: CivilDate;
  readonly confidence: Confidence;
  readonly note?: string;
}


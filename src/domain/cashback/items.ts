import type { CivilDate } from "@/domain/time";
import { monthlyEquivalentMinor } from "@/domain/recurring";
import { type RecurringPayment, isActive } from "@/domain/recurring/payment";
import type { SpendLine } from "@/domain/spending";
import { type MerchantLookup, resolvePaymentMcc } from "./resolve";
import type { SpendItem } from "./types";

/**
 * Приведение двух пользовательских сущностей к одному виду для движка подбора.
 * Платёж даёт сумму через месячный эквивалент (годовая подписка — это 1/12
 * в месяц), строка бюджета уже месячная.
 */

export function paymentToSpendItem(
  payment: RecurringPayment,
  lookupMerchant: MerchantLookup,
): SpendItem {
  const resolved = resolvePaymentMcc(payment, lookupMerchant);
  return {
    id: payment.id,
    title: payment.title,
    mccCode: resolved.code,
    merchantId: resolved.merchantId,
    monthlyMinor: monthlyEquivalentMinor(payment.amountMinor, payment.recurrence),
    currency: payment.currency,
    source: "payment",
  };
}

export function spendLineToSpendItem(line: SpendLine): SpendItem {
  return {
    id: line.id,
    title: line.title,
    mccCode: line.mccCode,
    merchantId: line.merchantId,
    monthlyMinor: line.monthlyMinor,
    currency: line.currency,
    source: "profile",
  };
}

/** Все траты человека на дату: действующие платежи плюс статьи бюджета. */
export function collectSpendItems(
  payments: readonly RecurringPayment[],
  lines: readonly SpendLine[],
  lookupMerchant: MerchantLookup,
  on: CivilDate,
): SpendItem[] {
  return [
    ...payments.filter((p) => isActive(p, on)).map((p) => paymentToSpendItem(p, lookupMerchant)),
    ...lines.map(spendLineToSpendItem),
  ];
}

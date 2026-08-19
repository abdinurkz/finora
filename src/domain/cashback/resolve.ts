import type { Confidence } from "@/domain/registry";
import {
  type ExpenseType,
  type RecurringPayment,
  SUBSCRIPTION_CATEGORIES,
} from "@/domain/recurring/payment";

/**
 * ОТКУДА БЕРЁТСЯ КОД КАТЕГОРИИ.
 *
 * Требование было жёстким: подписки и расходы, заведённые до появления MCC,
 * обязаны участвовать в подборе кэшбэка сразу, без переразметки руками.
 * Отсюда главное решение — код НЕ ХРАНИТСЯ, а выводится при чтении, и только
 * ручная правка пользователя сохраняется в записи.
 *
 * Побочная выгода: цепочка вывода возвращает не только код, но и то, ПОЧЕМУ
 * он такой. Интерфейс показывает «определено по названию: Netflix», и человек
 * видит, чему верить, — ровно как с бейджами достоверности в расчётах.
 */

export type MccSource = "explicit" | "merchant" | "category" | "none";

export interface ResolvedMcc {
  readonly code?: string;
  readonly source: MccSource;
  /** Человекочитаемая причина: «Netflix», «Коммунальные услуги». */
  readonly via?: string;
  readonly merchantId?: string;
  readonly confidence: Confidence;
}

/** Ищет мерчанта по строке. Передаётся снаружи: домен не знает про справочники. */
export type MerchantLookup = (
  text: string,
) => { readonly id: string; readonly name: string; readonly mcc: string } | undefined;

/**
 * `null` означает «кэшбэка по такой трате не бывает», а не «не знаем».
 * Погашение кредита и аренда — это перевод, а не покупка в торговой точке,
 * и обещать по ним возврат было бы враньём.
 */
export const DEFAULT_MCC_BY_EXPENSE_TYPE: Record<ExpenseType, string | null> = {
  housing: null,
  utilities: "4900",
  loan: null,
  insurance: "6300",
  telecom: "4814",
  education: "8299",
  transport: "4111",
  childcare: "8351",
  other: null,
};

export const DEFAULT_MCC_BY_SUBSCRIPTION_CATEGORY: Record<string, string | null> = {
  "Видео и музыка": "5815",
  Игры: "5816",
  "Софт и сервисы": "5817",
  "Облако и хранилище": "5817",
  Обучение: "8299",
  "Спорт и здоровье": "7997",
  Доставка: "5814",
  Прочее: null,
};

const NOT_FOUND: ResolvedMcc = { source: "none", confidence: "placeholder" };

export function resolvePaymentMcc(
  payment: RecurringPayment,
  lookupMerchant: MerchantLookup,
): ResolvedMcc {
  // 1. Ручная правка пользователя. Он видел свою выписку — это самый надёжный источник.
  if (payment.mccCode !== undefined && payment.mccCode !== "") {
    return { code: payment.mccCode, source: "explicit", confidence: "verified" };
  }

  // 2. Узнаваемый мерчант. Сначала явный поставщик, потом название платежа.
  const vendor = payment.kind === "subscription" ? payment.vendor : payment.provider;
  for (const text of [vendor, payment.title]) {
    if (text === undefined || text === "") continue;
    const merchant = lookupMerchant(text);
    if (merchant) {
      return {
        code: merchant.mcc,
        source: "merchant",
        via: merchant.name,
        merchantId: merchant.id,
        confidence: "likely",
      };
    }
  }

  // 3. Умолчание по категории — грубо, но лучше, чем ничего.
  const [code, via] =
    payment.kind === "fixedExpense"
      ? [DEFAULT_MCC_BY_EXPENSE_TYPE[payment.expenseType], EXPENSE_LABEL[payment.expenseType]]
      : [DEFAULT_MCC_BY_SUBSCRIPTION_CATEGORY[payment.categoryId] ?? null, payment.categoryId];

  if (code === null) return NOT_FOUND;
  return { code, source: "category", via, confidence: "unverified" };
}

/** Дублирует EXPENSE_TYPE_LABELS, но нужен здесь ради `via` без лишнего импорта. */
const EXPENSE_LABEL: Record<ExpenseType, string> = {
  housing: "Аренда и жильё",
  utilities: "Коммунальные услуги",
  loan: "Кредиты и рассрочки",
  insurance: "Страхование",
  telecom: "Связь и интернет",
  education: "Образование",
  transport: "Транспорт",
  childcare: "Дети",
  other: "Прочее",
};

/** Категории подписок, для которых умолчание не задано, — страховка от опечатки. */
export const UNMAPPED_SUBSCRIPTION_CATEGORIES: readonly string[] =
  SUBSCRIPTION_CATEGORIES.filter((c) => !(c in DEFAULT_MCC_BY_SUBSCRIPTION_CATEGORY));

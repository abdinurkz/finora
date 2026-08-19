import type { CivilDate, YearMonth } from "@/domain/time";
import type { Assumptions, Confidence, SourceRef } from "@/domain/registry";
import type { Currency } from "@/domain/money";

/* ── MCC ────────────────────────────────────────────────────────── */

/**
 * Группа нужна ТОЛЬКО для организации списков в интерфейсе.
 * Ни одно правило подбора кэшбэка на неё не опирается: предложения банков
 * целятся в конкретные MCC или в конкретных мерчантов, а «Коммуналка» или
 * «Медцентры, фитнес, образование и т.д.» — это маркетинговые названия,
 * свои у каждого банка и разные от месяца к месяцу.
 */
export type SpendGroupId =
  | "groceries"
  | "dining"
  | "transport"
  | "fuel"
  | "auto"
  | "travel"
  | "entertainment"
  | "digital"
  | "home"
  | "telecom"
  | "utilities"
  | "health"
  | "beauty"
  | "kids"
  | "clothing"
  | "electronics"
  | "marketplace"
  | "education"
  | "pets"
  | "services"
  | "finance"
  | "other";

/**
 * Код категории торговой точки по ISO 18245.
 *
 * `code` — строка, а не число: ведущий ноль значим (0742 — ветклиники),
 * а Number("0742") молча превращается в 742.
 */
export interface MccCode {
  readonly code: string;
  readonly name: string;
  readonly groupId: SpendGroupId;
  /**
   * По таким операциям кэшбэк не начисляют почти никогда: снятие наличных,
   * переводы, налоги, брокерские операции. Движок подбора обязан их пропускать,
   * иначе приложение пообещает возврат за поход к банкомату.
   */
  readonly excludedFromCashback?: boolean;
}

/**
 * Мерчант существует ради одного: пользователь не должен знать, что такое MCC.
 * Он пишет «Netflix» или «Small», а код подставляется сам.
 */
export interface Merchant {
  readonly id: string;
  readonly name: string;
  readonly mcc: string;
  /** Написания, по которым узнаём мерчанта в названии платежа. */
  readonly aliases?: readonly string[];
  readonly siteUrl?: string;
}

/* ── Карты ──────────────────────────────────────────────────────── */

/**
 * Повышенный кэшбэк объявляется на КАРТУ, а не на банк: у ForteBank
 * «Яндекс Плюс Forte» и обычная ForteCard дают разное на одну и ту же поездку.
 */
export interface CardProduct {
  readonly id: string;
  readonly bankId: string;
  readonly name: string;
  readonly rewardKind: "cashback" | "bonus" | "miles";
  readonly redemption: "cash" | "bonus-only" | "partner-only";
  readonly baseRate?: number;
  readonly monthlyCapMinor?: number;
  /** Приложение, через которое проходят «в приложении банка» предложения. */
  readonly appName?: string;
  readonly productUrl: string;
  readonly verifiedAt: CivilDate;
  readonly confidence: Confidence;
  readonly note?: string;
}

/* ── Предложения месяца ─────────────────────────────────────────── */

/** Во что целится предложение: в набор категорий или в конкретные магазины. */
export type OfferTarget =
  | { readonly kind: "mcc"; readonly codes: readonly string[] }
  | { readonly kind: "merchant"; readonly merchantIds: readonly string[] };

/**
 * `individual` — банк раздаёт категории персонально; у конкретного человека
 * их может не быть вовсе, поэтому такие предложения нельзя считать доступными
 * по умолчанию.
 */
export type Eligibility = "all" | "salary" | "individual" | "subscribers";

export interface CashbackOffer {
  readonly id: string;
  readonly period: YearMonth;
  readonly cardId: string;
  /** Как категорию назвал сам банк — для показа рядом с процентом. */
  readonly label: string;
  readonly target: OfferTarget;
  readonly rate: number;
  /** true для «до 10 %»: ставка потолочная и не может обещаться как факт. */
  readonly rateIsCeiling: boolean;
  readonly eligibility: Eligibility;
  /** «приложение Freedom», «Halyk QR», «оплата с баланса» — условие получения. */
  readonly channel?: string;
  readonly capMinor?: number;
  readonly conditions?: string;
  /**
   * Не `sourceUrl`, как у ставок по депозитам: месячные подборки расходятся
   * репостами без канонической ссылки, и `SourceRef` позволяет честно указать
   * издателя и дату, когда ссылки нет.
   */
  readonly source: SourceRef;
  readonly verifiedAt: CivilDate;
  readonly confidence: Confidence;
  readonly note?: string;
}

/* ── Траты пользователя ─────────────────────────────────────────── */

/**
 * Общий вид траты для движка подбора.
 *
 * Регулярный платёж и строка бюджета — разные сущности (у первой есть дата
 * списания, у второй нет), но кэшбэк считается по ним одинаково. Приведение
 * к одному типу избавляет движок от знания, откуда трата взялась.
 */
export interface SpendItem {
  readonly id: string;
  readonly title: string;
  readonly mccCode?: string;
  readonly merchantId?: string;
  readonly monthlyMinor: number;
  readonly currency: Currency;
  readonly source: "payment" | "profile";
}

/* ── Кошелёк ────────────────────────────────────────────────────── */

export interface OwnedCard {
  readonly cardId: string;
  /**
   * Зарплатный клиент этого банка. Отдельно по каждой карте: человек может
   * получать зарплату в одном банке и держать карты нескольких.
   */
  readonly salaryClient: boolean;
}

export interface Wallet {
  readonly cards: readonly OwnedCard[];
  /**
   * Учитывать ли «индивидуальные» категории. По умолчанию нет: банк раздаёт
   * их персонально, и считать их своими — значит завысить оценку.
   */
  readonly includeIndividual: boolean;
}

export const EMPTY_WALLET: Wallet = { cards: [], includeIndividual: false };

/* ── Подбор ─────────────────────────────────────────────────────── */

/** Почему предложение подошло. Точное совпадение по магазину важнее категории. */
export type MatchReason = "merchant" | "mcc" | "base";

/** Что мешает воспользоваться предложением. */
export type Blocker = "notOwned" | "salaryOnly" | "individual";

export interface OfferMatch {
  /** Отсутствует у базовой ставки карты — она не привязана к предложению. */
  readonly offer?: CashbackOffer;
  readonly card: CardProduct;
  readonly rate: number;
  readonly rateIsCeiling: boolean;
  readonly reason: MatchReason;
  readonly monthlyGainMinor: number;
  readonly cappedBy?: "offer" | "card";
  readonly blockedBy?: Blocker;
}

export interface ItemRecommendation {
  readonly item: SpendItem;
  /** Лучшее из того, чем человек реально может заплатить. */
  readonly best?: OfferMatch;
  readonly alternatives: readonly OfferMatch[];
  /** Выгоднее, но карты нет или не подходит статус. */
  readonly locked: readonly OfferMatch[];
}

export interface CashbackEstimate {
  readonly perItem: readonly ItemRecommendation[];
  /** Только точные ставки — эту сумму можно называть вслух. */
  readonly guaranteedMonthlyMinor: number;
  /** С учётом «до X %» — верхняя граница, а не обещание. */
  readonly ceilingMonthlyMinor: number;
  readonly guaranteedYearlyMinor: number;
  /** Трат, по которым кэшбэка нет вовсе. */
  readonly unmatchedCount: number;
  readonly assumptions: Assumptions;
}

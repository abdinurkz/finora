import { type Rounding, allocate, mulRate, roundWith } from "@/domain/money";
import { type Assumptions, type MethodRef, buildAssumptions } from "@/domain/registry";
import type {
  Blocker,
  CardProduct,
  CashbackEstimate,
  CashbackOffer,
  ItemRecommendation,
  MatchReason,
  OfferMatch,
  OwnedCard,
  SpendItem,
  Wallet,
} from "./types";

export * from "./types";
export * from "./resolve";
export * from "./items";

/**
 * ДВИЖОК ПОДБОРА.
 *
 * Чистые функции: справочники карт и предложений передаются аргументами,
 * потому что домен ничего не знает про `src/data`.
 *
 * Два правила вынесены сюда из интерфейса намеренно, чтобы их нельзя было
 * обойти по невнимательности:
 *
 * 1. Возврат считается с округлением ВНИЗ. Оценка выгоды — это обещание,
 *    а обещание округляют не в свою пользу.
 * 2. Точные ставки и «до X %» никогда не складываются в одно число. В оценке
 *    это два разных поля, так что компонент физически не может показать
 *    потолок как гарантию.
 */

export const CAP_METHOD: MethodRef = {
  id: "cashback-caps",
  label: "Распределение лимитов кэшбэка",
  description:
    "Сначала режется лимит каждого предложения, затем общий месячный лимит карты. " +
    "Внутри лимита сумма делится между тратами пропорционально их размеру. " +
    "Это упрощение: банк может считать иначе, а точный подбор трат под лимит — " +
    "комбинаторная задача с неединственным ответом.",
  confidence: "unverified",
};

export const CEILING_METHOD: MethodRef = {
  id: "cashback-ceiling",
  label: "Ставки вида «до X %»",
  description:
    "Банк не публикует, при каких условиях действует максимум, поэтому такие " +
    "ставки не попадают в гарантированную сумму и показываются отдельной оценкой сверху.",
  confidence: "unverified",
};

export interface EngineOptions {
  /** Округление годовых величин. Месячный возврат всегда считается вниз. */
  readonly rounding?: Rounding;
  /** Проверка, что по коду вообще бывает кэшбэк (снятие наличных, налоги). */
  readonly isCashbackEligible?: (code: string) => boolean;
}

/* ── Совпадение ─────────────────────────────────────────────────── */

/** Подходит ли предложение под трату. `null` — не подходит. */
export function matchOffer(
  offer: CashbackOffer,
  mccCode: string | undefined,
  merchantId: string | undefined,
): MatchReason | null {
  if (offer.target.kind === "merchant") {
    if (merchantId !== undefined && offer.target.merchantIds.includes(merchantId)) {
      return "merchant";
    }
    return null;
  }
  if (mccCode !== undefined && offer.target.codes.includes(mccCode)) return "mcc";
  return null;
}

/**
 * Что мешает воспользоваться предложением.
 *
 * «Абонентам Activ» проверяется владением: оплата с баланса телефона попадает
 * в кошелёк только у того, кто и есть абонент, — отдельного флага не нужно.
 */
function blockerFor(
  offer: CashbackOffer | undefined,
  owned: OwnedCard | undefined,
  wallet: Wallet,
): Blocker | undefined {
  if (owned === undefined) return "notOwned";
  if (offer === undefined) return undefined;
  if (offer.eligibility === "salary" && !owned.salaryClient) return "salaryOnly";
  if (offer.eligibility === "individual" && !wallet.includeIndividual) return "individual";
  return undefined;
}

const REDEMPTION_RANK: Record<CardProduct["redemption"], number> = {
  cash: 0,
  "bonus-only": 1,
  "partner-only": 2,
};

/**
 * Точное совпадение по магазину важнее категорийного, а категорийное —
 * важнее базовой ставки: «20 % в Forte Market» конкретнее, чем «1 % на всё».
 */
const REASON_RANK: Record<MatchReason, number> = { merchant: 0, mcc: 1, base: 2 };

function compareMatches(a: OfferMatch, b: OfferMatch): number {
  if (a.rate !== b.rate) return b.rate - a.rate;
  // Точная ставка выигрывает у потолочной той же величины.
  if (a.rateIsCeiling !== b.rateIsCeiling) return a.rateIsCeiling ? 1 : -1;
  if (a.reason !== b.reason) return REASON_RANK[a.reason] - REASON_RANK[b.reason];
  const r = REDEMPTION_RANK[a.card.redemption] - REDEMPTION_RANK[b.card.redemption];
  if (r !== 0) return r;
  return a.card.id.localeCompare(b.card.id);
}

/** Все предложения, подходящие под трату, — и доступные, и заблокированные. */
export function rankOffers(
  item: SpendItem,
  offers: readonly CashbackOffer[],
  cards: readonly CardProduct[],
  wallet: Wallet,
  opts: EngineOptions = {},
): OfferMatch[] {
  const eligible = opts.isCashbackEligible ?? (() => true);
  if (item.mccCode !== undefined && !eligible(item.mccCode)) return [];

  const ownedById = new Map(wallet.cards.map((c) => [c.cardId, c]));
  const matches: OfferMatch[] = [];

  for (const card of cards) {
    const owned = ownedById.get(card.id);

    for (const offer of offers) {
      if (offer.cardId !== card.id) continue;
      const reason = matchOffer(offer, item.mccCode, item.merchantId);
      if (reason === null) continue;

      matches.push({
        offer,
        card,
        rate: offer.rate,
        rateIsCeiling: offer.rateIsCeiling,
        reason,
        monthlyGainMinor: mulRate(item.monthlyMinor, offer.rate, "down"),
        blockedBy: blockerFor(offer, owned, wallet),
      });
    }

    // Базовая ставка — чтобы карта с высоким базовым процентом не выпадала
    // из сравнения только потому, что в этом месяце по ней нет категории.
    if (card.baseRate !== undefined) {
      matches.push({
        card,
        rate: card.baseRate,
        rateIsCeiling: false,
        reason: "base",
        monthlyGainMinor: mulRate(item.monthlyMinor, card.baseRate, "down"),
        blockedBy: blockerFor(undefined, owned, wallet),
      });
    }
  }

  return matches.sort(compareMatches);
}

export function recommendFor(
  item: SpendItem,
  offers: readonly CashbackOffer[],
  cards: readonly CardProduct[],
  wallet: Wallet,
  opts: EngineOptions = {},
): ItemRecommendation {
  const all = rankOffers(item, offers, cards, wallet, opts);
  const available = all.filter((m) => m.blockedBy === undefined);
  const best = available[0];

  // Заблокированное показываем только если оно ВЫГОДНЕЕ доступного:
  // иначе список превращается в перечень всех карт страны.
  const floor = best?.rate ?? 0;
  const locked = all.filter((m) => m.blockedBy !== undefined && m.rate > floor);

  return { item, best, alternatives: available.slice(1), locked };
}

/* ── Лимиты ─────────────────────────────────────────────────────── */

/**
 * Режет суммы по лимиту группы и распределяет остаток пропорционально.
 * `allocate` гарантирует, что части сложатся ровно в лимит — иначе строки
 * в интерфейсе не сходились бы с итогом.
 */
function applyCap(
  picked: { match: OfferMatch; index: number }[],
  capMinor: number | undefined,
  cappedBy: "offer" | "card",
  out: (OfferMatch | undefined)[],
): void {
  if (capMinor === undefined) return;
  const total = picked.reduce((s, p) => s + p.match.monthlyGainMinor, 0);
  if (total <= capMinor) return;

  const shares = allocate(
    capMinor,
    picked.map((p) => p.match.monthlyGainMinor),
  );
  picked.forEach((p, i) => {
    out[p.index] = { ...p.match, monthlyGainMinor: shares[i], cappedBy };
  });
}

function groupBy<T>(items: T[], key: (t: T) => string | undefined): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (k === undefined) continue;
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}

/* ── Оценка ─────────────────────────────────────────────────────── */

export function estimateCashback(
  items: readonly SpendItem[],
  offers: readonly CashbackOffer[],
  cards: readonly CardProduct[],
  wallet: Wallet,
  opts: EngineOptions = {},
): CashbackEstimate {
  const rounding: Rounding = opts.rounding ?? "halfUp";
  const recommendations = items.map((item) => recommendFor(item, offers, cards, wallet, opts));

  // Выбранные варианты режем по лимитам: сперва по каждому предложению,
  // затем по месячному лимиту карты.
  const chosen: (OfferMatch | undefined)[] = recommendations.map((r) => r.best);
  const indexed = chosen
    .map((match, index) => (match ? { match, index } : undefined))
    .filter((v): v is { match: OfferMatch; index: number } => v !== undefined);

  for (const [, group] of groupBy(indexed, (p) => p.match.offer?.id)) {
    applyCap(group, group[0].match.offer?.capMinor, "offer", chosen);
  }
  const afterOfferCaps = chosen
    .map((match, index) => (match ? { match, index } : undefined))
    .filter((v): v is { match: OfferMatch; index: number } => v !== undefined);

  for (const [, group] of groupBy(afterOfferCaps, (p) => p.match.card.id)) {
    applyCap(group, group[0].match.card.monthlyCapMinor, "card", chosen);
  }

  let guaranteed = 0;
  let ceiling = 0;
  let unmatched = 0;

  const perItem = recommendations.map((rec, i) => {
    const best = chosen[i];
    if (best === undefined) {
      unmatched++;
      return rec;
    }
    ceiling += best.monthlyGainMinor;
    if (!best.rateIsCeiling) guaranteed += best.monthlyGainMinor;
    return { ...rec, best };
  });

  const contributing = chosen.filter((m): m is OfferMatch => m !== undefined);
  const methods: MethodRef[] = [];
  if (contributing.some((m) => m.cappedBy !== undefined)) methods.push(CAP_METHOD);
  if (contributing.some((m) => m.rateIsCeiling)) methods.push(CEILING_METHOD);

  const assumptions: Assumptions = buildAssumptions(
    contributing.map((m) => ({
      seriesKey: m.offer?.id ?? m.card.id,
      label: m.offer?.label ?? m.card.name,
      unit: "ratio" as const,
      value: m.rate,
      confidence: m.offer?.confidence ?? m.card.confidence,
      entry: {
        value: m.rate,
        effectiveFrom: m.offer?.verifiedAt ?? m.card.verifiedAt,
        confidence: m.offer?.confidence ?? m.card.confidence,
        source: m.offer?.source,
      },
    })),
    methods,
  );

  return {
    perItem,
    guaranteedMonthlyMinor: guaranteed,
    ceilingMonthlyMinor: ceiling,
    guaranteedYearlyMinor: roundWith(guaranteed * 12, rounding),
    unmatchedCount: unmatched,
    assumptions,
  };
}

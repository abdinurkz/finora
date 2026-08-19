import { describe, expect, it } from "vitest";
import {
  EXPENSE_TYPE_LABELS,
  type FixedExpense,
  type RecurringPayment,
  SUBSCRIPTION_CATEGORIES,
  type Subscription,
} from "@/domain/recurring/payment";
import type { CardProduct, CashbackOffer, SpendItem, Wallet } from "./types";
import {
  DEFAULT_MCC_BY_EXPENSE_TYPE,
  DEFAULT_MCC_BY_SUBSCRIPTION_CATEGORY,
  UNMAPPED_SUBSCRIPTION_CATEGORIES,
  estimateCashback,
  matchOffer,
  rankOffers,
  recommendFor,
  resolvePaymentMcc,
} from "./index";

/* ── Заготовки ──────────────────────────────────────────────────── */

const MERCHANTS = [
  { id: "netflix", name: "Netflix", mcc: "5815" },
  { id: "small", name: "Small", mcc: "5411" },
];

const lookup = (text: string) =>
  MERCHANTS.find((m) => text.toLowerCase().split(/[^\p{L}\p{N}]+/u).includes(m.name.toLowerCase()));

const base = {
  schemaVersion: 2,
  currency: "KZT" as const,
  amountKind: "fixed" as const,
  recurrence: { anchor: "2026-08-01", unit: "month" as const, every: 1 },
  status: "active" as const,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const subscription = (over: Partial<Subscription> = {}): Subscription => ({
  ...base,
  id: "s1",
  kind: "subscription",
  title: "Подписка",
  amountMinor: 500000,
  categoryId: "Прочее",
  ...over,
});

const expense = (over: Partial<FixedExpense> = {}): FixedExpense => ({
  ...base,
  id: "e1",
  kind: "fixedExpense",
  title: "Расход",
  amountMinor: 500000,
  categoryId: EXPENSE_TYPE_LABELS.other,
  expenseType: "other",
  ...over,
});

const card = (over: Partial<CardProduct> = {}): CardProduct => ({
  id: "card-a",
  bankId: "bank-a",
  name: "Карта А",
  rewardKind: "cashback",
  redemption: "cash",
  productUrl: "https://example.kz",
  verifiedAt: "2026-08-18",
  confidence: "unverified",
  ...over,
});

const offer = (over: Partial<CashbackOffer> = {}): CashbackOffer => ({
  id: "o1",
  period: "2026-08",
  cardId: "card-a",
  label: "Категория",
  target: { kind: "mcc", codes: ["5411"] },
  rate: 0.05,
  rateIsCeiling: false,
  eligibility: "all",
  source: { title: "Подборка", publisher: "Издатель", retrievedAt: "2026-08-18" },
  verifiedAt: "2026-08-18",
  confidence: "unverified",
  ...over,
});

const item = (over: Partial<SpendItem> = {}): SpendItem => ({
  id: "i1",
  title: "Трата",
  mccCode: "5411",
  monthlyMinor: 10_000_00,
  currency: "KZT",
  source: "profile",
  ...over,
});

const owning = (cardId: string, salaryClient = false): Wallet => ({
  cards: [{ cardId, salaryClient }],
  includeIndividual: false,
});

/* ── Определение категории ──────────────────────────────────────── */

describe("определение MCC по платежу", () => {
  it("ручная правка пользователя важнее всего", () => {
    const p = subscription({ mccCode: "9999", title: "Netflix" });
    expect(resolvePaymentMcc(p, lookup)).toMatchObject({ code: "9999", source: "explicit" });
  });

  it("узнаёт мерчанта в названии и объясняет, откуда код", () => {
    const r = resolvePaymentMcc(subscription({ title: "Netflix" }), lookup);
    expect(r).toMatchObject({ code: "5815", source: "merchant", via: "Netflix", merchantId: "netflix" });
  });

  it("поставщик приоритетнее названия платежа", () => {
    const r = resolvePaymentMcc(subscription({ title: "Small", vendor: "Netflix" }), lookup);
    expect(r.merchantId).toBe("netflix");
  });

  it("откатывается к умолчанию по типу расхода", () => {
    const r = resolvePaymentMcc(expense({ expenseType: "utilities" }), lookup);
    expect(r).toMatchObject({ code: "4900", source: "category", via: "Коммунальные услуги" });
  });

  it("откатывается к умолчанию по категории подписки", () => {
    const r = resolvePaymentMcc(subscription({ categoryId: "Видео и музыка" }), lookup);
    expect(r).toMatchObject({ code: "5815", source: "category" });
  });

  /**
   * Главное обещание миграции: записи, заведённые до появления MCC, участвуют
   * в подборе сразу. Поле у них отсутствует, а код выводится.
   */
  it("запись версии 1 без поля mccCode всё равно получает код", () => {
    const old = { ...expense({ expenseType: "telecom" }), schemaVersion: 1 } as RecurringPayment;
    expect(old.mccCode).toBeUndefined();
    expect(resolvePaymentMcc(old, lookup).code).toBe("4814");
  });

  it("по кредиту и аренде кэшбэка не обещает", () => {
    expect(resolvePaymentMcc(expense({ expenseType: "loan" }), lookup).source).toBe("none");
    expect(resolvePaymentMcc(expense({ expenseType: "housing" }), lookup).source).toBe("none");
  });

  it("умолчания покрывают все типы расходов и все категории подписок", () => {
    for (const key of Object.keys(EXPENSE_TYPE_LABELS)) {
      expect(DEFAULT_MCC_BY_EXPENSE_TYPE, key).toHaveProperty(key);
    }
    for (const c of SUBSCRIPTION_CATEGORIES) {
      expect(DEFAULT_MCC_BY_SUBSCRIPTION_CATEGORY, c).toHaveProperty(c);
    }
    expect(UNMAPPED_SUBSCRIPTION_CATEGORIES).toEqual([]);
  });
});

/* ── Подбор ─────────────────────────────────────────────────────── */

describe("подбор предложений", () => {
  it("совпадение по магазину и по категории различаются", () => {
    const byShop = offer({ target: { kind: "merchant", merchantIds: ["small"] } });
    expect(matchOffer(byShop, "5411", "small")).toBe("merchant");
    expect(matchOffer(byShop, "5411", undefined)).toBeNull();
    expect(matchOffer(offer(), "5411", undefined)).toBe("mcc");
    expect(matchOffer(offer(), "5812", undefined)).toBeNull();
  });

  it("точечное предложение по магазину бьёт категорийное той же ставки", () => {
    const cards = [card(), card({ id: "card-b" })];
    const offers = [
      offer({ id: "by-mcc", cardId: "card-a" }),
      offer({ id: "by-shop", cardId: "card-b", target: { kind: "merchant", merchantIds: ["small"] } }),
    ];
    const wallet: Wallet = { cards: [{ cardId: "card-a", salaryClient: false }, { cardId: "card-b", salaryClient: false }], includeIndividual: false };
    const best = recommendFor(item({ merchantId: "small" }), offers, cards, wallet).best;
    expect(best?.offer?.id).toBe("by-shop");
  });

  it("категория бьёт базовую ставку карты", () => {
    const cards = [card({ baseRate: 0.01 })];
    const best = recommendFor(item(), [offer()], cards, owning("card-a")).best;
    expect(best?.reason).toBe("mcc");
    expect(best?.rate).toBe(0.05);
  });

  it("точная ставка выигрывает у потолочной той же величины", () => {
    const cards = [card(), card({ id: "card-b" })];
    const offers = [
      offer({ id: "ceil", cardId: "card-a", rateIsCeiling: true }),
      offer({ id: "flat", cardId: "card-b", rateIsCeiling: false }),
    ];
    const wallet: Wallet = { cards: [{ cardId: "card-a", salaryClient: false }, { cardId: "card-b", salaryClient: false }], includeIndividual: false };
    expect(recommendFor(item(), offers, cards, wallet).best?.offer?.id).toBe("flat");
  });

  it("чужая карта попадает в «заблокировано», а не в «лучшее»", () => {
    const cards = [card(), card({ id: "card-b" })];
    const offers = [offer({ id: "mine", cardId: "card-a", rate: 0.02 }), offer({ id: "theirs", cardId: "card-b", rate: 0.2 })];
    const rec = recommendFor(item(), offers, cards, owning("card-a"));
    expect(rec.best?.offer?.id).toBe("mine");
    expect(rec.locked.map((m) => m.offer?.id)).toContain("theirs");
    expect(rec.locked[0].blockedBy).toBe("notOwned");
  });

  it("заблокированное показывается, только если оно выгоднее доступного", () => {
    const cards = [card(), card({ id: "card-b" })];
    const offers = [offer({ id: "mine", cardId: "card-a", rate: 0.2 }), offer({ id: "theirs", cardId: "card-b", rate: 0.02 })];
    expect(recommendFor(item(), offers, cards, owning("card-a")).locked).toEqual([]);
  });

  it("категория для зарплатных не достаётся обычному клиенту", () => {
    const offers = [offer({ eligibility: "salary", rate: 0.1 })];
    const cards = [card()];
    expect(recommendFor(item(), offers, cards, owning("card-a", false)).best).toBeUndefined();
    expect(recommendFor(item(), offers, cards, owning("card-a", true)).best?.rate).toBe(0.1);
  });

  it("индивидуальные категории скрыты, пока их не включили", () => {
    const offers = [offer({ eligibility: "individual" })];
    const cards = [card()];
    expect(recommendFor(item(), offers, cards, owning("card-a")).best).toBeUndefined();
    const on: Wallet = { cards: [{ cardId: "card-a", salaryClient: false }], includeIndividual: true };
    expect(recommendFor(item(), offers, cards, on).best?.rate).toBe(0.05);
  });

  it("по операциям без кэшбэка не предлагает ничего", () => {
    const matches = rankOffers(item({ mccCode: "6011" }), [offer({ target: { kind: "mcc", codes: ["6011"] } })], [card()], owning("card-a"), {
      isCashbackEligible: (c) => c !== "6011",
    });
    expect(matches).toEqual([]);
  });

  it("порядок не зависит от порядка карт на входе", () => {
    const cards = [card({ id: "card-a" }), card({ id: "card-b" })];
    const offers = [offer({ id: "a", cardId: "card-a" }), offer({ id: "b", cardId: "card-b" })];
    const wallet: Wallet = { cards: [{ cardId: "card-a", salaryClient: false }, { cardId: "card-b", salaryClient: false }], includeIndividual: false };
    const forward = rankOffers(item(), offers, cards, wallet).map((m) => m.offer?.id);
    const backward = rankOffers(item(), [...offers].reverse(), [...cards].reverse(), wallet).map((m) => m.offer?.id);
    expect(forward).toEqual(backward);
  });
});

/* ── Оценка ─────────────────────────────────────────────────────── */

describe("оценка кэшбэка", () => {
  const cards = [card()];
  const wallet = owning("card-a");

  it("возврат округляется вниз — обещание не завышается", () => {
    // 3333,33 ₸ × 3 % = 99,9999 ₸ → 99,99 ₸, а не 100 ₸.
    const e = estimateCashback([item({ monthlyMinor: 333_333, mccCode: "5411" })], [offer({ rate: 0.03 })], cards, wallet);
    expect(e.guaranteedMonthlyMinor).toBe(9999);
  });

  it("«до X %» не попадает в гарантированную сумму", () => {
    const e = estimateCashback([item()], [offer({ rateIsCeiling: true })], cards, wallet);
    expect(e.guaranteedMonthlyMinor).toBe(0);
    expect(e.ceilingMonthlyMinor).toBe(50_000);
  });

  it("точные ставки попадают в обе суммы", () => {
    const e = estimateCashback([item()], [offer()], cards, wallet);
    expect(e.guaranteedMonthlyMinor).toBe(50_000);
    expect(e.ceilingMonthlyMinor).toBe(50_000);
  });

  it("траты без подходящего предложения считаются отдельно", () => {
    const e = estimateCashback([item({ mccCode: "9999" })], [offer()], cards, wallet);
    expect(e.unmatchedCount).toBe(1);
    expect(e.guaranteedMonthlyMinor).toBe(0);
  });

  it("годовая сумма — двенадцать месячных", () => {
    const e = estimateCashback([item()], [offer()], cards, wallet);
    expect(e.guaranteedYearlyMinor).toBe(e.guaranteedMonthlyMinor * 12);
  });

  it("лимит предложения режет возврат", () => {
    const e = estimateCashback([item()], [offer({ capMinor: 20_000 })], cards, wallet);
    expect(e.guaranteedMonthlyMinor).toBe(20_000);
    expect(e.perItem[0].best?.cappedBy).toBe("offer");
  });

  it("месячный лимит карты режет сумму по всем тратам", () => {
    const capped = [card({ monthlyCapMinor: 30_000 })];
    const items = [item({ id: "i1" }), item({ id: "i2" })];
    const e = estimateCashback(items, [offer()], capped, wallet);
    expect(e.guaranteedMonthlyMinor).toBe(30_000);
  });

  /** Строки в интерфейсе обязаны складываться ровно в итог. */
  it("урезанные по лимиту строки складываются ровно в лимит", () => {
    const capped = [card({ monthlyCapMinor: 7_777 })];
    const items = [
      item({ id: "i1", monthlyMinor: 10_000_00 }),
      item({ id: "i2", monthlyMinor: 30_000_00 }),
      item({ id: "i3", monthlyMinor: 7_000_00 }),
    ];
    const e = estimateCashback(items, [offer()], capped, wallet);
    const sum = e.perItem.reduce((s, r) => s + (r.best?.monthlyGainMinor ?? 0), 0);
    expect(sum).toBe(7_777);
  });

  it("метод расчёта лимитов и потолков попадает в допущения", () => {
    const e = estimateCashback([item()], [offer({ rateIsCeiling: true })], cards, wallet);
    expect(e.assumptions.methods.map((m) => m.id)).toContain("cashback-ceiling");
    expect(e.assumptions.worstConfidence).toBe("unverified");
  });
});

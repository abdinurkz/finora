import type { CardProduct } from "./types";

/**
 * ПОЧЕМУ КАРТА, А НЕ БАНК.
 *
 * Повышенный кэшбэк объявляется на конкретный продукт: «Яндекс Плюс Forte»
 * даёт на такси до 20 %, а обычная ForteCard — 5 %. Привязка к банку сделала
 * бы эти два предложения неразличимыми и превратила подбор в угадайку.
 *
 * Базовые ставки и лимиты здесь ОРИЕНТИРОВОЧНЫЕ и помечены `unverified`:
 * они не сверялись с банками. Сам факт существования карты — публичный.
 */

const ENTERED = "2026-08-18";

/**
 * Оговорка общая для всего каталога, поэтому она ЗДЕСЬ, а не в каждой записи:
 * повторённая девятнадцать раз подряд, она превращается в обои и перестаёт
 * читаться. Интерфейс обязан показать её один раз на видном месте.
 */
export const CARDS_DISCLAIMER =
  "Базовые ставки и лимиты карт не сверены с банками — уточняйте в приложении своего банка.";

export const CARD_PRODUCTS: readonly CardProduct[] = [
  /* Kaspi */
  {
    id: "kaspi-gold",
    bankId: "kaspi",
    name: "Kaspi Gold",
    rewardKind: "bonus",
    redemption: "bonus-only",
    baseRate: 0.01,
    appName: "Kaspi.kz",
    productUrl: "https://kaspi.kz/bonus/",
    verifiedAt: ENTERED,
    confidence: "unverified",
  },

  /* Halyk */
  {
    id: "halyk-bonus",
    bankId: "halyk",
    name: "Halyk Bonus Card",
    rewardKind: "bonus",
    redemption: "bonus-only",
    baseRate: 0.01,
    appName: "Halyk Homebank",
    productUrl: "https://halykbank.kz/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
  },

  /* ForteBank */
  {
    id: "forte-card",
    bankId: "forte",
    name: "ForteCard",
    rewardKind: "bonus",
    redemption: "partner-only",
    baseRate: 0.01,
    appName: "ForteBank",
    productUrl: "https://forte.kz/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
  },
  {
    id: "forte-solo",
    bankId: "forte",
    name: "Solo",
    rewardKind: "cashback",
    redemption: "cash",
    baseRate: 0.01,
    appName: "ForteBank",
    productUrl: "https://forte.kz/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: "Держатели Solo получают часть категорий наравне с зарплатными клиентами.",
  },
  {
    id: "forte-yandex-plus",
    bankId: "forte",
    name: "Яндекс Плюс Forte",
    rewardKind: "cashback",
    redemption: "cash",
    baseRate: 0.01,
    appName: "ForteBank",
    productUrl: "https://forte.kz/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
  },

  /* Bank CenterCredit */
  {
    id: "bcc-card",
    bankId: "bcc",
    name: "#ЯКарта",
    rewardKind: "cashback",
    redemption: "cash",
    baseRate: 0.01,
    appName: "BCC.KZ",
    productUrl: "https://www.bcc.kz/cards/",
    verifiedAt: ENTERED,
    confidence: "unverified",
  },
  {
    id: "bcc-junior",
    bankId: "bcc",
    name: "БЦК junior",
    rewardKind: "cashback",
    redemption: "cash",
    baseRate: 0.01,
    appName: "BCC.KZ",
    productUrl: "https://www.bcc.kz/cards/",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: "Детская карта.",
  },

  /* Freedom */
  {
    id: "freedom-card",
    bankId: "freedom",
    name: "Freedom Card",
    rewardKind: "cashback",
    redemption: "cash",
    baseRate: 0.01,
    appName: "Freedom SuperApp",
    productUrl: "https://bankffin.kz/ru/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
  },
  {
    id: "freedom-drive",
    bankId: "freedom",
    name: "Freedom Drive",
    rewardKind: "cashback",
    redemption: "cash",
    appName: "Freedom SuperApp",
    productUrl: "https://bankffin.kz/ru/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: "Автомобильная карта.",
  },

  /* Bereke */
  {
    id: "bereke-card",
    bankId: "bereke",
    name: "Bereke Card",
    rewardKind: "cashback",
    redemption: "cash",
    baseRate: 0.01,
    appName: "B-Bank",
    productUrl: "https://berekebank.kz/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
  },

  /* Jusan */
  {
    id: "jusan-card",
    bankId: "jusan",
    name: "Jusan Card",
    rewardKind: "cashback",
    redemption: "cash",
    baseRate: 0.01,
    appName: "Jusan",
    productUrl: "https://jusan.kz/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
  },

  /* Евразийский */
  {
    id: "eurasian-card",
    bankId: "eurasian",
    name: "Eurasian Card",
    rewardKind: "cashback",
    redemption: "cash",
    baseRate: 0.005,
    appName: "Eurasian Bank",
    productUrl: "https://eubank.kz/cards/",
    verifiedAt: ENTERED,
    confidence: "unverified",
  },

  /* Home Credit — Arna, Aspan и Home Card Lite это КАРТЫ банка, а не банки */
  {
    id: "homecredit-arna",
    bankId: "homecredit",
    name: "Arna",
    rewardKind: "cashback",
    redemption: "cash",
    baseRate: 0.01,
    appName: "Home Credit Bank",
    productUrl: "https://home.kz/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
  },
  {
    id: "homecredit-aspan",
    bankId: "homecredit",
    name: "Aspan",
    rewardKind: "cashback",
    redemption: "cash",
    baseRate: 0.01,
    appName: "Home Credit Bank",
    productUrl: "https://home.kz/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
  },
  {
    id: "homecredit-home-lite",
    bankId: "homecredit",
    name: "Home Card Lite",
    rewardKind: "cashback",
    redemption: "cash",
    baseRate: 0.01,
    appName: "Home Credit Bank",
    productUrl: "https://home.kz/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
  },

  /* Нурбанк */
  {
    id: "nurbank-card",
    bankId: "nurbank",
    name: "Нурбанк карта",
    rewardKind: "cashback",
    redemption: "cash",
    productUrl: "https://nurbank.kz",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: "Точное название карточного продукта требует сверки.",
  },

  /* Alatau City Bank */
  {
    id: "alatau-card",
    bankId: "alatau",
    name: "Alatau City Bank карта",
    rewardKind: "cashback",
    redemption: "cash",
    productUrl: "https://alataucitybank.kz",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: "Точное название карточного продукта требует сверки.",
  },

  /* Небанковские эмитенты */
  {
    id: "activ-balance",
    bankId: "activ",
    name: "Баланс Activ",
    rewardKind: "cashback",
    redemption: "cash",
    appName: "Activ",
    productUrl: "https://activ.kz",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: "Не карта, а оплата с баланса телефона. Условие — тариф «Семейный».",
  },
  {
    id: "avtokarta",
    bankId: "avtokarta",
    name: "Автокарта",
    rewardKind: "cashback",
    redemption: "cash",
    productUrl: "https://avtokarta.kz",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: "Банк-эмитент карты не установлен и требует сверки.",
  },
];

const BY_ID = new Map(CARD_PRODUCTS.map((c) => [c.id, c]));

export function cardById(id: string): CardProduct | undefined {
  return BY_ID.get(id);
}

export function cardName(id: string): string {
  return BY_ID.get(id)?.name ?? id;
}

export function cardsOfBank(bankId: string): CardProduct[] {
  return CARD_PRODUCTS.filter((c) => c.bankId === bankId);
}

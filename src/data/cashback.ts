import type { CashbackProgram } from "./types";

/**
 * ВАЖНО ПРО ПРОЦЕНТЫ.
 *
 * Существование программ — публичный факт. Конкретные проценты и потолки —
 * ОРИЕНТИРОВОЧНЫЕ: они не сверены с банками и помечены `unverified`.
 * У программ с ротацией (Kaspi Bonus и подобных) категории вообще меняются
 * каждый месяц, поэтому там важен не процент, а сам факт ротации — он отмечен
 * флагом `rotates`, и интерфейс показывает это отдельным бейджем.
 */

const ENTERED = "2026-08-17";

const NOTE = "Ориентировочные условия. Проценты и лимиты уточняйте в приложении банка.";

const ROTATING_NOTE =
  "Категории и проценты меняются каждый месяц. Смотрите актуальный набор в приложении банка.";

export const CASHBACK_PROGRAMS: readonly CashbackProgram[] = [
  {
    id: "kaspi-bonus",
    bankId: "kaspi",
    name: "Kaspi Bonus",
    kind: "bonus",
    cardProduct: "Kaspi Gold / Red",
    baseRate: 0.01,
    rotates: true,
    redemption: "bonus-only",
    categories: [
      { label: "Супермаркеты", rate: 0.05, conditions: "если категория выпала в этом месяце" },
      { label: "АЗС", rate: 0.03, conditions: "если категория выпала в этом месяце" },
      { label: "Аптеки", rate: 0.03, conditions: "если категория выпала в этом месяце" },
      { label: "Кафе и рестораны", rate: 0.05, conditions: "если категория выпала в этом месяце" },
      { label: "Остальные покупки", rate: 0.01 },
    ],
    sourceUrl: "https://kaspi.kz/bonus/",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: ROTATING_NOTE,
  },
  {
    id: "halyk-bonus",
    bankId: "halyk",
    name: "Halyk Bonus",
    kind: "bonus",
    cardProduct: "Halyk Bonus Card",
    baseRate: 0.01,
    rotates: true,
    redemption: "bonus-only",
    categories: [
      { label: "Супермаркеты", rate: 0.04 },
      { label: "Транспорт и такси", rate: 0.03 },
      { label: "Развлечения", rate: 0.05 },
      { label: "Остальные покупки", rate: 0.01 },
    ],
    sourceUrl: "https://halykbank.kz/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: ROTATING_NOTE,
  },
  {
    id: "freedom-cashback",
    bankId: "freedom",
    name: "Freedom Кэшбэк",
    kind: "cashback",
    cardProduct: "Freedom Card",
    baseRate: 0.01,
    rotates: false,
    redemption: "cash",
    categories: [
      { label: "Онлайн-покупки", rate: 0.03 },
      { label: "Кафе и рестораны", rate: 0.03 },
      { label: "Путешествия", rate: 0.05 },
      { label: "Остальные покупки", rate: 0.01 },
    ],
    sourceUrl: "https://bankffin.kz/ru/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: NOTE,
  },
  {
    id: "jusan-cashback",
    bankId: "jusan",
    name: "Jusan Кэшбэк",
    kind: "cashback",
    cardProduct: "Jusan Card",
    baseRate: 0.01,
    rotates: true,
    redemption: "cash",
    categories: [
      { label: "Супермаркеты", rate: 0.05 },
      { label: "АЗС", rate: 0.04 },
      { label: "Аптеки", rate: 0.03 },
      { label: "Остальные покупки", rate: 0.01 },
    ],
    sourceUrl: "https://jusan.kz/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: ROTATING_NOTE,
  },
  {
    id: "forte-bonus",
    bankId: "forte",
    name: "ForteBonus",
    kind: "bonus",
    cardProduct: "ForteCard",
    baseRate: 0.01,
    rotates: false,
    redemption: "partner-only",
    categories: [
      { label: "Покупки у партнёров", rate: 0.1, conditions: "только в сети партнёров" },
      { label: "Супермаркеты", rate: 0.03 },
      { label: "Остальные покупки", rate: 0.01 },
    ],
    sourceUrl: "https://forte.kz/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: NOTE,
  },
  {
    id: "bcc-cashback",
    bankId: "bcc",
    name: "BCC Кэшбэк",
    kind: "cashback",
    cardProduct: "#ЯКарта",
    baseRate: 0.01,
    rotates: true,
    redemption: "cash",
    categories: [
      { label: "Супермаркеты", rate: 0.04 },
      { label: "Кафе и рестораны", rate: 0.04 },
      { label: "Транспорт и такси", rate: 0.03 },
      { label: "Остальные покупки", rate: 0.01 },
    ],
    sourceUrl: "https://www.bcc.kz/cards/",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: ROTATING_NOTE,
  },
  {
    id: "eurasian-cashback",
    bankId: "eurasian",
    name: "Евразийский Кэшбэк",
    kind: "cashback",
    cardProduct: "Eurasian Card",
    baseRate: 0.005,
    rotates: false,
    redemption: "cash",
    categories: [
      { label: "АЗС", rate: 0.05 },
      { label: "Супермаркеты", rate: 0.02 },
      { label: "Остальные покупки", rate: 0.005 },
    ],
    sourceUrl: "https://eubank.kz/cards/",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: NOTE,
  },
  {
    id: "homecredit-cashback",
    bankId: "homecredit",
    name: "Home Credit Кэшбэк",
    kind: "cashback",
    cardProduct: "Home Card",
    baseRate: 0.01,
    rotates: true,
    redemption: "cash",
    categories: [
      { label: "Супермаркеты", rate: 0.05 },
      { label: "Аптеки", rate: 0.05 },
      { label: "Остальные покупки", rate: 0.01 },
    ],
    sourceUrl: "https://home.kz/cards",
    verifiedAt: ENTERED,
    confidence: "unverified",
    note: ROTATING_NOTE,
  },
];

/** Все категории, встречающиеся в программах — для подбора карты. */
export function allCashbackCategories(): string[] {
  const set = new Set<string>();
  for (const program of CASHBACK_PROGRAMS) {
    for (const category of program.categories) set.add(category.label);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ru"));
}

export interface CardMatch {
  readonly program: CashbackProgram;
  readonly rate: number;
  readonly category: string;
  readonly conditions?: string;
  readonly capMinor?: number;
}

/**
 * Подбор карты под категорию трат.
 * Если у программы нет точного совпадения, берём базовую ставку — иначе карта
 * с высоким базовым процентом несправедливо выпадала бы из сравнения.
 */
export function bestCardsFor(category: string): CardMatch[] {
  const matches: CardMatch[] = [];

  for (const program of CASHBACK_PROGRAMS) {
    const exact = program.categories.find((c) => c.label === category);
    if (exact) {
      matches.push({
        program,
        rate: exact.rate,
        category: exact.label,
        conditions: exact.conditions,
        capMinor: exact.capMinor,
      });
    } else if (program.baseRate !== undefined) {
      matches.push({
        program,
        rate: program.baseRate,
        category: "базовая ставка",
      });
    }
  }

  return matches.sort((a, b) => b.rate - a.rate);
}

import { describe, expect, it } from "vitest";
import { diffDays, endOfMonth, firstDayOf, isCivilDate, isYearMonth } from "@/domain/time";
import { todayCivil } from "@/lib/today";
import { BANKS, bankById } from "./banks";
import { DEPOSIT_PRODUCTS, RATE_RECORDS, currentRate } from "./deposits";
import {
  MCC_CODES,
  SPEND_GROUP_LABELS,
  SPEND_GROUP_ORDER,
  isCashbackEligible,
  mccByCode,
  mccInGroup,
  searchMcc,
} from "./mcc";
import { MERCHANTS, merchantById, suggestMerchant } from "./merchants";
import { CARDS_DISCLAIMER, CARD_PRODUCTS, cardById } from "./cards";
import { ALL_OFFERS, LATEST_PERIOD, offerById, offersForPeriod } from "./offers";

describe("банки", () => {
  it("идентификаторы уникальны", () => {
    const ids = BANKS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("у каждого банка есть корректная дата и адрес сайта", () => {
    for (const bank of BANKS) {
      expect(isCivilDate(bank.verifiedAt), bank.id).toBe(true);
      expect(bank.siteUrl.startsWith("https://"), bank.id).toBe(true);
    }
  });
});

describe("депозитные продукты", () => {
  it("идентификаторы уникальны", () => {
    const ids = DEPOSIT_PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("каждый продукт ссылается на существующий банк", () => {
    for (const product of DEPOSIT_PRODUCTS) {
      expect(bankById(product.bankId), product.id).toBeDefined();
    }
  });

  it("срок и минимальная сумма положительны", () => {
    for (const product of DEPOSIT_PRODUCTS) {
      expect(product.termMonths, product.id).toBeGreaterThan(0);
      if (product.minAmountMinor !== undefined) {
        expect(product.minAmountMinor, product.id).toBeGreaterThan(0);
        expect(Number.isInteger(product.minAmountMinor), product.id).toBe(true);
      }
    }
  });

  it("отсечка пополнений не превышает срок вклада", () => {
    for (const product of DEPOSIT_PRODUCTS) {
      if (product.topUpCutoffMonths !== undefined) {
        expect(product.topUpCutoffMonths, product.id).toBeLessThanOrEqual(product.termMonths);
      }
    }
  });

  it("у каждого продукта есть действующая ставка", () => {
    for (const product of DEPOSIT_PRODUCTS) {
      expect(currentRate(product.id), product.id).toBeDefined();
    }
  });
});

describe("ставки", () => {
  it("каждая ставка ссылается на существующий продукт", () => {
    const ids = new Set(DEPOSIT_PRODUCTS.map((p) => p.id));
    for (const rate of RATE_RECORDS) {
      expect(ids.has(rate.productId), rate.id).toBe(true);
    }
  });

  it("значения лежат в разумных пределах", () => {
    for (const rate of RATE_RECORDS) {
      expect(rate.nominalAnnualRate, rate.id).toBeGreaterThan(0);
      expect(rate.nominalAnnualRate, rate.id).toBeLessThan(1);
    }
  });

  it("у каждой ставки есть дата и ссылка на источник", () => {
    for (const rate of RATE_RECORDS) {
      expect(isCivilDate(rate.verifiedAt), rate.id).toBe(true);
      expect(rate.sourceUrl.startsWith("https://"), rate.id).toBe(true);
    }
  });

  /**
   * Ключевая проверка честности каталога: ни одна ставка не выдаётся
   * за подтверждённую, пока её действительно не сверили с банком.
   */
  it("непроверенные ставки объясняют, что именно требует сверки", () => {
    for (const rate of RATE_RECORDS) {
      if (rate.confidence === "unverified") {
        expect(rate.note, rate.id).toBeTruthy();
      }
      if (rate.confidence === "verified") {
        // В стартовом наборе подтверждённых ставок быть не должно —
        // ни одна из них не сверялась с сайтом банка.
        throw new Error(`Ставка ${rate.id} помечена как проверенная без реальной сверки`);
      }
    }
  });
});

/* ══ MCC и подбор кэшбэка ═══════════════════════════════════════════ */

describe("справочник MCC", () => {
  it("коды уникальны и состоят ровно из четырёх цифр", () => {
    const codes = MCC_CODES.map((m) => m.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const m of MCC_CODES) {
      expect(/^\d{4}$/.test(m.code), m.code).toBe(true);
    }
  });

  /** Ведущий ноль значим: 0742 — ветклиники, а не 742. */
  it("код с ведущим нулём не теряет его", () => {
    expect(mccByCode("0742")?.name).toContain("Ветеринар");
  });

  it("у каждого кода есть существующая группа", () => {
    for (const m of MCC_CODES) {
      expect(SPEND_GROUP_LABELS[m.groupId], m.code).toBeDefined();
    }
  });

  it("в каждой группе есть хотя бы один код", () => {
    for (const groupId of SPEND_GROUP_ORDER) {
      expect(mccInGroup(groupId).length, groupId).toBeGreaterThan(0);
    }
  });

  it("порядок групп перечисляет каждую группу ровно один раз", () => {
    const labelled = Object.keys(SPEND_GROUP_LABELS).sort();
    expect([...SPEND_GROUP_ORDER].sort()).toEqual(labelled);
  });

  it("снятие наличных и переводы помечены как не дающие кэшбэка", () => {
    for (const code of ["6011", "6012", "4829", "9311"]) {
      expect(isCashbackEligible(code), code).toBe(false);
    }
    // Страхование кэшбэк даёт — банки прямо объявляют ОГПО и КАСКО.
    expect(isCashbackEligible("6300")).toBe(true);
  });

  it("поиск находит и по номеру, и по названию", () => {
    expect(searchMcc("5411").map((m) => m.code)).toContain("5411");
    expect(searchMcc("аптек").map((m) => m.code)).toContain("5912");
  });
});

describe("мерчанты", () => {
  it("идентификаторы уникальны", () => {
    const ids = MERCHANTS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("каждый мерчант ссылается на существующий код MCC", () => {
    for (const m of MERCHANTS) {
      expect(mccByCode(m.mcc), `${m.id} → ${m.mcc}`).toBeDefined();
    }
  });

  /**
   * Одно написание у двух мерчантов сделало бы результат подбора зависящим
   * от порядка в массиве — то есть невоспроизводимым.
   */
  it("написания не пересекаются между мерчантами", () => {
    const seen = new Map<string, string>();
    for (const m of MERCHANTS) {
      for (const alias of [m.name, ...(m.aliases ?? [])]) {
        const key = alias.toLowerCase();
        const owner = seen.get(key);
        expect(owner, `«${alias}» уже занято мерчантом ${owner}`).toBeUndefined();
        seen.set(key, m.id);
      }
    }
  });

  it("узнаёт мерчанта в названии платежа", () => {
    expect(suggestMerchant("Netflix")?.id).toBe("netflix");
    expect(suggestMerchant("Оплата Small на Абая")?.id).toBe("small");
    expect(suggestMerchant("подписка Яндекс Плюс")?.id).toBe("yandex-plus");
  });

  /** Сравнение по целым словам: иначе «ivi» нашлось бы внутри «Privilege». */
  it("не срабатывает на части слова", () => {
    expect(suggestMerchant("Privilege клуб")).toBeUndefined();
    expect(suggestMerchant("Smallville")).toBeUndefined();
  });

  it("из двух совпадений выбирает более длинное", () => {
    expect(suggestMerchant("Яндекс Плюс")?.id).toBe("yandex-plus");
  });
});

describe("карты", () => {
  it("идентификаторы уникальны, эмитенты существуют", () => {
    const ids = CARD_PRODUCTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const card of CARD_PRODUCTS) {
      expect(bankById(card.bankId), card.id).toBeDefined();
    }
  });

  it("базовая ставка лежит в разумных пределах", () => {
    for (const card of CARD_PRODUCTS) {
      if (card.baseRate !== undefined) {
        expect(card.baseRate, card.id).toBeGreaterThan(0);
        expect(card.baseRate, card.id).toBeLessThanOrEqual(1);
      }
    }
  });

  /** Ни одна карта не сверялась с банком — подтверждённых тут быть не должно. */
  it("ни одна карта не выдаётся за проверенную", () => {
    for (const card of CARD_PRODUCTS) {
      expect(card.confidence, card.id).not.toBe("verified");
    }
  });

  /** Оговорка общая, поэтому она обязана существовать и быть непустой. */
  it("у каталога есть общая оговорка о непроверенных условиях", () => {
    expect(CARDS_DISCLAIMER.length).toBeGreaterThan(0);
  });

  it("карточные заметки не повторяют общую оговорку", () => {
    for (const card of CARD_PRODUCTS) {
      expect(card.note ?? "", card.id).not.toContain("не сверены с банк");
    }
  });
});

describe("предложения по кэшбэку", () => {
  it("идентификаторы уникальны", () => {
    const ids = ALL_OFFERS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("каждое предложение ссылается на существующую карту", () => {
    for (const offer of ALL_OFFERS) {
      expect(cardById(offer.cardId), offer.id).toBeDefined();
    }
  });

  it("все цели существуют в справочниках", () => {
    for (const offer of ALL_OFFERS) {
      if (offer.target.kind === "mcc") {
        expect(offer.target.codes.length, offer.id).toBeGreaterThan(0);
        for (const code of offer.target.codes) {
          expect(mccByCode(code), `${offer.id} → ${code}`).toBeDefined();
        }
      } else {
        expect(offer.target.merchantIds.length, offer.id).toBeGreaterThan(0);
        for (const id of offer.target.merchantIds) {
          expect(merchantById(id), `${offer.id} → ${id}`).toBeDefined();
        }
      }
    }
  });

  /**
   * Обещать возврат за снятие наличных нельзя ни при каких условиях —
   * даже если такая строка попадётся в подборке.
   */
  it("ни одно предложение не целится в операцию без кэшбэка", () => {
    for (const offer of ALL_OFFERS) {
      if (offer.target.kind !== "mcc") continue;
      for (const code of offer.target.codes) {
        expect(isCashbackEligible(code), `${offer.id} → ${code}`).toBe(true);
      }
    }
  });

  it("ставки лежат в пределах от нуля до единицы", () => {
    for (const offer of ALL_OFFERS) {
      expect(offer.rate, offer.id).toBeGreaterThan(0);
      expect(offer.rate, offer.id).toBeLessThanOrEqual(1);
    }
  });

  it("период записан как YYYY-MM", () => {
    for (const offer of ALL_OFFERS) {
      expect(isYearMonth(offer.period), offer.id).toBe(true);
    }
  });

  /**
   * Месячные подборки расходятся репостами без канонической ссылки, поэтому
   * подтверждённых предложений тут быть не может — но издатель и дата
   * обязаны стоять всегда.
   */
  it("ни одно предложение не выдаётся за проверенное, источник указан", () => {
    for (const offer of ALL_OFFERS) {
      expect(offer.confidence, offer.id).not.toBe("verified");
      expect(offer.source.title, offer.id).toBeTruthy();
      expect(offer.source.publisher, offer.id).toBeTruthy();
      expect(isCivilDate(offer.source.retrievedAt), offer.id).toBe(true);
    }
  });

  it("незакрытые списки категорий объясняют свою неполноту", () => {
    const partial = ALL_OFFERS.filter((o) => o.label.includes(","));
    expect(partial.length).toBeGreaterThan(0);
    for (const offer of ALL_OFFERS) {
      if (offer.note?.includes("и т.д.")) {
        expect(offer.target.kind, offer.id).toBe("mcc");
      }
    }
  });

  it("одна категория с разными ставками по праву — разные записи", () => {
    const optics = offersForPeriod("2026-08").filter((o) => o.label === "Оптика");
    expect(optics.length).toBe(2);
    expect(new Set(optics.map((o) => o.eligibility))).toEqual(new Set(["salary", "all"]));
  });

  it("«до X %» отмечено как потолок, а точная ставка — нет", () => {
    expect(offerById("2026-08-freedom-arbuz")?.rateIsCeiling).toBe(true);
    expect(offerById("2026-08-forte-market")?.rateIsCeiling).toBe(false);
  });

  it("подборка августа покрывает все банки из публикации", () => {
    const banks = new Set(
      offersForPeriod("2026-08").map((o) => cardById(o.cardId)?.bankId),
    );
    for (const id of ["halyk", "forte", "bcc", "bereke", "freedom", "homecredit",
      "nurbank", "alatau", "eurasian", "activ"]) {
      expect(banks.has(id), id).toBe(true);
    }
  });

  /**
   * Данные вносятся руками, поэтому устаревание должно ломать сборку — но
   * не первого числа каждого месяца. 45 дней после конца последнего внесённого
   * периода: достаточно, чтобы успеть внести новый, и мало, чтобы устаревание
   * осталось незамеченным.
   */
  it("подборка категорий не устарела", () => {
    expect(LATEST_PERIOD).toBeDefined();
    const lastDay = endOfMonth(firstDayOf(LATEST_PERIOD!));
    const stale = diffDays(lastDay, todayCivil());
    expect(stale, `последний внесённый период — ${LATEST_PERIOD}`).toBeLessThan(45);
  });
});

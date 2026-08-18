import { describe, expect, it } from "vitest";
import { isCivilDate } from "@/domain/time";
import { BANKS, bankById } from "./banks";
import { DEPOSIT_PRODUCTS, RATE_RECORDS, currentRate } from "./deposits";
import { CASHBACK_PROGRAMS, allCashbackCategories, bestCardsFor } from "./cashback";

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

describe("кэшбэк", () => {
  it("идентификаторы уникальны и банки существуют", () => {
    const ids = CASHBACK_PROGRAMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const program of CASHBACK_PROGRAMS) {
      expect(bankById(program.bankId), program.id).toBeDefined();
    }
  });

  it("ставки лежат в пределах от нуля до единицы", () => {
    for (const program of CASHBACK_PROGRAMS) {
      for (const category of program.categories) {
        expect(category.rate, `${program.id}/${category.label}`).toBeGreaterThan(0);
        expect(category.rate, `${program.id}/${category.label}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("подбор карты сортирует по убыванию ставки", () => {
    const matches = bestCardsFor("Супермаркеты");
    expect(matches.length).toBeGreaterThan(0);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].rate).toBeGreaterThanOrEqual(matches[i].rate);
    }
  });

  it("программа без нужной категории попадает в подбор по базовой ставке", () => {
    const matches = bestCardsFor("Супермаркеты");
    // Ни одна программа с базовой ставкой не должна выпасть из сравнения.
    const withBase = CASHBACK_PROGRAMS.filter((p) => p.baseRate !== undefined).length;
    expect(matches.length).toBeGreaterThanOrEqual(withBase);
  });

  it("список категорий не пуст и без дубликатов", () => {
    const categories = allCashbackCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(new Set(categories).size).toBe(categories.length);
  });
});

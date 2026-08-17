import { describe, expect, it } from "vitest";
import { allocate, assertMinor, fromMajor, mulRate, roundWith, sum, toMajor } from "./index";

describe("минорные единицы", () => {
  it("побеждает плавающую точку: 0.1 + 0.2 === 0.3", () => {
    // Ради этого весь модуль и существует.
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(fromMajor(0.1) + fromMajor(0.2)).toBe(fromMajor(0.3));
  });

  it("конвертирует туда и обратно без потерь", () => {
    for (const major of [0, 1, 1234.56, 999_999.99, 0.01]) {
      expect(toMajor(fromMajor(major))).toBeCloseTo(major, 10);
    }
  });
});

describe("округление", () => {
  it("halfUp и halfEven расходятся ровно на границе .5", () => {
    expect(roundWith(2.5, "halfUp")).toBe(3);
    expect(roundWith(2.5, "halfEven")).toBe(2);
    expect(roundWith(3.5, "halfUp")).toBe(4);
    expect(roundWith(3.5, "halfEven")).toBe(4);
  });

  it("down и up отсекают в нужную сторону", () => {
    expect(roundWith(2.9, "down")).toBe(2);
    expect(roundWith(2.1, "up")).toBe(3);
    expect(roundWith(-2.9, "down")).toBe(-2);
    expect(roundWith(-2.1, "up")).toBe(-3);
  });

  it("halfUp симметричен для отрицательных значений", () => {
    // Нативный Math.round(-0.5) даёт -0, а не -1 — здесь поведение симметричное.
    expect(roundWith(-2.5, "halfUp")).toBe(-3);
    expect(roundWith(2.5, "halfUp")).toBe(3);
  });
});

describe("mulRate", () => {
  it("считает вознаграждение за период", () => {
    // 1 000 000 ₸ = 100 000 000 тиын; 16,5 % годовых за год
    expect(mulRate(100_000_000, 0.165, "halfUp")).toBe(16_500_000);
  });

  it("округление до целого тенге даёт кратный 100 результат", () => {
    const result = mulRate(100_000_000, 0.16543, "halfUp", "major");
    expect(result % 100).toBe(0);
  });
});

describe("allocate", () => {
  it("не теряет и не создаёт ни одного тиына", () => {
    const parts = allocate(10_001, [1, 1, 1]);
    expect(sum(parts)).toBe(10_001);
    expect(parts).toHaveLength(3);
  });

  it("раздаёт остаток частям с наибольшей отброшенной дробью", () => {
    const parts = allocate(100, [1, 1, 1]);
    expect(sum(parts)).toBe(100);
    expect(parts.filter((p) => p === 34)).toHaveLength(1);
    expect(parts.filter((p) => p === 33)).toHaveLength(2);
  });

  it("выдерживает произвольные веса", () => {
    const parts = allocate(1_000_000, [3, 5, 7, 11]);
    expect(sum(parts)).toBe(1_000_000);
  });

  it("нулевые веса дают нули, а не деление на ноль", () => {
    expect(allocate(500, [0, 0])).toEqual([0, 0]);
  });
});

describe("assertMinor", () => {
  it("ловит дробные суммы", () => {
    expect(() => assertMinor(10.5, "остаток")).toThrow(/целое число минорных единиц/);
    expect(() => assertMinor(10, "остаток")).not.toThrow();
  });
});

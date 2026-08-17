import { describe, expect, it } from "vitest";
import {
  type DatedSeries,
  buildAssumptions,
  isMissing,
  resolve,
  resolveOr,
  worstOf,
} from "./index";

const SERIES: DatedSeries<number> = {
  key: "test",
  label: "Тестовая величина",
  unit: "KZT",
  entries: [
    { value: 100, effectiveFrom: "2025-01-01", effectiveTo: "2026-01-01", confidence: "likely" },
    { value: 200, effectiveFrom: "2026-01-01", confidence: "verified" },
  ],
};

describe("resolve", () => {
  it("effectiveFrom включительно, effectiveTo исключительно", () => {
    const before = resolve(SERIES, "2025-12-31");
    const on = resolve(SERIES, "2026-01-01");

    expect(isMissing(before)).toBe(false);
    expect(isMissing(on)).toBe(false);
    if (isMissing(before) || isMissing(on)) return;

    expect(before.value).toBe(100);
    expect(on.value).toBe(200);
  });

  it("значение меняется ровно на границе года", () => {
    const dec = resolve(SERIES, "2025-12-31");
    const jan = resolve(SERIES, "2026-01-01");
    if (isMissing(dec) || isMissing(jan)) throw new Error("ожидались значения");
    expect(dec.value).not.toBe(jan.value);
  });

  it("дата раньше первой записи даёт MissingConstant, а не ноль и не исключение", () => {
    const result = resolve(SERIES, "2020-06-01");
    expect(isMissing(result)).toBe(true);
  });

  it("возвращает достоверность вместе со значением", () => {
    const result = resolve(SERIES, "2026-06-01");
    if (isMissing(result)) throw new Error("ожидалось значение");
    expect(result.confidence).toBe("verified");
  });
});

describe("resolveOr", () => {
  it("запасное значение всегда получает статус placeholder", () => {
    const result = resolveOr(SERIES, "2020-01-01", 42);
    expect(result.value).toBe(42);
    expect(result.confidence).toBe("placeholder");
  });

  it("при наличии записи запасное значение не используется", () => {
    const result = resolveOr(SERIES, "2026-06-01", 42);
    expect(result.value).toBe(200);
    expect(result.confidence).toBe("verified");
  });
});

describe("worstOf", () => {
  it("выбирает наименее достоверный статус", () => {
    expect(worstOf({ confidence: "verified" }, { confidence: "likely" })).toBe("likely");
    expect(worstOf({ confidence: "verified" }, { confidence: "unverified" })).toBe("unverified");
    expect(worstOf({ confidence: "unverified" }, { confidence: "placeholder" })).toBe("placeholder");
  });

  it("пустой набор считается проверенным", () => {
    expect(worstOf()).toBe("verified");
  });
});

describe("buildAssumptions", () => {
  it("одна непроверенная константа делает недостоверным весь расчёт", () => {
    const good = resolve(SERIES, "2026-06-01");
    const meh = resolve(SERIES, "2025-06-01");
    if (isMissing(good) || isMissing(meh)) throw new Error("ожидались значения");

    const assumptions = buildAssumptions([good, meh]);
    expect(assumptions.worstConfidence).toBe("likely");
    expect(assumptions.constants).toHaveLength(2);
  });

  it("непроверенный метод расчёта тоже понижает статус результата", () => {
    const good = resolve(SERIES, "2026-06-01");
    if (isMissing(good)) throw new Error("ожидалось значение");

    const assumptions = buildAssumptions([good], [
      { id: "m1", label: "Метод", description: "", confidence: "unverified" },
    ]);
    expect(assumptions.worstConfidence).toBe("unverified");
  });

  it("отсутствующая константа попадает в missing и роняет статус до placeholder", () => {
    const gone = resolve(SERIES, "2020-01-01");
    const assumptions = buildAssumptions([gone]);
    expect(assumptions.missing).toHaveLength(1);
    expect(assumptions.worstConfidence).toBe("placeholder");
  });
});

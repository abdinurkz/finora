import { describe, expect, it } from "vitest";
import { compare, isCivilDate } from "@/domain/time";
import { isMissing, resolve } from "@/domain/registry";
import { todayCivil } from "@/lib/today";
import { ALL_SERIES, MRP, MZP, OPVR_RATE, getConstantSet, kdifLimitFor } from "./index";

const TODAY = todayCivil();

describe("целостность реестра", () => {
  it.each(ALL_SERIES.map((s) => [s.key, s] as const))(
    "«%s»: записи корректны и не пересекаются",
    (_key, series) => {
      expect(series.entries.length).toBeGreaterThan(0);

      for (const entry of series.entries) {
        expect(isCivilDate(entry.effectiveFrom)).toBe(true);
        if (entry.effectiveTo !== undefined) {
          expect(isCivilDate(entry.effectiveTo)).toBe(true);
          expect(compare(entry.effectiveFrom, entry.effectiveTo)).toBeLessThan(0);
        }
      }

      // Никакие два периода не должны перекрываться: иначе resolve вернёт
      // одно из двух значений «как повезёт».
      const sorted = [...series.entries].sort((a, b) => compare(a.effectiveFrom, b.effectiveFrom));
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (prev.effectiveTo !== undefined) {
          expect(compare(prev.effectiveTo, curr.effectiveFrom)).toBeLessThanOrEqual(0);
        } else {
          // Бессрочная запись допустима только как последняя.
          expect(i).toBe(sorted.length - 1);
        }
      }
    },
  );

  it.each(ALL_SERIES.map((s) => [s.key, s] as const))(
    "«%s»: статус verified подтверждён ссылкой на источник",
    (_key, series) => {
      for (const entry of series.entries) {
        if (entry.confidence === "verified") {
          expect(entry.source, `${series.key} @ ${entry.effectiveFrom}`).toBeDefined();
          expect(entry.source?.title.length ?? 0).toBeGreaterThan(0);
          expect(entry.source?.publisher.length ?? 0).toBeGreaterThan(0);
          expect(isCivilDate(entry.source?.retrievedAt ?? "")).toBe(true);
        }
      }
    },
  );

  it.each(ALL_SERIES.map((s) => [s.key, s] as const))(
    "«%s»: непроверенные значения объясняют, что именно требует сверки",
    (_key, series) => {
      for (const entry of series.entries) {
        if (entry.confidence === "unverified") {
          expect(entry.note, `${series.key} @ ${entry.effectiveFrom}`).toBeTruthy();
        }
      }
    },
  );
});

describe("актуальность реестра", () => {
  /**
   * Этот тест — не проверка кода, а сигнализация.
   * Он начнёт падать, как только реестр перестанет покрывать сегодняшний день:
   * например, в январе, когда утвердят новые МРП и МЗП, а сюда их ещё не внесли.
   * Падение здесь означает «пора обновить данные», а не «сломался расчёт».
   */
  it.each(ALL_SERIES.map((s) => [s.key, s] as const))(
    "«%s»: есть действующее значение на сегодня",
    (_key, series) => {
      const result = resolve(series, TODAY);
      expect(
        isMissing(result),
        `Для «${series.label}» нет записи на ${TODAY}. Обновите src/data/constants.`,
      ).toBe(false);
    },
  );
});

describe("значения на 2026 год", () => {
  it("МРП с 1 января 2026 — 4 325 ₸", () => {
    const r = resolve(MRP, "2026-01-01");
    if (isMissing(r)) throw new Error("МРП не найден");
    expect(r.value).toBe(432_500);
    expect(r.confidence).toBe("verified");
  });

  it("МЗП с 1 января 2026 — 85 000 ₸", () => {
    const r = resolve(MZP, "2026-01-01");
    if (isMissing(r)) throw new Error("МЗП не найден");
    expect(r.value).toBe(8_500_000);
  });

  it("ставка ОПВР растёт по графику 1,5 → 5 %", () => {
    const at = (d: string) => {
      const r = resolve(OPVR_RATE, d);
      if (isMissing(r)) throw new Error(`ОПВР не найден на ${d}`);
      return r.value;
    };
    expect(at("2024-06-01")).toBeCloseTo(0.015, 10);
    expect(at("2025-06-01")).toBeCloseTo(0.025, 10);
    expect(at("2026-06-01")).toBeCloseTo(0.035, 10);
    expect(at("2027-06-01")).toBeCloseTo(0.045, 10);
    expect(at("2029-06-01")).toBeCloseTo(0.05, 10);
  });
});

describe("гарантия КФГД", () => {
  it("различается по виду вклада и валюте — единой цифры нет", () => {
    const set = getConstantSet("2026-06-01");
    const limits = set.kdifLimits.value;

    expect(kdifLimitFor(limits, "savings", "KZT")).toBe(2_000_000_000); // 20 млн ₸
    expect(kdifLimitFor(limits, "term", "KZT")).toBe(1_000_000_000); // 10 млн ₸
    expect(kdifLimitFor(limits, "demand", "KZT")).toBe(1_000_000_000);
    expect(kdifLimitFor(limits, "term", "USD")).toBe(500_000_000); // 5 млн ₸
  });

  it("для неизвестного сочетания берётся запасной лимит", () => {
    const set = getConstantSet("2026-06-01");
    expect(kdifLimitFor(set.kdifLimits.value, "term", "RUB")).toBe(500_000_000);
  });
});

describe("getConstantSet", () => {
  it("собирает набор и считает худшую достоверность", () => {
    const set = getConstantSet("2026-06-01");
    expect(set.asOf).toBe("2026-06-01");
    expect(set.mrp.value).toBe(432_500);
    // В наборе есть непроверенные величины (госпремия, пенсионный возраст женщин),
    // поэтому весь набор не может считаться полностью проверенным.
    expect(set.worstConfidence).toBe("unverified");
  });

  it("на дате вне реестра подставляет запасные значения со статусом placeholder", () => {
    const set = getConstantSet("1990-01-01");
    expect(set.placeholders.length).toBeGreaterThan(0);
    expect(set.worstConfidence).toBe("placeholder");
  });
});

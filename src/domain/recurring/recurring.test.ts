import { describe, expect, it } from "vitest";
import { addMonthsClamped } from "@/domain/time";
import {
  type RecurrenceRule,
  daysUntilNext,
  describeRecurrence,
  monthlyEquivalentMinor,
  nextOccurrence,
  nthOccurrence,
  occurrenceCountInYear,
  occurrencesBetween,
  occurrencesInMonth,
  previousOccurrence,
  yearlyEquivalentMinor,
} from "./index";

const monthly31: RecurrenceRule = {
  anchor: "2026-01-31",
  unit: "month",
  every: 1,
  onShortMonth: "lastDay",
};

describe("якорная генерация вхождений", () => {
  it("НЕ дрейфует: после февральского зажатия март снова 31-е", () => {
    // Это главный тест всего модуля.
    // Итеративный способ («прибавить месяц к предыдущему вхождению») залипает на 28-м:
    const iterative = addMonthsClamped(addMonthsClamped("2026-01-31", 1), 1);
    expect(iterative).toBe("2026-03-28");

    // Якорный способ возвращается к 31-му, потому что считает от исходной даты:
    expect(nthOccurrence(monthly31, 0)).toBe("2026-01-31");
    expect(nthOccurrence(monthly31, 1)).toBe("2026-02-28");
    expect(nthOccurrence(monthly31, 2)).toBe("2026-03-31");
    expect(nthOccurrence(monthly31, 3)).toBe("2026-04-30");
    expect(nthOccurrence(monthly31, 4)).toBe("2026-05-31");
  });

  it("в високосном году февральское вхождение приходится на 29-е", () => {
    const rule: RecurrenceRule = { ...monthly31, anchor: "2028-01-31" };
    expect(nthOccurrence(rule, 1)).toBe("2028-02-29");
    expect(nthOccurrence(rule, 2)).toBe("2028-03-31");
  });

  it("за год даёт 12 платежей, февраль зажат", () => {
    const dates = occurrencesBetween(monthly31, "2026-01-01", "2026-12-31");
    expect(dates).toHaveLength(12);
    expect(dates[1]).toBe("2026-02-28");
    expect(dates[11]).toBe("2026-12-31");
  });

  it("правило skip пропускает все месяцы короче 31 дня, а не только февраль", () => {
    const skipping: RecurrenceRule = { ...monthly31, onShortMonth: "skip" };
    const dates = occurrencesBetween(skipping, "2026-01-01", "2026-12-31");

    // Без 31-го числа остаются февраль, апрель, июнь, сентябрь и ноябрь —
    // платёж проходит только в семи длинных месяцах.
    expect(dates).toEqual([
      "2026-01-31",
      "2026-03-31",
      "2026-05-31",
      "2026-07-31",
      "2026-08-31",
      "2026-10-31",
      "2026-12-31",
    ]);
  });
});

describe("nextOccurrence", () => {
  it("уважает границу inclusive", () => {
    expect(nextOccurrence(monthly31, "2026-01-31", false)).toBe("2026-02-28");
    expect(nextOccurrence(monthly31, "2026-01-31", true)).toBe("2026-01-31");
  });

  it("работает, когда якорь далеко в прошлом", () => {
    const old: RecurrenceRule = { anchor: "2015-03-10", unit: "month", every: 1 };
    expect(nextOccurrence(old, "2026-08-17")).toBe("2026-09-10");
  });

  it("возвращает null после endsOn", () => {
    const ending: RecurrenceRule = { ...monthly31, endsOn: "2026-04-30" };
    expect(nextOccurrence(ending, "2026-05-01")).toBeNull();
  });

  it("уважает maxOccurrences", () => {
    const capped: RecurrenceRule = { ...monthly31, maxOccurrences: 3 };
    expect(occurrencesBetween(capped, "2026-01-01", "2026-12-31")).toHaveLength(3);
  });
});

describe("previousOccurrence", () => {
  it("находит предыдущий платёж", () => {
    expect(previousOccurrence(monthly31, "2026-03-15")).toBe("2026-02-28");
  });
});

describe("периодичности", () => {
  it("квартальная даёт 4 платежа в год", () => {
    const quarterly: RecurrenceRule = { anchor: "2026-01-15", unit: "month", every: 3 };
    expect(occurrenceCountInYear(quarterly, 2026)).toBe(4);
  });

  it("годовая даёт 1 платёж в год", () => {
    const yearly: RecurrenceRule = { anchor: "2026-03-01", unit: "year", every: 1 };
    expect(occurrenceCountInYear(yearly, 2026)).toBe(1);
    expect(nthOccurrence(yearly, 1)).toBe("2027-03-01");
  });

  it("недельная укладывается в месяц 4–5 раз", () => {
    const weekly: RecurrenceRule = { anchor: "2026-08-03", unit: "week", every: 1 };
    const inAugust = occurrencesInMonth(weekly, 2026, 8);
    expect(inAugust.length).toBeGreaterThanOrEqual(4);
    expect(inAugust.length).toBeLessThanOrEqual(5);
  });
});

describe("месячный эквивалент", () => {
  it("годовая подписка за 120 000 ₸ — это 10 000 ₸ в месяц", () => {
    const yearly: RecurrenceRule = { anchor: "2026-01-01", unit: "year", every: 1 };
    expect(monthlyEquivalentMinor(120_000_00, yearly)).toBe(10_000_00);
  });

  it("квартальная делится на три", () => {
    const quarterly: RecurrenceRule = { anchor: "2026-01-01", unit: "month", every: 3 };
    expect(monthlyEquivalentMinor(30_000_00, quarterly)).toBe(10_000_00);
  });

  it("ежемесячная остаётся собой", () => {
    expect(monthlyEquivalentMinor(5_990_00, monthly31)).toBe(5_990_00);
  });

  it("годовой эквивалент возвращает исходную сумму годовой подписки", () => {
    const yearly: RecurrenceRule = { anchor: "2026-01-01", unit: "year", every: 1 };
    expect(yearlyEquivalentMinor(120_000_00, yearly)).toBe(120_000_00);
  });
});

describe("вспомогательное", () => {
  it("считает дни до ближайшего платежа", () => {
    expect(daysUntilNext(monthly31, "2026-02-20")).toBe(8);
    expect(daysUntilNext(monthly31, "2026-02-28")).toBe(0);
  });

  it("описывает периодичность по-русски", () => {
    expect(describeRecurrence(monthly31)).toBe("ежемесячно");
    expect(describeRecurrence({ anchor: "2026-01-01", unit: "month", every: 3 })).toBe("раз в 3 месяца");
    expect(describeRecurrence({ anchor: "2026-01-01", unit: "month", every: 6 })).toBe("раз в 6 месяцев");
  });
});

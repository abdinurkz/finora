import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonthsClamped,
  ageOn,
  civil,
  daysInMonth,
  diffDays,
  diffMonths,
  endOfMonth,
  fromDayNumber,
  isCivilDate,
  isLeapYear,
  toDayNumber,
  yearFraction,
} from "./index";

describe("CivilDate", () => {
  it("валидирует формат и реальность даты", () => {
    expect(isCivilDate("2026-08-17")).toBe(true);
    expect(isCivilDate("2026-02-29")).toBe(false); // 2026 не високосный
    expect(isCivilDate("2028-02-29")).toBe(true);
    expect(isCivilDate("2026-13-01")).toBe(false);
    expect(isCivilDate("17.08.2026")).toBe(false);
  });

  it("не сдвигает дату на сутки при обходе через номер дня", () => {
    // Ровно та ловушка, ради которой Date не выпускается из модуля:
    // new Date(2026, 0, 31).toISOString() в UTC+5 даёт 2026-01-30.
    for (const d of ["2026-01-01", "2026-01-31", "2026-12-31", "2028-02-29"]) {
      expect(fromDayNumber(toDayNumber(d))).toBe(d);
    }
  });
});

describe("високосные годы", () => {
  it("применяет правило 100/400", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });

  it("февраль меняет длину", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
  });
});

describe("addMonthsClamped", () => {
  it("зажимает 31 января до конца февраля", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("НЕ перескакивает через февраль, как это делает нативный setUTCMonth", () => {
    // Нативная арифметика для 31 января + 1 месяц выдаёт 3 марта.
    const native = new Date(Date.UTC(2026, 0, 31));
    native.setUTCMonth(native.getUTCMonth() + 1);
    expect(native.toISOString().slice(0, 10)).toBe("2026-03-03");

    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("переходит через границу года в обе стороны", () => {
    expect(addMonthsClamped("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonthsClamped("2026-01-15", -1)).toBe("2025-12-15");
    expect(addMonthsClamped("2026-06-30", 18)).toBe("2027-12-30");
  });

  it("29 февраля високосного года зажимается в обычном", () => {
    expect(addMonthsClamped("2028-02-29", 12)).toBe("2029-02-28");
  });
});

describe("diffDays / diffMonths", () => {
  it("считает дни с учётом високосного февраля", () => {
    expect(diffDays("2026-01-01", "2027-01-01")).toBe(365);
    expect(diffDays("2028-01-01", "2029-01-01")).toBe(366);
  });

  it("считает только полные месяцы", () => {
    expect(diffMonths("2026-01-15", "2026-03-15")).toBe(2);
    expect(diffMonths("2026-01-15", "2026-03-14")).toBe(1);
    expect(diffMonths("2026-01-31", "2026-02-28")).toBe(0);
  });
});

describe("yearFraction", () => {
  it("ACT/365 на полном году даёт ровно 1", () => {
    expect(yearFraction("2026-01-01", "2027-01-01", "ACT/365")).toBeCloseTo(1, 10);
  });

  it("високосный год по ACT/365 даёт больше единицы, по ACT/ACT — ровно единицу", () => {
    expect(yearFraction("2028-01-01", "2029-01-01", "ACT/365")).toBeCloseTo(366 / 365, 10);
    expect(yearFraction("2028-01-01", "2029-01-01", "ACT/ACT")).toBeCloseTo(1, 10);
  });

  it("ACT/360 переоценивает год — это и есть смысл базы 360", () => {
    expect(yearFraction("2026-01-01", "2027-01-01", "ACT/360")).toBeCloseTo(365 / 360, 10);
  });

  it("30/360 сглаживает длину месяцев", () => {
    expect(yearFraction("2026-01-01", "2026-02-01", "30/360")).toBeCloseTo(1 / 12, 10);
    expect(yearFraction("2026-01-01", "2027-01-01", "30/360")).toBeCloseTo(1, 10);
  });

  it("ACT/ACT корректно режет период по границе годов", () => {
    // Полгода в 2026-м плюс полгода в 2027-м.
    const f = yearFraction("2026-07-01", "2027-07-01", "ACT/ACT");
    expect(f).toBeCloseTo(1, 10);
  });
});

describe("прочее", () => {
  it("endOfMonth учитывает високосность", () => {
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
  });

  it("addDays переходит через конец года", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("ageOn не засчитывает год до дня рождения", () => {
    expect(ageOn("1990-08-18", "2026-08-17")).toBe(35);
    expect(ageOn("1990-08-17", "2026-08-17")).toBe(36);
  });

  it("civil собирает дату с ведущими нулями", () => {
    expect(civil(2026, 1, 5)).toBe("2026-01-05");
  });
});

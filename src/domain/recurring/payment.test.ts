import { describe, expect, it } from "vitest";
import {
  type RecurringPayment,
  createPayment,
  isActive,
  monthlyTotalMinor,
  paymentsBetween,
  totalsByCategory,
  upcomingPayments,
  yearlyTotalMinor,
} from "./payment";

function sub(title: string, amountMinor: number, anchor: string, every = 1, unit: "month" | "year" = "month") {
  return createPayment("subscription", {
    title,
    amountMinor,
    recurrence: { anchor, unit, every, onShortMonth: "lastDay" },
  }) as RecurringPayment;
}

function expense(title: string, amountMinor: number, anchor: string) {
  return createPayment("fixedExpense", {
    title,
    amountMinor,
    recurrence: { anchor, unit: "month", every: 1, onShortMonth: "lastDay" },
  }) as RecurringPayment;
}

describe("месячные итоги", () => {
  it("складывают подписки и расходы в общий месячный эквивалент", () => {
    const payments = [
      sub("Netflix", 5_990_00, "2026-01-15"),
      sub("Годовая лицензия", 120_000_00, "2026-03-01", 1, "year"),
      expense("Аренда", 250_000_00, "2026-01-05"),
    ];

    // 5 990 + 10 000 (годовая / 12) + 250 000
    expect(monthlyTotalMinor(payments, "2026-08-17")).toBe(5_990_00 + 10_000_00 + 250_000_00);
  });

  it("годовой итог равен месячному, умноженному на двенадцать", () => {
    const payments = [sub("Netflix", 5_990_00, "2026-01-15")];
    expect(yearlyTotalMinor(payments, "2026-08-17")).toBe(5_990_00 * 12);
  });

  it("приостановленные платежи не попадают в итог", () => {
    const active = sub("Netflix", 5_990_00, "2026-01-15");
    const paused = { ...sub("Spotify", 2_990_00, "2026-01-20"), status: "paused" as const };
    expect(monthlyTotalMinor([active, paused], "2026-08-17")).toBe(5_990_00);
  });

  it("завершившиеся платежи не попадают в итог", () => {
    const ended = {
      ...sub("Курс", 10_000_00, "2026-01-10"),
      recurrence: { anchor: "2026-01-10", unit: "month" as const, every: 1, endsOn: "2026-06-10" },
    };
    expect(isActive(ended, "2026-08-17")).toBe(false);
    expect(monthlyTotalMinor([ended], "2026-08-17")).toBe(0);
  });

  it("другая валюта не смешивается с тенге", () => {
    const usd = { ...sub("Хостинг", 20_00, "2026-01-01"), currency: "USD" as const };
    const kzt = sub("Netflix", 5_990_00, "2026-01-15");
    expect(monthlyTotalMinor([usd, kzt], "2026-08-17", "KZT")).toBe(5_990_00);
    expect(monthlyTotalMinor([usd, kzt], "2026-08-17", "USD")).toBe(20_00);
  });
});

describe("ближайшие платежи", () => {
  it("отсортированы по дате и содержат число дней до списания", () => {
    const payments = [sub("Позже", 1000, "2026-01-25"), sub("Раньше", 1000, "2026-01-20")];
    const upcoming = upcomingPayments(payments, "2026-08-17", 30);

    expect(upcoming[0].payment.title).toBe("Раньше");
    expect(upcoming[0].date).toBe("2026-08-20");
    expect(upcoming[0].daysUntil).toBe(3);
    expect(upcoming[1].date).toBe("2026-08-25");
  });

  it("платёж сегодня попадает в список с нулём дней", () => {
    const payments = [sub("Сегодня", 1000, "2026-01-17")];
    const upcoming = upcomingPayments(payments, "2026-08-17", 30);
    expect(upcoming[0].daysUntil).toBe(0);
  });

  it("за пределами окна платежи не показываются", () => {
    const payments = [sub("Далеко", 1000, "2026-01-25")];
    expect(upcomingPayments(payments, "2026-08-01", 7)).toHaveLength(0);
  });

  it("день 31 в коротком месяце сдвигается на конец месяца", () => {
    const payments = [sub("Аренда", 250_000_00, "2026-01-31")];
    const upcoming = upcomingPayments(payments, "2026-02-01", 30);
    expect(upcoming[0].date).toBe("2026-02-28");
  });
});

describe("календарь платежей", () => {
  it("возвращает все списания периода, включая повторы", () => {
    const payments = [sub("Netflix", 5_990_00, "2026-01-15")];
    const dates = paymentsBetween(payments, "2026-01-01", "2026-03-31");
    expect(dates.map((d) => d.date)).toEqual(["2026-01-15", "2026-02-15", "2026-03-15"]);
  });

  it("после февральского зажатия день платежа возвращается к 31-му", () => {
    const payments = [sub("Аренда", 250_000_00, "2026-01-31")];
    const dates = paymentsBetween(payments, "2026-01-01", "2026-03-31");
    expect(dates.map((d) => d.date)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });
});

describe("разбивка по категориям", () => {
  it("группирует и сортирует по убыванию суммы", () => {
    const payments = [
      { ...sub("Netflix", 5_990_00, "2026-01-15"), categoryId: "Видео и музыка" },
      { ...sub("Spotify", 2_990_00, "2026-01-20"), categoryId: "Видео и музыка" },
      expense("Аренда", 250_000_00, "2026-01-05"),
    ];

    const totals = totalsByCategory(payments, "2026-08-17");
    expect(totals[0].monthlyMinor).toBe(250_000_00);
    expect(totals[1].category).toBe("Видео и музыка");
    expect(totals[1].monthlyMinor).toBe(8_980_00);
  });
});

describe("создание", () => {
  it("подписка и расход получают свой дискриминатор и обязательные поля", () => {
    const s = createPayment("subscription", {
      title: "Netflix",
      amountMinor: 5_990_00,
      recurrence: { anchor: "2026-01-15", unit: "month", every: 1 },
    });
    const e = createPayment("fixedExpense", {
      title: "Аренда",
      amountMinor: 250_000_00,
      recurrence: { anchor: "2026-01-05", unit: "month", every: 1 },
    });

    expect(s.kind).toBe("subscription");
    expect(e.kind).toBe("fixedExpense");
    if (e.kind === "fixedExpense") expect(e.expenseType).toBe("other");
    expect(s.id).not.toBe(e.id);
    expect(s.currency).toBe("KZT");
    expect(s.status).toBe("active");
  });
});

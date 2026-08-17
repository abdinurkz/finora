import { describe, expect, it } from "vitest";
import { getConstantSet } from "@/data/constants";
import { type OtbasyScenario, computeOp, projectOtbasy } from "./index";

const CONSTANTS = getConstantSet("2026-06-01");

function scenario(overrides: Partial<OtbasyScenario> = {}): OtbasyScenario {
  return {
    asOf: "2026-06-01",
    contractAmountMinor: 2_000_000_000, // 20 000 000 ₸
    initialDepositMinor: 1_000_000_000, // 10 000 000 ₸ — половина по программе 50/50
    monthlyContributionMinor: 0,
    depositRate: 0.02,
    months: 12,
    statePremiumEnabled: false,
    ...overrides,
  };
}

describe("формула ОП", () => {
  it("воспроизводит опубликованный банком пример: НВ 100 тыс ₸ при ДС 20 млн ₸ даёт ОП 5", () => {
    // Это эталон из материалов Отбасы банка.
    expect(computeOp(10_000_000, 2_000_000_000)).toBeCloseTo(5, 10);
  });

  it("ОП линеен по вознаграждению", () => {
    expect(computeOp(20_000_000, 2_000_000_000)).toBeCloseTo(10, 10);
    expect(computeOp(32_000_000, 2_000_000_000)).toBeCloseTo(16, 10);
  });

  it("дорогая квартира при том же вознаграждении даёт меньший ОП", () => {
    expect(computeOp(10_000_000, 4_000_000_000)).toBeCloseTo(2.5, 10);
  });

  it("нулевая договорная сумма не приводит к делению на ноль", () => {
    expect(computeOp(10_000_000, 0)).toBe(0);
  });
});

describe("накопление по программе 50/50", () => {
  it("10 млн ₸ под 2 % выводят на ОП 5 к шестому месяцу", () => {
    // Ежемесячное вознаграждение ≈ 16 667 ₸; за полгода набегает чуть больше 100 000 ₸.
    const r = projectOtbasy(scenario({ months: 12 }), CONSTANTS);
    expect(r.monthsToOp.intermediate).toBe(6);
  });

  it("на пятом месяце порог ОП 5 ещё не достигнут", () => {
    const r = projectOtbasy(scenario({ months: 5 }), CONSTANTS);
    expect(r.finalOp).toBeLessThan(5);
    expect(r.monthsToOp.intermediate).toBeNull();
  });

  it("накоплена ровно половина договорной суммы", () => {
    const r = projectOtbasy(scenario({ months: 1 }), CONSTANTS);
    expect(r.eligibility.halfAccumulated).toBe(true);
    expect(r.savingsShare).toBeGreaterThanOrEqual(0.5);
  });

  it("до ОП 16 при тех же условиях нужно значительно больше времени", () => {
    const r = projectOtbasy(scenario({ months: 240 }), CONSTANTS);
    expect(r.monthsToOp.housing).not.toBeNull();
    expect(r.monthsToOp.housing!).toBeGreaterThan(r.monthsToOp.intermediate!);
  });
});

describe("монотонность", () => {
  it("больше накоплений — выше ОП", () => {
    const small = projectOtbasy(scenario({ initialDepositMinor: 500_000_000 }), CONSTANTS);
    const large = projectOtbasy(scenario({ initialDepositMinor: 1_500_000_000 }), CONSTANTS);
    expect(large.finalOp).toBeGreaterThan(small.finalOp);
  });

  it("дольше копишь — выше ОП", () => {
    const short = projectOtbasy(scenario({ months: 6 }), CONSTANTS);
    const long = projectOtbasy(scenario({ months: 24 }), CONSTANTS);
    expect(long.finalOp).toBeGreaterThan(short.finalOp);
  });

  it("регулярные взносы ускоряют рост ОП", () => {
    const without = projectOtbasy(scenario({ months: 24 }), CONSTANTS);
    const with_ = projectOtbasy(
      scenario({ months: 24, monthlyContributionMinor: 10_000_000 }),
      CONSTANTS,
    );
    expect(with_.finalOp).toBeGreaterThan(without.finalOp);
  });

  it("ОП в расписании не убывает", () => {
    const r = projectOtbasy(scenario({ months: 36 }), CONSTANTS);
    for (let i = 1; i < r.schedule.length; i++) {
      expect(r.schedule[i].op).toBeGreaterThanOrEqual(r.schedule[i - 1].op);
    }
  });
});

describe("государственная премия", () => {
  it("не входит в начисленное вознаграждение, но увеличивает остаток", () => {
    const without = projectOtbasy(scenario({ months: 24 }), CONSTANTS);
    const with_ = projectOtbasy(scenario({ months: 24, statePremiumEnabled: true }), CONSTANTS);

    expect(with_.statePremiumTotalMinor).toBeGreaterThan(0);
    expect(with_.finalBalanceMinor).toBeGreaterThan(without.finalBalanceMinor);
    // Премия влияет на ОП только косвенно — через вознаграждение следующих месяцев.
    expect(with_.cumulativeInterestMinor).toBeGreaterThan(without.cumulativeInterestMinor);
  });

  it("ограничена годовым потолком в МРП", () => {
    const r = projectOtbasy(
      scenario({ months: 12, initialDepositMinor: 50_000_000_000, statePremiumEnabled: true }),
      CONSTANTS,
    );
    const cap = CONSTANTS.otbasyStatePremiumCapMrp.value * CONSTANTS.mrp.value;
    expect(r.statePremiumTotalMinor).toBeLessThanOrEqual(cap);
  });

  it("включение премии делает расчёт непроверенным", () => {
    const r = projectOtbasy(scenario({ statePremiumEnabled: true }), CONSTANTS);
    expect(r.assumptions.worstConfidence).toBe("unverified");
  });
});

describe("честность результата", () => {
  it("формула помечена как не сверенная с первоисточником напрямую", () => {
    const r = projectOtbasy(scenario(), CONSTANTS);
    expect(r.formula.confidence).not.toBe("verified");
  });

  it("результат раскрывает составляющие расчёта, а не только число", () => {
    const r = projectOtbasy(scenario(), CONSTANTS);
    expect(r.terms.length).toBeGreaterThanOrEqual(3);
    expect(r.terms.some((t) => t.label.includes("НВ"))).toBe(true);
    expect(r.terms.some((t) => t.label.includes("ДС"))).toBe(true);
  });

  it("при неизвестном пороге допуск равен null, а не false", () => {
    // Дата вне реестра: пороги подставляются как placeholder.
    const unknown = getConstantSet("1990-01-01");
    const r = projectOtbasy(scenario(), unknown);
    expect(r.eligibility.intermediateLoan).toBeNull();
    expect(r.eligibility.housingLoan).toBeNull();
  });
});

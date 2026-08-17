import { describe, expect, it } from "vitest";
import { DEFAULT_ROUNDING } from "@/domain/money";
import { getConstantSet } from "@/data/constants";
import {
  type DepositScenario,
  buildDepositSchedule,
  effectiveToNominal,
  nominalToEffective,
  resolveRate,
  xirr,
} from "./index";

const CONSTANTS = getConstantSet("2026-06-01");

function scenario(overrides: Partial<DepositScenario> = {}): DepositScenario {
  return {
    currency: "KZT",
    kind: "term",
    principalMinor: 100_000_000, // 1 000 000 ₸
    rates: { base: 0.12 },
    startDate: "2026-01-01",
    termMonths: 12,
    compounding: "monthly",
    payoutMode: "capitalize",
    // 30/360 даёт ровно 1/12 года на месяц — так проверяется замкнутая формула.
    dayCount: "30/360",
    flows: [],
    tax: { kind: "none" },
    rounding: DEFAULT_ROUNDING,
    ...overrides,
  };
}

describe("вырожденные случаи", () => {
  it("нулевая ставка не даёт вознаграждения", () => {
    const r = buildDepositSchedule(scenario({ rates: { base: 0 } }), CONSTANTS);
    expect(r.totalInterestGrossMinor).toBe(0);
    expect(r.finalBalanceMinor).toBe(100_000_000);
  });

  it("срок в один месяц даёт один период", () => {
    const r = buildDepositSchedule(scenario({ termMonths: 1 }), CONSTANTS);
    expect(r.periods).toHaveLength(1);
    expect(r.periods[0].interestAccruedMinor).toBe(1_000_000); // 1 % за месяц
  });
});

describe("капитализация и эффективная ставка", () => {
  it("12 % с ежемесячной капитализацией сходятся с замкнутой формулой", () => {
    const r = buildDepositSchedule(scenario(), CONSTANTS);

    // (1 + 0,12/12)^12 − 1 = 12,6825 %
    const expected = nominalToEffective(0.12, 12);
    expect(expected).toBeCloseTo(0.12682503, 8);
    expect(r.effectiveAnnualRate).toBeCloseTo(expected, 6);
    expect(r.effectiveRateConverged).toBe(true);

    // 1 000 000 × 1,01^12 = 1 126 825,03 ₸
    expect(r.finalBalanceMinor).toBeCloseTo(112_682_503, -1);
  });

  it("без капитализации эффективная ставка равна номинальной", () => {
    const r = buildDepositSchedule(scenario({ compounding: "none" }), CONSTANTS);
    expect(r.totalInterestGrossMinor).toBe(12_000_000); // простые проценты
    expect(r.effectiveAnnualRate).toBeCloseTo(0.12, 6);
  });

  it("ежеквартальная капитализация лежит между отсутствием и ежемесячной", () => {
    const none = buildDepositSchedule(scenario({ compounding: "none" }), CONSTANTS);
    const quarterly = buildDepositSchedule(scenario({ compounding: "quarterly" }), CONSTANTS);
    const monthly = buildDepositSchedule(scenario({ compounding: "monthly" }), CONSTANTS);

    expect(quarterly.finalBalanceMinor).toBeGreaterThan(none.finalBalanceMinor);
    expect(quarterly.finalBalanceMinor).toBeLessThan(monthly.finalBalanceMinor);
  });

  it("преобразование номинальной и эффективной ставки обратимо", () => {
    for (const rate of [0.01, 0.05, 0.12, 0.165, 0.3]) {
      for (const n of [1, 2, 4, 12, 365]) {
        expect(effectiveToNominal(nominalToEffective(rate, n), n)).toBeCloseTo(rate, 10);
      }
    }
  });
});

describe("выплата на карту", () => {
  it("вознаграждение уходит из вклада, остаток не растёт", () => {
    const r = buildDepositSchedule(scenario({ payoutMode: "payout" }), CONSTANTS);
    expect(r.finalBalanceMinor).toBe(100_000_000);
    expect(r.totalPaidOutMinor).toBe(12_000_000);
    expect(r.effectiveAnnualRate).toBeCloseTo(0.1268, 3); // реинвестирование не учитывается вкладом
  });
});

describe("пополнения", () => {
  it("регулярное пополнение увеличивает внесённую сумму и вознаграждение", () => {
    const plain = buildDepositSchedule(scenario(), CONSTANTS);
    const topped = buildDepositSchedule(scenario({ monthlyTopUpMinor: 5_000_000 }), CONSTANTS);

    expect(topped.totalContributedMinor).toBe(100_000_000 + 12 * 5_000_000);
    expect(topped.totalInterestGrossMinor).toBeGreaterThan(plain.totalInterestGrossMinor);
  });

  it("пополнения после отсечки не принимаются и об этом сообщается", () => {
    const r = buildDepositSchedule(
      scenario({
        monthlyTopUpMinor: 5_000_000,
        constraints: { topUpAllowed: true, topUpCutoffMonths: 6 },
      }),
      CONSTANTS,
    );
    expect(r.totalContributedMinor).toBe(100_000_000 + 6 * 5_000_000);
    expect(r.warnings.some((w) => w.code === "TOPUP_AFTER_CUTOFF")).toBe(true);
  });

  it("разовое пополнение в середине срока попадает в свой период", () => {
    const r = buildDepositSchedule(
      scenario({ flows: [{ date: "2026-07-15", amountMinor: 50_000_000 }] }),
      CONSTANTS,
    );
    const july = r.periods.find((p) => p.from === "2026-07-01");
    expect(july?.flowsMinor).toBe(50_000_000);
    expect(r.totalContributedMinor).toBe(150_000_000);
  });
});

describe("налог", () => {
  it("ИПН уменьшает чистое вознаграждение", () => {
    const gross = buildDepositSchedule(scenario({ compounding: "none" }), CONSTANTS);
    const taxed = buildDepositSchedule(
      scenario({ compounding: "none", tax: { kind: "flat", rate: 0.1 } }),
      CONSTANTS,
    );

    expect(taxed.totalInterestGrossMinor).toBe(gross.totalInterestGrossMinor);
    expect(taxed.totalTaxMinor).toBe(1_200_000);
    expect(taxed.totalInterestNetMinor).toBe(gross.totalInterestGrossMinor - 1_200_000);
    expect(taxed.effectiveAnnualRate).toBeLessThan(gross.effectiveAnnualRate);
  });
});

describe("база начисления", () => {
  it("високосный февраль по ACT/365 даёт больше вознаграждения", () => {
    const normal = buildDepositSchedule(
      scenario({ startDate: "2026-01-01", dayCount: "ACT/365", compounding: "none" }),
      CONSTANTS,
    );
    const leap = buildDepositSchedule(
      scenario({ startDate: "2028-01-01", dayCount: "ACT/365", compounding: "none" }),
      CONSTANTS,
    );
    expect(leap.totalInterestGrossMinor).toBeGreaterThan(normal.totalInterestGrossMinor);
  });

  it("ACT/360 даёт больше, чем ACT/365 — база короче", () => {
    const act365 = buildDepositSchedule(scenario({ dayCount: "ACT/365", compounding: "none" }), CONSTANTS);
    const act360 = buildDepositSchedule(scenario({ dayCount: "ACT/360", compounding: "none" }), CONSTANTS);
    expect(act360.totalInterestGrossMinor).toBeGreaterThan(act365.totalInterestGrossMinor);
  });
});

describe("ставки по условиям", () => {
  it("лестничная ставка меняется с указанного месяца", () => {
    const rates = { base: 0.1, steps: [{ fromMonth: 7, rate: 0.16 }] };
    expect(resolveRate(rates, 6, 0)).toBe(0.1);
    expect(resolveRate(rates, 7, 0)).toBe(0.16);
  });

  it("ставка по диапазону суммы выбирается по остатку", () => {
    const rates = {
      base: 0.1,
      amountBands: [
        { minMinor: 0, maxMinor: 100_000_000, rate: 0.12 },
        { minMinor: 100_000_000, rate: 0.15 },
      ],
    };
    expect(resolveRate(rates, 1, 50_000_000)).toBe(0.12);
    expect(resolveRate(rates, 1, 200_000_000)).toBe(0.15);
  });
});

describe("гарантия КФГД", () => {
  it("сберегательный вклад в тенге защищён до 20 млн ₸", () => {
    const r = buildDepositSchedule(
      scenario({ kind: "savings", principalMinor: 1_500_000_000 }),
      CONSTANTS,
    );
    expect(r.kdif.limitMinor).toBe(2_000_000_000);
    expect(r.kdif.covered).toBe(true);
  });

  it("срочный вклад сверх 10 млн ₸ помечается как частично не покрытый", () => {
    const r = buildDepositSchedule(
      scenario({ kind: "term", principalMinor: 1_500_000_000 }),
      CONSTANTS,
    );
    expect(r.kdif.limitMinor).toBe(1_000_000_000);
    expect(r.kdif.covered).toBe(false);
    expect(r.kdif.uncoveredMinor).toBeGreaterThan(0);
    expect(r.warnings.some((w) => w.code === "EXCEEDS_KDIF")).toBe(true);
  });
});

describe("ограничения продукта", () => {
  it("сумма ниже минимальной помечается ошибкой, но расчёт возвращается", () => {
    const r = buildDepositSchedule(
      scenario({ principalMinor: 1_000_000, constraints: { minAmountMinor: 5_000_000 } }),
      CONSTANTS,
    );
    expect(r.warnings.some((w) => w.code === "BELOW_MIN_AMOUNT")).toBe(true);
    expect(r.periods).toHaveLength(12); // не бросили исключение
  });

  it("пополнение запрещённого вклада помечается ошибкой", () => {
    const r = buildDepositSchedule(
      scenario({ monthlyTopUpMinor: 1_000_000, constraints: { topUpAllowed: false } }),
      CONSTANTS,
    );
    expect(r.warnings.some((w) => w.code === "TOPUP_NOT_ALLOWED")).toBe(true);
  });
});

describe("инвариант сходимости сумм", () => {
  /**
   * Главный тест на утечки округления: на случайных сценариях итог обязан
   * сходиться с точностью до тиына. Любая потеря копейки в расписании
   * проявится здесь, а не в отчёте пользователя.
   */
  it("итоговый остаток точно равен внесённому плюс чистое вознаграждение", () => {
    let checked = 0;
    for (let i = 0; i < 1000; i++) {
      const s = scenario({
        principalMinor: Math.floor(Math.random() * 500_000_000) + 100_000,
        rates: { base: Math.random() * 0.25 },
        termMonths: Math.floor(Math.random() * 60) + 1,
        compounding: (["none", "monthly", "quarterly", "annual"] as const)[
          Math.floor(Math.random() * 4)
        ],
        dayCount: (["ACT/365", "ACT/360", "30/360", "ACT/ACT"] as const)[
          Math.floor(Math.random() * 4)
        ],
        monthlyTopUpMinor: Math.random() < 0.5 ? Math.floor(Math.random() * 5_000_000) : 0,
        tax: Math.random() < 0.3 ? { kind: "flat", rate: 0.1 } : { kind: "none" },
      });

      const r = buildDepositSchedule(s, CONSTANTS);

      expect(Number.isInteger(r.finalBalanceMinor)).toBe(true);
      expect(r.finalBalanceMinor).toBe(r.totalContributedMinor + r.totalInterestNetMinor);
      checked++;
    }
    expect(checked).toBe(1000);
  });

  it("при выплате на карту остаток равен внесённому, а выплаты — чистому вознаграждению", () => {
    const r = buildDepositSchedule(
      scenario({ payoutMode: "payout", monthlyTopUpMinor: 1_000_000 }),
      CONSTANTS,
    );
    expect(r.finalBalanceMinor).toBe(r.totalContributedMinor);
    expect(r.totalPaidOutMinor).toBe(r.totalInterestNetMinor);
  });

  it("сумма начислений по периодам равна общему вознаграждению", () => {
    const r = buildDepositSchedule(scenario({ monthlyTopUpMinor: 2_000_000 }), CONSTANTS);
    const summed = r.periods.reduce((acc, p) => acc + p.interestAccruedMinor, 0);
    expect(summed).toBe(r.totalInterestGrossMinor);
  });
});

describe("xirr", () => {
  it("восстанавливает ставку на простом потоке", () => {
    const result = xirr(
      [
        { date: "2026-01-01", amountMinor: -100_000_000 },
        { date: "2027-01-01", amountMinor: 115_000_000 },
      ],
      "ACT/365",
    );
    expect(result.converged).toBe(true);
    expect(result.rate).toBeCloseTo(0.15, 8);
  });

  it("поток без смены знака честно сообщает о несходимости", () => {
    const result = xirr([
      { date: "2026-01-01", amountMinor: -100 },
      { date: "2027-01-01", amountMinor: -100 },
    ]);
    expect(result.converged).toBe(false);
  });

  it("детерминирован при повторных вызовах", () => {
    const flows = [
      { date: "2026-01-01", amountMinor: -100_000_000 },
      { date: "2026-07-01", amountMinor: -20_000_000 },
      { date: "2027-01-01", amountMinor: 128_000_000 },
    ];
    const a = xirr(flows);
    const b = xirr(flows);
    expect(a.rate).toBe(b.rate);
  });
});

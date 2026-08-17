import { describe, expect, it } from "vitest";
import { getConstantSet } from "@/data/constants";
import { type PensionScenario, projectPension, retirementAgeFor } from "./index";

const CONSTANTS = getConstantSet("2026-06-01");

function scenario(overrides: Partial<PensionScenario> = {}): PensionScenario {
  return {
    asOf: "2026-06-01",
    birthDate: "1990-06-01",
    sex: "male",
    monthlyIncomeMinor: 50_000_000, // 500 000 ₸
    currentOpvBalanceMinor: 0,
    currentOpvrBalanceMinor: 0,
    salaryGrowthAnnual: 0,
    investmentReturnAnnual: 0,
    inflationAnnual: 0,
    ...overrides,
  };
}

describe("ОПВР", () => {
  it("не начисляется за рождённых до 1 января 1975 года", () => {
    const r = projectPension(scenario({ birthDate: "1974-12-31" }), CONSTANTS);
    expect(r.opvrEligible).toBe(false);
    expect(r.opvrBalanceAtRetirementMinor).toBe(0);
    expect(r.years.every((y) => y.opvrContributedMinor === 0)).toBe(true);
  });

  it("начисляется за рождённых 1 января 1975 года и позже", () => {
    const r = projectPension(scenario({ birthDate: "1975-01-01" }), CONSTANTS);
    expect(r.opvrEligible).toBe(true);
    expect(r.opvrBalanceAtRetirementMinor).toBeGreaterThan(0);
  });

  it("ставка растёт по годам согласно графику", () => {
    const r = projectPension(scenario(), CONSTANTS);
    const y2026 = r.years.find((y) => y.year === 2026);
    const y2027 = r.years.find((y) => y.year === 2027);
    const y2029 = r.years.find((y) => y.year === 2029);

    expect(y2026?.opvrRate).toBeCloseTo(0.035, 10);
    expect(y2027?.opvrRate).toBeCloseTo(0.045, 10);
    expect(y2029?.opvrRate).toBeCloseTo(0.05, 10);
  });

  it("показывается отдельно от ОПВ — это разные по правилам деньги", () => {
    const r = projectPension(scenario(), CONSTANTS);
    expect(r.funded.monthlyMinor).toBeGreaterThan(0);
    expect(r.employerFunded.monthlyMinor).toBeGreaterThan(0);
    expect(r.employerFunded.basis).toContain("не наследуются");
  });
});

describe("база взносов", () => {
  it("доход выше 50 МЗП зажимается потолком", () => {
    const cap = CONSTANTS.contributionCapMzp.value * CONSTANTS.mzp.value; // 50 × 85 000 ₸
    const r = projectPension(scenario({ monthlyIncomeMinor: cap * 3 }), CONSTANTS);
    expect(r.years[0].contributionBaseMinor).toBe(cap);
  });

  it("доход ниже МЗП поднимается до МЗП", () => {
    const r = projectPension(scenario({ monthlyIncomeMinor: 1_000_000 }), CONSTANTS);
    expect(r.years[0].contributionBaseMinor).toBe(CONSTANTS.mzp.value);
  });

  it("ОПВ равен 10 % от базы за 12 месяцев", () => {
    const r = projectPension(scenario({ monthlyIncomeMinor: 50_000_000 }), CONSTANTS);
    expect(r.years[0].opvContributedMinor).toBe(50_000_000 * 0.1 * 12);
  });
});

describe("накопление", () => {
  it("при нулевой доходности остаток равен сумме взносов", () => {
    const r = projectPension(scenario({ investmentReturnAnnual: 0 }), CONSTANTS);
    expect(r.totalBalanceAtRetirementMinor).toBe(r.totalContributedMinor);
    expect(r.totalInvestmentIncomeMinor).toBe(0);
  });

  it("положительная доходность увеличивает остаток", () => {
    const flat = projectPension(scenario({ investmentReturnAnnual: 0 }), CONSTANTS);
    const growing = projectPension(scenario({ investmentReturnAnnual: 0.08 }), CONSTANTS);
    expect(growing.totalBalanceAtRetirementMinor).toBeGreaterThan(flat.totalBalanceAtRetirementMinor);
  });

  it("рост зарплаты увеличивает взносы", () => {
    const flat = projectPension(scenario({ salaryGrowthAnnual: 0 }), CONSTANTS);
    const growing = projectPension(scenario({ salaryGrowthAnnual: 0.05 }), CONSTANTS);
    expect(growing.totalContributedMinor).toBeGreaterThan(flat.totalContributedMinor);
  });

  it("суммы остаются целыми тиынами", () => {
    const r = projectPension(scenario({ investmentReturnAnnual: 0.073, salaryGrowthAnnual: 0.043 }), CONSTANTS);
    for (const y of r.years) {
      expect(Number.isInteger(y.opvBalanceMinor)).toBe(true);
      expect(Number.isInteger(y.opvrBalanceMinor)).toBe(true);
    }
  });
});

describe("пенсионный возраст", () => {
  it("для мужчин — 63 года", () => {
    expect(retirementAgeFor("male", CONSTANTS).value).toBe(63);
  });

  it("для женщин наступает раньше, значит и срок накопления короче", () => {
    const male = projectPension(scenario({ sex: "male" }), CONSTANTS);
    const female = projectPension(scenario({ sex: "female" }), CONSTANTS);
    expect(female.retirementAge).toBeLessThan(male.retirementAge);
    expect(female.yearsToRetirement).toBeLessThan(male.yearsToRetirement);
  });

  it("график для женщин помечен как требующий проверки", () => {
    expect(retirementAgeFor("female", CONSTANTS).confidence).toBe("unverified");
  });

  it("ручной возраст выхода переопределяет законодательный", () => {
    const r = projectPension(scenario({ plannedRetirementAge: 55 }), CONSTANTS);
    expect(r.retirementAge).toBe(55);
  });

  it("человек пенсионного возраста получает нулевой срок накопления", () => {
    const r = projectPension(scenario({ birthDate: "1955-01-01" }), CONSTANTS);
    expect(r.yearsToRetirement).toBe(0);
    expect(r.years).toHaveLength(0);
  });
});

describe("выплата", () => {
  it("реальная выплата не превышает номинальную при инфляции", () => {
    const r = projectPension(scenario({ inflationAnnual: 0.06 }), CONSTANTS);
    expect(r.totalMonthlyRealMinor).toBeLessThan(r.totalMonthlyNominalMinor);
  });

  it("без инфляции номинал и реальная выплата совпадают", () => {
    const r = projectPension(scenario({ inflationAnnual: 0 }), CONSTANTS);
    expect(r.totalMonthlyRealMinor).toBe(r.totalMonthlyNominalMinor);
  });

  it("итог складывается из базовой, накопительной и ОПВР", () => {
    const r = projectPension(scenario(), CONSTANTS);
    expect(r.totalMonthlyNominalMinor).toBe(
      r.basic.monthlyMinor + r.funded.monthlyMinor + r.employerFunded.monthlyMinor,
    );
  });

  it("методики выплаты помечены как упрощения", () => {
    const r = projectPension(scenario(), CONSTANTS);
    expect(r.funded.method?.confidence).toBe("unverified");
    expect(r.basic.method?.confidence).toBe("unverified");
    expect(r.assumptions.worstConfidence).toBe("unverified");
  });
});

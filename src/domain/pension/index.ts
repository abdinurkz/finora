/**
 * Пенсионная проекция ЕНПФ.
 *
 * ОПВ и ОПВР считаются и показываются РАЗДЕЛЬНО. Это не косметика: ОПВР
 * зачисляется на условный пенсионный счёт, не наследуется и выплачивается
 * по другим правилам. Сложить их в одну сумму — значит показать человеку
 * деньги, которыми он распорядится иначе, чем думает.
 */

import { type Assumptions, type MethodRef, type Resolved, buildAssumptions } from "@/domain/registry";
import { clampMinor, roundWith } from "@/domain/money";
import { type CivilDate, addYearsClamped, ageOn, compare, year as yearOf } from "@/domain/time";
import { OPVR_RATE } from "@/data/constants/pension";
import { resolve, isMissing } from "@/domain/registry";
import type { ConstantSet } from "@/data/constants";

/**
 * Способ оценки ежемесячной выплаты из накоплений.
 * Реальная методика ЕНПФ сложнее: график выплат зависит от возраста, остатка
 * и ежегодно пересчитывается. Здесь — равномерное распределение на горизонт.
 */
export const PAYOUT_METHOD_V1: MethodRef = {
  id: "enpf.payout.simple.v1",
  label: "Равномерная выплата накоплений",
  description:
    "Накопления делятся поровну на горизонт выплаты. Упрощение: фактический график " +
    "ЕНПФ зависит от возраста и остатка и пересчитывается ежегодно.",
  confidence: "unverified",
};

/**
 * Базовая пенсионная выплата зависит от стажа участия в пенсионной системе.
 * Здесь берётся законодательный минимум как нижняя граница.
 */
export const BASE_PENSION_METHOD_V1: MethodRef = {
  id: "enpf.basePension.floor.v1",
  label: "Базовая выплата по минимуму",
  description:
    "Используется минимальный размер базовой пенсионной выплаты. Фактический размер " +
    "растёт со стажем участия в пенсионной системе, поэтому реальная выплата будет выше.",
  confidence: "unverified",
};

export type Sex = "male" | "female";

export interface PensionScenario {
  readonly asOf: CivilDate;
  readonly birthDate: CivilDate;
  readonly sex: Sex;
  readonly monthlyIncomeMinor: number;
  readonly currentOpvBalanceMinor: number;
  readonly currentOpvrBalanceMinor: number;
  readonly salaryGrowthAnnual: number;
  readonly investmentReturnAnnual: number;
  readonly inflationAnnual: number;
  /** Переопределяет законодательный пенсионный возраст. */
  readonly plannedRetirementAge?: number;
}

export interface PensionYear {
  readonly year: number;
  readonly age: number;
  readonly monthlySalaryMinor: number;
  readonly contributionBaseMinor: number;
  readonly opvContributedMinor: number;
  readonly opvrContributedMinor: number;
  readonly opvrRate: number;
  readonly investmentIncomeMinor: number;
  readonly opvBalanceMinor: number;
  readonly opvrBalanceMinor: number;
  readonly totalBalanceMinor: number;
}

export interface PensionComponent {
  readonly monthlyMinor: number;
  readonly basis: string;
  readonly method?: MethodRef;
}

export interface PensionResult {
  readonly years: readonly PensionYear[];
  readonly retirementAge: number;
  readonly retirementDate: CivilDate;
  readonly yearsToRetirement: number;
  readonly opvBalanceAtRetirementMinor: number;
  readonly opvrBalanceAtRetirementMinor: number;
  readonly totalBalanceAtRetirementMinor: number;
  readonly totalContributedMinor: number;
  readonly totalInvestmentIncomeMinor: number;

  readonly basic: PensionComponent;
  readonly funded: PensionComponent;
  readonly employerFunded: PensionComponent;

  readonly totalMonthlyNominalMinor: number;
  /** Та же выплата в покупательной способности на дату расчёта. */
  readonly totalMonthlyRealMinor: number;
  readonly finalSalaryMinor: number;
  readonly replacementRate: number;
  readonly opvrEligible: boolean;
  readonly assumptions: Assumptions;
}

/** Законодательный пенсионный возраст на дату. */
export function retirementAgeFor(sex: Sex, constants: ConstantSet): Resolved<number> {
  return sex === "male" ? constants.retirementAgeMale : constants.retirementAgeFemale;
}

export function projectPension(scenario: PensionScenario, constants: ConstantSet): PensionResult {
  const {
    asOf,
    birthDate,
    sex,
    monthlyIncomeMinor,
    currentOpvBalanceMinor,
    currentOpvrBalanceMinor,
    salaryGrowthAnnual,
    investmentReturnAnnual,
    inflationAnnual,
    plannedRetirementAge,
  } = scenario;

  const statutoryAge = retirementAgeFor(sex, constants);
  const retirementAge = plannedRetirementAge ?? statutoryAge.value;

  const currentAge = ageOn(birthDate, asOf);
  const yearsToRetirement = Math.max(0, Math.ceil(retirementAge - currentAge));
  const retirementDate = addYearsClamped(birthDate, Math.floor(retirementAge));

  const mzp = constants.mzp.value;
  const capMinor = constants.contributionCapMzp.value * mzp;
  const opvRate = constants.opvRate.value;

  // ОПВР не уплачивается за работников старше порогового года рождения.
  const opvrEligible = compare(birthDate, constants.opvrBirthCutoff.value) >= 0;

  const years: PensionYear[] = [];
  const startYear = yearOf(asOf);

  let salary = monthlyIncomeMinor;
  let opvBalance = currentOpvBalanceMinor;
  let opvrBalance = currentOpvrBalanceMinor;
  let totalContributed = 0;
  let totalInvestmentIncome = 0;

  for (let i = 0; i < yearsToRetirement; i++) {
    const calendarYear = startYear + i;
    const age = currentAge + i;

    // База взносов ограничена сверху и снизу.
    const base = clampMinor(salary, mzp, capMinor);

    const opvYear = roundWith(base * opvRate * 12, "halfUp");

    // Ставка ОПВР меняется по годам — берём действующую на этот календарный год.
    const opvrResolved = resolve(OPVR_RATE, `${calendarYear}-06-01`);
    const opvrRate = isMissing(opvrResolved) ? constants.opvrRate.value : opvrResolved.value;
    const opvrYear = opvrEligible ? roundWith(base * opvrRate * 12, "halfUp") : 0;

    // Доход начисляется на остаток начала года.
    const opvIncome = roundWith(opvBalance * investmentReturnAnnual, "halfUp");
    const opvrIncome = roundWith(opvrBalance * investmentReturnAnnual, "halfUp");

    opvBalance += opvYear + opvIncome;
    opvrBalance += opvrYear + opvrIncome;
    totalContributed += opvYear + opvrYear;
    totalInvestmentIncome += opvIncome + opvrIncome;

    years.push({
      year: calendarYear,
      age,
      monthlySalaryMinor: salary,
      contributionBaseMinor: base,
      opvContributedMinor: opvYear,
      opvrContributedMinor: opvrYear,
      opvrRate: opvrEligible ? opvrRate : 0,
      investmentIncomeMinor: opvIncome + opvrIncome,
      opvBalanceMinor: opvBalance,
      opvrBalanceMinor: opvrBalance,
      totalBalanceMinor: opvBalance + opvrBalance,
    });

    salary = roundWith(salary * (1 + salaryGrowthAnnual), "halfUp");
  }

  /* ── Выплаты ─────────────────────────────────────────────────── */

  const payoutMonths = Math.max(1, constants.payoutYears.value * 12);
  const fundedMonthly = roundWith(opvBalance / payoutMonths, "halfUp");
  const employerMonthly = roundWith(opvrBalance / payoutMonths, "halfUp");
  const basicMonthly = constants.basePensionMin.value;

  const totalMonthlyNominal = fundedMonthly + employerMonthly + basicMonthly;
  const deflator = Math.pow(1 + inflationAnnual, yearsToRetirement);
  const totalMonthlyReal = roundWith(totalMonthlyNominal / deflator, "halfUp");

  const finalSalary = years.length > 0 ? years[years.length - 1].monthlySalaryMinor : monthlyIncomeMinor;

  return {
    years,
    retirementAge,
    retirementDate,
    yearsToRetirement,
    opvBalanceAtRetirementMinor: opvBalance,
    opvrBalanceAtRetirementMinor: opvrBalance,
    totalBalanceAtRetirementMinor: opvBalance + opvrBalance,
    totalContributedMinor: totalContributed,
    totalInvestmentIncomeMinor: totalInvestmentIncome,

    basic: {
      monthlyMinor: basicMonthly,
      basis: "Минимальная государственная базовая пенсионная выплата",
      method: BASE_PENSION_METHOD_V1,
    },
    funded: {
      monthlyMinor: fundedMonthly,
      basis: "Накопления ОПВ на индивидуальном пенсионном счёте",
      method: PAYOUT_METHOD_V1,
    },
    employerFunded: {
      monthlyMinor: employerMonthly,
      basis: "Накопления ОПВР на условном счёте — не наследуются",
      method: PAYOUT_METHOD_V1,
    },

    totalMonthlyNominalMinor: totalMonthlyNominal,
    totalMonthlyRealMinor: totalMonthlyReal,
    finalSalaryMinor: finalSalary,
    replacementRate: finalSalary > 0 ? totalMonthlyNominal / finalSalary : 0,
    opvrEligible,
    assumptions: buildAssumptions(
      [
        constants.mzp as Resolved<unknown>,
        constants.opvRate as Resolved<unknown>,
        constants.opvrRate as Resolved<unknown>,
        constants.contributionCapMzp as Resolved<unknown>,
        constants.opvrBirthCutoff as Resolved<unknown>,
        statutoryAge as Resolved<unknown>,
        constants.basePensionMin as Resolved<unknown>,
        constants.payoutYears as Resolved<unknown>,
      ],
      [PAYOUT_METHOD_V1, BASE_PENSION_METHOD_V1],
    ),
  };
}

/**
 * Оценочный показатель (ОП) Отбасы банка.
 *
 * ОП определяет очередь на жилищный заём, поэтому завышенный результат вреден
 * для реального человека. Отсюда два решения:
 *
 * 1. Формула вынесена в `MethodRef` со своей достоверностью — она такое же
 *    внешнее допущение, как МРП, и может быть уточнена без переписывания расчёта.
 * 2. Результат всегда содержит разложение по составляющим (`terms`), чтобы
 *    вкладчик, знающий свои реальные условия, мог заметить расхождение,
 *    а не поверить голому числу.
 */

import { type Assumptions, type MethodRef, type Resolved, buildAssumptions } from "@/domain/registry";
import { roundWith } from "@/domain/money";
import type { CivilDate } from "@/domain/time";
import type { ConstantSet } from "@/data/constants";

/**
 * ОП = НВ / ДС × 1000
 *
 * НВ — начисленное банком вознаграждение (2 % годовых на остаток вклада),
 * ДС — договорная сумма (стоимость жилья).
 *
 * Государственная премия в НВ НЕ входит: она увеличивает остаток и потому
 * влияет на ОП косвенно, через будущее вознаграждение.
 *
 * Статус `likely`: формула совпала в нескольких публикациях, включая
 * официальный аккаунт банка и опубликованный пример (100 000 ₸ при ДС 20 млн ₸
 * даёт ровно ОП 5), но страница банка на момент сборки не открывалась напрямую.
 */
export const OP_FORMULA_V1: MethodRef = {
  id: "otbasy.op.v1",
  label: "ОП = НВ / ДС × 1000",
  description:
    "Отношение начисленного вознаграждения к договорной сумме, умноженное на 1000. " +
    "Государственная премия в начисленное вознаграждение не включается.",
  confidence: "likely",
  source: {
    title: "Что такое оценочный показатель",
    publisher: "АО «Отбасы банк»",
    retrievedAt: "2026-08-17",
    url: "https://hcsbk.kz/ru/most-important/helpful-information/performance-indicator/",
  },
};

export interface OtbasyScenario {
  readonly asOf: CivilDate;
  /** Договорная сумма — стоимость приобретаемого жилья. */
  readonly contractAmountMinor: number;
  readonly initialDepositMinor: number;
  readonly monthlyContributionMinor: number;
  readonly depositRate: number;
  readonly months: number;
  readonly statePremiumEnabled: boolean;
}

export interface OtbasyMonth {
  readonly month: number;
  readonly contributedMinor: number;
  readonly interestMinor: number;
  readonly cumulativeInterestMinor: number;
  readonly statePremiumMinor: number;
  readonly balanceMinor: number;
  readonly op: number;
  readonly savingsShare: number;
}

/**
 * Составляющая расчёта. Доменный слой отдаёт числа, а не готовые строки:
 * форматирование — задача интерфейса, у которого есть локаль ru-KZ.
 */
export type OtbasyTerm =
  | { readonly kind: "money"; readonly label: string; readonly amountMinor: number; readonly explanation: string }
  | {
      readonly kind: "formula";
      readonly label: string;
      readonly numeratorMinor: number;
      readonly denominatorMinor: number;
      readonly result: number;
      readonly explanation: string;
    };

export interface OtbasyResult {
  readonly schedule: readonly OtbasyMonth[];
  readonly finalOp: number;
  readonly totalContributedMinor: number;
  readonly cumulativeInterestMinor: number;
  readonly statePremiumTotalMinor: number;
  readonly finalBalanceMinor: number;
  readonly savingsShare: number;
  /** Месяц достижения порога, либо null, если за срок сценария не достигнут. */
  readonly monthsToOp: {
    readonly intermediate: number | null;
    readonly housing: number | null;
  };
  readonly eligibility: {
    /** null — порог неизвестен: «не знаем» не должно выглядеть как «не проходите». */
    readonly intermediateLoan: boolean | null;
    readonly housingLoan: boolean | null;
    readonly halfAccumulated: boolean;
  };
  readonly terms: readonly OtbasyTerm[];
  readonly formula: MethodRef;
  readonly assumptions: Assumptions;
}

/** Оценочный показатель по накопленному вознаграждению и договорной сумме. */
export function computeOp(cumulativeInterestMinor: number, contractAmountMinor: number): number {
  if (contractAmountMinor <= 0) return 0;
  return (cumulativeInterestMinor / contractAmountMinor) * 1000;
}

export function projectOtbasy(scenario: OtbasyScenario, constants: ConstantSet): OtbasyResult {
  const {
    contractAmountMinor,
    initialDepositMinor,
    monthlyContributionMinor,
    depositRate,
    months,
    statePremiumEnabled,
  } = scenario;

  const premiumRate = constants.otbasyStatePremiumRate.value;
  const premiumCapMinor = constants.otbasyStatePremiumCapMrp.value * constants.mrp.value;

  const schedule: OtbasyMonth[] = [];

  let balance = initialDepositMinor;
  let cumulativeInterest = 0;
  let statePremiumTotal = 0;
  let totalContributed = initialDepositMinor;

  // Накопления за календарный год — база для государственной премии.
  let yearAccumulation = initialDepositMinor;

  let opIntermediateAt: number | null = null;
  let opHousingAt: number | null = null;

  const thresholdIntermediate = constants.otbasyOpIntermediate.value;
  const thresholdHousing = constants.otbasyOpHousing.value;

  for (let m = 1; m <= months; m++) {
    balance += monthlyContributionMinor;
    totalContributed += monthlyContributionMinor;
    yearAccumulation += monthlyContributionMinor;

    // Вознаграждение начисляется ежемесячно на текущий остаток.
    const interest = roundWith((balance * depositRate) / 12, "halfUp");
    cumulativeInterest += interest;
    balance += interest;
    yearAccumulation += interest;

    let premium = 0;
    if (statePremiumEnabled && m % 12 === 0) {
      premium = Math.min(roundWith(yearAccumulation * premiumRate, "halfUp"), premiumCapMinor);
      balance += premium;
      statePremiumTotal += premium;
      yearAccumulation = 0;
    }

    const op = computeOp(cumulativeInterest, contractAmountMinor);
    const savingsShare = contractAmountMinor > 0 ? balance / contractAmountMinor : 0;

    if (opIntermediateAt === null && op >= thresholdIntermediate) opIntermediateAt = m;
    if (opHousingAt === null && op >= thresholdHousing) opHousingAt = m;

    schedule.push({
      month: m,
      contributedMinor: monthlyContributionMinor,
      interestMinor: interest,
      cumulativeInterestMinor: cumulativeInterest,
      statePremiumMinor: premium,
      balanceMinor: balance,
      op,
      savingsShare,
    });
  }

  const finalOp = computeOp(cumulativeInterest, contractAmountMinor);
  const savingsShare = contractAmountMinor > 0 ? balance / contractAmountMinor : 0;
  const minShare = constants.otbasyMinSavingsShare.value;

  /* Порог неизвестен → «не знаем», а не «не проходите». */
  const intermediateKnown = constants.otbasyOpIntermediate.confidence !== "placeholder";
  const housingKnown = constants.otbasyOpHousing.confidence !== "placeholder";

  const terms: OtbasyTerm[] = [
    {
      kind: "money",
      label: "Начисленное вознаграждение (НВ)",
      amountMinor: cumulativeInterest,
      explanation: `Вознаграждение банка за ${months} мес. накопления.`,
    },
    {
      kind: "money",
      label: "Договорная сумма (ДС)",
      amountMinor: contractAmountMinor,
      explanation: "Стоимость приобретаемого жилья по договору.",
    },
    {
      kind: "formula",
      label: "Расчёт",
      numeratorMinor: cumulativeInterest,
      denominatorMinor: contractAmountMinor,
      result: finalOp,
      explanation: "ОП = НВ / ДС × 1000.",
    },
  ];

  if (statePremiumEnabled) {
    terms.push({
      kind: "money",
      label: "Государственная премия",
      amountMinor: statePremiumTotal,
      explanation:
        "В НВ не входит: увеличивает остаток вклада и потому влияет на ОП косвенно, " +
        "через вознаграждение следующих месяцев.",
    });
  }

  const usedConstants: Resolved<unknown>[] = [
    constants.otbasyOpIntermediate as Resolved<unknown>,
    constants.otbasyOpHousing as Resolved<unknown>,
    constants.otbasyMinSavingsShare as Resolved<unknown>,
  ];
  if (statePremiumEnabled) {
    usedConstants.push(
      constants.otbasyStatePremiumRate as Resolved<unknown>,
      constants.otbasyStatePremiumCapMrp as Resolved<unknown>,
      constants.mrp as Resolved<unknown>,
    );
  }

  return {
    schedule,
    finalOp,
    totalContributedMinor: totalContributed,
    cumulativeInterestMinor: cumulativeInterest,
    statePremiumTotalMinor: statePremiumTotal,
    finalBalanceMinor: balance,
    savingsShare,
    monthsToOp: { intermediate: opIntermediateAt, housing: opHousingAt },
    eligibility: {
      intermediateLoan: intermediateKnown ? finalOp >= thresholdIntermediate : null,
      housingLoan: housingKnown ? finalOp >= thresholdHousing : null,
      halfAccumulated: savingsShare >= minShare,
    },
    terms,
    formula: OP_FORMULA_V1,
    assumptions: buildAssumptions(usedConstants, [OP_FORMULA_V1]),
  };
}

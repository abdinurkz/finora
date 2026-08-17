import type { DatedSeries, SourceRef } from "@/domain/registry";

const ENPF: SourceRef = {
  title: "Обязательные пенсионные взносы работодателя (ОПВР)",
  publisher: "ЕНПФ",
  retrievedAt: "2026-08-17",
  url: "https://www.enpf.kz/ru/",
};

/** ОПВ — обязательные пенсионные взносы, удерживаются из дохода работника. */
export const OPV_RATE: DatedSeries<number> = {
  key: "pension.opvRate",
  label: "Ставка ОПВ",
  unit: "ratio",
  description: "Удерживается из дохода работника и зачисляется на его индивидуальный пенсионный счёт.",
  entries: [
    {
      value: 0.1,
      effectiveFrom: "1998-01-01",
      confidence: "verified",
      source: ENPF,
    },
  ],
};

/**
 * ОПВР — обязательные пенсионные взносы РАБОТОДАТЕЛЯ. Введены с 2024 года
 * и повышаются по графику до 5 % к 2028-му.
 *
 * Важно: ОПВР зачисляется на условный пенсионный счёт. Он не наследуется
 * и выплачивается иначе, чем ОПВ, поэтому в расчётах эти суммы не смешиваются.
 */
export const OPVR_RATE: DatedSeries<number> = {
  key: "pension.opvrRate",
  label: "Ставка ОПВР",
  unit: "ratio",
  description: "Платит работодатель сверх зарплаты. Зачисляется на условный пенсионный счёт.",
  entries: [
    { value: 0.015, effectiveFrom: "2024-01-01", effectiveTo: "2025-01-01", confidence: "verified", source: ENPF },
    { value: 0.025, effectiveFrom: "2025-01-01", effectiveTo: "2026-01-01", confidence: "verified", source: ENPF },
    { value: 0.035, effectiveFrom: "2026-01-01", effectiveTo: "2027-01-01", confidence: "verified", source: ENPF },
    { value: 0.045, effectiveFrom: "2027-01-01", effectiveTo: "2028-01-01", confidence: "verified", source: ENPF },
    { value: 0.05, effectiveFrom: "2028-01-01", confidence: "verified", source: ENPF },
  ],
};

/** Верхняя граница месячной базы взносов, в МЗП. */
export const CONTRIBUTION_CAP_MZP: DatedSeries<number> = {
  key: "pension.contributionCapMzp",
  label: "Потолок базы взносов",
  unit: "count",
  description: "Доход сверх этого числа МЗП в месяц взносами не облагается.",
  entries: [
    {
      value: 50,
      effectiveFrom: "2024-01-01",
      confidence: "verified",
      source: ENPF,
    },
  ],
};

/**
 * ОПВР не уплачивается за работников, родившихся до этой даты.
 * Хранится как строка-дата, а не как число: это порог по дате рождения.
 */
export const OPVR_BIRTH_CUTOFF: DatedSeries<string> = {
  key: "pension.opvrBirthCutoff",
  label: "ОПВР не платится за рождённых до",
  unit: "none",
  entries: [
    {
      value: "1975-01-01",
      effectiveFrom: "2024-01-01",
      confidence: "verified",
      source: ENPF,
    },
  ],
};

/** Пенсионный возраст для мужчин. */
export const RETIREMENT_AGE_MALE: DatedSeries<number> = {
  key: "pension.retirementAge.male",
  label: "Пенсионный возраст, мужчины",
  unit: "years",
  entries: [
    {
      value: 63,
      effectiveFrom: "2018-01-01",
      confidence: "likely",
      note: "Значение стабильно много лет, но с первоисточником в этой сборке не сверялось.",
    },
  ],
};

/**
 * Пенсионный возраст для женщин повышается поэтапно.
 *
 * ГРАФИК НЕ ПОДТВЕРЖДЁН. Значения внесены по общему представлению о реформе
 * и требуют сверки с законом «О пенсионном обеспечении в РК» перед тем,
 * как показывать их как факт. В интерфейсе выводятся с бейджем «требует проверки».
 */
export const RETIREMENT_AGE_FEMALE: DatedSeries<number> = {
  key: "pension.retirementAge.female",
  label: "Пенсионный возраст, женщины",
  unit: "years",
  description: "Повышается поэтапно до 63 лет. График требует сверки с первоисточником.",
  entries: [
    {
      value: 61,
      effectiveFrom: "2023-01-01",
      effectiveTo: "2028-01-01",
      confidence: "unverified",
      note: "Требует сверки с законом о пенсионном обеспечении.",
    },
    {
      value: 61.5,
      effectiveFrom: "2028-01-01",
      effectiveTo: "2029-01-01",
      confidence: "unverified",
      note: "Требует сверки: этап повышения не подтверждён.",
    },
    {
      value: 62,
      effectiveFrom: "2029-01-01",
      effectiveTo: "2030-01-01",
      confidence: "unverified",
      note: "Требует сверки: этап повышения не подтверждён.",
    },
    {
      value: 62.5,
      effectiveFrom: "2030-01-01",
      effectiveTo: "2031-01-01",
      confidence: "unverified",
      note: "Требует сверки: этап повышения не подтверждён.",
    },
    {
      value: 63,
      effectiveFrom: "2031-01-01",
      confidence: "unverified",
      note: "Требует сверки: конечная точка реформы не подтверждена.",
    },
  ],
};

/**
 * Срок выплаты накопительной пенсии в годах — упрощение.
 * Реальная методика ЕНПФ сложнее (график выплат зависит от возраста и остатка).
 */
export const PAYOUT_YEARS: DatedSeries<number> = {
  key: "pension.payoutYears",
  label: "Горизонт выплаты накоплений",
  unit: "years",
  description: "Упрощённое допущение для оценки ежемесячной выплаты из накоплений.",
  entries: [
    {
      value: 20,
      effectiveFrom: "2024-01-01",
      confidence: "unverified",
      note: "Допущение приложения, а не методика ЕНПФ. Реальный график выплат считается иначе.",
    },
  ],
};

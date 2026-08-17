"use client";

import { useMemo, useState } from "react";
import { type Sex, projectPension } from "@/domain/pension";
import { getConstantSet } from "@/data/constants";
import { formatMoney, formatMoneyCompact, formatRate, formatYears } from "@/lib/format";
import { useToday } from "@/lib/useToday";
import { Card, CardTitle, Note, PageHeader, Stat, StatGrid } from "@/components/ui";
import { DateInput, Field, MoneyInput, RateInput, SegmentedControl } from "@/components/ui/inputs";
import { StackedAreaChart } from "@/components/charts";
import { AssumptionsPanel, UnverifiedBanner } from "@/components/trust";

export function PensionCalculator({ today: serverToday }: { today: string }) {
  const today = useToday(serverToday);
  const [birthDate, setBirthDate] = useState("1990-01-01");
  const [sex, setSex] = useState<Sex>("male");
  const [monthlyIncomeMinor, setMonthlyIncomeMinor] = useState(50_000_000); // 500 000 ₸
  const [currentOpvMinor, setCurrentOpvMinor] = useState(0);
  const [currentOpvrMinor, setCurrentOpvrMinor] = useState(0);
  const [salaryGrowth, setSalaryGrowth] = useState(0.05);
  const [investmentReturn, setInvestmentReturn] = useState(0.08);
  const [inflation, setInflation] = useState(0.06);

  const constants = useMemo(() => getConstantSet(today), [today]);

  const result = useMemo(
    () =>
      projectPension(
        {
          asOf: today,
          birthDate,
          sex,
          monthlyIncomeMinor,
          currentOpvBalanceMinor: currentOpvMinor,
          currentOpvrBalanceMinor: currentOpvrMinor,
          salaryGrowthAnnual: salaryGrowth,
          investmentReturnAnnual: investmentReturn,
          inflationAnnual: inflation,
        },
        constants,
      ),
    [
      today,
      birthDate,
      sex,
      monthlyIncomeMinor,
      currentOpvMinor,
      currentOpvrMinor,
      salaryGrowth,
      investmentReturn,
      inflation,
      constants,
    ],
  );

  const capMinor = constants.contributionCapMzp.value * constants.mzp.value;
  const overCap = monthlyIncomeMinor > capMinor;

  return (
    <>
      <PageHeader
        title="Пенсионный калькулятор"
        description="Проекция накоплений в ЕНПФ до выхода на пенсию. Обязательные взносы работника (ОПВ) и работодателя (ОПВР) считаются раздельно — у них разные правила выплаты."
      />

      <div className="flex flex-col gap-5">
        <Card>
          <CardTitle>Ваши данные</CardTitle>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Дата рождения" htmlFor="birth">
              <DateInput id="birth" value={birthDate} onChange={setBirthDate} />
            </Field>

            <Field label="Пол" hint="Определяет пенсионный возраст">
              <SegmentedControl
                value={sex}
                onChange={setSex}
                options={[
                  { value: "male", label: "Мужской" },
                  { value: "female", label: "Женский" },
                ]}
              />
            </Field>

            <Field
              label="Доход в месяц"
              htmlFor="income"
              hint={
                overCap
                  ? `Взносы считаются с потолка ${formatMoneyCompact(capMinor)} — это 50 МЗП`
                  : "До удержания взносов и налогов"
              }
            >
              <MoneyInput id="income" valueMinor={monthlyIncomeMinor} onChange={setMonthlyIncomeMinor} />
            </Field>

            <Field label="Уже накоплено по ОПВ" htmlFor="opv" hint="Остаток на индивидуальном счёте в ЕНПФ">
              <MoneyInput id="opv" valueMinor={currentOpvMinor} onChange={setCurrentOpvMinor} />
            </Field>

            <Field label="Уже накоплено по ОПВР" htmlFor="opvr" hint="Остаток на условном счёте">
              <MoneyInput id="opvr" valueMinor={currentOpvrMinor} onChange={setCurrentOpvrMinor} />
            </Field>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-3">
            <Field label="Рост зарплаты в год" htmlFor="growth">
              <RateInput id="growth" value={salaryGrowth} onChange={setSalaryGrowth} max={50} />
            </Field>
            <Field label="Доходность ЕНПФ в год" htmlFor="return">
              <RateInput id="return" value={investmentReturn} onChange={setInvestmentReturn} max={50} />
            </Field>
            <Field label="Инфляция в год" htmlFor="inflation">
              <RateInput id="inflation" value={inflation} onChange={setInflation} max={50} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardTitle
            hint={`Выход на пенсию в ${result.retirementAge} ${
              result.retirementAge === 63 ? "года" : "лет"
            } — через ${formatYears(result.yearsToRetirement)}`}
          >
            Что накопится к пенсии
          </CardTitle>

          <StatGrid cols={4}>
            <Stat
              label="Накопления к выходу"
              value={formatMoney(result.totalBalanceAtRetirementMinor)}
              sub={`из них доход ${formatMoneyCompact(result.totalInvestmentIncomeMinor)}`}
            />
            <Stat
              label="Пенсия в месяц"
              value={formatMoney(result.totalMonthlyNominalMinor)}
              sub="в номинальных тенге"
              tone="positive"
            />
            <Stat
              label="В сегодняшних деньгах"
              value={formatMoney(result.totalMonthlyRealMinor)}
              sub={`с учётом инфляции ${formatRate(inflation)}`}
            />
            <Stat
              label="Коэффициент замещения"
              value={formatRate(result.replacementRate)}
              sub="пенсия к последней зарплате"
            />
          </StatGrid>
        </Card>

        {/* ОПВ и ОПВР показаны раздельно: это деньги с разными правилами. */}
        <Card>
          <CardTitle hint="Три источника выплаты складываются в итоговую пенсию.">
            Из чего сложится пенсия
          </CardTitle>

          <div className="flex flex-col divide-y divide-border">
            {[result.basic, result.funded, result.employerFunded].map((component, i) => (
              <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="text-sm text-fg">
                    {["Базовая пенсионная выплата", "Накопительная (ОПВ)", "За счёт работодателя (ОПВР)"][i]}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{component.basis}</p>
                </div>
                <div className="tabular text-sm font-medium">{formatMoney(component.monthlyMinor)}</div>
              </div>
            ))}
          </div>

          {!result.opvrEligible && (
            <Note tone="neutral" icon="info" className="mt-4">
              ОПВР не начисляется за работников, родившихся до 1 января 1975 года, — поэтому
              соответствующая часть равна нулю.
            </Note>
          )}

          <Note tone="warning" icon="alert" className="mt-4">
            ОПВР зачисляется на условный пенсионный счёт: эти средства не наследуются
            и выплачиваются по отдельным правилам. Не считайте их частью накоплений ОПВ.
          </Note>
        </Card>

        {result.years.length > 0 && (
          <Card>
            <CardTitle hint="Наведите на график, чтобы увидеть значения за год.">
              Как растут накопления
            </CardTitle>
            <StackedAreaChart
              ariaLabel="Рост пенсионных накоплений по годам: взносы ОПВ и ОПВР"
              series={[
                {
                  key: "opv",
                  label: "ОПВ — свои накопления",
                  color: "chart-1",
                  values: result.years.map((y) => y.opvBalanceMinor),
                },
                {
                  key: "opvr",
                  label: "ОПВР — от работодателя",
                  color: "chart-3",
                  values: result.years.map((y) => y.opvrBalanceMinor),
                },
              ]}
              xLabels={result.years.map((y) => String(y.year))}
              formatValue={(v) => formatMoney(v)}
              formatAxis={(v) => formatMoneyCompact(v)}
            />
          </Card>
        )}

        {result.years.length === 0 && (
          <Note tone="neutral" icon="info">
            По указанной дате рождения пенсионный возраст уже наступил, поэтому периода
            накопления не осталось.
          </Note>
        )}

        <UnverifiedBanner assumptions={result.assumptions} />
        <AssumptionsPanel assumptions={result.assumptions} />
      </div>
    </>
  );
}

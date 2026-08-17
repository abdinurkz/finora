"use client";

import { useMemo, useState } from "react";
import { projectOtbasy } from "@/domain/otbasy";
import { getConstantSet } from "@/data/constants";
import { formatDecimal, formatMoney, formatMoneyCompact, formatMonths, formatRate } from "@/lib/format";
import { useToday } from "@/lib/useToday";
import { Badge, Card, CardTitle, Note, PageHeader, Stat, StatGrid } from "@/components/ui";
import { Field, MoneyInput, NumberInput, RateInput, Toggle } from "@/components/ui/inputs";
import { LineChart } from "@/components/charts";
import { AssumptionsPanel, UnverifiedBanner } from "@/components/trust";

export function OtbasyCalculator({ today: serverToday }: { today: string }) {
  const today = useToday(serverToday);
  const [contractAmountMinor, setContractAmountMinor] = useState(2_000_000_000); // 20 млн ₸
  const [initialDepositMinor, setInitialDepositMinor] = useState(1_000_000_000); // 10 млн ₸
  const [monthlyContributionMinor, setMonthlyContributionMinor] = useState(0);
  const [depositRate, setDepositRate] = useState(0.02);
  const [months, setMonths] = useState(36);
  const [statePremiumEnabled, setStatePremiumEnabled] = useState(false);

  const constants = useMemo(() => getConstantSet(today), [today]);

  const result = useMemo(
    () =>
      projectOtbasy(
        {
          asOf: today,
          contractAmountMinor,
          initialDepositMinor,
          monthlyContributionMinor,
          depositRate,
          months,
          statePremiumEnabled,
        },
        constants,
      ),
    [
      today,
      contractAmountMinor,
      initialDepositMinor,
      monthlyContributionMinor,
      depositRate,
      months,
      statePremiumEnabled,
      constants,
    ],
  );

  const thresholdIntermediate = constants.otbasyOpIntermediate.value;
  const thresholdHousing = constants.otbasyOpHousing.value;

  return (
    <>
      <PageHeader
        title="Оценочный показатель Отбасы банка"
        description="ОП определяет очерёдность и ставку по жилищному займу. Здесь видно, когда накопления выведут вас на пороги ОП 5 и ОП 16."
      />

      <div className="flex flex-col gap-5">
        <Card>
          <CardTitle hint="Договорная сумма — стоимость жилья, которое вы планируете приобрести.">
            Параметры накопления
          </CardTitle>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Договорная сумма" htmlFor="contract">
              <MoneyInput id="contract" valueMinor={contractAmountMinor} onChange={setContractAmountMinor} />
            </Field>

            <Field
              label="Первоначальный взнос"
              htmlFor="initial"
              hint={`Сейчас это ${formatRate(
                contractAmountMinor > 0 ? initialDepositMinor / contractAmountMinor : 0,
              )} от договорной суммы`}
            >
              <MoneyInput id="initial" valueMinor={initialDepositMinor} onChange={setInitialDepositMinor} />
            </Field>

            <Field label="Ежемесячный взнос" htmlFor="monthly" hint="0 — только первоначальный взнос">
              <MoneyInput
                id="monthly"
                valueMinor={monthlyContributionMinor}
                onChange={setMonthlyContributionMinor}
              />
            </Field>

            <Field label="Ставка по депозиту" htmlFor="rate" hint="Базовая ставка Отбасы банка — 2 % годовых">
              <RateInput id="rate" value={depositRate} onChange={setDepositRate} max={20} />
            </Field>

            <Field label="Срок накопления" htmlFor="months">
              <NumberInput id="months" value={months} onChange={setMonths} suffix="мес" min={1} max={360} />
            </Field>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <Toggle
              checked={statePremiumEnabled}
              onChange={setStatePremiumEnabled}
              label="Учитывать государственную премию"
              hint="Правила премии менялись в 2026 году и требуют сверки — расчёт будет помечен как непроверенный."
            />
          </div>
        </Card>

        <Card>
          <CardTitle hint={`За ${formatMonths(months)} накоплений при ставке ${formatRate(depositRate)}`}>
            Результат
          </CardTitle>

          <StatGrid cols={4}>
            <Stat
              label="Оценочный показатель"
              value={formatDecimal(result.finalOp, 2, 2)}
              sub={`из вознаграждения ${formatMoneyCompact(result.cumulativeInterestMinor)}`}
              tone={result.finalOp >= thresholdHousing ? "positive" : "neutral"}
            />
            <Stat
              label={`До ОП ${thresholdIntermediate} (промежуточный заём)`}
              value={
                result.monthsToOp.intermediate === null
                  ? "не достигнут"
                  : formatMonths(result.monthsToOp.intermediate)
              }
            />
            <Stat
              label={`До ОП ${thresholdHousing} (жилищный заём)`}
              value={
                result.monthsToOp.housing === null ? "не достигнут" : formatMonths(result.monthsToOp.housing)
              }
            />
            <Stat
              label="Накоплено"
              value={formatMoney(result.finalBalanceMinor)}
              sub={`${formatRate(result.savingsShare)} от договорной суммы`}
            />
          </StatGrid>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
            {result.eligibility.halfAccumulated ? (
              <Badge tone="positive" icon="check">
                накоплено не менее половины договорной суммы
              </Badge>
            ) : (
              <Badge tone="warning" icon="alert">
                накоплено меньше половины договорной суммы
              </Badge>
            )}

            {/* null означает «порог неизвестен» — это не то же самое, что «не проходите». */}
            {result.eligibility.intermediateLoan === null ? (
              <Badge tone="neutral" icon="info">
                порог ОП неизвестен
              </Badge>
            ) : result.eligibility.intermediateLoan ? (
              <Badge tone="positive" icon="check">
                проходит на промежуточный заём
              </Badge>
            ) : (
              <Badge tone="neutral">до промежуточного займа ещё не хватает</Badge>
            )}

            {result.eligibility.housingLoan === true && (
              <Badge tone="positive" icon="check">
                проходит на жилищный заём
              </Badge>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle hint="Пороговые уровни показаны пунктиром.">Рост ОП по месяцам</CardTitle>
          <LineChart
            ariaLabel="Рост оценочного показателя по месяцам накопления"
            series={{
              key: "op",
              label: "Оценочный показатель",
              color: "chart-1",
              values: result.schedule.map((m) => m.op),
            }}
            xLabels={result.schedule.map((m) => `${m.month} мес.`)}
            formatValue={(v) => formatDecimal(v, 2, 2)}
            formatAxis={(v) => formatDecimal(v, 0, 1)}
            thresholds={[
              { value: thresholdIntermediate, label: `ОП ${thresholdIntermediate}` },
              { value: thresholdHousing, label: `ОП ${thresholdHousing}` },
            ]}
          />
        </Card>

        {/* Разложение формулы: показываем работу, а не только итоговое число. */}
        <Card>
          <CardTitle hint="Если ваши условия отличаются, расхождение будет видно здесь.">
            Как получилось это число
          </CardTitle>
          <dl className="flex flex-col divide-y divide-border">
            {result.terms.map((term) => (
              <div key={term.label} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <dt className="text-sm text-fg">{term.label}</dt>
                  <dd className="tabular text-sm font-medium">
                    {term.kind === "money" ? (
                      formatMoney(term.amountMinor)
                    ) : (
                      <>
                        {formatMoney(term.numeratorMinor)} / {formatMoney(term.denominatorMinor)} × 1000 ={" "}
                        <span className="text-accent">{formatDecimal(term.result, 2, 2)}</span>
                      </>
                    )}
                  </dd>
                </div>
                <p className="mt-1 text-xs text-muted">{term.explanation}</p>
              </div>
            ))}
          </dl>
        </Card>

        <Note tone="neutral" icon="info">
          ОП влияет на очерёдность получения жилищного займа. Перед решением сверьте расчёт
          с условиями вашего договора — приложение даёт оценку, а не официальный расчёт банка.
        </Note>

        <UnverifiedBanner assumptions={result.assumptions} />
        <AssumptionsPanel assumptions={result.assumptions} />
      </div>
    </>
  );
}

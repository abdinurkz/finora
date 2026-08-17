"use client";

import { useMemo, useState } from "react";
import {
  type Compounding,
  type DepositKind,
  COMPOUNDING_LABELS,
  DEPOSIT_KIND_HINTS,
  DEPOSIT_KIND_LABELS,
  buildDepositSchedule,
} from "@/domain/deposit";
import { DEFAULT_ROUNDING } from "@/domain/money";
import { DAY_COUNT_LABELS, type DayCount, addMonthsClamped } from "@/domain/time";
import { getConstantSet } from "@/data/constants";
import { formatDate, formatMoney, formatMoneyCompact, formatRate } from "@/lib/format";
import { Badge, Card, CardTitle, Note, PageHeader, Stat, StatGrid } from "@/components/ui";
import {
  DateInput,
  Field,
  MoneyInput,
  NumberInput,
  RateInput,
  SegmentedControl,
  Select,
  Toggle,
} from "@/components/ui/inputs";
import { StackedAreaChart } from "@/components/charts";
import { AssumptionsPanel, UnverifiedBanner } from "@/components/trust";

const KIND_OPTIONS = (Object.keys(DEPOSIT_KIND_LABELS) as DepositKind[]).map((k) => ({
  value: k,
  label: DEPOSIT_KIND_LABELS[k],
}));

const COMPOUNDING_OPTIONS = (Object.keys(COMPOUNDING_LABELS) as Compounding[]).map((c) => ({
  value: c,
  label: COMPOUNDING_LABELS[c],
}));

const DAY_COUNT_OPTIONS = (Object.keys(DAY_COUNT_LABELS) as DayCount[]).map((d) => ({
  value: d,
  label: `${d} — ${DAY_COUNT_LABELS[d]}`,
}));

export interface DepositPrefill {
  readonly amountMinor: number;
  readonly rate: number;
  readonly termMonths: number;
  readonly kind?: string;
  readonly compounding?: string;
}

export function DepositCalculator({
  today,
  prefill,
}: {
  today: string;
  prefill?: DepositPrefill;
}) {
  const [principalMinor, setPrincipalMinor] = useState(prefill?.amountMinor ?? 100_000_000);
  const [rate, setRate] = useState(prefill?.rate ?? 0.165);
  const [termMonths, setTermMonths] = useState(prefill?.termMonths ?? 12);
  const [kind, setKind] = useState<DepositKind>(
    prefill?.kind !== undefined && prefill.kind in DEPOSIT_KIND_LABELS
      ? (prefill.kind as DepositKind)
      : "savings",
  );
  const [compounding, setCompounding] = useState<Compounding>(
    prefill?.compounding !== undefined && prefill.compounding in COMPOUNDING_LABELS
      ? (prefill.compounding as Compounding)
      : "monthly",
  );
  const [payoutMode, setPayoutMode] = useState<"capitalize" | "payout">("capitalize");
  const [dayCount, setDayCount] = useState<DayCount>("ACT/365");
  const [monthlyTopUpMinor, setMonthlyTopUpMinor] = useState(0);
  const [startDate, setStartDate] = useState(today);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState(0.1);
  const [showSchedule, setShowSchedule] = useState(false);

  const result = useMemo(() => {
    // Константы разрешаются на дату открытия вклада, а не на «сегодня»:
    // гарантия КФГД и налоговые правила привязаны к периоду.
    const constants = getConstantSet(startDate);
    return buildDepositSchedule(
      {
        currency: "KZT",
        kind,
        principalMinor,
        rates: { base: rate },
        startDate,
        termMonths,
        compounding,
        payoutMode,
        dayCount,
        flows: [],
        monthlyTopUpMinor,
        tax: taxEnabled ? { kind: "flat", rate: taxRate } : { kind: "none" },
        rounding: DEFAULT_ROUNDING,
      },
      constants,
    );
  }, [
    principalMinor,
    rate,
    termMonths,
    kind,
    compounding,
    payoutMode,
    dayCount,
    monthlyTopUpMinor,
    startDate,
    taxEnabled,
    taxRate,
  ]);

  const chart = useMemo(() => {
    const contributed: number[] = [];
    const interest: number[] = [];
    const labels: string[] = [];

    let contributedSoFar = principalMinor;
    for (const p of result.periods) {
      if (p.flowsMinor > 0) contributedSoFar += p.flowsMinor;
      contributed.push(contributedSoFar);
      interest.push(Math.max(0, p.closingBalanceMinor - contributedSoFar));
      labels.push(formatDate(p.to, "short"));
    }

    return { contributed, interest, labels };
  }, [result, principalMinor]);

  const maturity = addMonthsClamped(startDate, termMonths);
  const gain = result.finalBalanceMinor + result.totalPaidOutMinor - result.totalContributedMinor;

  return (
    <>
      <PageHeader
        title="Депозитный калькулятор"
        description="Расчёт вклада с учётом капитализации, пополнений, базы начисления и налога. Эффективная ставка считается по фактическому денежному потоку."
      />

      <div className="flex flex-col gap-5">
        {/* ── Параметры ─────────────────────────────────────────── */}
        <Card>
          <CardTitle hint="Ставку и условия берите из договора или карточки продукта банка.">
            Параметры вклада
          </CardTitle>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Сумма вклада" htmlFor="principal">
              <MoneyInput id="principal" valueMinor={principalMinor} onChange={setPrincipalMinor} />
            </Field>

            <Field label="Ставка, годовых" htmlFor="rate">
              <RateInput id="rate" value={rate} onChange={setRate} />
            </Field>

            <Field label="Срок" htmlFor="term">
              <NumberInput id="term" value={termMonths} onChange={setTermMonths} suffix="мес" min={1} max={360} />
            </Field>

            <Field label="Дата открытия" htmlFor="start">
              <DateInput id="start" value={startDate} onChange={setStartDate} />
            </Field>

            <Field label="Вид вклада" htmlFor="kind" hint={DEPOSIT_KIND_HINTS[kind]}>
              <Select id="kind" value={kind} onChange={setKind} options={KIND_OPTIONS} />
            </Field>

            <Field label="Ежемесячное пополнение" htmlFor="topup" hint="0 — без пополнений">
              <MoneyInput id="topup" valueMinor={monthlyTopUpMinor} onChange={setMonthlyTopUpMinor} />
            </Field>

            <Field label="Капитализация" htmlFor="compounding">
              <Select
                id="compounding"
                value={compounding}
                onChange={setCompounding}
                options={COMPOUNDING_OPTIONS}
              />
            </Field>

            <Field
              label="База начисления"
              htmlFor="daycount"
              hint="Банки редко публикуют базу, а разница в деньгах заметна."
            >
              <Select id="daycount" value={dayCount} onChange={setDayCount} options={DAY_COUNT_OPTIONS} />
            </Field>
          </div>

          <div className="mt-5 flex flex-col gap-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">Вознаграждение</span>
              <SegmentedControl
                value={payoutMode}
                onChange={setPayoutMode}
                options={[
                  { value: "capitalize", label: "Причисляется к вкладу" },
                  { value: "payout", label: "Выплата на карту" },
                ]}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Toggle
                checked={taxEnabled}
                onChange={setTaxEnabled}
                label="Удерживать ИПН с вознаграждения"
                hint="По умолчанию выключено — налоговый режим требует проверки."
              />
              {taxEnabled && (
                <div className="w-28">
                  <RateInput value={taxRate} onChange={setTaxRate} />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Итоги ─────────────────────────────────────────────── */}
        <Card>
          <CardTitle hint={`Дата закрытия вклада — ${formatDate(maturity, "long")}`}>Результат</CardTitle>

          <StatGrid cols={4}>
            <Stat
              label={payoutMode === "payout" ? "Остаток на вкладе" : "Сумма в конце срока"}
              value={formatMoney(result.finalBalanceMinor)}
              sub={`внесено ${formatMoneyCompact(result.totalContributedMinor)}`}
            />
            <Stat
              label={payoutMode === "payout" ? "Выплачено на карту" : "Вознаграждение"}
              value={formatMoney(payoutMode === "payout" ? result.totalPaidOutMinor : result.totalInterestNetMinor)}
              sub={result.totalTaxMinor > 0 ? `удержан налог ${formatMoney(result.totalTaxMinor)}` : undefined}
              tone="positive"
            />
            <Stat
              label="Эффективная ставка"
              value={result.effectiveRateConverged ? formatRate(result.effectiveAnnualRate) : "—"}
              sub={`номинальная ${formatRate(result.nominalAnnualRate)}`}
            />
            <Stat
              label="Доход к вложенному"
              value={formatRate(result.totalContributedMinor > 0 ? gain / result.totalContributedMinor : 0)}
              sub={`за ${termMonths} мес.`}
            />
          </StatGrid>

          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Гарантия КФГД</span>
              {result.kdif.covered ? (
                <Badge tone="positive" icon="check">
                  сумма покрыта полностью
                </Badge>
              ) : (
                <Badge tone="warning" icon="alert">
                  не покрыто {formatMoney(result.kdif.uncoveredMinor)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted">
              Предел для вида «{DEPOSIT_KIND_LABELS[kind].toLowerCase()}» в тенге —{" "}
              {formatMoney(result.kdif.limitMinor)} на один банк. Гарантия по каждому банку считается
              отдельно.
            </p>
          </div>

          {result.warnings.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {result.warnings.map((w) => (
                <Note
                  key={w.code}
                  tone={w.severity === "error" ? "negative" : w.severity === "warning" ? "warning" : "neutral"}
                  icon={w.severity === "info" ? "info" : "alert"}
                >
                  {w.message}
                </Note>
              ))}
            </div>
          )}
        </Card>

        {/* ── График ────────────────────────────────────────────── */}
        {payoutMode === "capitalize" && (
          <Card>
            <CardTitle hint="Наведите на график, чтобы увидеть значения за месяц.">
              Как растёт вклад
            </CardTitle>
            <StackedAreaChart
              ariaLabel="Рост суммы вклада по месяцам: внесённые средства и накопленное вознаграждение"
              series={[
                { key: "contributed", label: "Внесено", color: "chart-2", values: chart.contributed },
                { key: "interest", label: "Вознаграждение", color: "chart-1", values: chart.interest },
              ]}
              xLabels={chart.labels}
              formatValue={(v) => formatMoney(v)}
              formatAxis={(v) => formatMoneyCompact(v)}
            />
          </Card>
        )}

        {/* ── Расписание ────────────────────────────────────────── */}
        <Card padded={false}>
          <button
            type="button"
            onClick={() => setShowSchedule((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-sm font-semibold">Расписание по месяцам</span>
            <span className="text-xs text-muted">
              {showSchedule ? "скрыть" : `показать ${result.periods.length} строк`}
            </span>
          </button>

          {showSchedule && (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full min-w-[42rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-5 py-2 font-medium">Месяц</th>
                    <th className="px-3 py-2 text-right font-medium">Остаток на начало</th>
                    <th className="px-3 py-2 text-right font-medium">Пополнение</th>
                    <th className="px-3 py-2 text-right font-medium">Начислено</th>
                    {taxEnabled && <th className="px-3 py-2 text-right font-medium">Налог</th>}
                    <th className="px-5 py-2 text-right font-medium">Остаток на конец</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.periods.map((p) => (
                    <tr key={p.index}>
                      <td className="px-5 py-2">
                        <span className="text-muted">{p.index}.</span> {formatDate(p.to, "short")}
                      </td>
                      <td className="tabular px-3 py-2 text-right">{formatMoney(p.openingBalanceMinor)}</td>
                      <td className="tabular px-3 py-2 text-right text-muted">
                        {p.flowsMinor === 0 ? "—" : formatMoney(p.flowsMinor)}
                      </td>
                      <td className="tabular px-3 py-2 text-right text-positive">
                        {formatMoney(p.interestAccruedMinor)}
                      </td>
                      {taxEnabled && (
                        <td className="tabular px-3 py-2 text-right text-muted">
                          {formatMoney(p.taxWithheldMinor)}
                        </td>
                      )}
                      <td className="tabular px-5 py-2 text-right font-medium">
                        {formatMoney(p.closingBalanceMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <UnverifiedBanner assumptions={result.assumptions} />
        <AssumptionsPanel assumptions={result.assumptions} />
      </div>
    </>
  );
}

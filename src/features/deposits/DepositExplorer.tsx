"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DEPOSIT_KIND_LABELS, type DepositKind, buildDepositSchedule } from "@/domain/deposit";
import { DEFAULT_ROUNDING, type Currency } from "@/domain/money";
import { diffDays } from "@/domain/time";
import { getConstantSet } from "@/data/constants";
import type { Bank, DepositProduct, RateRecord } from "@/data/types";
import { formatDate, formatMoney, formatMoneyCompact, formatRate } from "@/lib/format";
import { useToday } from "@/lib/useToday";
import { Badge, Card, EmptyState, Icon, Note, Stat, StatGrid } from "@/components/ui";
import { Field, MoneyInput, SegmentedControl, Select } from "@/components/ui/inputs";
import { ConfidenceBadge } from "@/components/trust";

interface Row {
  readonly product: DepositProduct;
  readonly bank: Bank;
  readonly rate: RateRecord;
  readonly effectiveRate: number;
  readonly finalBalanceMinor: number;
  readonly interestMinor: number;
  readonly kdifLimitMinor: number;
  readonly kdifCovered: boolean;
  readonly staleDays: number;
}

export function DepositExplorer({
  products,
  banks,
  rates,
  today: serverToday,
}: {
  products: readonly DepositProduct[];
  banks: readonly Bank[];
  rates: readonly RateRecord[];
  today: string;
}) {
  const today = useToday(serverToday);
  const [amountMinor, setAmountMinor] = useState(100_000_000); // 1 000 000 ₸
  const [currency, setCurrency] = useState<Currency>("KZT");
  const [kind, setKind] = useState<DepositKind | "all">("all");
  const [needsTopUp, setNeedsTopUp] = useState<"any" | "yes">("any");
  const [needsWithdrawal, setNeedsWithdrawal] = useState<"any" | "yes">("any");

  const constants = useMemo(() => getConstantSet(today), [today]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];

    for (const product of products) {
      if (product.currency !== currency) continue;
      if (kind !== "all" && product.kind !== kind) continue;
      if (needsTopUp === "yes" && !product.topUpAllowed) continue;
      if (needsWithdrawal === "yes" && !product.partialWithdrawalAllowed) continue;

      const bank = banks.find((b) => b.id === product.bankId);
      const rate = rates.find((r) => r.productId === product.id && r.supersededAt === undefined);
      if (!bank || !rate) continue;

      // ГЭСВ считаем своим движком по фактическому денежному потоку —
      // так все продукты сравниваются на одинаковых допущениях.
      const result = buildDepositSchedule(
        {
          currency: product.currency,
          kind: product.kind,
          principalMinor: amountMinor,
          rates: { base: rate.nominalAnnualRate },
          startDate: today,
          termMonths: product.termMonths,
          compounding: product.compounding,
          payoutMode: product.payoutMode,
          dayCount: product.dayCount,
          flows: [],
          tax: { kind: "none" },
          rounding: DEFAULT_ROUNDING,
          constraints: {
            minAmountMinor: product.minAmountMinor,
            topUpAllowed: product.topUpAllowed,
            partialWithdrawalAllowed: product.partialWithdrawalAllowed,
            topUpCutoffMonths: product.topUpCutoffMonths,
          },
        },
        constants,
      );

      out.push({
        product,
        bank,
        rate,
        effectiveRate: result.effectiveAnnualRate,
        finalBalanceMinor: result.finalBalanceMinor,
        interestMinor: result.totalInterestNetMinor,
        kdifLimitMinor: result.kdif.limitMinor,
        kdifCovered: result.kdif.covered,
        staleDays: diffDays(rate.verifiedAt, today),
      });
    }

    return out.sort((a, b) => b.effectiveRate - a.effectiveRate);
  }, [products, banks, rates, currency, kind, needsTopUp, needsWithdrawal, amountMinor, today, constants]);

  const best = rows[0];
  const kindOptions = [
    { value: "all" as const, label: "Все виды" },
    ...(Object.keys(DEPOSIT_KIND_LABELS) as DepositKind[]).map((k) => ({
      value: k,
      label: DEPOSIT_KIND_LABELS[k],
    })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <Note tone="warning" icon="alert">
        <p className="font-medium">Ставки в каталоге не сверены с банками</p>
        <p className="mt-0.5 text-muted">
          Это стартовый набор для сравнения условий: структура продуктов реальна, а проценты —
          ориентировочные. Перед открытием вклада проверьте ставку на сайте банка по ссылке
          в карточке.
        </p>
      </Note>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Сумма для сравнения" htmlFor="amount">
            <MoneyInput
              id="amount"
              valueMinor={amountMinor}
              onChange={setAmountMinor}
              suffix={currency === "KZT" ? "₸" : currency}
            />
          </Field>

          <Field label="Валюта">
            <SegmentedControl
              value={currency}
              onChange={setCurrency}
              options={[
                { value: "KZT" as Currency, label: "Тенге" },
                { value: "USD" as Currency, label: "Доллары" },
              ]}
            />
          </Field>

          <Field label="Вид вклада" htmlFor="kind">
            <Select id="kind" value={kind} onChange={setKind} options={kindOptions} />
          </Field>

          <div className="flex flex-col gap-3">
            <Field label="Пополнение">
              <SegmentedControl
                value={needsTopUp}
                onChange={setNeedsTopUp}
                options={[
                  { value: "any" as const, label: "Неважно" },
                  { value: "yes" as const, label: "Нужно" },
                ]}
              />
            </Field>
            <Field label="Частичное изъятие">
              <SegmentedControl
                value={needsWithdrawal}
                onChange={setNeedsWithdrawal}
                options={[
                  { value: "any" as const, label: "Неважно" },
                  { value: "yes" as const, label: "Нужно" },
                ]}
              />
            </Field>
          </div>
        </div>
      </Card>

      {best && (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <Badge tone="accent" icon="check">
              лучшая доходность по фильтру
            </Badge>
            <span className="text-sm font-medium">
              {best.bank.name} · {best.product.name}
            </span>
          </div>
          <StatGrid cols={3}>
            <Stat
              label="Эффективная ставка"
              value={formatRate(best.effectiveRate)}
              sub={`номинальная ${formatRate(best.rate.nominalAnnualRate)}`}
              tone="positive"
            />
            <Stat
              label={`Вознаграждение за ${best.product.termMonths} мес.`}
              value={formatMoney(best.interestMinor, best.product.currency)}
            />
            <Stat
              label="Сумма в конце срока"
              value={formatMoney(best.finalBalanceMinor, best.product.currency)}
            />
          </StatGrid>
        </Card>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon="bank"
          title="Под эти условия ничего не подошло"
          description="Смягчите фильтры: например, снимите требование пополнения или частичного изъятия."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Card key={row.product.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-fg">{row.bank.name}</span>
                    <span className="text-muted">·</span>
                    <span className="text-fg">{row.product.name}</span>
                    {row.bank.kind === "housing" && (
                      <Badge tone="neutral" title="Жилищный строительный сберегательный банк">
                        жилищный
                      </Badge>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>{DEPOSIT_KIND_LABELS[row.product.kind]}</span>
                    <span>{row.product.termMonths} мес.</span>
                    {row.product.minAmountMinor !== undefined && (
                      <span>от {formatMoneyCompact(row.product.minAmountMinor, row.product.currency)}</span>
                    )}
                    <span className={row.product.topUpAllowed ? "text-positive" : undefined}>
                      {row.product.topUpAllowed ? "с пополнением" : "без пополнения"}
                    </span>
                    <span className={row.product.partialWithdrawalAllowed ? "text-positive" : undefined}>
                      {row.product.partialWithdrawalAllowed ? "с изъятием" : "без изъятия"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ConfidenceBadge confidence={row.rate.confidence} />
                    <span className="text-xs text-faint">
                      внесено {formatDate(row.rate.verifiedAt)}
                      {row.staleDays > 90 && ` · ${row.staleDays} дней назад`}
                    </span>
                    <a
                      href={row.rate.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted underline decoration-border underline-offset-2 hover:text-fg"
                    >
                      проверить на сайте
                      <Icon name="external" size={11} />
                    </a>
                  </div>
                </div>

                <div className="text-right">
                  <div className="tabular text-xl font-semibold tracking-tight text-fg">
                    {formatRate(row.effectiveRate)}
                  </div>
                  <div className="text-xs text-faint">
                    эффективная · номинал {formatRate(row.rate.nominalAnnualRate)}
                  </div>
                  <div className="tabular mt-1 text-sm text-positive">
                    +{formatMoney(row.interestMinor, row.product.currency)}
                  </div>
                  {!row.kdifCovered && (
                    <div className="mt-1.5">
                      <Badge tone="warning" icon="alert" title="Сумма превышает гарантию КФГД">
                        сверх гарантии
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 border-t border-border pt-3">
                <Link
                  href={`/deposits/calculator?amount=${amountMinor}&rate=${row.rate.nominalAnnualRate}&term=${row.product.termMonths}&kind=${row.product.kind}&compounding=${row.product.compounding}`}
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                >
                  Посчитать подробно
                  <Icon name="chevronRight" size={14} />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-faint">
        Эффективная ставка рассчитана нашим движком по фактическому денежному потоку на одинаковых
        допущениях для всех продуктов, поэтому может отличаться от ГЭСВ, публикуемой банком.
        База начисления везде принята как ACT/365 — банки её обычно не раскрывают.
      </p>
    </div>
  );
}

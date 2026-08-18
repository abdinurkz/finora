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
import { Badge, Card, EmptyState, Icon, Note } from "@/components/ui";
import { Field, MoneyInput, SegmentedControl, Select } from "@/components/ui/inputs";
import { ConfidenceMark } from "@/components/trust";

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
          в строке.
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

      {rows.length === 0 ? (
        <EmptyState
          icon="bank"
          title="Под эти условия ничего не подошло"
          description="Смягчите фильтры: например, снимите требование пополнения или частичного изъятия."
        />
      ) : (
        <Card padded={false}>
          {/* Таблица шире мобильного экрана, поэтому скроллится внутри себя,
              а не растягивает страницу по горизонтали. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-faint">
                  <th scope="col" className="px-4 py-2.5">Банк и продукт</th>
                  <th scope="col" className="px-2.5 py-2.5">Вид</th>
                  <th scope="col" className="px-2.5 py-2.5 text-right">Срок</th>
                  <th scope="col" className="px-2.5 py-2.5 text-right">Мин. сумма</th>
                  <th scope="col" className="px-2.5 py-2.5">Условия</th>
                  <th scope="col" className="px-2.5 py-2.5 text-right">Номинал</th>
                  <th scope="col" className="px-2.5 py-2.5 text-right">Эффективная</th>
                  <th scope="col" className="px-2.5 py-2.5 text-right">Вознаграждение</th>
                  <th scope="col" className="px-2.5 py-2.5">
                    {/* Подпись только для скринридера: в ячейках две иконки,
                        и слово «Источник» растягивало бы колонку втрое. */}
                    <span className="sr-only">Источник</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.product.id} className="transition-colors hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <Link
                        href={`/deposits/calculator?amount=${amountMinor}&rate=${row.rate.nominalAnnualRate}&term=${row.product.termMonths}&kind=${row.product.kind}&compounding=${row.product.compounding}`}
                        title="Посчитать подробно"
                        className="font-medium text-fg hover:text-accent hover:underline"
                      >
                        {row.product.name}
                      </Link>
                      <div className="text-xs text-muted">{row.bank.name}</div>
                    </td>

                    <td className="px-2.5 py-3 text-muted">{DEPOSIT_KIND_LABELS[row.product.kind]}</td>

                    <td className="tabular px-2.5 py-3 text-right text-muted whitespace-nowrap">
                      {row.product.termMonths} мес.
                    </td>

                    <td className="tabular px-2.5 py-3 text-right text-muted whitespace-nowrap">
                      {row.product.minAmountMinor === undefined
                        ? "—"
                        : formatMoneyCompact(row.product.minAmountMinor, row.product.currency)}
                    </td>

                    <td className="px-2.5 py-3 text-xs whitespace-nowrap">
                      <div className={row.product.topUpAllowed ? "text-positive" : "text-faint"}>
                        {row.product.topUpAllowed ? "с пополнением" : "без пополнения"}
                      </div>
                      <div
                        className={row.product.partialWithdrawalAllowed ? "text-positive" : "text-faint"}
                      >
                        {row.product.partialWithdrawalAllowed ? "с изъятием" : "без изъятия"}
                      </div>
                    </td>

                    <td className="tabular px-2.5 py-3 text-right text-muted">
                      {formatRate(row.rate.nominalAnnualRate)}
                    </td>

                    <td className="tabular px-2.5 py-3 text-right font-semibold text-fg">
                      {formatRate(row.effectiveRate)}
                    </td>

                    <td className="px-2.5 py-3 text-right whitespace-nowrap">
                      <div className="tabular text-positive">
                        +{formatMoney(row.interestMinor, row.product.currency)}
                      </div>
                      {!row.kdifCovered && (
                        <Badge
                          tone="warning"
                          icon="alert"
                          title="Сумма превышает гарантию КФГД"
                          className="mt-1"
                        >
                          сверх гарантии
                        </Badge>
                      )}
                    </td>

                    <td className="px-2.5 py-3">
                      <div className="flex items-center gap-2">
                        <ConfidenceMark confidence={row.rate.confidence} />
                        <a
                          href={row.rate.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Проверить ставку на сайте: ${row.bank.name}`}
                          title={`Внесено ${formatDate(row.rate.verifiedAt)}${
                            row.staleDays > 90 ? ` · ${row.staleDays} дней назад` : ""
                          }`}
                          className="text-muted transition-colors hover:text-fg"
                        >
                          <Icon name="external" size={13} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-faint">
        Строки отсортированы по эффективной ставке. Она рассчитана нашим движком по фактическому
        денежному потоку на одинаковых допущениях для всех продуктов, поэтому может отличаться
        от ГЭСВ, публикуемой банком. База начисления везде принята как ACT/365 — банки её обычно
        не раскрывают.
      </p>
    </div>
  );
}

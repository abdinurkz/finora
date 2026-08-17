"use client";

import { useMemo, useState } from "react";
import { allCashbackCategories, bestCardsFor } from "@/data/cashback";
import type { Bank, CashbackProgram } from "@/data/types";
import { formatDate, formatMoney, formatRate } from "@/lib/format";
import { Badge, Card, CardTitle, Icon, Note, Stat, StatGrid } from "@/components/ui";
import { Field, MoneyInput, Select } from "@/components/ui/inputs";
import { ConfidenceBadge } from "@/components/trust";

const REDEMPTION_LABELS: Record<CashbackProgram["redemption"], string> = {
  cash: "деньгами",
  "bonus-only": "только бонусами",
  "partner-only": "только у партнёров",
};

export function CashbackExplorer({
  programs,
  banks,
}: {
  programs: readonly CashbackProgram[];
  banks: readonly Bank[];
}) {
  const categories = useMemo(() => allCashbackCategories(), []);
  const [category, setCategory] = useState(categories[0] ?? "");
  const [monthlySpendMinor, setMonthlySpendMinor] = useState(20_000_00);

  const matches = useMemo(() => bestCardsFor(category), [category]);
  const best = matches[0];

  const bankName = (id: string) => banks.find((b) => b.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-5">
      <Note tone="warning" icon="alert">
        <p className="font-medium">Проценты не сверены с банками</p>
        <p className="mt-0.5 text-muted">
          Существование программ — факт, конкретные ставки и лимиты — ориентировочные.
          У программ с ротацией категории меняются каждый месяц, поэтому сверяйтесь
          с приложением банка.
        </p>
      </Note>

      <Card>
        <CardTitle hint="Выберите категорию трат, и карты отсортируются по выгоде.">
          Какой картой платить
        </CardTitle>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Категория трат" htmlFor="category">
            <Select
              id="category"
              value={category}
              onChange={setCategory}
              options={categories.map((c) => ({ value: c, label: c }))}
            />
          </Field>

          <Field label="Траты в месяц по категории" htmlFor="spend">
            <MoneyInput id="spend" valueMinor={monthlySpendMinor} onChange={setMonthlySpendMinor} />
          </Field>
        </div>

        {best && (
          <div className="mt-5 border-t border-border pt-4">
            <StatGrid cols={3}>
              <Stat
                label="Лучшая ставка"
                value={formatRate(best.rate)}
                sub={`${bankName(best.program.bankId)} · ${best.program.name}`}
                tone="positive"
              />
              <Stat
                label="Вернётся за месяц"
                value={formatMoney(Math.round(monthlySpendMinor * best.rate))}
                sub={REDEMPTION_LABELS[best.program.redemption]}
              />
              <Stat
                label="За год"
                value={formatMoney(Math.round(monthlySpendMinor * best.rate * 12))}
                sub="при тех же тратах"
              />
            </StatGrid>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        {matches.map((match, index) => {
          const gain = Math.round(monthlySpendMinor * match.rate);
          return (
            <Card key={match.program.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {index === 0 && (
                      <Badge tone="accent" icon="check">
                        лучшее
                      </Badge>
                    )}
                    <span className="font-medium text-fg">{bankName(match.program.bankId)}</span>
                    <span className="text-muted">·</span>
                    <span className="text-fg">{match.program.name}</span>
                    {match.program.rotates && (
                      <Badge tone="warning" title="Категории меняются каждый месяц">
                        ротация категорий
                      </Badge>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    {match.program.cardProduct && <span>{match.program.cardProduct}</span>}
                    <span>возврат {REDEMPTION_LABELS[match.program.redemption]}</span>
                    <span>по категории: {match.category}</span>
                  </div>

                  {match.conditions && (
                    <p className="mt-1.5 text-xs text-warning">{match.conditions}</p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ConfidenceBadge confidence={match.program.confidence} />
                    <span className="text-xs text-faint">
                      внесено {formatDate(match.program.verifiedAt)}
                    </span>
                    <a
                      href={match.program.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted underline decoration-border underline-offset-2 hover:text-fg"
                    >
                      условия банка
                      <Icon name="external" size={11} />
                    </a>
                  </div>
                </div>

                <div className="text-right">
                  <div className="tabular text-xl font-semibold tracking-tight text-fg">
                    {formatRate(match.rate)}
                  </div>
                  <div className="tabular mt-0.5 text-sm text-positive">
                    +{formatMoney(gain)} / мес.
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardTitle hint="Полные условия программ, независимо от выбранной категории.">
          Все программы
        </CardTitle>
        <div className="flex flex-col divide-y divide-border">
          {programs.map((program) => (
            <div key={program.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-fg">
                  {bankName(program.bankId)} · {program.name}
                </span>
                {program.rotates && <Badge tone="warning">ротация</Badge>}
              </div>
              <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                {program.categories.map((c) => (
                  <li key={c.label} className="text-xs text-muted">
                    {c.label} — <span className="tabular font-medium text-fg">{formatRate(c.rate)}</span>
                    {c.capMinor !== undefined && ` (до ${formatMoney(c.capMinor)})`}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

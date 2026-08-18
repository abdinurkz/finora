"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  monthlyTotalMinor,
  totalsByCategory,
  upcomingPayments,
  yearlyTotalMinor,
} from "@/domain/recurring/payment";
import { usePayments } from "@/persistence/hooks";
import { formatDate, formatDays, formatMoney, formatMoneyCompact, formatRate, plural } from "@/lib/format";
import { useToday } from "@/lib/useToday";
import { Badge, Card, CardTitle, EmptyState, Icon, Stat, StatGrid } from "@/components/ui";

export function Dashboard({ today: serverToday }: { today: string }) {
  const today = useToday(serverToday);
  const { payments, status } = usePayments();

  const subscriptions = useMemo(() => payments.filter((p) => p.kind === "subscription"), [payments]);
  const expenses = useMemo(() => payments.filter((p) => p.kind === "fixedExpense"), [payments]);

  const monthlyAll = monthlyTotalMinor(payments, today);
  const monthlySubs = monthlyTotalMinor(subscriptions, today);
  const monthlyExpenses = monthlyTotalMinor(expenses, today);
  const yearlyAll = yearlyTotalMinor(payments, today);

  const upcoming = useMemo(() => upcomingPayments(payments, today, 30), [payments, today]);
  const categories = useMemo(() => totalsByCategory(payments, today), [payments, today]);

  const hasData = payments.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {status === "loading" ? (
        <Card>
          <div className="h-24 animate-pulse rounded-lg bg-surface-2" />
        </Card>
      ) : !hasData ? (
        <EmptyState
          icon="wallet"
          title="Пока нет регулярных платежей"
          description="Добавьте подписки и фиксированные расходы — здесь появятся обязательства месяца и календарь ближайших списаний."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/subscriptions"
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg"
              >
                Добавить подписку
              </Link>
              <Link
                href="/expenses"
                className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-fg"
              >
                Добавить расход
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <Card>
            <CardTitle hint="Всё, что списывается регулярно, в пересчёте на один месяц.">
              Обязательства месяца
            </CardTitle>
            <StatGrid cols={4}>
              <Stat label="Всего в месяц" value={formatMoney(monthlyAll)} tone="negative" />
              <Stat
                label="Подписки"
                value={formatMoney(monthlySubs)}
                sub={`${subscriptions.length} ${plural(subscriptions.length, {
                  one: "штука",
                  few: "штуки",
                  many: "штук",
                })}`}
              />
              <Stat
                label="Фиксированные расходы"
                value={formatMoney(monthlyExpenses)}
                sub={`${expenses.length} ${plural(expenses.length, {
                  one: "штука",
                  few: "штуки",
                  many: "штук",
                })}`}
              />
              <Stat label="За год" value={formatMoneyCompact(yearlyAll)} sub="при текущем наборе" />
            </StatGrid>
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card padded={false}>
              <div className="px-5 pb-3 pt-5">
                <CardTitle hint="Ближайшие 30 дней" className="mb-0">
                  Календарь платежей
                </CardTitle>
              </div>
              {upcoming.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-muted">В ближайший месяц списаний нет.</p>
              ) : (
                <ul className="divide-y divide-border border-t border-border">
                  {upcoming.slice(0, 8).map(({ payment, date, daysUntil }) => (
                    <li key={`${payment.id}-${date}`} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-fg">{payment.title}</div>
                        <div className="text-xs text-faint">
                          {formatDate(date, "dayMonth")}
                          {daysUntil === 0
                            ? " · сегодня"
                            : daysUntil === 1
                              ? " · завтра"
                              : ` · через ${formatDays(daysUntil)}`}
                        </div>
                      </div>
                      <span className="tabular shrink-0 text-sm font-medium">
                        {formatMoney(payment.amountMinor, payment.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {upcoming.length > 8 && (
                <p className="border-t border-border px-5 py-2.5 text-xs text-faint">
                  и ещё {upcoming.length - 8}
                </p>
              )}
            </Card>

            <Card padded={false}>
              <div className="px-5 pb-3 pt-5">
                <CardTitle hint="Доля в месячных обязательствах" className="mb-0">
                  По категориям
                </CardTitle>
              </div>
              <ul className="divide-y divide-border border-t border-border">
                {categories.slice(0, 8).map(({ category, monthlyMinor }) => {
                  const share = monthlyAll > 0 ? monthlyMinor / monthlyAll : 0;
                  return (
                    <li key={category} className="px-5 py-2.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-fg">{category}</span>
                        <span className="tabular shrink-0 font-medium">{formatMoney(monthlyMinor)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full bg-chart-1"
                            style={{ width: `${Math.max(2, share * 100)}%` }}
                          />
                        </div>
                        <span className="tabular w-10 shrink-0 text-right text-xs text-faint">
                          {formatRate(share, 0)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </>
      )}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-faint">Калькуляторы</h2>
        <div className="grid grid-cols-1 gap-3">
          {[
            { href: "/deposits/calculator", icon: "calculator", label: "Депозит", hint: "Расчёт вклада и ГЭСВ" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full transition-colors group-hover:border-border-strong">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-accent-soft p-2 text-accent">
                    <Icon name={item.icon} size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-fg">{item.label}</div>
                    <p className="mt-0.5 text-sm text-muted">{item.hint}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-faint">Справочники БВУ</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { href: "/deposits", icon: "bank", label: "Депозиты", hint: "Ставки с датой актуальности" },
            { href: "/cashback", icon: "card", label: "Кэшбэк", hint: "Подбор карты по категории" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full transition-colors group-hover:border-border-strong">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-surface-2 p-2 text-muted">
                    <Icon name={item.icon} size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-fg">{item.label}</div>
                    <p className="mt-0.5 text-sm text-muted">{item.hint}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-xs text-faint">
        <Badge tone="neutral" icon="database" className="mr-1.5">
          local-first
        </Badge>
        Данные хранятся только на этом устройстве и никуда не отправляются.
      </p>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { describeRecurrence, monthlyEquivalentMinor, nextOccurrence } from "@/domain/recurring";
import {
  EXPENSE_TYPE_LABELS,
  type PaymentKind,
  type RecurringPayment,
  isActive,
  monthlyTotalMinor,
  upcomingPayments,
  yearlyTotalMinor,
} from "@/domain/recurring/payment";
import { diffDays } from "@/domain/time";
import { usePayments } from "@/persistence/hooks";
import { formatDate, formatDays, formatMoney, formatMoneyCompact, plural } from "@/lib/format";
import { useToday } from "@/lib/useToday";
import { Badge, Card, EmptyState, Icon, Note, PageHeader, Stat, StatGrid } from "@/components/ui";
import { PaymentForm } from "./PaymentForm";

function DueBadge({ days }: { days: number }) {
  if (days === 0) return <Badge tone="warning" icon="clock">сегодня</Badge>;
  if (days === 1) return <Badge tone="warning" icon="clock">завтра</Badge>;
  if (days <= 7) return <Badge tone="accent" icon="clock">через {formatDays(days)}</Badge>;
  return <Badge tone="neutral">через {formatDays(days)}</Badge>;
}

export function PaymentsView({
  kind,
  today: serverToday,
  title,
  description,
}: {
  kind: PaymentKind;
  today: string;
  title: string;
  description: string;
}) {
  const today = useToday(serverToday);
  const { payments, status, errors, save, remove } = usePayments();
  const [editing, setEditing] = useState<RecurringPayment | null>(null);
  const [adding, setAdding] = useState(false);

  const mine = useMemo(() => payments.filter((p) => p.kind === kind), [payments, kind]);

  const rows = useMemo(() => {
    return mine
      .map((payment) => {
        const next = nextOccurrence(payment.recurrence, today, true);
        return {
          payment,
          next,
          daysUntil: next === null ? null : diffDays(today, next),
          monthlyMinor: monthlyEquivalentMinor(payment.amountMinor, payment.recurrence),
        };
      })
      .sort((a, b) => {
        // Активные и ближайшие — наверх; неактивные уходят вниз списка.
        const aActive = isActive(a.payment, today);
        const bActive = isActive(b.payment, today);
        if (aActive !== bActive) return aActive ? -1 : 1;
        if (a.next === null) return 1;
        if (b.next === null) return -1;
        return a.next.localeCompare(b.next);
      });
  }, [mine, today]);

  const monthly = monthlyTotalMinor(mine, today);
  const yearly = yearlyTotalMinor(mine, today);
  const soon = upcomingPayments(mine, today, 7);
  const soonTotal = soon.reduce((acc, u) => acc + u.payment.amountMinor, 0);

  const isSubscription = kind === "subscription";

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          !adding &&
          !editing && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg"
            >
              <Icon name="plus" size={16} />
              Добавить
            </button>
          )
        }
      />

      <div className="flex flex-col gap-5">
        {errors.length > 0 && (
          <Note tone="warning" icon="alert">
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </Note>
        )}

        {(adding || editing) && (
          <PaymentForm
            kind={kind}
            initial={editing ?? undefined}
            today={today}
            onSave={(payment) => {
              save(payment);
              setAdding(false);
              setEditing(null);
            }}
            onCancel={() => {
              setAdding(false);
              setEditing(null);
            }}
          />
        )}

        {status === "loading" ? (
          <Card>
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-2" />
              ))}
            </div>
          </Card>
        ) : mine.length === 0 ? (
          <EmptyState
            icon={isSubscription ? "repeat" : "receipt"}
            title={isSubscription ? "Подписок пока нет" : "Расходов пока нет"}
            description={
              isSubscription
                ? "Добавьте регулярные списания, чтобы видеть день платежа и сумму за месяц."
                : "Добавьте аренду, коммуналку и кредиты, чтобы видеть обязательные платежи месяца."
            }
            action={
              !adding && (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg"
                >
                  Добавить первую запись
                </button>
              )
            }
          />
        ) : (
          <>
            <Card>
              <StatGrid cols={3}>
                <Stat label="В месяц" value={formatMoney(monthly)} sub="с учётом периодичности" />
                <Stat
                  label="За год"
                  value={formatMoney(yearly)}
                  sub={`${mine.length} ${plural(mine.length, {
                    one: "запись",
                    few: "записи",
                    many: "записей",
                  })}`}
                />
                <Stat
                  label="В ближайшие 7 дней"
                  value={formatMoney(soonTotal)}
                  sub={
                    soon.length === 0
                      ? "списаний нет"
                      : `${soon.length} ${plural(soon.length, {
                          one: "списание",
                          few: "списания",
                          many: "списаний",
                        })}`
                  }
                  tone={soon.length > 0 ? "negative" : "neutral"}
                />
              </StatGrid>
            </Card>

            <Card padded={false}>
              <ul className="divide-y divide-border">
                {rows.map(({ payment, next, daysUntil, monthlyMinor }) => {
                  const active = isActive(payment, today);
                  return (
                    <li key={payment.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={active ? "font-medium text-fg" : "text-muted line-through"}>
                            {payment.title}
                          </span>
                          {payment.amountKind === "variable" && (
                            <Badge tone="neutral" title="Сумма меняется от месяца к месяцу">
                              плавающая
                            </Badge>
                          )}
                          {payment.status === "paused" && <Badge tone="warning">приостановлен</Badge>}
                          {payment.status === "cancelled" && <Badge tone="neutral">отменён</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {payment.kind === "fixedExpense"
                            ? EXPENSE_TYPE_LABELS[payment.expenseType]
                            : payment.categoryId}
                          {" · "}
                          {describeRecurrence(payment.recurrence)}
                          {monthlyMinor !== payment.amountMinor && (
                            <> · {formatMoneyCompact(monthlyMinor, payment.currency)} в месяц</>
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="tabular text-sm font-medium">
                          {formatMoney(payment.amountMinor, payment.currency)}
                        </div>
                        {active && next !== null && daysUntil !== null ? (
                          <div className="mt-1 flex items-center justify-end gap-1.5">
                            <span className="text-xs text-faint">{formatDate(next, "dayMonth")}</span>
                            <DueBadge days={daysUntil} />
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-faint">списаний не будет</div>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(payment);
                            setAdding(false);
                          }}
                          aria-label={`Изменить «${payment.title}»`}
                          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                        >
                          <Icon name="pencil" size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(payment.id)}
                          aria-label={`Удалить «${payment.title}»`}
                          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-negative-soft hover:text-negative"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </>
        )}

        <p className="text-xs text-faint">
          Данные хранятся только в этом браузере. Сделайте резервную копию в разделе{" "}
          <a href="/data" className="underline underline-offset-2 hover:text-muted">
            «Данные и источники»
          </a>
          .
        </p>
      </div>
    </>
  );
}

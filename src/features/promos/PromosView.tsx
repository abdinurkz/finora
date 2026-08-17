"use client";

import { useMemo, useState } from "react";
import { PROMOTION_KIND_LABELS, type Promotion, type PromotionKind } from "@/data/types";
import type { Bank } from "@/data/types";
import { activePromotions, daysLeft, isExpired, isUpcoming } from "@/data/promos";
import { newId } from "@/domain/recurring/payment";
import { usePromotions } from "@/persistence/hooks";
import { formatDate, formatDays } from "@/lib/format";
import { useToday } from "@/lib/useToday";
import { Badge, Card, CardTitle, EmptyState, Icon, Note, Stat, StatGrid } from "@/components/ui";
import { DateInput, Field, SegmentedControl, Select, TextInput } from "@/components/ui/inputs";

const KIND_OPTIONS = (Object.keys(PROMOTION_KIND_LABELS) as PromotionKind[]).map((k) => ({
  value: k,
  label: PROMOTION_KIND_LABELS[k],
}));

function PromoForm({
  banks,
  initial,
  today,
  onSave,
  onCancel,
}: {
  banks: readonly Bank[];
  initial?: Promotion;
  today: string;
  onSave: (promotion: Promotion) => void;
  onCancel: () => void;
}) {
  const [bankId, setBankId] = useState(initial?.bankId ?? banks[0]?.id ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [kind, setKind] = useState<PromotionKind>(initial?.kind ?? "deposit-rate");
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? today);
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [conditions, setConditions] = useState(initial?.conditions.join("\n") ?? "");

  const canSave = title.trim().length > 0 && bankId.length > 0;

  return (
    <Card>
      <CardTitle hint="Вносите только то, что видели на сайте банка — источник этой записи вы.">
        {initial ? "Изменить акцию" : "Новая акция"}
      </CardTitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Банк" htmlFor="bank">
          <Select
            id="bank"
            value={bankId}
            onChange={setBankId}
            options={banks.map((b) => ({ value: b.id, label: b.name }))}
          />
        </Field>

        <Field label="Тип акции" htmlFor="kind">
          <Select id="kind" value={kind} onChange={setKind} options={KIND_OPTIONS} />
        </Field>

        <Field label="Название" htmlFor="title">
          <TextInput id="title" value={title} onChange={setTitle} placeholder="+2 % к ставке по вкладу" />
        </Field>

        <Field label="Ссылка на страницу акции" htmlFor="url">
          <TextInput id="url" value={url} onChange={setUrl} placeholder="https://…" />
        </Field>

        <Field label="Начало" htmlFor="starts">
          <DateInput id="starts" value={startsAt} onChange={setStartsAt} />
        </Field>

        <Field label="Окончание" htmlFor="ends" hint="Пусто — акция бессрочная">
          <DateInput id="ends" value={endsAt} onChange={setEndsAt} />
        </Field>

        <Field label="Краткое описание" htmlFor="summary" className="sm:col-span-2">
          <TextInput id="summary" value={summary} onChange={setSummary} />
        </Field>

        <Field
          label="Условия"
          htmlFor="conditions"
          hint="По одному условию в строке"
          className="sm:col-span-2"
        >
          <textarea
            id="conditions"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
        <button
          type="button"
          disabled={!canSave}
          onClick={() =>
            onSave({
              id: initial?.id ?? newId(),
              bankId,
              title: title.trim(),
              summary: summary.trim(),
              kind,
              startsAt,
              endsAt: endsAt || undefined,
              conditions: conditions
                .split("\n")
                .map((c) => c.trim())
                .filter(Boolean),
              url: url.trim(),
              verifiedAt: today,
              confidence: "likely",
            })
          }
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-40"
        >
          {initial ? "Сохранить" : "Добавить"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg"
        >
          Отмена
        </button>
      </div>
    </Card>
  );
}

export function PromosView({ banks, today: serverToday }: { banks: readonly Bank[]; today: string }) {
  const today = useToday(serverToday);
  const { promotions, status, save, remove } = usePromotions();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [filter, setFilter] = useState<"active" | "all">("active");

  const bankName = (id: string) => banks.find((b) => b.id === id)?.name ?? id;

  const visible = useMemo(() => {
    if (filter === "active") return activePromotions(promotions, today);
    return [...promotions].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  }, [promotions, filter, today]);

  const running = activePromotions(promotions, today);
  const endingSoon = running.filter((p) => {
    const left = daysLeft(p, today);
    return left !== null && left <= 7;
  });

  return (
    <div className="flex flex-col gap-5">
      {(adding || editing) && (
        <PromoForm
          banks={banks}
          initial={editing ?? undefined}
          today={today}
          onSave={(promotion) => {
            save(promotion);
            setAdding(false);
            setEditing(null);
          }}
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      )}

      {status !== "loading" && promotions.length === 0 && !adding && (
        <>
          <Note tone="neutral" icon="info">
            <p className="font-medium">Почему каталог пуст</p>
            <p className="mt-0.5 text-muted">
              Акция — это конкретное утверждение «банк проводит такое-то предложение до такой-то
              даты». В отличие от ставки по вкладу, её нельзя внести «примерно»: придуманная акция
              с придуманным сроком вводит в заблуждение, даже если пометить её как непроверенную.
              Поэтому предложения вносите сами — отсчёт до окончания, фильтры и сортировка уже
              работают.
            </p>
          </Note>

          <EmptyState
            icon="tag"
            title="Акций пока нет"
            description="Добавьте предложение, которое увидели на сайте банка, — оно сохранится в этом браузере."
            action={
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg"
              >
                Добавить акцию
              </button>
            }
          />
        </>
      )}

      {promotions.length > 0 && (
        <>
          <Card>
            <StatGrid cols={3}>
              <Stat label="Действуют сейчас" value={String(running.length)} />
              <Stat
                label="Заканчиваются за неделю"
                value={String(endingSoon.length)}
                tone={endingSoon.length > 0 ? "negative" : "neutral"}
              />
              <Stat label="Всего записей" value={String(promotions.length)} />
            </StatGrid>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl
              value={filter}
              onChange={setFilter}
              options={[
                { value: "active" as const, label: "Действующие" },
                { value: "all" as const, label: "Все" },
              ]}
            />
            {!adding && !editing && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg"
              >
                <Icon name="plus" size={16} />
                Добавить
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {visible.map((promo) => {
              const left = daysLeft(promo, today);
              const expired = isExpired(promo, today);
              const upcoming = isUpcoming(promo, today);

              return (
                <Card key={promo.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-fg">{promo.title}</span>
                        <Badge tone="neutral">{PROMOTION_KIND_LABELS[promo.kind]}</Badge>
                        {expired && <Badge tone="neutral">завершена</Badge>}
                        {upcoming && <Badge tone="accent">скоро</Badge>}
                        {!expired && !upcoming && left !== null && left <= 7 && (
                          <Badge tone="warning" icon="clock">
                            осталось {formatDays(left)}
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-muted">{bankName(promo.bankId)}</p>
                      {promo.summary && <p className="mt-1 text-sm text-fg">{promo.summary}</p>}

                      {promo.conditions.length > 0 && (
                        <ul className="mt-2 flex list-disc flex-col gap-0.5 pl-5 text-xs text-muted">
                          {promo.conditions.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-faint">
                        <span>
                          {formatDate(promo.startsAt)}
                          {promo.endsAt ? ` — ${formatDate(promo.endsAt)}` : " — бессрочно"}
                        </span>
                        {promo.url && (
                          <a
                            href={promo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 underline decoration-border underline-offset-2 hover:text-muted"
                          >
                            страница акции
                            <Icon name="external" size={11} />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(promo);
                          setAdding(false);
                        }}
                        aria-label={`Изменить «${promo.title}»`}
                        className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
                      >
                        <Icon name="pencil" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(promo.id)}
                        aria-label={`Удалить «${promo.title}»`}
                        className="rounded-lg p-1.5 text-muted hover:bg-negative-soft hover:text-negative"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {visible.length === 0 && (
            <EmptyState
              icon="tag"
              title="Действующих акций нет"
              description="Все записи уже завершились. Переключитесь на «Все», чтобы увидеть архив."
            />
          )}
        </>
      )}
    </div>
  );
}

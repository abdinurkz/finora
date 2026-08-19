"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDate, formatMoney, formatRate, plural } from "@/lib/format";
import { useToday } from "@/lib/useToday";
import { yearMonthOf } from "@/domain/time";
import {
  type ItemRecommendation,
  type OfferMatch,
  collectSpendItems,
  estimateCashback,
} from "@/domain/cashback";
import { BANKS } from "@/data/banks";
import { CARD_PRODUCTS, cardById } from "@/data/cards";
import { isCashbackEligible, mccByCode } from "@/data/mcc";
import { suggestMerchant } from "@/data/merchants";
import { offersOn } from "@/data/offers";
import { usePayments, useSpendLines, useWallet } from "@/persistence/hooks";
import { Badge, Card, CardTitle, EmptyState, Icon, Note, Stat, StatGrid } from "@/components/ui";
import { SegmentedControl } from "@/components/ui/inputs";
import { AssumptionsPanel } from "@/components/trust";
import { MccLabel } from "@/components/mcc";

/**
 * Экран отвечает на главный вопрос приложения: какой картой платить.
 *
 * Две вкладки нужны потому, что вопросов на самом деле два. «По моим тратам» —
 * персональный ответ, он считается по кошельку и статьям трат. «Все предложения» —
 * справочник за месяц, он нужен, когда решаешь, какую карту вообще завести.
 */

type Tab = "mine" | "all";

const BLOCKER_LABELS = {
  notOwned: "карты нет в кошельке",
  salaryOnly: "только зарплатным клиентам",
  individual: "индивидуальная категория",
} as const;

const ELIGIBILITY_LABELS = {
  all: "всем держателям",
  salary: "зарплатным клиентам",
  individual: "индивидуально",
  subscribers: "абонентам",
} as const;

export function CashbackView({ today: serverToday }: { today: string }) {
  const today = useToday(serverToday);
  const [tab, setTab] = useState<Tab>("mine");

  const { period, offers } = useMemo(() => offersOn(yearMonthOf(today)), [today]);

  return (
    <div className="flex flex-col gap-5">
      <Note tone="warning" icon="alert">
        <p className="font-medium">Проценты не сверены с банками</p>
        <p className="mt-0.5 text-muted">
          Подборка внесена из пересланной публикации без ссылки на первоисточник.
          Существование категорий — факт, конкретные проценты и лимиты уточняйте
          в приложении своего банка.
        </p>
      </Note>

      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "mine", label: "По моим тратам" },
          { value: "all", label: "Все предложения" },
        ]}
      />

      {period === undefined ? (
        <EmptyState
          icon="alert"
          title="Нет подборки категорий"
          description="Данные о повышенных категориях ещё не внесены."
        />
      ) : tab === "mine" ? (
        <MySpending today={today} offers={offers} period={period} />
      ) : (
        <AllOffers offers={offers} period={period} />
      )}
    </div>
  );
}

/* ── По моим тратам ─────────────────────────────────────────────── */

function MySpending({
  today,
  offers,
  period,
}: {
  today: string;
  offers: ReturnType<typeof offersOn>["offers"];
  period: string;
}) {
  const { payments } = usePayments();
  const { lines } = useSpendLines();
  const { wallet } = useWallet();

  const items = useMemo(
    () => collectSpendItems(payments, lines, suggestMerchant, today),
    [payments, lines, today],
  );

  const estimate = useMemo(
    () => estimateCashback(items, offers, CARD_PRODUCTS, wallet, { isCashbackEligible }),
    [items, offers, wallet],
  );

  if (items.length === 0) {
    return (
      <EmptyState
        icon="tag"
        title="Пока не с чего считать кэшбэк"
        description="Заведите подписки и расходы или добавьте статьи трат — продукты, такси, кафе."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/spending"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
            >
              Статьи трат
            </Link>
            <Link
              href="/subscriptions"
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg"
            >
              Подписки
            </Link>
          </div>
        }
      />
    );
  }

  const upside = estimate.ceilingMonthlyMinor - estimate.guaranteedMonthlyMinor;
  const withBest = estimate.perItem.filter((r) => r.best !== undefined);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardTitle hint={`Категории за ${formatDate(`${period}-01`, "monthYear")}`}>
          Кэшбэк за месяц
        </CardTitle>
        <StatGrid cols={3}>
          <Stat
            label="Вернётся точно"
            value={formatMoney(estimate.guaranteedMonthlyMinor)}
            sub="по точным ставкам"
            tone="positive"
          />
          <Stat
            label="Может быть больше"
            value={upside > 0 ? `+${formatMoney(upside)}` : "—"}
            sub={upside > 0 ? "по ставкам «до X %»" : "потолочных ставок нет"}
            tone={upside > 0 ? "neutral" : "neutral"}
          />
          <Stat
            label="За год"
            value={formatMoney(estimate.guaranteedYearlyMinor)}
            sub="при тех же тратах"
          />
        </StatGrid>

        {wallet.cards.length === 0 && (
          <Note tone="warning" icon="info" className="mt-4">
            В кошельке не отмечено ни одной карты, поэтому считать нечего.{" "}
            <Link href="/wallet" className="underline underline-offset-2">
              Отметьте свои карты
            </Link>
            .
          </Note>
        )}

        {estimate.unmatchedCount > 0 && (
          <p className="mt-3 text-xs text-muted">
            Без подходящего предложения: {estimate.unmatchedCount} из {items.length}.
          </p>
        )}
      </Card>

      {withBest.length > 0 && (
        <div className="flex flex-col gap-3">
          {[...estimate.perItem]
            .sort((a, b) => (b.best?.monthlyGainMinor ?? 0) - (a.best?.monthlyGainMinor ?? 0))
            .map((rec) => (
              <ItemCard key={rec.item.id} rec={rec} />
            ))}
        </div>
      )}

      <AssumptionsPanel assumptions={estimate.assumptions} />
    </div>
  );
}

function ItemCard({ rec }: { rec: ItemRecommendation }) {
  const { item, best, locked } = rec;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-fg">{item.title}</span>
            <Badge tone="neutral">
              {item.source === "payment" ? "платёж" : "статья трат"}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-muted">
            <MccLabel code={item.mccCode} /> · {formatMoney(item.monthlyMinor)} в месяц
          </div>

          {best ? (
            <div className="mt-2.5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Icon name="card" size={13} />
                <span className="font-medium text-fg">{best.card.name}</span>
                {best.offer && <span className="text-muted">· {best.offer.label}</span>}
                {best.rateIsCeiling && (
                  <Badge tone="warning" title="Банк не гарантирует максимум">
                    до {formatRate(best.rate)}
                  </Badge>
                )}
                {best.reason === "base" && <Badge tone="neutral">базовая ставка</Badge>}
                {best.cappedBy && <Badge tone="warning">упёрлось в лимит</Badge>}
              </div>
              {best.offer?.channel && (
                <p className="mt-1 text-xs text-warning">только {best.offer.channel}</p>
              )}
              {best.offer?.conditions && (
                <p className="mt-0.5 text-xs text-muted">{best.offer.conditions}</p>
              )}
            </div>
          ) : (
            <p className="mt-2.5 text-sm text-muted">Подходящего предложения нет</p>
          )}

          {locked.length > 0 && <LockedList locked={locked} />}
        </div>

        {best && (
          <div className="text-right">
            <div className="tabular text-xl font-semibold tracking-tight text-fg">
              {best.rateIsCeiling ? "до " : ""}
              {formatRate(best.rate)}
            </div>
            <div className="tabular mt-0.5 text-sm text-positive">
              +{formatMoney(best.monthlyGainMinor)} / мес.
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Что было бы выгоднее — с честной причиной, почему недоступно. */
function LockedList({ locked }: { locked: readonly OfferMatch[] }) {
  return (
    <details className="mt-2.5 text-xs">
      <summary className="cursor-pointer text-muted hover:text-fg">
        Выгоднее с другой картой ({locked.length})
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5 border-l border-border pl-3">
        {locked.slice(0, 5).map((m, i) => (
          <li key={`${m.offer?.id ?? m.card.id}-${i}`} className="text-muted">
            <span className="tabular font-medium text-fg">
              {m.rateIsCeiling ? "до " : ""}
              {formatRate(m.rate)}
            </span>{" "}
            — {m.card.name}
            {m.offer && <span> · {m.offer.label}</span>}
            {m.blockedBy && <span className="text-faint"> ({BLOCKER_LABELS[m.blockedBy]})</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}

/* ── Все предложения ────────────────────────────────────────────── */

function AllOffers({
  offers,
  period,
}: {
  offers: ReturnType<typeof offersOn>["offers"];
  period: string;
}) {
  const [bankId, setBankId] = useState<string>("all");

  const banksWithOffers = useMemo(() => {
    const ids = new Set(offers.map((o) => cardById(o.cardId)?.bankId).filter(Boolean));
    return BANKS.filter((b) => ids.has(b.id));
  }, [offers]);

  const shown = useMemo(() => {
    const filtered =
      bankId === "all" ? offers : offers.filter((o) => cardById(o.cardId)?.bankId === bankId);
    return [...filtered].sort((a, b) => b.rate - a.rate || a.label.localeCompare(b.label, "ru"));
  }, [offers, bankId]);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardTitle hint={`${offers.length} ${plural(offers.length, { one: "категория", few: "категории", many: "категорий" })} за ${formatDate(`${period}-01`, "monthYear")}`}>
          Категории месяца
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={bankId === "all"} onClick={() => setBankId("all")}>
            Все банки
          </FilterChip>
          {banksWithOffers.map((b) => (
            <FilterChip key={b.id} active={bankId === b.id} onClick={() => setBankId(b.id)}>
              {b.name}
            </FilterChip>
          ))}
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {shown.map((offer) => {
          const card = cardById(offer.cardId);
          const bank = BANKS.find((b) => b.id === card?.bankId);
          const codes = offer.target.kind === "mcc" ? offer.target.codes : [];

          return (
            <Card key={offer.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-fg">{offer.label}</span>
                    {offer.rateIsCeiling && <Badge tone="warning">потолок</Badge>}
                    {offer.eligibility !== "all" && (
                      <Badge tone="neutral">{ELIGIBILITY_LABELS[offer.eligibility]}</Badge>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>
                      {bank?.name ?? card?.bankId} · {card?.name ?? offer.cardId}
                    </span>
                    {offer.channel && <span className="text-warning">только {offer.channel}</span>}
                  </div>

                  {codes.length > 0 && (
                    <p className="mt-1.5 text-xs text-faint">
                      {codes
                        .map((c) => mccByCode(c)?.name ?? c)
                        .slice(0, 6)
                        .join(", ")}
                      {codes.length > 6 && ` и ещё ${codes.length - 6}`}
                    </p>
                  )}

                  {offer.conditions && (
                    <p className="mt-1 text-xs text-muted">{offer.conditions}</p>
                  )}
                  {offer.note && <p className="mt-1 text-xs text-warning">{offer.note}</p>}
                </div>

                <div className="tabular text-right text-xl font-semibold tracking-tight text-fg">
                  {offer.rateIsCeiling ? "до " : ""}
                  {formatRate(offer.rate)}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg"
          : "rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      }
    >
      {children}
    </button>
  );
}

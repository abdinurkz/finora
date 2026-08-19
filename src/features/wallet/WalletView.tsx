"use client";

import { useMemo } from "react";
import { CARDS_DISCLAIMER } from "@/data/cards";
import type { Bank, CardProduct } from "@/data/types";
import type { OwnedCard, Wallet } from "@/domain/cashback";
import { useWallet } from "@/persistence/hooks";
import { Badge, Card, CardTitle, Icon, Note, Stat, StatGrid } from "@/components/ui";
import { Toggle } from "@/components/ui/inputs";

/**
 * Кошелёк отвечает на вопрос, без которого подбор кэшбэка бессмысленен:
 * какими картами человек РЕАЛЬНО может заплатить. Предложение под карту,
 * которой у него нет, — это не совет, а реклама.
 *
 * Зарплатный статус отмечается по каждой карте отдельно: зарплату получают
 * в одном банке, а карт обычно несколько.
 */
export function WalletView({ banks, cards }: { banks: readonly Bank[]; cards: readonly CardProduct[] }) {
  const { wallet, setWallet } = useWallet();

  const ownedById = useMemo(
    () => new Map(wallet.cards.map((c) => [c.cardId, c])),
    [wallet.cards],
  );

  const byBank = useMemo(() => {
    const map = new Map<string, CardProduct[]>();
    for (const card of cards) {
      const bucket = map.get(card.bankId);
      if (bucket) bucket.push(card);
      else map.set(card.bankId, [card]);
    }
    return [...map.entries()].sort((a, b) => {
      const nameA = banks.find((x) => x.id === a[0])?.name ?? a[0];
      const nameB = banks.find((x) => x.id === b[0])?.name ?? b[0];
      return nameA.localeCompare(nameB, "ru");
    });
  }, [cards, banks]);

  function update(next: OwnedCard[], includeIndividual = wallet.includeIndividual): void {
    setWallet({ cards: next, includeIndividual } satisfies Wallet);
  }

  function toggleOwned(cardId: string, owned: boolean): void {
    update(
      owned
        ? [...wallet.cards, { cardId, salaryClient: false }]
        : wallet.cards.filter((c) => c.cardId !== cardId),
    );
  }

  function toggleSalary(cardId: string, salaryClient: boolean): void {
    update(wallet.cards.map((c) => (c.cardId === cardId ? { ...c, salaryClient } : c)));
  }

  const salaryCount = wallet.cards.filter((c) => c.salaryClient).length;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardTitle hint="Подбор кэшбэка считается только по отмеченным картам.">
          Что у меня есть
        </CardTitle>
        <StatGrid cols={3}>
          <Stat label="Карт отмечено" value={String(wallet.cards.length)} sub={`из ${cards.length}`} />
          <Stat label="Зарплатных" value={String(salaryCount)} sub="дают повышенные категории" />
          <Stat
            label="Индивидуальные"
            value={wallet.includeIndividual ? "учитываются" : "не учитываются"}
            tone={wallet.includeIndividual ? "warning" : "neutral"}
          />
        </StatGrid>

        <div className="mt-5 border-t border-border pt-4">
          <Toggle
            checked={wallet.includeIndividual}
            onChange={(v) => update([...wallet.cards], v)}
            label="Учитывать индивидуальные категории"
            hint="Банк раздаёт их персонально. Включайте, только если видите такие категории у себя в приложении, — иначе оценка будет завышенной."
          />
        </div>
      </Card>

      <Note tone="neutral" icon="info">
        {CARDS_DISCLAIMER}
      </Note>

      {wallet.cards.length === 0 && (
        <Note tone="neutral" icon="info">
          <p className="font-medium">Пока не отмечена ни одна карта</p>
          <p className="mt-0.5 text-muted">
            Отметьте те, которыми действительно платите. Остальные предложения останутся
            видны на странице кэшбэка — с пометкой, что карты у вас нет.
          </p>
        </Note>
      )}

      {byBank.map(([bankId, bankCards]) => {
        const bank = banks.find((b) => b.id === bankId);
        return (
          <Card key={bankId}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-fg">{bank?.name ?? bankId}</span>
              {bank?.kind === "nonbank" && (
                <Badge tone="neutral" title="Не банк: оператор связи или сервис">
                  небанковский эмитент
                </Badge>
              )}
            </div>

            <div className="flex flex-col divide-y divide-border">
              {bankCards.map((card) => {
                const owned = ownedById.get(card.id);
                return (
                  <div key={card.id} className="py-3 first:pt-0 last:pb-0">
                    <Toggle
                      checked={owned !== undefined}
                      onChange={(v) => toggleOwned(card.id, v)}
                      label={card.name}
                      hint={card.note}
                    />
                    {owned && (
                      <div className="mt-2.5 ml-12">
                        <Toggle
                          checked={owned.salaryClient}
                          onChange={(v) => toggleSalary(card.id, v)}
                          label="Я зарплатный клиент этого банка"
                          hint="Часть категорий банки дают только зарплатным клиентам."
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {bank && (
              <a
                href={bank.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-muted underline decoration-border underline-offset-2 hover:text-fg"
              >
                сайт банка
                <Icon name="external" size={11} />
              </a>
            )}
          </Card>
        );
      })}
    </div>
  );
}

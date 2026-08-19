"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { type SpendLine, createSpendLine, monthlySpendTotalMinor } from "@/domain/spending";
import { mccByCode } from "@/data/mcc";
import { useSpendLines } from "@/persistence/hooks";
import { Card, CardTitle, EmptyState, Icon, Note, Stat, StatGrid } from "@/components/ui";
import { Field, MoneyInput, TextInput } from "@/components/ui/inputs";
import { MccField, MccLabel } from "@/components/mcc";

/**
 * Статьи трат — вторая половина ответа про кэшбэк.
 *
 * Подписки и коммуналка уже заведены как платежи, но повышенные проценты
 * банки дают там, где регулярного платежа нет: продукты, АЗС, такси, кафе.
 * Без примерных сумм по этим статьям оценка кэшбэка молчала бы ровно про то,
 * где его больше всего.
 */

/** Заготовки, чтобы первая страница не была пустым полем. */
const PRESETS: readonly { title: string; mccCode: string }[] = [
  { title: "Продукты", mccCode: "5411" },
  { title: "Кафе и рестораны", mccCode: "5812" },
  { title: "Такси", mccCode: "4121" },
  { title: "АЗС", mccCode: "5541" },
  { title: "Аптеки", mccCode: "5912" },
  { title: "Маркетплейсы", mccCode: "5262" },
];

export function SpendingView() {
  const { lines, save, remove } = useSpendLines();
  const [editing, setEditing] = useState<SpendLine | null>(null);
  const [adding, setAdding] = useState(false);

  const total = monthlySpendTotalMinor(lines);
  const used = new Set(lines.map((l) => l.mccCode));

  function upsert(line: SpendLine): void {
    save(line);
    setEditing(null);
    setAdding(false);
  }

  function addPreset(preset: { title: string; mccCode: string }): void {
    save(createSpendLine({ ...preset, monthlyMinor: 0 }));
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardTitle hint="Примерные суммы за месяц — точность до тысячи тенге тут ничего не решает.">
          Сколько уходит в месяц
        </CardTitle>
        <StatGrid cols={2}>
          <Stat label="Всего по статьям" value={formatMoney(total)} sub="без учёта подписок и расходов" />
          <Stat label="Статей заведено" value={String(lines.length)} />
        </StatGrid>
      </Card>

      {PRESETS.some((p) => !used.has(p.mccCode)) && (
        <Card>
          <CardTitle hint="Добавит статью с нулевой суммой — останется вписать свою.">
            Быстрое добавление
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {PRESETS.filter((p) => !used.has(p.mccCode)).map((preset) => (
              <button
                key={preset.mccCode}
                type="button"
                onClick={() => addPreset(preset)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <Icon name="plus" size={13} />
                {preset.title}
              </button>
            ))}
          </div>
        </Card>
      )}

      {(adding || editing) && (
        <SpendLineForm
          initial={editing ?? undefined}
          onSave={upsert}
          onCancel={() => {
            setEditing(null);
            setAdding(false);
          }}
        />
      )}

      {lines.length === 0 && !adding ? (
        <EmptyState
          icon="tag"
          title="Статей трат пока нет"
          description="Добавьте пару строк — продукты, такси, кафе. Этого хватит, чтобы увидеть, какой картой платить выгоднее."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {[...lines]
            .sort((a, b) => b.monthlyMinor - a.monthlyMinor)
            .map((line) => (
              <Card key={line.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-fg">{line.title}</div>
                    <div className="mt-1 text-xs text-muted">
                      <MccLabel code={line.mccCode} />
                    </div>
                    {line.note && <p className="mt-1 text-xs text-faint">{line.note}</p>}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="tabular text-right text-lg font-semibold tracking-tight text-fg">
                      {formatMoney(line.monthlyMinor)}
                      <span className="block text-xs font-normal text-muted">в месяц</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(line)}
                      aria-label={`Изменить «${line.title}»`}
                      className="rounded-lg border border-border p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                    >
                      <Icon name="pencil" size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(line.id)}
                      aria-label={`Удалить «${line.title}»`}
                      className="rounded-lg border border-border p-1.5 text-muted transition-colors hover:bg-negative-soft hover:text-negative"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      {!adding && !editing && (
        <div>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
          >
            <Icon name="plus" size={14} />
            Добавить статью
          </button>
        </div>
      )}

      <Note tone="neutral" icon="info">
        Суммы нужны только для оценки кэшбэка и никуда не отправляются: всё хранится
        в этом браузере.
      </Note>
    </div>
  );
}

function SpendLineForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: SpendLine;
  onSave: (line: SpendLine) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [mccCode, setMccCode] = useState(initial?.mccCode ?? "5411");
  const [monthlyMinor, setMonthlyMinor] = useState(initial?.monthlyMinor ?? 0);
  const [note, setNote] = useState(initial?.note ?? "");

  const canSave = title.trim().length > 0 && mccByCode(mccCode) !== undefined;

  function submit(): void {
    if (!canSave) return;
    const fields = { title: title.trim(), mccCode, monthlyMinor, note: note.trim() || undefined };
    onSave(
      initial
        ? { ...initial, ...fields, updatedAt: new Date().toISOString() }
        : createSpendLine(fields),
    );
  }

  return (
    <Card>
      <CardTitle hint="Категория определяет, какие предложения банков сюда подойдут.">
        {initial ? "Изменить статью" : "Новая статья трат"}
      </CardTitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Название" htmlFor="sl-title">
          <TextInput id="sl-title" value={title} onChange={setTitle} placeholder="Продукты" />
        </Field>

        <Field label="Сумма в месяц" htmlFor="sl-amount">
          <MoneyInput id="sl-amount" valueMinor={monthlyMinor} onChange={setMonthlyMinor} />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Категория" htmlFor="sl-mcc">
            <MccField id="sl-mcc" value={mccCode} onChange={setMccCode} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Заметка" htmlFor="sl-note" hint="Необязательно">
            <TextInput id="sl-note" value={note} onChange={setNote} />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={submit}
          disabled={!canSave}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity disabled:opacity-40"
        >
          {initial ? "Сохранить" : "Добавить"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          Отмена
        </button>
        {!canSave && <span className="self-center text-xs text-faint">Укажите название статьи</span>}
      </div>
    </Card>
  );
}

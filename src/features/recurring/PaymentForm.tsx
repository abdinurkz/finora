"use client";

import { useState } from "react";
import { CURRENCIES, type Currency } from "@/domain/money";
import type { RecurrenceUnit } from "@/domain/recurring";
import {
  EXPENSE_TYPE_LABELS,
  type ExpenseType,
  type PaymentKind,
  type PaymentStatus,
  type RecurringPayment,
  SUBSCRIPTION_CATEGORIES,
  createPayment,
} from "@/domain/recurring/payment";
import { Card, CardTitle, Note } from "@/components/ui";
import {
  DateInput,
  Field,
  MoneyInput,
  NumberInput,
  SegmentedControl,
  Select,
  TextInput,
} from "@/components/ui/inputs";

const UNIT_OPTIONS: { value: RecurrenceUnit; label: string }[] = [
  { value: "month", label: "Месяц" },
  { value: "year", label: "Год" },
  { value: "week", label: "Неделя" },
  { value: "day", label: "День" },
];

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "active", label: "Активен" },
  { value: "paused", label: "Приостановлен" },
  { value: "cancelled", label: "Отменён" },
];

const EXPENSE_TYPE_OPTIONS = (Object.keys(EXPENSE_TYPE_LABELS) as ExpenseType[]).map((t) => ({
  value: t,
  label: EXPENSE_TYPE_LABELS[t],
}));

const CATEGORY_OPTIONS = SUBSCRIPTION_CATEGORIES.map((c) => ({ value: c, label: c }));

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c, label: c }));

export function PaymentForm({
  kind,
  initial,
  today,
  onSave,
  onCancel,
}: {
  kind: PaymentKind;
  initial?: RecurringPayment;
  today: string;
  onSave: (payment: RecurringPayment) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [amountMinor, setAmountMinor] = useState(initial?.amountMinor ?? 0);
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "KZT");
  const [amountKind, setAmountKind] = useState(initial?.amountKind ?? "fixed");
  const [unit, setUnit] = useState<RecurrenceUnit>(initial?.recurrence.unit ?? "month");
  const [every, setEvery] = useState(initial?.recurrence.every ?? 1);
  const [anchor, setAnchor] = useState(initial?.recurrence.anchor ?? today);
  const [status, setStatus] = useState<PaymentStatus>(initial?.status ?? "active");
  const [note, setNote] = useState(initial?.note ?? "");

  const [categoryId, setCategoryId] = useState(
    initial?.kind === "subscription" ? initial.categoryId : (SUBSCRIPTION_CATEGORIES[0] as string),
  );
  const [vendor, setVendor] = useState(initial?.kind === "subscription" ? (initial.vendor ?? "") : "");
  const [cancelUrl, setCancelUrl] = useState(
    initial?.kind === "subscription" ? (initial.cancelUrl ?? "") : "",
  );

  const [expenseType, setExpenseType] = useState<ExpenseType>(
    initial?.kind === "fixedExpense" ? initial.expenseType : "housing",
  );
  const [provider, setProvider] = useState(
    initial?.kind === "fixedExpense" ? (initial.provider ?? "") : "",
  );
  const [accountRef, setAccountRef] = useState(
    initial?.kind === "fixedExpense" ? (initial.accountRef ?? "") : "",
  );

  const canSave = title.trim().length > 0 && amountMinor > 0;

  function submit() {
    if (!canSave) return;

    const common = {
      title: title.trim(),
      amountMinor,
      currency,
      amountKind,
      recurrence: { anchor, unit, every, onShortMonth: "lastDay" as const },
      status,
      note: note.trim() || undefined,
    };

    const specific =
      kind === "subscription"
        ? {
            categoryId,
            vendor: vendor.trim() || undefined,
            cancelUrl: cancelUrl.trim() || undefined,
          }
        : {
            categoryId: EXPENSE_TYPE_LABELS[expenseType],
            expenseType,
            provider: provider.trim() || undefined,
            accountRef: accountRef.trim() || undefined,
          };

    if (initial) {
      onSave({
        ...initial,
        ...common,
        ...specific,
        updatedAt: new Date().toISOString(),
      } as RecurringPayment);
    } else {
      onSave(createPayment(kind, { ...common, ...specific }));
    }
  }

  return (
    <Card>
      <CardTitle hint="День платежа берётся из даты первого списания.">
        {initial ? "Изменить" : kind === "subscription" ? "Новая подписка" : "Новый расход"}
      </CardTitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Название" htmlFor="title">
          <TextInput
            id="title"
            value={title}
            onChange={setTitle}
            placeholder={kind === "subscription" ? "Netflix" : "Аренда квартиры"}
          />
        </Field>

        <Field label="Сумма списания" htmlFor="amount">
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <MoneyInput
                id="amount"
                valueMinor={amountMinor}
                onChange={setAmountMinor}
                suffix={undefined}
              />
            </div>
            <div className="w-24 shrink-0">
              <Select value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} />
            </div>
          </div>
        </Field>

        <Field label="Дата первого списания" htmlFor="anchor" hint="Определяет день платежа">
          <DateInput id="anchor" value={anchor} onChange={setAnchor} />
        </Field>

        <Field label="Периодичность">
          <div className="flex gap-2">
            <div className="w-24 shrink-0">
              <NumberInput value={every} onChange={setEvery} min={1} max={100} />
            </div>
            <div className="min-w-0 flex-1">
              <Select value={unit} onChange={setUnit} options={UNIT_OPTIONS} />
            </div>
          </div>
        </Field>

        {kind === "subscription" ? (
          <>
            <Field label="Категория" htmlFor="category">
              <Select id="category" value={categoryId} onChange={setCategoryId} options={CATEGORY_OPTIONS} />
            </Field>
            <Field label="Поставщик" htmlFor="vendor" hint="Необязательно">
              <TextInput id="vendor" value={vendor} onChange={setVendor} placeholder="Netflix Inc." />
            </Field>
            <Field label="Ссылка на отмену" htmlFor="cancel" hint="Необязательно">
              <TextInput id="cancel" value={cancelUrl} onChange={setCancelUrl} placeholder="https://…" />
            </Field>
          </>
        ) : (
          <>
            <Field label="Тип расхода" htmlFor="etype">
              <Select id="etype" value={expenseType} onChange={setExpenseType} options={EXPENSE_TYPE_OPTIONS} />
            </Field>
            <Field label="Поставщик услуги" htmlFor="provider" hint="Необязательно">
              <TextInput id="provider" value={provider} onChange={setProvider} placeholder="КСК «Алатау»" />
            </Field>
            <Field label="Лицевой счёт" htmlFor="account" hint="Необязательно">
              <TextInput id="account" value={accountRef} onChange={setAccountRef} />
            </Field>
          </>
        )}

        <Field label="Статус" htmlFor="status">
          <Select id="status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </Field>

        <Field label="Заметка" htmlFor="note" hint="Необязательно">
          <TextInput id="note" value={note} onChange={setNote} />
        </Field>
      </div>

      <div className="mt-5">
        <Field label="Характер суммы">
          <SegmentedControl
            value={amountKind}
            onChange={setAmountKind}
            options={[
              { value: "fixed", label: "Фиксированная" },
              { value: "variable", label: "Плавающая" },
            ]}
          />
        </Field>
        {amountKind === "variable" && (
          <Note tone="neutral" icon="info" className="mt-3">
            Плавающие суммы (например, коммуналка) считаются по последнему указанному значению.
            В итогах месяца это оценка, а не точная сумма.
          </Note>
        )}
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
        {!canSave && (
          <span className="self-center text-xs text-faint">Укажите название и сумму больше нуля</span>
        )}
      </div>
    </Card>
  );
}

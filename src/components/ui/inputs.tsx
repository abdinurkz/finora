"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { formatDecimal } from "@/lib/format";
import { parseDecimal, parseMoneyToMinor } from "@/lib/parse-number";

/* ── Обёртка поля ───────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

const inputClass =
  "tabular w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg " +
  "outline-none transition-colors placeholder:text-faint " +
  "focus:border-accent focus:ring-2 focus:ring-accent/20";

/* ── Денежное поле ──────────────────────────────────────────────── */

/**
 * Ввод суммы. Наружу отдаёт минорные единицы (тиыны).
 *
 * Разбор идёт через собственный парсер: пользователи вставляют суммы прямо
 * с сайтов банков, где разделитель разрядов — неразрывный пробел, а дробная
 * часть отделена запятой. `parseFloat` на такой строке возвращает 1.
 */
export function MoneyInput({
  valueMinor,
  onChange,
  suffix = "₸",
  id,
  placeholder,
  min = 0,
}: {
  valueMinor: number;
  onChange: (minor: number) => void;
  suffix?: string;
  id?: string;
  placeholder?: string;
  min?: number;
}) {
  const [text, setText] = useState(() => formatDecimal(valueMinor / 100, 0, 2));
  const [focused, setFocused] = useState(false);
  const [lastValue, setLastValue] = useState(valueMinor);

  // Пока поле не в фокусе, оно следует за внешним значением.
  // Правка прямо в рендере, а не в эффекте: это подстройка состояния под
  // изменившийся проп, и лишнего прохода рендера она не вызывает.
  if (valueMinor !== lastValue) {
    setLastValue(valueMinor);
    if (!focused) setText(formatDecimal(valueMinor / 100, 0, 2));
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setText(formatDecimal(valueMinor / 100, 0, 2));
        }}
        onChange={(e) => {
          setText(e.target.value);
          const parsed = parseMoneyToMinor(e.target.value);
          if (parsed.ok) onChange(Math.max(min, parsed.value));
          else if (parsed.reason === "empty") onChange(min);
        }}
        className={cn(inputClass, suffix && "pr-9")}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">
          {suffix}
        </span>
      )}
    </div>
  );
}

/* ── Числовое поле ──────────────────────────────────────────────── */

export function NumberInput({
  value,
  onChange,
  suffix,
  id,
  min,
  max,
  step = 1,
  decimals = 0,
}: {
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  id?: string;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
}) {
  const [text, setText] = useState(() => formatDecimal(value, 0, decimals));
  const [focused, setFocused] = useState(false);
  const [lastValue, setLastValue] = useState(value);

  if (value !== lastValue) {
    setLastValue(value);
    if (!focused) setText(formatDecimal(value, 0, decimals));
  }

  function clamp(n: number): number {
    let out = n;
    if (min !== undefined) out = Math.max(min, out);
    if (max !== undefined) out = Math.min(max, out);
    return out;
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={text}
        step={step}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setText(formatDecimal(value, 0, decimals));
        }}
        onChange={(e) => {
          setText(e.target.value);
          const parsed = parseDecimal(e.target.value);
          if (parsed.ok) onChange(clamp(parsed.value));
          else if (parsed.reason === "empty" && min !== undefined) onChange(min);
        }}
        className={cn(inputClass, suffix && "pr-9")}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-faint">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** Ставка в процентах: наружу отдаёт долю (16,5 → 0.165). */
export function RateInput({
  value,
  onChange,
  id,
  max = 100,
}: {
  value: number;
  onChange: (ratio: number) => void;
  id?: string;
  max?: number;
}) {
  return (
    <NumberInput
      id={id}
      value={value * 100}
      onChange={(pct) => onChange(pct / 100)}
      suffix="%"
      min={0}
      max={max}
      step={0.1}
      decimals={2}
    />
  );
}

/* ── Выпадающий список ──────────────────────────────────────────── */

export function Select<T extends string>({
  value,
  onChange,
  options,
  id,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { readonly value: T; readonly label: string }[];
  id?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(inputClass, "cursor-pointer appearance-none pr-8")}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a8a29e' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.6rem center",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ── Переключатель ──────────────────────────────────────────────── */

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        // `htmlFor` не именует кнопку — метки работают только для полей формы.
        // Без этого список переключателей читается как «switch, switch, switch».
        aria-labelledby={labelId}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-surface transition-transform",
            checked ? "translate-x-4.5" : "translate-x-0.5",
          )}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer select-none">
        <span id={labelId} className="block text-sm text-fg">
          {label}
        </span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </label>
    </div>
  );
}

/* ── Текстовое поле и дата ──────────────────────────────────────── */

export function TextInput({
  value,
  onChange,
  id,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  );
}

export function DateInput({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  return (
    <input
      id={id}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  );
}

/* ── Сегментированный переключатель ─────────────────────────────── */

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { readonly value: T; readonly label: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-md px-3 py-1 text-sm transition-colors",
            value === o.value ? "bg-surface font-medium text-fg shadow-sm" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

export { Icon } from "./Icon";

/* ── Заголовок страницы ─────────────────────────────────────────── */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── Карточка ───────────────────────────────────────────────────── */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface",
        padded && "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  hint,
  className,
}: {
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <h2 className="text-sm font-semibold text-fg">{children}</h2>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/* ── Бейдж ──────────────────────────────────────────────────────── */

type Tone = "neutral" | "accent" | "positive" | "negative" | "warning";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-border",
  accent: "bg-accent-soft text-accent border-transparent",
  positive: "bg-positive-soft text-positive border-transparent",
  negative: "bg-negative-soft text-negative border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
};

export function Badge({
  children,
  tone = "neutral",
  icon,
  className,
  title,
}: {
  children: React.ReactNode;
  tone?: Tone;
  icon?: string;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

/* ── Крупный показатель ─────────────────────────────────────────── */

export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
}) {
  const valueTone =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-fg";
  return (
    <div>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className={cn("tabular mt-1 text-xl font-semibold tracking-tight", valueTone)}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-faint">{sub}</div>}
    </div>
  );
}

/* ── Пустое состояние ───────────────────────────────────────────── */

export function EmptyState({
  icon = "info",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-surface-2 p-3 text-faint">
        <Icon name={icon} size={22} />
      </div>
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ── Заметка / предупреждение ───────────────────────────────────── */

export function Note({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const toneClass =
    tone === "warning"
      ? "border-warning/30 bg-warning-soft/40 text-fg"
      : tone === "negative"
        ? "border-negative/30 bg-negative-soft/40 text-fg"
        : tone === "positive"
          ? "border-positive/30 bg-positive-soft/40 text-fg"
          : "border-border bg-surface-2 text-fg";

  const iconTone =
    tone === "warning"
      ? "text-warning"
      : tone === "negative"
        ? "text-negative"
        : tone === "positive"
          ? "text-positive"
          : "text-muted";

  return (
    <div className={cn("flex gap-2.5 rounded-lg border px-3 py-2.5 text-sm", toneClass, className)}>
      {icon && <Icon name={icon} size={16} className={cn("mt-0.5", iconTone)} />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ── Сетка показателей ──────────────────────────────────────────── */

export function StatGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const colClass = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[cols];
  return <div className={cn("grid grid-cols-1 gap-5", colClass)}>{children}</div>;
}

/* ── Разделитель ────────────────────────────────────────────────── */

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-border", className)} />;
}

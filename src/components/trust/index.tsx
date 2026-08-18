/**
 * Компоненты доверия.
 *
 * Их задача — сделать невозможным показ непроверенного числа как факта.
 * `AssumptionsPanel` рендерится из `Assumptions`, которые возвращает каждый
 * калькулятор, поэтому «забыть» показать источники нельзя: данные приходят
 * вместе с результатом.
 */

import {
  type Assumptions,
  type Confidence,
  CONFIDENCE_LABELS,
  type MethodRef,
  type Resolved,
} from "@/domain/registry";
import { Badge, Icon, Note } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const TONE: Record<Confidence, "positive" | "neutral" | "warning" | "negative"> = {
  verified: "positive",
  likely: "neutral",
  unverified: "warning",
  placeholder: "negative",
};

const ICON: Record<Confidence, string> = {
  verified: "check",
  likely: "info",
  unverified: "alert",
  placeholder: "alert",
};

export function ConfidenceBadge({
  confidence,
  className,
}: {
  confidence: Confidence;
  className?: string;
}) {
  return (
    <Badge tone={TONE[confidence]} icon={ICON[confidence]} className={className}>
      {CONFIDENCE_LABELS[confidence]}
    </Badge>
  );
}

const TONE_TEXT: Record<Confidence, string> = {
  verified: "text-positive",
  likely: "text-muted",
  unverified: "text-warning",
  placeholder: "text-negative",
};

/**
 * Метка достоверности одной иконкой — для плотных мест вроде строк таблицы,
 * где бейдж с подписью повторялся бы в каждой строке и превращался в шум.
 * Статусы различаются формой иконки, а не только цветом; полная подпись
 * доступна в подсказке и для скринридера.
 */
export function ConfidenceMark({
  confidence,
  className,
}: {
  confidence: Confidence;
  className?: string;
}) {
  return (
    <span
      title={CONFIDENCE_LABELS[confidence]}
      aria-label={`Достоверность: ${CONFIDENCE_LABELS[confidence]}`}
      className={cn("inline-flex", TONE_TEXT[confidence], className)}
    >
      <Icon name={ICON[confidence]} size={14} />
    </span>
  );
}

/** Ссылка на первоисточник с датой, когда его последний раз открывали. */
export function SourceLink({ source }: { source?: MethodRef["source"] }) {
  if (!source) return null;

  const label = `${source.publisher} · ${source.title}`;
  const suffix = (
    <span className="text-faint"> · сверено {formatDate(source.retrievedAt)}</span>
  );

  if (!source.url) {
    return (
      <span className="text-xs text-muted">
        {label}
        {suffix}
      </span>
    );
  }

  return (
    <span className="text-xs text-muted">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 underline decoration-border underline-offset-2 hover:text-fg"
      >
        {label}
        <Icon name="external" size={11} />
      </a>
      {suffix}
    </span>
  );
}

/** Баннер поверх результата, когда расчёт опирается на неподтверждённые данные. */
export function UnverifiedBanner({ assumptions }: { assumptions: Assumptions }) {
  const { worstConfidence } = assumptions;
  if (worstConfidence === "verified" || worstConfidence === "likely") return null;

  const shaky = [
    ...assumptions.constants.filter((c) => c.confidence === "unverified" || c.confidence === "placeholder"),
  ];
  const shakyMethods = assumptions.methods.filter(
    (m) => m.confidence === "unverified" || m.confidence === "placeholder",
  );

  const names = [...shaky.map((c) => c.label), ...shakyMethods.map((m) => m.label)];

  return (
    <Note tone={worstConfidence === "placeholder" ? "negative" : "warning"} icon="alert">
      <p className="font-medium">Расчёт опирается на непроверенные данные</p>
      <p className="mt-0.5 text-muted">
        {names.length > 0 ? (
          <>Требуют сверки с первоисточником: {names.join(", ")}.</>
        ) : (
          <>Часть исходных величин не подтверждена.</>
        )}{" "}
        Сверьте их с первоисточником, прежде чем принимать решение.
      </p>
    </Note>
  );
}

function formatConstantValue(resolved: Resolved<unknown>): string {
  const { value, unit } = resolved;

  // Составные величины (например, лимиты КФГД по видам вкладов) описывают себя сами.
  if (resolved.entry.display) return resolved.entry.display;

  if (typeof value === "number") {
    if (unit === "KZT") return `${(value / 100).toLocaleString("ru-KZ")} ₸`;
    if (unit === "ratio") return `${(value * 100).toLocaleString("ru-KZ")} %`;
    if (unit === "years") return `${value} г.`;
    if (unit === "months") return `${value} мес.`;
    return String(value);
  }
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "kind" in value) {
    const policy = value as { kind: string; rate?: number };
    if (policy.kind === "none") return "не удерживается";
    if (policy.kind === "flat" && typeof policy.rate === "number") {
      return `${(policy.rate * 100).toFixed(1)} %`;
    }
  }
  return "—";
}

/**
 * Полный перечень того, на чём построен результат: константы с датами и
 * источниками плюс использованные методики расчёта.
 */
export function AssumptionsPanel({
  assumptions,
  className,
}: {
  assumptions: Assumptions;
  className?: string;
}) {
  const { constants, methods, missing } = assumptions;

  return (
    <div className={cn("rounded-xl border border-border bg-surface", className)}>
      <div className="border-b border-border px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">На чём построен расчёт</h2>
          <ConfidenceBadge confidence={assumptions.worstConfidence} />
        </div>
        <p className="mt-0.5 text-xs text-muted">
          Каждая величина указана с датой начала действия и источником.
        </p>
      </div>

      {constants.length > 0 && (
        <ul className="divide-y divide-border">
          {constants.map((c) => (
            <li key={c.seriesKey} className="px-5 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm text-fg">{c.label}</span>
                <span className="tabular text-sm font-medium">{formatConstantValue(c)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <ConfidenceBadge confidence={c.confidence} />
                <span className="text-xs text-faint">
                  с {formatDate(c.entry.effectiveFrom)}
                </span>
                <SourceLink source={c.entry.source} />
              </div>
              {c.entry.note && <p className="mt-1 text-xs text-muted">{c.entry.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {methods.length > 0 && (
        <div className="border-t border-border">
          <p className="px-5 pt-3 text-xs font-semibold uppercase tracking-wider text-faint">
            Методики
          </p>
          <ul className="divide-y divide-border">
            {methods.map((m) => (
              <li key={m.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-fg">{m.label}</span>
                  <ConfidenceBadge confidence={m.confidence} />
                </div>
                <p className="mt-1 text-xs text-muted">{m.description}</p>
                <div className="mt-1">
                  <SourceLink source={m.source} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div className="border-t border-border px-5 py-3">
          <p className="text-xs text-negative">
            Нет данных на выбранную дату: {missing.map((m) => m.label).join(", ")}.
          </p>
        </div>
      )}
    </div>
  );
}

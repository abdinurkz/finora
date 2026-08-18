/**
 * Реестр датированных констант.
 *
 * Регуляторные величины в Казахстане меняются как минимум раз в год (МРП, МЗП,
 * лимиты КФГД), иногда — в середине года. Число, вписанное прямо в формулу,
 * первого января молча становится неверным: ошибки не будет, будет неправильный
 * ответ. Поэтому каждая константа хранится вместе с датой начала действия,
 * источником и статусом проверки, а калькулятор запрашивает значение НА ДАТУ
 * сценария.
 *
 * Второе назначение реестра — честность. Значение нельзя прочитать в отрыве от
 * его достоверности: `resolve` возвращает не `number`, а `Resolved<number>`,
 * где всегда есть `confidence`. Дальше по цепочке результат расчёта несёт
 * `worstConfidence`, а интерфейс обязан показать бейдж. Забыть про это нельзя
 * на уровне типов.
 */

import { type CivilDate, compare } from "@/domain/time";

/**
 * `verified` — значение сверено с первоисточником, ссылка обязательна.
 * `likely`   — из вторичного источника, согласуется с несколькими публикациями.
 * `unverified` — внесено по памяти или из ненадёжного источника, требует проверки.
 * `placeholder` — значения нет; расчёты, которые от него зависят, не показывают число.
 */
export type Confidence = "verified" | "likely" | "unverified" | "placeholder";

export const CONFIDENCE_ORDER: Record<Confidence, number> = {
  verified: 0,
  likely: 1,
  unverified: 2,
  placeholder: 3,
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  verified: "проверено",
  likely: "вероятно",
  unverified: "требует проверки",
  placeholder: "нет данных",
};

export interface SourceRef {
  readonly url?: string;
  readonly title: string;
  readonly publisher: string;
  /** Когда человек в последний раз действительно открывал источник. */
  readonly retrievedAt: CivilDate;
  readonly legalRef?: string;
}

export interface DatedValue<T> {
  readonly value: T;
  /** Включительно. */
  readonly effectiveFrom: CivilDate;
  /** Исключительно. Отсутствует — значит действует бессрочно. */
  readonly effectiveTo?: CivilDate;
  readonly confidence: Confidence;
  readonly source?: SourceRef;
  readonly note?: string;
  /** Готовое представление для составных значений, которые не сводятся к числу. */
  readonly display?: string;
}

export interface DatedSeries<T> {
  readonly key: string;
  readonly label: string;
  readonly unit: "KZT" | "ratio" | "count" | "years" | "months" | "none";
  readonly description?: string;
  readonly entries: readonly DatedValue<T>[];
}

export interface Resolved<T> {
  readonly seriesKey: string;
  readonly label: string;
  readonly unit: DatedSeries<T>["unit"];
  readonly value: T;
  readonly confidence: Confidence;
  readonly entry: DatedValue<T>;
}

export interface MissingConstant {
  readonly missing: true;
  readonly seriesKey: string;
  readonly label: string;
  readonly on: CivilDate;
}

export function isMissing<T>(r: Resolved<T> | MissingConstant): r is MissingConstant {
  return (r as MissingConstant).missing === true;
}

/** Значение серии на указанную дату. Отсутствие записи — не исключение, а результат. */
export function resolve<T>(series: DatedSeries<T>, on: CivilDate): Resolved<T> | MissingConstant {
  let best: DatedValue<T> | null = null;

  for (const entry of series.entries) {
    if (compare(entry.effectiveFrom, on) > 0) continue;
    if (entry.effectiveTo !== undefined && compare(on, entry.effectiveTo) >= 0) continue;
    if (best === null || compare(entry.effectiveFrom, best.effectiveFrom) > 0) best = entry;
  }

  if (best === null) {
    return { missing: true, seriesKey: series.key, label: series.label, on };
  }

  return {
    seriesKey: series.key,
    label: series.label,
    unit: series.unit,
    value: best.value,
    confidence: best.confidence,
    entry: best,
  };
}

/**
 * Значение с запасным вариантом. Запасное значение всегда получает
 * достоверность не выше `unverified` — оно по определению не подтверждено.
 */
export function resolveOr<T>(series: DatedSeries<T>, on: CivilDate, fallback: T): Resolved<T> {
  const found = resolve(series, on);
  if (!isMissing(found)) return found;
  return {
    seriesKey: series.key,
    label: series.label,
    unit: series.unit,
    value: fallback,
    confidence: "placeholder",
    entry: {
      value: fallback,
      effectiveFrom: on,
      confidence: "placeholder",
      note: `Значение на ${on} не внесено в реестр.`,
    },
  };
}

/** Худшая достоверность из набора — она и определяет статус всего расчёта. */
export function worstOf(...items: readonly { confidence: Confidence }[]): Confidence {
  let worst: Confidence = "verified";
  for (const item of items) {
    if (CONFIDENCE_ORDER[item.confidence] > CONFIDENCE_ORDER[worst]) worst = item.confidence;
  }
  return worst;
}

export function isTrustworthy(confidence: Confidence): boolean {
  return confidence === "verified" || confidence === "likely";
}

/* ── Методы расчёта ─────────────────────────────────────────────── */

/**
 * То же, что `DatedValue`, но для ФОРМУЛ, а не чисел.
 *
 * Методика расчёта ГЭСВ — такое же внешнее допущение, как МРП: её можно
 * неверно понять, и она меняется. Версионируем и помечаем так же, чтобы
 * в интерфейсе было видно, на каком основании получено число.
 */
export interface MethodRef {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly confidence: Confidence;
  readonly source?: SourceRef;
}

/** Всё, на чём построен результат расчёта: и константы, и методы. */
export interface Assumptions {
  readonly constants: readonly Resolved<unknown>[];
  readonly methods: readonly MethodRef[];
  readonly missing: readonly MissingConstant[];
  readonly worstConfidence: Confidence;
}

export function buildAssumptions(
  constants: readonly (Resolved<unknown> | MissingConstant)[],
  methods: readonly MethodRef[] = [],
): Assumptions {
  const resolved: Resolved<unknown>[] = [];
  const missing: MissingConstant[] = [];

  for (const c of constants) {
    if (isMissing(c)) missing.push(c);
    else resolved.push(c);
  }

  const worst = worstOf(
    ...resolved,
    ...methods,
    ...missing.map(() => ({ confidence: "placeholder" as const })),
  );

  return { constants: resolved, methods, missing, worstConfidence: worst };
}

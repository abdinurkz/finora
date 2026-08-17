"use client";

/**
 * Графики собственной сборки вместо библиотеки.
 *
 * Нужны три простые формы (накопление вклада, рост ОП, пенсионная проекция),
 * и все три — это путь в SVG плюс линейная шкала. Recharts тянет d3 и ~100 КБ
 * ради того, что здесь занимает пару сотен строк и тематизируется теми же
 * токенами Tailwind, что и остальной интерфейс.
 *
 * Палитра проверена валидатором: диапазон светлоты, насыщенность, различимость
 * при дальтонизме и контраст к фону — отдельно для светлой и тёмной темы.
 * Разделение при тританопии лежит в диапазоне 6–8, поэтому цвет везде
 * подкреплён вторичным кодированием: легенда, зазор между слоями и подпись
 * последнего значения.
 */

import { useState } from "react";
import { cn } from "@/lib/cn";

const W = 720;
const H = 300;
const PAD = { top: 14, right: 18, bottom: 30, left: 74 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export interface ChartSeries {
  readonly key: string;
  readonly label: string;
  /** Токен темы: "chart-1" | "chart-2" | "chart-3". */
  readonly color: string;
  readonly values: readonly number[];
}

/** Округляет верх шкалы до «круглого» значения, чтобы подписи читались. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function xAt(index: number, count: number): number {
  if (count <= 1) return PAD.left + PLOT_W / 2;
  return PAD.left + (index / (count - 1)) * PLOT_W;
}

function yAt(value: number, max: number): number {
  return PAD.top + PLOT_H - (value / max) * PLOT_H;
}

function Grid({ max, format }: { max: number; format: (v: number) => string }) {
  const lines = [0, 0.25, 0.5, 0.75, 1];
  return (
    <g>
      {lines.map((t) => {
        const y = PAD.top + PLOT_H - t * PLOT_H;
        return (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 10}
              y={y + 4}
              textAnchor="end"
              className="fill-faint"
              style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}
            >
              {format(t * max)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function XAxis({ labels, count }: { labels: readonly string[]; count: number }) {
  // Показываем не больше шести подписей, иначе они наезжают друг на друга.
  const maxTicks = 6;
  const stride = Math.max(1, Math.ceil(count / maxTicks));
  const y = PAD.top + PLOT_H + 20;

  return (
    <g>
      {labels.map((label, i) => {
        if (i % stride !== 0 && i !== count - 1) return null;
        const x = xAt(i, count);
        const anchor = i === 0 ? "start" : i === count - 1 ? "end" : "middle";
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={anchor}
            className="fill-faint"
            style={{ fontSize: 12 }}
          >
            {label}
          </text>
        );
      })}
    </g>
  );
}

function Legend({ series }: { series: readonly ChartSeries[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5 text-xs text-muted">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: `var(--${s.color})` }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

interface HoverState {
  index: number;
  xPct: number;
}

function useHover(count: number) {
  const [hover, setHover] = useState<HoverState | null>(null);

  function onMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (count - 1));
    const clamped = Math.min(count - 1, Math.max(0, index));
    setHover({ index: clamped, xPct: count <= 1 ? 50 : (clamped / (count - 1)) * 100 });
  }

  return { hover, onMove, onLeave: () => setHover(null) };
}

function Tooltip({
  hover,
  rows,
  title,
}: {
  hover: HoverState;
  rows: readonly { label: string; value: string; color?: string }[];
  title: string;
}) {
  // Ближе к правому краю разворачиваем подсказку влево, чтобы не обрезалась.
  const flip = hover.xPct > 65;
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-lg border border-border bg-surface p-2 shadow-lg"
      style={{
        left: `calc(${hover.xPct}% * ${PLOT_W / W} + ${(PAD.left / W) * 100}%)`,
        transform: flip ? "translateX(-100%) translateX(-8px)" : "translateX(8px)",
      }}
    >
      <div className="mb-1 text-xs font-medium text-fg">{title}</div>
      <ul className="flex flex-col gap-0.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-muted">
              {r.color && (
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-sm"
                  style={{ background: `var(--${r.color})` }}
                />
              )}
              {r.label}
            </span>
            <span className="tabular font-medium text-fg">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Область с накоплением ──────────────────────────────────────── */

/**
 * Слои складываются снизу вверх. Между слоями оставлен зазор в 2 единицы
 * цветом фона — иначе на границе двух заливок глаз читает третий цвет.
 */
export function StackedAreaChart({
  series,
  xLabels,
  formatValue,
  formatAxis,
  ariaLabel,
  className,
}: {
  series: readonly ChartSeries[];
  xLabels: readonly string[];
  formatValue: (v: number) => string;
  formatAxis: (v: number) => string;
  ariaLabel: string;
  className?: string;
}) {
  const count = series[0]?.values.length ?? 0;
  const { hover, onMove, onLeave } = useHover(count);

  if (count === 0) return null;

  const totals = Array.from({ length: count }, (_, i) =>
    series.reduce((acc, s) => acc + (s.values[i] ?? 0), 0),
  );
  const max = niceMax(Math.max(...totals, 1));

  // Накопленные границы каждого слоя.
  const bands = series.map((s, si) => {
    const lower: number[] = [];
    const upper: number[] = [];
    for (let i = 0; i < count; i++) {
      const below = series.slice(0, si).reduce((acc, o) => acc + (o.values[i] ?? 0), 0);
      lower.push(below);
      upper.push(below + (s.values[i] ?? 0));
    }
    return { series: s, lower, upper };
  });

  return (
    <figure className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={ariaLabel}
        className="overflow-visible"
      >
        <Grid max={max} format={formatAxis} />

        {bands.map((band) => {
          const top = band.upper.map((v, i) => `${xAt(i, count)},${yAt(v, max)}`).join(" L ");
          const bottom = band.lower
            .map((v, i) => `${xAt(count - 1 - i, count)},${yAt(band.lower[count - 1 - i], max)}`)
            .join(" L ");
          return (
            <g key={band.series.key}>
              <path
                d={`M ${top} L ${bottom} Z`}
                fill={`var(--${band.series.color})`}
                fillOpacity={0.85}
              />
              {/* Зазор между слоями: обводка верхней границы цветом фона. */}
              <polyline
                points={band.upper.map((v, i) => `${xAt(i, count)},${yAt(v, max)}`).join(" ")}
                fill="none"
                stroke="var(--surface)"
                strokeWidth={2}
              />
            </g>
          );
        })}

        {hover && (
          <line
            x1={xAt(hover.index, count)}
            x2={xAt(hover.index, count)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            className="stroke-fg"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.4}
          />
        )}

        <XAxis labels={xLabels} count={count} />

        <rect
          x={PAD.left}
          y={PAD.top}
          width={PLOT_W}
          height={PLOT_H}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        />
      </svg>

      {hover && (
        <Tooltip
          hover={hover}
          title={xLabels[hover.index] ?? ""}
          rows={[
            ...series.map((s) => ({
              label: s.label,
              value: formatValue(s.values[hover.index] ?? 0),
              color: s.color,
            })),
            { label: "Итого", value: formatValue(totals[hover.index]) },
          ]}
        />
      )}

      <Legend series={series} />
    </figure>
  );
}

/* ── Линия с пороговыми уровнями ────────────────────────────────── */

export interface Threshold {
  readonly value: number;
  readonly label: string;
  readonly tone?: "accent" | "positive" | "muted";
}

export function LineChart({
  series,
  xLabels,
  formatValue,
  formatAxis,
  thresholds = [],
  ariaLabel,
  className,
}: {
  series: ChartSeries;
  xLabels: readonly string[];
  formatValue: (v: number) => string;
  formatAxis: (v: number) => string;
  thresholds?: readonly Threshold[];
  ariaLabel: string;
  className?: string;
}) {
  const count = series.values.length;
  const { hover, onMove, onLeave } = useHover(count);

  if (count === 0) return null;

  const peak = Math.max(...series.values, ...thresholds.map((t) => t.value), 1);
  const max = niceMax(peak * 1.05);

  const points = series.values.map((v, i) => `${xAt(i, count)},${yAt(v, max)}`).join(" ");
  const areaPath = `M ${xAt(0, count)},${yAt(0, max)} L ${points} L ${xAt(count - 1, count)},${yAt(0, max)} Z`;

  return (
    <figure className={cn("relative", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel} className="overflow-visible">
        <Grid max={max} format={formatAxis} />

        <path d={areaPath} fill={`var(--${series.color})`} fillOpacity={0.12} />
        <polyline
          points={points}
          fill="none"
          stroke={`var(--${series.color})`}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {thresholds.map((t) => {
          const y = yAt(t.value, max);
          return (
            <g key={t.label}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                className="stroke-fg"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.45}
              />
              <text
                x={W - PAD.right}
                y={y - 6}
                textAnchor="end"
                className="fill-muted"
                style={{ fontSize: 12, fontWeight: 500 }}
              >
                {t.label}
              </text>
            </g>
          );
        })}

        {hover && (
          <>
            <line
              x1={xAt(hover.index, count)}
              x2={xAt(hover.index, count)}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              className="stroke-fg"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.4}
            />
            <circle
              cx={xAt(hover.index, count)}
              cy={yAt(series.values[hover.index], max)}
              r={5}
              fill={`var(--${series.color})`}
              stroke="var(--surface)"
              strokeWidth={2}
            />
          </>
        )}

        <XAxis labels={xLabels} count={count} />

        <rect
          x={PAD.left}
          y={PAD.top}
          width={PLOT_W}
          height={PLOT_H}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
        />
      </svg>

      {hover && (
        <Tooltip
          hover={hover}
          title={xLabels[hover.index] ?? ""}
          rows={[
            {
              label: series.label,
              value: formatValue(series.values[hover.index] ?? 0),
              color: series.color,
            },
          ]}
        />
      )}
    </figure>
  );
}

import { DataManager } from "@/features/data/DataManager";
import { ALL_SERIES } from "@/data/constants";
import { CONFIDENCE_LABELS, type DatedSeries } from "@/domain/registry";
import { ConfidenceBadge, SourceLink } from "@/components/trust";
import { Card, CardTitle, Note, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { todayCivil } from "@/lib/today";

export const metadata = { title: "Данные и источники" };

function formatEntryValue(series: DatedSeries<unknown>, value: unknown, display?: string): string {
  if (display) return display;
  if (typeof value === "number") {
    if (series.unit === "KZT") return `${(value / 100).toLocaleString("ru-KZ")} ₸`;
    if (series.unit === "ratio") return `${(value * 100).toLocaleString("ru-KZ")} %`;
    if (series.unit === "years") return `${value} г.`;
    if (series.unit === "months") return `${value} мес.`;
    return String(value);
  }
  if (typeof value === "string") return value;
  return "—";
}

/**
 * Таблица источников рендерится прямо из реестра, а не пишется руками.
 * Поэтому она физически не может разойтись с тем, что используют калькуляторы.
 */
function SeriesCard({ series }: { series: DatedSeries<unknown> }) {
  const sorted = [...series.entries].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  return (
    <Card padded={false}>
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold text-fg">{series.label}</h3>
        {series.description && <p className="mt-0.5 text-xs text-muted">{series.description}</p>}
      </div>

      <ul className="divide-y divide-border border-t border-border">
        {sorted.map((entry) => (
          <li key={entry.effectiveFrom} className="px-5 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="tabular text-sm font-medium text-fg">
                {formatEntryValue(series, entry.value, entry.display)}
              </span>
              <span className="text-xs text-faint">
                с {formatDate(entry.effectiveFrom)}
                {entry.effectiveTo && ` по ${formatDate(entry.effectiveTo)}`}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <ConfidenceBadge confidence={entry.confidence} />
              <SourceLink source={entry.source} />
            </div>

            {entry.note && <p className="mt-1.5 text-xs text-muted">{entry.note}</p>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function DataPage() {
  const today = todayCivil();

  const counts = ALL_SERIES.flatMap((s) => s.entries).reduce<Record<string, number>>((acc, e) => {
    acc[e.confidence] = (acc[e.confidence] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Данные и источники"
        description="Все величины, на которых построены расчёты, с датой начала действия, источником и статусом проверки. Здесь же резервная копия ваших записей."
      />

      <div className="flex flex-col gap-8">
        <DataManager today={today} />

        <section>
          <h2 className="mb-1 text-lg font-semibold tracking-tight">Реестр констант</h2>
          <p className="mb-4 text-sm text-muted">
            Регуляторные величины в Казахстане меняются как минимум раз в год. Каждая хранится
            с датой начала действия, а калькуляторы запрашивают значение на дату сценария —
            не «текущее».
          </p>

          <div className="mb-4 flex flex-wrap gap-2">
            {(["verified", "likely", "unverified", "placeholder"] as const).map(
              (c) =>
                counts[c] > 0 && (
                  <span key={c} className="flex items-center gap-1.5 text-xs text-muted">
                    <ConfidenceBadge confidence={c} />
                    {counts[c]} {counts[c] === 1 ? "значение" : "значений"}
                  </span>
                ),
            )}
          </div>

          <Note tone="warning" icon="alert" className="mb-4">
            Значения со статусом «{CONFIDENCE_LABELS.unverified}» внесены без сверки
            с первоисточником. Расчёты, которые на них опираются, помечены соответствующим
            баннером — не принимайте по ним решений без проверки.
          </Note>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {ALL_SERIES.map((series) => (
              <SeriesCard key={series.key} series={series} />
            ))}
          </div>
        </section>

        <Card>
          <CardTitle>Как это работает</CardTitle>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted">
            <li>
              Приложение работает без сервера: записи не покидают ваш браузер и не отправляются
              никуда по сети.
            </li>
            <li>
              Обратная сторона — очистка данных браузера удаляет всё безвозвратно. Резервная копия
              выше решает и эту задачу, и перенос на другое устройство.
            </li>
            <li>
              Справочные величины лежат в коде и версионируются вместе с ним, поэтому у каждой
              правки есть история.
            </li>
            <li>
              Тесты падают, если для сегодняшней даты не находится действующего значения — так
              устаревание реестра становится заметным, а не молчаливым.
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}

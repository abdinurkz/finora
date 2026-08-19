"use client";

import { useRef, useState } from "react";
import { usePayments, useSettings, useSpendLines, useWallet } from "@/persistence/hooks";
import { backupFileName, buildBackup, mergePayments, parseBackup, serializeBackup } from "@/persistence/backup";
import type { ImportReport } from "@/persistence/types";
import { formatMoney, plural } from "@/lib/format";
import { useToday } from "@/lib/useToday";
import { monthlyTotalMinor } from "@/domain/recurring/payment";
import { Card, CardTitle, Icon, Note, Stat, StatGrid } from "@/components/ui";

export function DataManager({ today: serverToday }: { today: string }) {
  const today = useToday(serverToday);
  const { payments, replaceAll, clear } = usePayments();
  const { settings } = useSettings();
  const { lines, replaceAll: replaceLines, clear: clearLines } = useSpendLines();
  const { wallet, setWallet } = useWallet();
  const fileInput = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  function exportData() {
    const json = serializeBackup(buildBackup(payments, settings, { wallet, spendLines: lines }));
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = backupFileName();
    link.click();

    URL.revokeObjectURL(url);
  }

  async function importData(file: File) {
    setError(null);
    setReport(null);

    try {
      const text = await file.text();
      const parsed = parseBackup(JSON.parse(text));

      if (!parsed.ok) {
        setError(parsed.report.errors[0] ?? "Не удалось прочитать файл");
        return;
      }

      replaceAll(mergePayments(payments, parsed.payments));
      // Кошелёк и статьи трат заменяются целиком: сливать их по id нечего —
      // это единый снимок, а не история правок.
      if (parsed.wallet) setWallet(parsed.wallet);
      if (parsed.spendLines.length > 0) replaceLines(parsed.spendLines);
      setReport(parsed.report);
    } catch {
      setError("Файл не является корректным JSON");
    }
  }

  const monthly = monthlyTotalMinor(payments, today);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardTitle hint="Всё, что сейчас хранится в этом браузере.">Ваши данные</CardTitle>
        <StatGrid cols={3}>
          <Stat
            label="Записей"
            value={String(payments.length)}
            sub={(() => {
              const subs = payments.filter((p) => p.kind === "subscription").length;
              const exp = payments.filter((p) => p.kind === "fixedExpense").length;
              return `${subs} ${plural(subs, {
                one: "подписка",
                few: "подписки",
                many: "подписок",
              })}, ${exp} ${plural(exp, { one: "расход", few: "расхода", many: "расходов" })}`;
            })()}
          />
          <Stat label="Обязательства в месяц" value={formatMoney(monthly)} />
          <Stat label="Где хранится" value="localStorage" sub="только на этом устройстве" />
        </StatGrid>
      </Card>

      <Card>
        <CardTitle hint="В приложении нет сервера, поэтому резервная копия — единственный способ пережить очистку данных браузера и перенести записи на другое устройство.">
          Резервная копия
        </CardTitle>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportData}
            disabled={payments.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg disabled:opacity-40"
          >
            <Icon name="download" size={16} />
            Скачать копию
          </button>

          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Icon name="upload" size={16} />
            Восстановить из файла
          </button>

          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importData(file);
              e.target.value = "";
            }}
          />
        </div>

        {report && (
          <Note tone={report.skipped > 0 ? "warning" : "positive"} icon="check" className="mt-4">
            <p className="font-medium">
              Восстановлено {report.imported}{" "}
              {plural(report.imported, { one: "запись", few: "записи", many: "записей" })}
            </p>
            {report.skipped > 0 && (
              <p className="mt-0.5 text-muted">
                Пропущено {report.skipped} из-за неверного формата. Остальные данные загружены.
              </p>
            )}
          </Note>
        )}

        {error && (
          <Note tone="negative" icon="alert" className="mt-4">
            {error}
          </Note>
        )}

        <p className="mt-4 text-xs text-muted">
          При восстановлении записи объединяются с текущими по идентификатору: более свежая версия
          побеждает, ничего не теряется.
        </p>
      </Card>

      <Card>
        <CardTitle hint="Действие необратимо — сначала скачайте резервную копию.">
          Удалить все данные
        </CardTitle>

        {confirmingClear ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-fg">
              Удалить {payments.length}{" "}
              {plural(payments.length, { one: "запись", few: "записи", many: "записей" })} безвозвратно?
            </span>
            <button
              type="button"
              onClick={() => {
                clear();
                clearLines();
                setConfirmingClear(false);
              }}
              className="rounded-lg bg-negative px-3 py-2 text-sm font-medium text-white"
            >
              Да, удалить
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-fg"
            >
              Отмена
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            disabled={payments.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-negative hover:text-negative disabled:opacity-40"
          >
            <Icon name="trash" size={16} />
            Очистить хранилище
          </button>
        )}
      </Card>
    </div>
  );
}

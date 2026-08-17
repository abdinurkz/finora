import { DepositCalculator } from "@/features/deposits/DepositCalculator";
import { todayCivil } from "@/lib/today";

export const metadata = { title: "Депозитный калькулятор" };

/** Разбирает предзаполнение из ссылки каталога, отбрасывая мусор. */
function num(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return fallback;
  return value;
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DepositCalculatorPage({
  searchParams,
}: PageProps<"/deposits/calculator">) {
  // Параметры разбираются на сервере и приходят пропами.
  //
  // Раньше здесь был useSearchParams, но он требует Suspense, а React при
  // потоковой отдаче выносил содержимое границы в конец <body> — калькулятор
  // оказывался вне разметки страницы. Страница и так динамическая из-за
  // «сегодня», поэтому чтение searchParams на сервере ничего не стоит.
  const params = await searchParams;

  return (
    <DepositCalculator
      today={todayCivil()}
      prefill={{
        amountMinor: Math.round(num(one(params.amount), 100_000_000, 0, 1e14)),
        rate: num(one(params.rate), 0.165, 0, 1),
        termMonths: Math.round(num(one(params.term), 12, 1, 360)),
        kind: one(params.kind),
        compounding: one(params.compounding),
      }}
    />
  );
}

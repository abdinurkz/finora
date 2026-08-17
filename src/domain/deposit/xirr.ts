import { type CivilDate, type DayCount, yearFraction } from "@/domain/time";
import type { MethodRef } from "@/domain/registry";

export interface CashFlow {
  readonly date: CivilDate;
  /** Со стороны вкладчика: отрицательное — внёс, положительное — получил. */
  readonly amountMinor: number;
}

/**
 * Метод расчёта эффективной ставки.
 *
 * Помечен как непроверенный намеренно: ГЭСВ — регулируемая величина с
 * утверждённой методикой, и совпадение с публикуемой банком цифрой не гарантируется,
 * пока методика не сверена с первоисточником. Поэтому в интерфейсе результат
 * подписан как «расчёт finora», а рядом показывается ГЭСВ банка, если она известна.
 */
export const IRR_METHOD: MethodRef = {
  id: "effectiveRate.irr.v1",
  label: "Эффективная ставка через IRR",
  description:
    "Внутренняя норма доходности по фактическому денежному потоку: решается уравнение NPV = 0 " +
    "методом бисекции. Единообразно учитывает капитализацию, пополнения, выплаты и налог. " +
    "Не сверено с методикой ГЭСВ, утверждённой регулятором.",
  confidence: "unverified",
};

/** Чистая приведённая стоимость потока при заданной годовой ставке. */
export function npv(flows: readonly CashFlow[], rate: number, dayCount: DayCount): number {
  if (flows.length === 0) return 0;
  const origin = flows[0].date;
  let total = 0;
  for (const flow of flows) {
    const t = yearFraction(origin, flow.date, dayCount);
    total += flow.amountMinor / Math.pow(1 + rate, t);
  }
  return total;
}

export interface XirrResult {
  readonly rate: number;
  readonly converged: boolean;
  readonly iterations: number;
}

/**
 * Внутренняя норма доходности методом бисекции.
 *
 * Бисекция, а не Ньютон: на реальных лестничных вкладах с пополнениями
 * производная меняет знак и Ньютон расходится, выдавая правдоподобное,
 * но неверное число. Бисекция на 200 итерациях стоит микросекунды и
 * либо сходится, либо честно сообщает, что не сошлась.
 */
export function xirr(
  flows: readonly CashFlow[],
  dayCount: DayCount = "ACT/365",
  opts: { lower?: number; upper?: number; tolerance?: number; maxIterations?: number } = {},
): XirrResult {
  const { lower = -0.9999, upper = 10, tolerance = 1e-10, maxIterations = 200 } = opts;

  if (flows.length < 2) return { rate: 0, converged: false, iterations: 0 };

  const hasPositive = flows.some((f) => f.amountMinor > 0);
  const hasNegative = flows.some((f) => f.amountMinor < 0);
  if (!hasPositive || !hasNegative) return { rate: 0, converged: false, iterations: 0 };

  let lo = lower;
  let hi = upper;
  let fLo = npv(flows, lo, dayCount);
  let fHi = npv(flows, hi, dayCount);

  // Без смены знака на границах корня в интервале нет.
  if (fLo * fHi > 0) return { rate: 0, converged: false, iterations: 0 };

  let mid = 0;
  for (let i = 1; i <= maxIterations; i++) {
    mid = (lo + hi) / 2;
    const fMid = npv(flows, mid, dayCount);

    if (Math.abs(fMid) < tolerance || hi - lo < tolerance) {
      return { rate: mid, converged: true, iterations: i };
    }

    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }

  return { rate: mid, converged: false, iterations: maxIterations };
}

/** Номинальная ставка с капитализацией n раз в год → эффективная годовая. */
export function nominalToEffective(nominal: number, periodsPerYear: number): number {
  if (periodsPerYear <= 0) return nominal;
  return Math.pow(1 + nominal / periodsPerYear, periodsPerYear) - 1;
}

/** Обратное преобразование. */
export function effectiveToNominal(effective: number, periodsPerYear: number): number {
  if (periodsPerYear <= 0) return effective;
  return periodsPerYear * (Math.pow(1 + effective, 1 / periodsPerYear) - 1);
}

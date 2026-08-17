export type Currency = "KZT" | "USD" | "EUR" | "RUB";

export const CURRENCIES: readonly Currency[] = ["KZT", "USD", "EUR", "RUB"];

export type Rounding = "halfUp" | "halfEven" | "down" | "up";

export interface RoundingPolicy {
  /** Округление при начислении вознаграждения за период. */
  readonly interest: Rounding;
  /** До чего округляем: до тиына или до целого тенге. Банки делают по-разному. */
  readonly unit: "minor" | "major";
  /** Округление удержанного налога. */
  readonly tax: Rounding;
}

export const DEFAULT_ROUNDING: RoundingPolicy = {
  interest: "halfUp",
  unit: "minor",
  tax: "halfUp",
};

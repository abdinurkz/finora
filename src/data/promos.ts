import { type CivilDate, compare, diffDays } from "@/domain/time";
import type { Promotion } from "./types";

/**
 * ПОЧЕМУ ЭТОТ СПИСОК ПУСТ.
 *
 * Ставка по вкладу — приближение непрерывной величины: «около 16 %» остаётся
 * осмысленным утверждением даже без сверки. Акция устроена иначе: это конкретное
 * утверждение «банк X проводит Y до даты Z на условиях W», которое либо верно,
 * либо нет. Придуманная акция с придуманным сроком — это выдуманная запись,
 * а не приближение, и пометка «требует проверки» её не спасает: именно такие
 * карточки попадают в скриншоты и в решения.
 *
 * Поэтому каталог поставляется пустым, а вносить акции можно через редактор
 * на странице раздела. Модель, отсчёт до окончания, фильтры и сортировка
 * работают в полном объёме — не хватает только данных, которые обязан
 * подтвердить человек.
 */
export const PROMOTIONS: readonly Promotion[] = [];

export function isExpired(promotion: Promotion, on: CivilDate): boolean {
  return promotion.endsAt !== undefined && compare(on, promotion.endsAt) > 0;
}

export function isUpcoming(promotion: Promotion, on: CivilDate): boolean {
  return compare(promotion.startsAt, on) > 0;
}

export function isRunning(promotion: Promotion, on: CivilDate): boolean {
  return !isExpired(promotion, on) && !isUpcoming(promotion, on);
}

/** Дней до окончания. `null` — акция бессрочная. */
export function daysLeft(promotion: Promotion, on: CivilDate): number | null {
  if (promotion.endsAt === undefined) return null;
  return diffDays(on, promotion.endsAt);
}

/** Действующие акции, сначала те, что заканчиваются раньше. */
export function activePromotions(
  promotions: readonly Promotion[],
  on: CivilDate,
): readonly Promotion[] {
  return promotions
    .filter((p) => isRunning(p, on))
    .sort((a, b) => {
      if (a.endsAt === undefined && b.endsAt === undefined) return 0;
      if (a.endsAt === undefined) return 1;
      if (b.endsAt === undefined) return -1;
      return compare(a.endsAt, b.endsAt);
    });
}

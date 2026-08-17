"use client";

import { useSyncExternalStore } from "react";
import { todayCivil } from "./today";

/**
 * Сегодняшняя дата, корректная и на статически собранной странице.
 *
 * Проблема, которую это решает: `new Date()` в Server Component не считается
 * динамическим API, поэтому Next спокойно пререндерит страницу на сборке
 * и «сегодня» замерзает на дате деплоя. На странице подписок это выглядит как
 * «платёж через 47 дней» месяцами подряд.
 *
 * Реализовано через useSyncExternalStore, а не через useEffect + setState:
 * дата — это внешний источник, а не производное состояние, и такой вариант
 * не порождает каскадный ререндер после монтирования.
 */

/** Дата не «пушит» обновления, поэтому подписка пустая. */
const subscribe = () => () => {};

// Формат даты пересчитывается не чаще раза в минуту: getSnapshot вызывается
// на каждый рендер и обязан быть дешёвым и стабильным по значению.
let cache: { at: number; value: string } | null = null;

function currentToday(): string {
  const now = Date.now();
  if (cache !== null && now - cache.at < 60_000) return cache.value;
  const value = todayCivil();
  cache = { at: now, value };
  return value;
}

export function useToday(serverToday: string): string {
  return useSyncExternalStore(subscribe, currentToday, () => serverToday);
}

"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { RecurringPayment } from "@/domain/recurring/payment";
import type { Promotion } from "@/data/types";
import { paymentsCollection, promotionsCollection, settingsStore, storageAdapter } from "./index";
import type { LoadStatus, Settings } from "./types";

/**
 * Данные приходят ПОСЛЕ монтирования, поэтому первый кадр — пустой список.
 * Это осознанный размен: альтернатива (инлайн-скрипт, синхронно вписывающий
 * состояние до гидратации) оправдана для темы, где мигание бросается в глаза,
 * и не оправдана для списка подписок.
 */
export function usePayments(): {
  payments: readonly RecurringPayment[];
  status: LoadStatus;
  errors: readonly string[];
  save: (payment: RecurringPayment) => void;
  remove: (id: string) => void;
  replaceAll: (payments: readonly RecurringPayment[]) => void;
  clear: () => void;
} {
  const payments = useSyncExternalStore(
    paymentsCollection.subscribe,
    paymentsCollection.getSnapshot,
    paymentsCollection.getServerSnapshot,
  );

  const status = useSyncExternalStore(
    paymentsCollection.subscribe,
    paymentsCollection.getStatus,
    paymentsCollection.getServerStatus,
  );

  const errors = useSyncExternalStore(
    paymentsCollection.subscribe,
    paymentsCollection.getErrors,
    paymentsCollection.getErrors,
  );

  useEffect(() => {
    void paymentsCollection.hydrate();

    // Правка в другой вкладке должна долетать сюда.
    return storageAdapter.subscribeExternal((collection) => {
      if (collection === "payments") void paymentsCollection.refresh();
    });
  }, []);

  return {
    payments,
    status,
    errors,
    save: useCallback((payment: RecurringPayment) => paymentsCollection.put(payment), []),
    remove: useCallback((id: string) => paymentsCollection.remove(id), []),
    replaceAll: useCallback(
      (next: readonly RecurringPayment[]) => paymentsCollection.replaceAll(next),
      [],
    ),
    clear: useCallback(() => paymentsCollection.clear(), []),
  };
}

export function usePromotions(): {
  promotions: readonly Promotion[];
  status: LoadStatus;
  save: (promotion: Promotion) => void;
  remove: (id: string) => void;
  replaceAll: (promotions: readonly Promotion[]) => void;
} {
  const promotions = useSyncExternalStore(
    promotionsCollection.subscribe,
    promotionsCollection.getSnapshot,
    promotionsCollection.getServerSnapshot,
  );

  const status = useSyncExternalStore(
    promotionsCollection.subscribe,
    promotionsCollection.getStatus,
    promotionsCollection.getServerStatus,
  );

  useEffect(() => {
    void promotionsCollection.hydrate();
    return storageAdapter.subscribeExternal((collection) => {
      if (collection === "promotions") void promotionsCollection.refresh();
    });
  }, []);

  return {
    promotions,
    status,
    save: useCallback((promotion: Promotion) => promotionsCollection.put(promotion), []),
    remove: useCallback((id: string) => promotionsCollection.remove(id), []),
    replaceAll: useCallback(
      (next: readonly Promotion[]) => promotionsCollection.replaceAll(next),
      [],
    ),
  };
}

export function useSettings(): { settings: Settings; setSettings: (s: Settings) => void } {
  const settings = useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    settingsStore.getServerSnapshot,
  );

  useEffect(() => {
    void settingsStore.hydrate();
  }, []);

  return {
    settings,
    setSettings: useCallback((s: Settings) => settingsStore.set(s), []),
  };
}

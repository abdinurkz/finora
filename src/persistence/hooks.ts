"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { Wallet } from "@/domain/cashback/types";
import type { RecurringPayment } from "@/domain/recurring/payment";
import type { SpendLine } from "@/domain/spending";
import { paymentsCollection, settingsStore, spendLinesCollection, storageAdapter, walletStore } from "./index";
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

export function useSpendLines(): {
  lines: readonly SpendLine[];
  status: LoadStatus;
  save: (line: SpendLine) => void;
  remove: (id: string) => void;
  replaceAll: (lines: readonly SpendLine[]) => void;
  clear: () => void;
} {
  const lines = useSyncExternalStore(
    spendLinesCollection.subscribe,
    spendLinesCollection.getSnapshot,
    spendLinesCollection.getServerSnapshot,
  );

  const status = useSyncExternalStore(
    spendLinesCollection.subscribe,
    spendLinesCollection.getStatus,
    spendLinesCollection.getServerStatus,
  );

  useEffect(() => {
    void spendLinesCollection.hydrate();

    return storageAdapter.subscribeExternal((collection) => {
      if (collection === "spend-lines") void spendLinesCollection.refresh();
    });
  }, []);

  return {
    lines,
    status,
    save: useCallback((line: SpendLine) => spendLinesCollection.put(line), []),
    remove: useCallback((id: string) => spendLinesCollection.remove(id), []),
    replaceAll: useCallback(
      (next: readonly SpendLine[]) => spendLinesCollection.replaceAll(next),
      [],
    ),
    clear: useCallback(() => spendLinesCollection.clear(), []),
  };
}

export function useWallet(): { wallet: Wallet; setWallet: (w: Wallet) => void } {
  const wallet = useSyncExternalStore(
    walletStore.subscribe,
    walletStore.getSnapshot,
    walletStore.getServerSnapshot,
  );

  useEffect(() => {
    void walletStore.hydrate();
  }, []);

  return {
    wallet,
    setWallet: useCallback((w: Wallet) => walletStore.set(w), []),
  };
}

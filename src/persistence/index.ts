import type { Wallet } from "@/domain/cashback/types";
import type { RecurringPayment } from "@/domain/recurring/payment";
import type { SpendLine } from "@/domain/spending";
import { createLocalStorageAdapter } from "./adapters/local-storage";
import { parsePaymentsLenient, parseSpendLinesLenient, settingsSchema, walletSchema } from "./schema";
import { Collection, ValueStore } from "./store";
import { DEFAULT_SETTINGS, DEFAULT_WALLET, type Settings } from "./types";

export * from "./types";
export * from "./backup";

const adapter = createLocalStorageAdapter();

export const paymentsCollection = new Collection<RecurringPayment>(
  "payments",
  adapter,
  (input) => {
    const { valid, errors } = parsePaymentsLenient(input);
    return { valid: valid as RecurringPayment[], errors };
  },
);

export const settingsStore = new ValueStore<Settings>(
  "settings",
  adapter,
  (input) => {
    const parsed = settingsSchema.safeParse(input);
    return parsed.success ? parsed.data : null;
  },
  DEFAULT_SETTINGS,
);

export const spendLinesCollection = new Collection<SpendLine>(
  "spend-lines",
  adapter,
  (input) => {
    const { valid, errors } = parseSpendLinesLenient(input);
    return { valid: valid as SpendLine[], errors };
  },
);

/**
 * Кошелёк живёт в отдельном хранилище, а не полем в настройках, и это
 * не косметика: `ValueStore` при неудачном разборе молча оставляет значение
 * по умолчанию. Добавь мы обязательное поле в схему настроек — у всех, кто
 * уже менял окно ближайших списаний, оно бы тихо сбросилось.
 */
export const walletStore = new ValueStore<Wallet>(
  "wallet",
  adapter,
  (input) => {
    const parsed = walletSchema.safeParse(input);
    return parsed.success ? parsed.data : null;
  },
  DEFAULT_WALLET,
);

export { adapter as storageAdapter };

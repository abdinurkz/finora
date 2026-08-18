import type { RecurringPayment } from "@/domain/recurring/payment";
import { createLocalStorageAdapter } from "./adapters/local-storage";
import { parsePaymentsLenient, settingsSchema } from "./schema";
import { Collection, ValueStore } from "./store";
import { DEFAULT_SETTINGS, type Settings } from "./types";

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

export { adapter as storageAdapter };

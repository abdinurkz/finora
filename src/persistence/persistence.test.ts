import { describe, expect, it, vi } from "vitest";
import type { RecurringPayment } from "@/domain/recurring/payment";
import { createPayment } from "@/domain/recurring/payment";
import { createMemoryAdapter } from "./adapters/local-storage";
import { parsePaymentsLenient } from "./schema";
import { Collection } from "./store";
import { buildBackup, mergePayments, parseBackup } from "./backup";
import { DEFAULT_SETTINGS } from "./types";

function makeCollection(adapter = createMemoryAdapter()) {
  return new Collection<RecurringPayment>("payments", adapter, (input) => {
    const { valid, errors } = parsePaymentsLenient(input);
    return { valid: valid as RecurringPayment[], errors };
  });
}

function samplePayment(overrides: Partial<RecurringPayment> = {}): RecurringPayment {
  return {
    ...createPayment("subscription", {
      title: "Netflix",
      amountMinor: 5_990_00,
      recurrence: { anchor: "2026-01-15", unit: "month", every: 1 },
    }),
    ...overrides,
  } as RecurringPayment;
}

describe("getServerSnapshot", () => {
  /**
   * Самая коварная ошибка при работе с useSyncExternalStore: возврат нового
   * массива каждый вызов даёт бесконечный цикл рендера. Ссылка обязана быть одна.
   */
  it("возвращает одну и ту же ссылку при каждом вызове", () => {
    const c = makeCollection();
    expect(c.getServerSnapshot()).toBe(c.getServerSnapshot());
    expect(c.getServerSnapshot()).toBe(c.getServerSnapshot());
  });

  it("до загрузки совпадает с клиентским снимком — расхождение гидратации невозможно", () => {
    const c = makeCollection();
    expect(c.getSnapshot()).toBe(c.getServerSnapshot());
  });
});

describe("Collection", () => {
  it("сохраняет и читает запись", async () => {
    const adapter = createMemoryAdapter();
    const c = makeCollection(adapter);
    await c.hydrate();

    const payment = samplePayment();
    c.put(payment);

    expect(c.getSnapshot()).toHaveLength(1);
    expect(c.getSnapshot()[0].title).toBe("Netflix");
  });

  it("обновляет запись по id, а не добавляет дубликат", async () => {
    const c = makeCollection();
    await c.hydrate();

    const payment = samplePayment();
    c.put(payment);
    c.put({ ...payment, title: "Netflix Premium" });

    expect(c.getSnapshot()).toHaveLength(1);
    expect(c.getSnapshot()[0].title).toBe("Netflix Premium");
  });

  it("удаляет запись", async () => {
    const c = makeCollection();
    await c.hydrate();
    const payment = samplePayment();
    c.put(payment);
    c.remove(payment.id);
    expect(c.getSnapshot()).toHaveLength(0);
  });

  it("уведомляет подписчиков об изменениях", async () => {
    const c = makeCollection();
    await c.hydrate();
    const listener = vi.fn();
    c.subscribe(listener);
    c.put(samplePayment());
    expect(listener).toHaveBeenCalled();
  });

  it("сохраняет данные в адаптер с задержкой", async () => {
    vi.useFakeTimers();
    const adapter = createMemoryAdapter();
    const c = makeCollection(adapter);
    await c.hydrate();

    c.put(samplePayment());
    await vi.advanceTimersByTimeAsync(300);
    vi.useRealTimers();

    const stored = await adapter.read("payments");
    expect(Array.isArray(stored)).toBe(true);
    expect((stored as unknown[]).length).toBe(1);
  });

  it("данные переживают пересоздание хранилища", async () => {
    vi.useFakeTimers();
    const adapter = createMemoryAdapter();

    const first = makeCollection(adapter);
    await first.hydrate();
    first.put(samplePayment({ title: "Spotify" } as Partial<RecurringPayment>));
    await vi.advanceTimersByTimeAsync(300);
    vi.useRealTimers();

    const second = makeCollection(adapter);
    await second.hydrate();
    expect(second.getSnapshot()).toHaveLength(1);
    expect(second.getSnapshot()[0].title).toBe("Spotify");
  });
});

describe("устойчивость к битым данным", () => {
  it("мусор в хранилище даёт пустой список и ошибку, но не исключение", async () => {
    const adapter = createMemoryAdapter();
    await adapter.write("payments", { нечто: "совсем не то" });

    const c = makeCollection(adapter);
    await expect(c.hydrate()).resolves.toBeUndefined();
    expect(c.getSnapshot()).toHaveLength(0);
    expect(c.getErrors().length).toBeGreaterThan(0);
  });

  it("одна испорченная запись не отменяет остальные", async () => {
    const good = samplePayment();
    const adapter = createMemoryAdapter();
    await adapter.write("payments", [good, { id: "битая", kind: "subscription" }]);

    const c = makeCollection(adapter);
    await c.hydrate();

    expect(c.getSnapshot()).toHaveLength(1);
    expect(c.getErrors()).toHaveLength(1);
  });

  it("некорректная дата в правиле отбраковывается", () => {
    const broken = { ...samplePayment(), recurrence: { anchor: "31.01.2026", unit: "month", every: 1 } };
    const { valid, errors } = parsePaymentsLenient([broken]);
    expect(valid).toHaveLength(0);
    expect(errors[0]).toContain("ГГГГ-ММ-ДД");
  });
});

describe("резервная копия", () => {
  it("экспорт и импорт возвращают те же данные", () => {
    const payments = [samplePayment(), samplePayment()];
    const backup = buildBackup(payments, DEFAULT_SETTINGS);
    const roundTripped = parseBackup(JSON.parse(JSON.stringify(backup)));

    expect(roundTripped.ok).toBe(true);
    expect(roundTripped.payments).toHaveLength(2);
    expect(roundTripped.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("посторонний файл отклоняется с понятным сообщением", () => {
    const result = parseBackup({ какие: "то данные" });
    expect(result.ok).toBe(false);
    expect(result.report.errors.length).toBeGreaterThan(0);
  });

  it("из частично испорченного файла спасаются целые записи", () => {
    const good = samplePayment();
    const result = parseBackup({ payments: [good, { id: "битая" }] });
    expect(result.ok).toBe(true);
    expect(result.payments).toHaveLength(1);
    expect(result.report.skipped).toBe(1);
  });

  it("голый массив записей тоже принимается", () => {
    const result = parseBackup([samplePayment()]);
    expect(result.ok).toBe(true);
    expect(result.payments).toHaveLength(1);
  });
});

describe("слияние при импорте", () => {
  it("новые записи добавляются, существующие обновляются по свежести", () => {
    const base = samplePayment();
    const older = { ...base, title: "Старое", updatedAt: "2026-01-01T00:00:00.000Z" };
    const newer = { ...base, title: "Новое", updatedAt: "2026-08-01T00:00:00.000Z" };
    const other = samplePayment();

    const merged = mergePayments([older], [newer, other]);

    expect(merged).toHaveLength(2);
    expect(merged.find((p) => p.id === base.id)?.title).toBe("Новое");
  });

  it("устаревшая импортируемая запись не затирает более свежую", () => {
    const base = samplePayment();
    const current = { ...base, title: "Актуальное", updatedAt: "2026-08-01T00:00:00.000Z" };
    const stale = { ...base, title: "Устаревшее", updatedAt: "2026-01-01T00:00:00.000Z" };

    const merged = mergePayments([current], [stale]);
    expect(merged[0].title).toBe("Актуальное");
  });
});

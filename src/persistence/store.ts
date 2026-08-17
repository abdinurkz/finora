/**
 * Локальное хранилище состояния поверх `useSyncExternalStore`.
 *
 * Почему не контекст и не библиотека состояния: `useSyncExternalStore` — это
 * ровно тот примитив, который React предлагает для «внешний изменяемый
 * источник + серверный рендер», и его третий аргумент решает проблему
 * гидратации по построению.
 *
 * Дисциплина, которую нельзя нарушать: `getServerSnapshot` обязан возвращать
 * ОДНУ И ТУ ЖЕ ссылку при каждом вызове. Возврат нового `[]` даёт бесконечный
 * цикл рендера — самая частая ошибка при работе с этим хуком. На это есть тест.
 */

import type { LoadStatus, StorageAdapter } from "./types";

type Parser<T> = (input: unknown) => { valid: T[]; errors: string[] };

export class Collection<T extends { id: string }> {
  private snapshot: readonly T[];
  private status: LoadStatus = "loading";
  private errors: readonly string[] = [];
  private listeners = new Set<() => void>();
  private hydrating: Promise<void> | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  /** Замороженная константа: одна ссылка на всё время жизни. */
  private readonly empty: readonly T[];

  constructor(
    private readonly name: string,
    private readonly adapter: StorageAdapter,
    private readonly parse: Parser<T>,
  ) {
    this.empty = Object.freeze([]) as readonly T[];
    this.snapshot = this.empty;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): readonly T[] => this.snapshot;

  /** Одинаково на сервере и в первом клиентском рендере — расхождения невозможны. */
  getServerSnapshot = (): readonly T[] => this.empty;

  getStatus = (): LoadStatus => this.status;
  getServerStatus = (): LoadStatus => "loading";
  getErrors = (): readonly string[] => this.errors;

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  /** Читает данные из адаптера. Повторные вызовы переиспользуют одну загрузку. */
  hydrate(): Promise<void> {
    if (this.hydrating) return this.hydrating;

    this.hydrating = (async () => {
      try {
        const raw = await this.adapter.read(this.name);
        if (raw === undefined) {
          this.snapshot = this.empty;
          this.errors = [];
        } else {
          const { valid, errors } = this.parse(raw);
          this.snapshot = Object.freeze(valid);
          this.errors = errors;
        }
        this.status = "ready";
      } catch (error) {
        // Битые данные не должны ронять рендер: показываем пусто и запоминаем ошибку.
        this.snapshot = this.empty;
        this.errors = [error instanceof Error ? error.message : "Не удалось прочитать данные"];
        this.status = "error";
      }
      this.emit();
    })();

    return this.hydrating;
  }

  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      void this.adapter.write(this.name, this.snapshot).catch((error: unknown) => {
        this.errors = [error instanceof Error ? error.message : "Не удалось сохранить данные"];
        this.emit();
      });
    }, 250);
  }

  /** Оптимистичное обновление: состояние меняется сразу, запись — с задержкой. */
  private commit(next: readonly T[]): void {
    this.snapshot = Object.freeze([...next]);
    this.emit();
    this.schedulePersist();
  }

  put(entity: T): void {
    const index = this.snapshot.findIndex((e) => e.id === entity.id);
    if (index === -1) this.commit([...this.snapshot, entity]);
    else this.commit(this.snapshot.map((e) => (e.id === entity.id ? entity : e)));
  }

  putMany(entities: readonly T[]): void {
    const byId = new Map(this.snapshot.map((e) => [e.id, e]));
    for (const e of entities) byId.set(e.id, e);
    this.commit([...byId.values()]);
  }

  replaceAll(entities: readonly T[]): void {
    this.commit(entities);
  }

  remove(id: string): void {
    this.commit(this.snapshot.filter((e) => e.id !== id));
  }

  clear(): void {
    this.commit([]);
  }

  /** Перечитывает данные — используется при изменении из другой вкладки. */
  async refresh(): Promise<void> {
    this.hydrating = null;
    await this.hydrate();
  }
}

/** Хранилище одного значения — для настроек. */
export class ValueStore<T> {
  private snapshot: T;
  private listeners = new Set<() => void>();
  private hydrating: Promise<void> | null = null;

  constructor(
    private readonly name: string,
    private readonly adapter: StorageAdapter,
    private readonly parse: (input: unknown) => T | null,
    private readonly fallback: T,
  ) {
    this.snapshot = fallback;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): T => this.snapshot;
  getServerSnapshot = (): T => this.fallback;

  hydrate(): Promise<void> {
    if (this.hydrating) return this.hydrating;
    this.hydrating = (async () => {
      const raw = await this.adapter.read(this.name);
      const parsed = raw === undefined ? null : this.parse(raw);
      if (parsed !== null) {
        this.snapshot = parsed;
        for (const l of this.listeners) l();
      }
    })();
    return this.hydrating;
  }

  set(value: T): void {
    this.snapshot = value;
    for (const l of this.listeners) l();
    void this.adapter.write(this.name, value);
  }
}

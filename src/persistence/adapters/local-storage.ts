import type { StorageAdapter } from "../types";

const PREFIX = "finora:";

/**
 * localStorage выбран для первой версии осознанно: данных здесь — десятки
 * килобайт, до лимита в 5 МБ далеко, а синхронное чтение делает гидратацию
 * тривиально корректной. IndexedDB понадобится, когда появятся вложения;
 * тогда добавляется второй адаптер за тем же интерфейсом.
 */
export function createLocalStorageAdapter(): StorageAdapter {
  const available = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

  return {
    id: "localStorage",

    async read(collection) {
      if (!available) return undefined;
      try {
        const raw = window.localStorage.getItem(PREFIX + collection);
        return raw === null ? undefined : JSON.parse(raw);
      } catch {
        // Битый JSON или заблокированное хранилище: возвращаем «пусто»,
        // валидация выше решит, что делать.
        return undefined;
      }
    },

    async write(collection, value) {
      if (!available) return;
      try {
        window.localStorage.setItem(PREFIX + collection, JSON.stringify(value));
      } catch (error) {
        // Переполнение квоты или приватный режим — пробрасываем наверх,
        // чтобы интерфейс мог предупредить о непослушном сохранении.
        throw new Error(
          `Не удалось сохранить данные: ${error instanceof Error ? error.message : "хранилище недоступно"}`,
        );
      }
    },

    async remove(collection) {
      if (!available) return;
      try {
        window.localStorage.removeItem(PREFIX + collection);
      } catch {
        /* пусто */
      }
    },

    subscribeExternal(listener) {
      if (!available) return () => {};
      const handler = (e: StorageEvent) => {
        if (e.key && e.key.startsWith(PREFIX)) listener(e.key.slice(PREFIX.length));
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };
}

/** Адаптер в памяти — для тестов и для серверного рендера. */
export function createMemoryAdapter(): StorageAdapter {
  const data = new Map<string, unknown>();
  return {
    id: "memory",
    async read(collection) {
      return data.get(collection);
    },
    async write(collection, value) {
      data.set(collection, value);
    },
    async remove(collection) {
      data.delete(collection);
    },
    subscribeExternal() {
      return () => {};
    },
  };
}

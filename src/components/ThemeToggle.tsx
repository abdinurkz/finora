"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { THEME_KEY, type Theme } from "@/lib/theme";

/**
 * Тема применяется инлайн-скриптом в <head> ещё до первой отрисовки, поэтому
 * переключателю остаётся только показать текущее состояние и уметь его менять.
 *
 * Источник правды — сам DOM (атрибут data-theme) плюс системная настройка.
 * Это внешнее состояние, поэтому читается через useSyncExternalStore: чтение
 * localStorage в эффекте с последующим setState вызывало бы лишний ререндер
 * после каждого монтирования.
 */

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", emit);
  window.addEventListener("storage", emit);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", emit);
    window.removeEventListener("storage", emit);
  };
}

function getSnapshot(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** На сервере тема неизвестна: отдаём светлую, инлайн-скрипт поправит до отрисовки. */
function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    // Текущее значение читается из DOM, а не из отрендеренного `theme`:
    // иначе два клика подряд внутри одного тика вычислят одно и то же.
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Приватный режим: тема просто не переживёт перезагрузку.
    }
    emit();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
      className="rounded-lg border border-border p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
    </button>
  );
}

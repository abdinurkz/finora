"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ALL_NAV_ITEMS, NAV } from "@/lib/nav";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

/**
 * Активным считается самый длинный совпавший маршрут.
 * Иначе на /deposits/calculator подсветятся сразу два пункта: и «Депозиты», и «Депозит».
 */
function useActiveHref(): string | null {
  const pathname = usePathname();
  let best: string | null = null;
  for (const item of ALL_NAV_ITEMS) {
    const matches = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
    if (matches && (best === null || item.href.length > best.length)) best = item.href;
  }
  return best;
}

export function Sidebar() {
  const active = useActiveHref();

  return (
    <nav className="flex flex-col gap-6 p-4">
      {NAV.map((group) => (
        <div key={group.title}>
          <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
            {group.title}
          </div>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active === item.href ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    active === item.href
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-muted hover:bg-surface-2 hover:text-fg",
                  )}
                >
                  <Icon name={item.icon} size={17} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function MobileNav() {
  const active = useActiveHref();

  return (
    <nav className="-mx-4 overflow-x-auto px-4 lg:hidden">
      <ul className="flex w-max gap-1 pb-2">
        {ALL_NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active === item.href ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                active === item.href
                  ? "border-transparent bg-accent-soft font-medium text-accent"
                  : "border-border text-muted",
              )}
            >
              <Icon name={item.icon} size={15} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

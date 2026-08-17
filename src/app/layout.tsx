import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { MobileNav, Sidebar } from "@/components/AppNav";
import { InlineScript } from "@/components/InlineScript";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_SCRIPT } from "@/lib/theme";

// Кириллица обязательна: без subset "cyrillic" весь русский интерфейс
// отрисуется системным фолбэком, а не Geist.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Finora — личные финансы в Казахстане",
    template: "%s · Finora",
  },
  description:
    "Калькуляторы депозитов БВУ, ОП Отбасы банка и пенсии, справочники ставок и кэшбэков, учёт подписок и фиксированных расходов.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body className="flex min-h-full flex-col bg-bg text-fg">
        <div className="flex min-h-dvh">
          <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
            <div className="sticky top-0 flex h-dvh flex-col">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <Link href="/" className="text-lg font-semibold tracking-tight">
                  Finora
                </Link>
                <ThemeToggle />
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar />
              </div>
              <p className="border-t border-border px-5 py-3 text-[11px] leading-relaxed text-faint">
                Справочные расчёты, не финансовая консультация. Проверяйте условия у банка.
              </p>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-border bg-surface px-4 py-3 lg:hidden">
              <div className="mb-2 flex items-center justify-between">
                <Link href="/" className="text-lg font-semibold tracking-tight">
                  Finora
                </Link>
                <ThemeToggle />
              </div>
              <MobileNav />
            </header>

            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </main>

            <footer className="px-4 py-6 text-center text-xs text-faint lg:hidden">
              Справочные расчёты, не финансовая консультация.
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}

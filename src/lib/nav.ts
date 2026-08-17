export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: string;
}

export interface NavGroup {
  readonly title: string;
  readonly items: readonly NavItem[];
}

export const NAV: readonly NavGroup[] = [
  {
    title: "Обзор",
    items: [{ href: "/", label: "Дашборд", icon: "grid" }],
  },
  {
    title: "Калькуляторы",
    items: [
      { href: "/deposits/calculator", label: "Депозит", icon: "calculator" },
      { href: "/otbasy", label: "ОП Отбасы", icon: "home" },
      { href: "/pension", label: "Пенсия", icon: "clock" },
    ],
  },
  {
    title: "Мои деньги",
    items: [
      { href: "/subscriptions", label: "Подписки", icon: "repeat" },
      { href: "/expenses", label: "Расходы", icon: "receipt" },
    ],
  },
  {
    title: "Справочники БВУ",
    items: [
      { href: "/deposits", label: "Депозиты", icon: "bank" },
      { href: "/cashback", label: "Кэшбэк", icon: "card" },
      { href: "/promos", label: "Акции", icon: "tag" },
    ],
  },
  {
    title: "Служебное",
    items: [{ href: "/data", label: "Данные и источники", icon: "database" }],
  },
];

export const ALL_NAV_ITEMS: readonly NavItem[] = NAV.flatMap((g) => g.items);

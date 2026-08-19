import { SpendingView } from "@/features/spending/SpendingView";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Траты по категориям" };

export default function SpendingPage() {
  return (
    <>
      <PageHeader
        title="Траты по категориям"
        description="Продукты, такси, кафе, АЗС — то, где живёт основной кэшбэк, но где нет регулярного платежа. Достаточно примерных сумм за месяц."
      />
      <SpendingView />
    </>
  );
}

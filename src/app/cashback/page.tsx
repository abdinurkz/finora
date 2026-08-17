import { CashbackExplorer } from "@/features/cashback/CashbackExplorer";
import { BANKS } from "@/data/banks";
import { CASHBACK_PROGRAMS } from "@/data/cashback";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Кэшбэк и бонусы" };

export default function CashbackPage() {
  return (
    <>
      <PageHeader
        title="Кэшбэк и бонусы БВУ"
        description="Программы лояльности банков и подбор карты под категорию трат: сколько вернётся за месяц и за год."
      />
      <CashbackExplorer programs={CASHBACK_PROGRAMS} banks={BANKS} />
    </>
  );
}

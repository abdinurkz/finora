import { DepositExplorer } from "@/features/deposits/DepositExplorer";
import { BANKS } from "@/data/banks";
import { DEPOSIT_PRODUCTS, RATE_RECORDS } from "@/data/deposits";
import { PageHeader } from "@/components/ui";
import { todayCivil } from "@/lib/today";

export const metadata = { title: "Депозиты БВУ" };

export default function DepositsPage() {
  // Справочники — статические модули, поэтому сервер просто передаёт их вниз.
  // Фильтрация идёт на клиенте: обращение к searchParams сделало бы страницу
  // динамической без всякой пользы.
  return (
    <>
      <PageHeader
        title="Депозиты БВУ"
        description="Сравнение вкладов банков второго уровня на одинаковых допущениях: эффективная ставка, вознаграждение за срок и покрытие гарантией КФГД."
      />
      <DepositExplorer
        products={DEPOSIT_PRODUCTS}
        banks={BANKS}
        rates={RATE_RECORDS}
        today={todayCivil()}
      />
    </>
  );
}

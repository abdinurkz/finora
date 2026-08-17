import { PaymentsView } from "@/features/recurring/PaymentsView";
import { todayCivil } from "@/lib/today";

export const metadata = { title: "Фиксированные расходы" };

export default function ExpensesPage() {
  return (
    <PaymentsView
      kind="fixedExpense"
      today={todayCivil()}
      title="Фиксированные расходы"
      description="Аренда, коммунальные услуги, кредиты и прочие обязательные платежи каждого месяца."
    />
  );
}

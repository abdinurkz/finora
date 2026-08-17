import { PaymentsView } from "@/features/recurring/PaymentsView";
import { todayCivil } from "@/lib/today";

export const metadata = { title: "Подписки" };

export default function SubscriptionsPage() {
  return (
    <PaymentsView
      kind="subscription"
      today={todayCivil()}
      title="Подписки"
      description="Регулярные списания с днём платежа и суммой в пересчёте на месяц. Годовые подписки автоматически приводятся к месячному эквиваленту."
    />
  );
}

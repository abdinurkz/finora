import { Dashboard } from "@/features/dashboard/Dashboard";
import { PageHeader } from "@/components/ui";
import { todayCivil } from "@/lib/today";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Finora"
        description="Личные финансы в Казахстане: калькулятор депозитов, справочники ставок БВУ и учёт регулярных платежей."
      />
      <Dashboard today={todayCivil()} />
    </>
  );
}

import { PensionCalculator } from "@/features/pension/PensionCalculator";
import { todayCivil } from "@/lib/today";

export const metadata = { title: "Пенсионный калькулятор" };

export default function PensionPage() {
  return <PensionCalculator today={todayCivil()} />;
}

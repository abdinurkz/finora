import { OtbasyCalculator } from "@/features/otbasy/OtbasyCalculator";
import { todayCivil } from "@/lib/today";

export const metadata = { title: "Оценочный показатель Отбасы банка" };

export default function OtbasyPage() {
  return <OtbasyCalculator today={todayCivil()} />;
}

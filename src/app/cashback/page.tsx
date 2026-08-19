import { CashbackView } from "@/features/cashback/CashbackView";
import { PageHeader } from "@/components/ui";
import { todayCivil } from "@/lib/today";

export const metadata = { title: "Кэшбэк" };

export default function CashbackPage() {
  return (
    <>
      <PageHeader
        title="Кэшбэк"
        description="Какой картой платить за каждую трату и сколько вернётся за месяц. Категории банков меняются ежемесячно."
      />
      <CashbackView today={todayCivil()} />
    </>
  );
}

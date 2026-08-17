import { PromosView } from "@/features/promos/PromosView";
import { BANKS } from "@/data/banks";
import { PageHeader } from "@/components/ui";
import { todayCivil } from "@/lib/today";

export const metadata = { title: "Акции банков" };

export default function PromosPage() {
  return (
    <>
      <PageHeader
        title="Акции банков"
        description="Выгодные предложения БВУ со сроком окончания и условиями участия. Записи хранятся в этом браузере."
      />
      <PromosView banks={BANKS} today={todayCivil()} />
    </>
  );
}

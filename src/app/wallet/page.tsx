import { WalletView } from "@/features/wallet/WalletView";
import { BANKS } from "@/data/banks";
import { CARD_PRODUCTS } from "@/data/cards";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Мои карты" };

export default function WalletPage() {
  return (
    <>
      <PageHeader
        title="Мои карты"
        description="Отметьте карты, которыми платите. Подбор кэшбэка считается только по ним — предложение под чужую карту это не совет, а реклама."
      />
      <WalletView banks={BANKS} cards={CARD_PRODUCTS} />
    </>
  );
}

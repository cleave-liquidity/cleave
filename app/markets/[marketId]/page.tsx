import { notFound } from "next/navigation";
import { MarketDetailClient } from "@/components/markets/MarketDetailClient";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ marketId: string }>;
}) {
  const { marketId } = await params;
  const market = await yieldAdapter.getMarket(marketId);

  if (!market) {
    notFound();
  }

  return <MarketDetailClient market={market} />;
}

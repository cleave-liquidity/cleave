import { notFound } from "next/navigation";
import { MarketDetailClient } from "@/components/markets/MarketDetailClient";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { isDividendDemoStagingEnabled } from "@/lib/dividend/dividend-demo-staging";

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

  const interactiveDemoEnabled = await isDividendDemoStagingEnabled();
  return <MarketDetailClient market={market} interactiveDemoEnabled={interactiveDemoEnabled} />;
}

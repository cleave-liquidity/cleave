import { notFound, redirect } from "next/navigation";
import { TradeUnavailableState } from "@/components/trade/TradeUnavailableState";
import { TradeWorkspaceClient } from "@/components/trade/TradeWorkspaceClient";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { normalizeTradeMarketId } from "@/lib/markets/trade-market";
import { parseTradeStrategy } from "@/lib/markets/trade-strategy";
import { MAX_SAFE_DISPLAY_AMOUNT } from "@/lib/utils/amounts";

type SearchParams = { [key: string]: string | string[] | undefined };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function parseAmount(value: string | undefined): string | undefined {
  if (!value || value.length > 18) return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= MAX_SAFE_DISPLAY_AMOUNT
    ? String(amount)
    : undefined;
}

export default async function TradeWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ marketId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { marketId } = await params;
  const normalizedId = normalizeTradeMarketId(marketId);
  if (!normalizedId) notFound();

  const query = await searchParams;
  let market;
  try {
    market = await yieldAdapter.getMarket(normalizedId);
  } catch {
    return <TradeUnavailableState />;
  }

  if (!market) notFound();

  const strategy = parseTradeStrategy(query.strategy);
  const amount = parseAmount(first(query.amount));
  if (market.id.toLowerCase() !== normalizedId.toLowerCase()) {
    const canonicalQuery = new URLSearchParams();
    if (strategy) canonicalQuery.set("strategy", strategy);
    if (amount) canonicalQuery.set("amount", amount);
    const queryString = canonicalQuery.toString();
    redirect(`/trade/${market.id}${queryString ? `?${queryString}` : ""}`);
  }

  return (
    <TradeWorkspaceClient
      market={market}
      strategy={strategy}
      initialAmount={amount}
    />
  );
}

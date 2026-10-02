import { notFound } from "next/navigation";
import { MarketDetailClient } from "@/components/markets/MarketDetailClient";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { MAX_SAFE_DISPLAY_AMOUNT } from "@/lib/utils/amounts";

type SearchParams = { [key: string]: string | string[] | undefined };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** `?strategy=fixed|long` — anything else falls back to the default (Fixed). */
function parseStrategy(value: string | undefined): "fixed" | "long" | undefined {
  return value === "fixed" || value === "long" ? value : undefined;
}

/** `?amount=1000` — only a positive, finite, display-safe number is accepted. */
function parseAmount(value: string | undefined): string | undefined {
  if (!value || value.length > 18) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= MAX_SAFE_DISPLAY_AMOUNT ? String(n) : undefined;
}

export default async function MarketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ marketId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { marketId } = await params;
  const query = await searchParams;
  const market = await yieldAdapter.getMarket(marketId);

  if (!market) {
    notFound();
  }

  return (
    <MarketDetailClient
      market={market}
      initialStrategy={parseStrategy(first(query.strategy))}
      initialAmount={parseAmount(first(query.amount))}
    />
  );
}

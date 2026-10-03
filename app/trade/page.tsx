import { TradeMarketHub } from "@/components/trade/TradeMarketHub";
import { parseTradeStrategy } from "@/lib/markets/trade-strategy";

type SearchParams = { [key: string]: string | string[] | undefined };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function TradePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;

  return <TradeMarketHub strategy={parseTradeStrategy(first(query.strategy))} />;
}

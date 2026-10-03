import { keccak256, stringToHex } from "viem";
import { yieldAdapter } from "../lib/adapters/mock-adapter";
import { isMarketTradable } from "../lib/markets/status";
import { getContractByName } from "../lib/contracts/deployments";

async function main(): Promise<void> {
  if (yieldAdapter.mode !== "live") throw new Error("Mainnet market sync requires the live adapter; mock mode is refused.");
  const router = getContractByName(4663, "Pendle Router V2");
  if (!router?.verified || !router.address) throw new Error("No verified Mainnet Pendle Router V2 is registered.");

  const markets = (await yieldAdapter.getMarkets())
    .filter(isMarketTradable)
    .filter((market) => Boolean(
      market.marketAddress &&
      market.ptAddress &&
      market.ytAddress &&
      market.syAddress &&
      market.underlyingTokenAddress &&
      Number.isFinite(new Date(market.maturityDate).getTime()),
    ));
  const plan = markets.map((market) => ({
    marketId: market.id,
    marketKey: keccak256(stringToHex(market.id)),
    adapterId: "0x50454e444c450000000000000000000000000000000000000000000000000000",
    adapter: "Pendle",
    chainId: 4663,
    market: market.marketAddress,
    pt: market.ptAddress,
    yt: market.ytAddress,
    sy: market.syAddress,
    underlying: market.underlyingTokenAddress,
    maturity: Math.floor(new Date(market.maturityDate).getTime() / 1000),
    name: market.name,
  }));

  console.log(JSON.stringify({
    network: "Robinhood Chain Mainnet",
    chainId: 4663,
    source: "current live Pendle adapter",
    pendleRouter: router.address,
    registeredMarketCount: plan.length,
    markets: plan,
    broadcast: false,
  }, null, 2));
}

await main();

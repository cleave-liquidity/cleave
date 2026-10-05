import type { MarketDataMode } from "@/types/market";

export function getConfiguredDataMode(): MarketDataMode {
  const configuredMode = process.env.NEXT_PUBLIC_YELTRA_DATA_MODE ?? process.env.NEXT_PUBLIC_CLEAVE_DATA_MODE;
  return configuredMode === "mock" ? "mock" : "live";
}

import type { MarketDataMode } from "@/types/market";

export function getConfiguredDataMode(): MarketDataMode {
  return process.env.NEXT_PUBLIC_CLEAVE_DATA_MODE === "live" ? "live" : "mock";
}

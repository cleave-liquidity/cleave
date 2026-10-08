import type { MarketRowData } from "../components/MarketRow";

/**
 * Names are markets that exist in the YELTRA Market Explorer today. The rates and maturities in the film are
 * decorative (every scene that animates them carries the "Illustrative rates" tag); they are not live data.
 */
export const MARKET_ROWS: (MarketRowData & { rate: number; liquidity: number })[] = [
  { symbol: "USDG", name: "Global Dollar", initials: "US", maturity: "MAR 2027", rate: 3.3, liquidity: 0.52 },
  { symbol: "NVDA", name: "NVIDIA · Robinhood Token", initials: "NV", maturity: "OCT 2026", rate: 7.5, liquidity: 0.34 },
  { symbol: "PFE", name: "Pfizer · Robinhood Token", initials: "PF", maturity: "DEC 2026", rate: 6.4, liquidity: 0.3 },
  { symbol: "SGOV", name: "iShares 0-3 Month Treasury", initials: "SG", maturity: "NOV 2026", rate: 4.7, liquidity: 0.22 },
  { symbol: "SHROOM", name: "MUSHROOM", initials: "SH", maturity: "OCT 2026", rate: 9.8, liquidity: 0.45 },
  { symbol: "ORBIO", name: "Orbio.so", initials: "OR", maturity: "OCT 2026", rate: 8.2, liquidity: 0.18 },
  { symbol: "sNET", name: "Staked NET scaled18", initials: "sN", maturity: "OCT 2026", rate: 11.0, liquidity: 0.26 },
];

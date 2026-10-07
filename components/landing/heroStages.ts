import { formatApy, formatUsd } from "@/lib/utils/formatters";
import type { YieldMarket } from "@/types/market";
import type { FixedYieldQuote, LongYieldQuote } from "@/types/quote";
import { marketHref } from "./featuredMarket";

/** One of the two ways to own the yield, shown as a card in the first stage. */
export interface StagePath {
  kind: "fixed" | "long";
  title: string;
  tagline: string;
  figure: string;
  caption: string;
  href: string;
}

export interface StageInfo {
  index: number;
  tag: string;
  title: string;
  accent: string;
  description: string;
  /** When present the stage shows these cards instead of the detail tabs. */
  paths?: StagePath[];
  subTabs: string[];
  subDetails: string[];
  stats: { label: string; value: string; color?: string }[];
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
}

export const FALLBACK_STAGES: StageInfo[] = [
  {
    index: 0,
    tag: "00 / YIELD TRADING",
    title: "YELTRA brings yield and dividends",
    accent: "onchain.",
    description:
      "Access fixed yield, trade future yield, and explore dividend opportunities on Robinhood Chain",
    paths: [
      {
        kind: "fixed",
        title: "Fixed Yield",
        tagline: "Lock a quoted yield toward maturity.",
        figure: "Quoted",
        caption: "yield until maturity",
        href: "/markets",
      },
      {
        kind: "long",
        title: "Trading Yield",
        tagline: "Trade exposure to future yield as rates move.",
        figure: "Variable",
        caption: "rate now — can rise or fall",
        href: "/markets",
      },
    ],
    subTabs: ["01 Overview", "02 Two Ways", "03 Live Market"],
    subDetails: [
      "Yeltra splits a yield-bearing asset into two parts you can trade: a fixed side and a future-yield side.",
      "Fixed Yield targets a quoted yield toward maturity. Trading Yield follows future yield as rates move.",
      "Live on Robinhood Chain, with every rate, maturity and quote shown before you trade.",
    ],
    stats: [
      { label: "UNDERLYING", value: "Paxos USDG" },
      { label: "IMPLIED APY", value: "6.42%", color: "#3B86FF" },
      { label: "SETTLEMENT", value: "Zero Liquidation" },
    ],
    primaryCtaText: "Explore markets",
    primaryCtaHref: "/markets",
    secondaryCtaText: "How the split works",
    secondaryCtaHref: "#how",
  },
  {
    index: 1,
    tag: "01 / FIXED YIELD",
    title: "Lock a quoted yield.",
    accent: "Toward maturity.",
    description:
      "Lock a quoted 6.42% APY on USDG until 26 Mar 2027. A more predictable outcome, no margin calls, no liquidation. Selling early is priced by the market.",
    subTabs: ["01 Quoted APY", "02 Upfront Discount", "03 No Liquidation"],
    subDetails: [
      "Buy at a discount and target 1 USDG per token at maturity. Powered by Principal Tokens (PT).",
      "The quote you accept sets your outcome at maturity. Selling early is priced by the market, so it can differ.",
      "No health ratios and no liquidations. Built for a more predictable outcome.",
    ],
    stats: [
      { label: "QUOTED APY", value: "6.42%", color: "#3B86FF" },
      { label: "PRICE (PT)", value: "$0.941" },
      { label: "MATURITY", value: "26 Mar 2027" },
    ],
    primaryCtaText: "Open Fixed Yield",
    primaryCtaHref: "/markets",
    secondaryCtaText: "Explore markets",
    secondaryCtaHref: "/markets",
  },
  {
    index: 2,
    tag: "02 / TRADING YIELD",
    title: "Trade future yield.",
    accent: "As rates move.",
    description:
      "Take exposure to USDG yield as rates move. The position can gain if realized yield beats expectations, and lose value if it falls short.",
    subTabs: ["01 Variable Rate", "02 Amplified Exposure", "03 Rate Moves"],
    subDetails: [
      "Follows USDG yield as it accrues until maturity. Powered by Yield Tokens (YT).",
      "Each unit costs a fraction of USDG (~$0.059), so a small amount buys exposure to up to 16.9x more yield. Gains and losses are amplified too.",
      "Claim accrued yield any time. At maturity the position expires and does not redeem principal.",
    ],
    stats: [
      { label: "RATE NOW", value: "7.10%", color: "#EF5F22" },
      { label: "PRICE (YT)", value: "$0.059" },
      { label: "EXPOSURE", value: "~16.9x", color: "#EF5F22" },
    ],
    primaryCtaText: "Trade Future Yield",
    primaryCtaHref: "/markets",
    secondaryCtaText: "Explore markets",
    secondaryCtaHref: "/markets",
  },
  {
    index: 3,
    tag: "03 / HOW IT WORKS",
    title: "One asset.",
    accent: "Two yields to trade.",
    description:
      "Every 1 USDG splits into two parts: a fixed-yield side (PT) and a future-yield side (YT). At maturity 1 PT redeems 1 USDG, and YT expires.",
    subTabs: ["01 The Split", "02 Always Adds Up", "03 At Maturity"],
    subDetails: [
      "1 USDG = 1 PT + 1 YT. Together they always add up to the asset.",
      "Trading doesn't create protocol debt. Yield moves between Fixed Yield and Trading Yield holders.",
      "Every contract is listed in the Contract Registry, so you can see where positions come from.",
    ],
    stats: [
      { label: "THE SPLIT", value: "1 USDG = 1 PT + 1 YT" },
      { label: "AT MATURITY", value: "1 PT = 1 USDG" },
      { label: "SETTLES", value: "On-chain" },
    ],
    primaryCtaText: "View contract registry",
    primaryCtaHref: "/contracts",
    secondaryCtaText: "How it works",
    secondaryCtaHref: "#how",
  },
  {
    index: 4,
    tag: "04 / LIVE MARKETS",
    title: "USDG market.",
    accent: "Ready to trade.",
    description:
      "Choose a live market, preview your quote, and open a Fixed Yield or Trading Yield position. Live on Robinhood Chain.",
    subTabs: ["01 Live Rates", "02 Market Liquidity", "03 Preview, Then Trade"],
    subDetails: [
      "Yield comes from Morpho Prime lending markets on Robinhood Chain.",
      "Liquidity pools let you enter and exit before maturity at market prices.",
      "Preview your quote without a wallet. Connect only when you're ready to execute.",
    ],
    stats: [
      { label: "VAULT TVL", value: "$4.25M USDG" },
      { label: "24H VOLUME", value: "$382.4K" },
      { label: "NETWORK", value: "Robinhood Chain" },
    ],
    primaryCtaText: "Trade this market",
    primaryCtaHref: "/markets",
    secondaryCtaText: "Explore markets",
    secondaryCtaHref: "/markets",
  },
];

/**
 * Stage content for the featured market. Every number and name comes from the normalized market and its
 * quotes (mock or live); the wording around them is the product copy. Until a market is available the
 * fallback copy above is shown, so the hero never renders empty.
 */
export function buildStages(
  m: YieldMarket | null,
  fixed: FixedYieldQuote | null,
  long: LongYieldQuote | null,
): StageInfo[] {
  if (!m) return FALLBACK_STAGES;

  const S = m.symbol;
  const name = m.assetMetadata?.name ?? m.name;
  const underlying = name.length <= 18 ? name : S;
  const source = m.protocolMetadata?.name ?? m.sourceProtocol ?? m.yieldSource;
  const fixedApy = formatApy(fixed?.quotedFixedApy ?? m.impliedApy);
  const ptPrice = fixed ? `${fixed.ptPrice.toFixed(3)} ${S}` : "—";
  const ytPrice = long && long.ytPrice > 0 ? long.ytPrice : null;
  const leverage = ytPrice ? `~${(1 / ytPrice).toFixed(1)}x` : "—";
  const network =
    m.network === "mainnet" ? "Robinhood Chain" : "Robinhood Testnet";
  const [s0, s1, s2, s3, s4] = FALLBACK_STAGES;

  return [
    {
      ...s0,
      description: s0.description,
      paths: [
        {
          kind: "fixed",
          title: "Fixed Yield",
          tagline: s0.paths![0].tagline,
          figure: fixedApy,
          caption: `quoted until ${m.maturity}`,
          href: marketHref(m.id, "fixed"),
        },
        {
          kind: "long",
          title: "Trading Yield",
          tagline: s0.paths![1].tagline,
          figure: formatApy(m.underlyingApy),
          caption: s0.paths![1].caption,
          href: marketHref(m.id, "long"),
        },
      ],
      subDetails: [
        s0.subDetails[0],
        s0.subDetails[1],
        `Built on ${name}, earning through ${m.yieldSource} on Robinhood Chain.`,
      ],
      stats: [
        { label: "UNDERLYING", value: underlying },
        { label: "LIQUIDITY", value: formatUsd(m.liquidityUsd) },
        { label: "SETTLEMENT", value: "Zero Liquidation" },
      ],
      primaryCtaHref: "/markets",
    },
    {
      ...s1,
      description: `Lock a quoted ${fixedApy} APY on ${S} until ${m.maturity}. A more predictable outcome, no margin calls, no liquidation. Selling early is priced by the market.`,
      subDetails: [
        `Buy at a discount and target 1 ${S} per token at maturity. Powered by Principal Tokens (PT).`,
        s1.subDetails[1],
        s1.subDetails[2],
      ],
      stats: [
        { label: "QUOTED APY", value: fixedApy, color: "#3B86FF" },
        { label: "PRICE (PT)", value: ptPrice },
        { label: "MATURITY", value: m.maturity },
      ],
      primaryCtaHref: marketHref(m.id, "fixed"),
      secondaryCtaHref: "/markets",
    },
    {
      ...s2,
      description: `Take exposure to ${S} yield as rates move. The position can gain if realized yield beats expectations, and lose value if it falls short.`,
      subDetails: [
        `Follows ${S} yield as it accrues until maturity. Powered by Yield Tokens (YT).`,
        ytPrice
          ? `Each unit costs ~${ytPrice.toFixed(3)} ${S}, so a small amount buys exposure to up to ${(1 / ytPrice).toFixed(1)}x more yield. Gains and losses are amplified too.`
          : "A small amount buys exposure to a much larger yield stream. Gains and losses are amplified too.",
        s2.subDetails[2],
      ],
      stats: [
        {
          label: "RATE NOW",
          value: formatApy(m.underlyingApy),
          color: "#EF5F22",
        },
        {
          label: "PRICE (YT)",
          value: ytPrice ? `${ytPrice.toFixed(3)} ${S}` : "—",
        },
        { label: "EXPOSURE", value: leverage, color: "#EF5F22" },
      ],
      primaryCtaHref: marketHref(m.id, "long"),
      secondaryCtaHref: "/markets",
    },
    {
      ...s3,
      description: `Every 1 ${S} splits into two parts: a fixed-yield side (PT) and a future-yield side (YT). At maturity 1 PT redeems 1 ${S}, and YT expires.`,
      subDetails: [
        `1 ${S} = 1 PT + 1 YT. Together they always add up to the asset.`,
        s3.subDetails[1],
        s3.subDetails[2],
      ],
      stats: [
        { ...s3.stats[0], value: `1 ${S} = 1 PT + 1 YT` },
        { ...s3.stats[1], value: `1 PT = 1 ${S}` },
        s3.stats[2],
      ],
    },
    {
      ...s4,
      title: `${S} market.`,
      description: s4.description,
      subDetails: [
        `${source} ${S} market provides yield from ${m.yieldSource}.`,
        s4.subDetails[1],
        s4.subDetails[2],
      ],
      stats: [
        { label: "LIQUIDITY", value: formatUsd(m.liquidityUsd) },
        { label: "DAYS LEFT", value: `${m.daysRemaining}d` },
        { label: "NETWORK", value: network },
      ],
      primaryCtaHref: marketHref(m.id),
      secondaryCtaHref: "/markets",
    },
  ];
}

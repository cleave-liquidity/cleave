import type { DividendEvent } from "@/lib/dividend/dividend-types";
import type { RobinhoodStockTokenAsset } from "@/lib/dividend/dividend-source-adapter";
import { ROBINHOOD_CHAIN_ID } from "@/lib/web3/chains";
import type { YieldMarket } from "@/types/market";

export type DividendCoverageStatus =
  | "SUPPORTED"
  | "SOURCE DETECTED"
  | "VERIFICATION PENDING"
  | "UNSUPPORTED"
  | "MATURED";

export type DividendSourceSnapshot = {
  assets: RobinhoodStockTokenAsset[];
  events: DividendEvent[];
  assetsVerified: boolean;
  eventsVerified: boolean;
};

export type DividendMarketReference = Pick<YieldMarket, "id"> &
  Partial<Pick<
    YieldMarket,
    | "chainId"
    | "marketAddress"
    | "underlyingTokenAddress"
    | "ytAddress"
    | "providerId"
    | "marketType"
    | "execution"
    | "status"
    | "maturityDate"
    | "maturityType"
  >>;

export type DividendMarketConfig = {
  marketId: string;
  chainId: typeof ROBINHOOD_CHAIN_ID;
  tokenAddress: `0x${string}`;
  source: "ROBINHOOD_CORPORATE_ACTIONS";
};

export type DividendCoverage = {
  status: DividendCoverageStatus;
  reason: string;
  sourceAsset?: RobinhoodStockTokenAsset;
  event?: DividendEvent;
};

export function hasTradingYieldProduct(
  market: DividendMarketReference,
): boolean {
  return Boolean(
    market.chainId === ROBINHOOD_CHAIN_ID &&
      market.providerId === "pendle" &&
      market.marketType === "pt-yt" &&
      market.execution?.enabled === true &&
      market.execution.providerId === "pendle" &&
      market.marketAddress &&
      market.ytAddress &&
      market.underlyingTokenAddress,
  );
}

/** Returns a source lookup key for a real Pendle Trading Yield market. */
export function getDividendMarketConfig(
  market: DividendMarketReference,
): DividendMarketConfig | undefined {
  if (!hasTradingYieldProduct(market) || !market.marketAddress || !market.underlyingTokenAddress) {
    return undefined;
  }
  return {
    marketId: market.marketAddress.toLowerCase(),
    chainId: ROBINHOOD_CHAIN_ID,
    tokenAddress: market.underlyingTokenAddress,
    source: "ROBINHOOD_CORPORATE_ACTIONS",
  };
}

function marketHasMatured(market: DividendMarketReference, now: number): boolean {
  if (market.status === "matured") return true;
  if (market.maturityType === "open-ended" || !market.maturityDate) return false;
  const maturity = new Date(market.maturityDate).getTime();
  return Number.isFinite(maturity) && maturity <= now;
}

function eventForMarket(
  market: DividendMarketReference,
  snapshot: DividendSourceSnapshot,
): DividendEvent | undefined {
  const tokenAddress = market.underlyingTokenAddress?.toLowerCase();
  if (!tokenAddress) return undefined;
  return snapshot.events
    .filter((event) =>
      event.chainId === ROBINHOOD_CHAIN_ID &&
      event.tokenAddress?.toLowerCase() === tokenAddress,
    )
    .sort((left, right) => (right.processDate || "").localeCompare(left.processDate || ""))[0];
}

export function getDividendCoverage(
  market: DividendMarketReference,
  snapshot?: DividendSourceSnapshot,
  options: {
    now?: number;
    economicEntitlementVerified?: boolean;
    activationInfrastructureVerified?: boolean;
  } = {},
): DividendCoverage {
  const now = options.now ?? Date.now();
  if (marketHasMatured(market, now)) {
    return {
      status: "MATURED",
      reason: "Maturity has passed. No new Trading Yield position can be opened; historical holdings remain separate.",
    };
  }

  if (!snapshot || (!snapshot.assetsVerified && !snapshot.eventsVerified)) {
    return {
      status: "VERIFICATION PENDING",
      reason: "Robinhood asset and corporate-action sources could not be verified just now.",
    };
  }

  const tokenAddress = market.underlyingTokenAddress?.toLowerCase();
  const sourceAsset = snapshot.assetsVerified ? snapshot.assets.find((asset) =>
    asset.chainId === ROBINHOOD_CHAIN_ID &&
    asset.status === "ASSET_STATUS_ACTIVE" &&
    asset.tokenAddress.toLowerCase() === tokenAddress,
  ) : undefined;
  const event = eventForMarket(market, snapshot);

  if (event && snapshot.eventsVerified) {
    const entitlementReady =
      snapshot.assetsVerified &&
      Boolean(sourceAsset) &&
      market.status !== "paused" &&
      hasTradingYieldProduct(market) &&
      options.economicEntitlementVerified === true &&
      options.activationInfrastructureVerified === true;
    return entitlementReady
      ? {
          status: "SUPPORTED",
          reason: "A matching distribution, separate economic entitlement, and activation infrastructure are verified.",
          sourceAsset,
          event,
        }
      : {
          status: "SOURCE DETECTED",
          reason: hasTradingYieldProduct(market)
            ? `A matching ${event.type.replaceAll("_", " ")} event is reported; separate YT entitlement and settlement are not verified.`
            : `A matching ${event.type.replaceAll("_", " ")} event is reported, but this market has no executable YELTRA Trading Yield position; no Dividend Earn eligibility is inferred.`,
          sourceAsset,
          event,
        };
  }

  if (!snapshot.eventsVerified || !snapshot.assetsVerified) {
    return {
      status: "VERIFICATION PENDING",
      reason: "The market's distribution source could not be fully checked; no eligibility is inferred.",
      sourceAsset,
    };
  }

  if (sourceAsset) {
    return {
      status: "VERIFICATION PENDING",
      reason: "Underlying is an active Robinhood stock token, but no matching distribution event is currently reported; separate entitlement is unverified.",
      sourceAsset,
    };
  }

  if (!hasTradingYieldProduct(market)) {
    return {
      status: "UNSUPPORTED",
      reason: market.execution?.reason ||
        "This market has no executable YELTRA Trading Yield position and no verified separate distribution source.",
    };
  }

  return {
    status: "UNSUPPORTED",
    reason: "No verified separate distribution source exists for this underlying; ordinary yield is not Dividend Earn support.",
  };
}

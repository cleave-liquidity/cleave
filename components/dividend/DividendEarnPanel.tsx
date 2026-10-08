"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import type { LongYieldPosition } from "@/types/position";
import type { YieldMarket } from "@/types/market";
import { useAccount } from "wagmi";
import {
  getDividendMarketConfig,
  isDividendEarnMarket,
} from "@/lib/dividend/dividend-config";
import {
  sourceLabel,
} from "@/lib/dividend/dividend-source-adapter";
import type { DividendEvent } from "@/lib/dividend/dividend-types";
import { useDividendEarn } from "@/hooks/useDividendEarn";
import { useMainnetDividendYtPosition } from "@/hooks/useMainnetDividendYtPosition";
import { buildTradeWorkspaceHref } from "@/lib/markets/trade-strategy";
import { ROBINHOOD_CHAIN_ID } from "@/lib/web3/chains";

type DividendPanelMarket = Pick<YieldMarket, "id"> &
  Partial<
    Pick<
      YieldMarket,
      | "chainId"
      | "marketAddress"
      | "underlyingTokenAddress"
      | "ytAddress"
      | "maturity"
      | "maturityDate"
      | "symbol"
    >
  >;

type DividendPanelProps = {
  market: DividendPanelMarket;
  position?: LongYieldPosition;
  compact?: boolean;
  interactiveDemoEnabled?: boolean;
};

function statusClass(status: string): string {
  if (status === "POSITION VERIFIED" || status === "ACTIVE") {
    return "border-positive/30 bg-positive/5 text-positive";
  }
  if (status === "NO TRADING YIELD POSITION" || status === "WRONG NETWORK") {
    return "border-amber/30 bg-amber/5 text-amber";
  }
  return "border-white/15 bg-surface text-muted";
}

function displayMaturity(timestamp?: bigint): string {
  if (!timestamp) return "Unavailable";
  return new Date(Number(timestamp) * 1_000).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function displayAmount(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function DividendEarnPanel({
  market,
  position,
  compact = false,
  interactiveDemoEnabled = false,
}: DividendPanelProps) {
  const account = useAccount();
  const { openConnectModal } = useConnectModal();
  const marketConfig = getDividendMarketConfig(market);
  const isSupportedMarket = isDividendEarnMarket(market);
  const mainnetPosition = useMainnetDividendYtPosition(market);
  const [latestEvent, setLatestEvent] = useState<DividendEvent>();
  const [eventLoading, setEventLoading] = useState(false);
  const [eventReadFailed, setEventReadFailed] = useState(false);
  const [now, setNow] = useState<number>();

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const portfolioPositionChainId = position
    ? Number(position.id.split(":")[1])
    : undefined;
  const portfolioPositionMatches = Boolean(
    position &&
      position.status !== "closed" &&
      position.ytAmount > 0 &&
      portfolioPositionChainId === ROBINHOOD_CHAIN_ID &&
      account.address?.toLowerCase() === position.owner.toLowerCase(),
  );
  const hasMarketReadMetadata = Boolean(
    market.marketAddress && market.ytAddress && market.underlyingTokenAddress,
  );
  const hasPosition = hasMarketReadMetadata
    ? mainnetPosition.hasPosition
    : portfolioPositionMatches;
  const verifiedPosition = hasMarketReadMetadata
    ? mainnetPosition.data?.owner &&
      mainnetPosition.data.positionId &&
      mainnetPosition.hasPosition
      ? {
          id: mainnetPosition.data.positionId,
          owner: mainnetPosition.data.owner,
          marketId: mainnetPosition.data.marketId,
        }
      : undefined
    : portfolioPositionMatches
      ? position
      : undefined;
  const dividend = useDividendEarn(verifiedPosition);

  useEffect(() => {
    let cancelled = false;
    if (!marketConfig) {
      setLatestEvent(undefined);
      setEventLoading(false);
      setEventReadFailed(false);
      return;
    }
    setEventLoading(true);
    setEventReadFailed(false);
    void fetch("/api/dividend/events", { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Corporate-action source unavailable.");
        return (await response.json()) as { events?: DividendEvent[] };
      })
      .then(({ events }) => {
        if (cancelled) return;
        const latest = (events || []).reduce<DividendEvent | undefined>((current, event) => {
          if (!current) return event;
          return (event.processDate || "") > (current.processDate || "")
            ? event
            : current;
        }, undefined);
        setLatestEvent(latest);
      })
      .catch(() => {
        if (!cancelled) {
          setLatestEvent(undefined);
          setEventReadFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setEventLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [marketConfig]);

  if (!isSupportedMarket || !marketConfig) return null;

  const positionStatus = !account.isConnected
    ? "CONNECT WALLET"
    : hasPosition
      ? "POSITION VERIFIED"
      : hasMarketReadMetadata && mainnetPosition.isLoading
        ? "VERIFYING YT POSITION"
        : hasMarketReadMetadata && mainnetPosition.readUnavailable
          ? "POSITION READ UNAVAILABLE"
          : "NO TRADING YIELD POSITION";
  const networkStatus = !account.isConnected
    ? "Wallet not connected"
    : account.chainId === ROBINHOOD_CHAIN_ID
      ? "Robinhood Chain Mainnet · 4663"
      : `Wrong network · connected chain ${account.chainId ?? "unknown"}`;
  const currentYtAmount = hasMarketReadMetadata
    ? account.isConnected
      ? mainnetPosition.data?.balanceBaseUnits !== undefined
        ? mainnetPosition.formattedBalance ?? "0"
        : undefined
      : undefined
    : portfolioPositionMatches && position
      ? displayAmount(position.ytAmount)
      : undefined;
  const maturity = hasMarketReadMetadata
    ? displayMaturity(mainnetPosition.data?.maturityTimestamp)
    : position?.maturity || market.maturity || "Unavailable";
  const lifecycle = hasMarketReadMetadata
    ? mainnetPosition.data
      ? now === undefined
        ? "Reading lifecycle…"
        : Number(mainnetPosition.data.maturityTimestamp) * 1_000 > now
        ? "ACTIVE · maturity not reached"
        : "MATURED · YT token balance remains"
      : "Unavailable"
    : position?.status === "matured"
      ? "MATURED"
      : position?.status === "active"
        ? "ACTIVE"
        : "Unavailable";
  const sourceStatus = eventLoading
    ? "Checking source"
    : eventReadFailed
      ? "Source unavailable"
    : latestEvent
      ? "Corporate action detected"
      : "No event detected";
  const activationStatus = dividend.state?.enabled
    ? "Enabled · verified on-chain"
    : dividend.configured
      ? "Not enabled"
      : "Unavailable · no separate Mainnet Dividend Registry";
  const accrued = dividend.state && dividend.rewardDecimals !== undefined
    ? `${formatUnits(dividend.state.accruedBaseUnits, dividend.rewardDecimals)} USD`
    : "Unavailable · no verified Mainnet accounting read";
  const settlementStatus = dividend.state
    ? dividend.state.settlementEnabled
      ? "Enabled on-chain"
      : "Not enabled"
    : "Not configured";

  if (compact) {
    return (
      <div className="w-full rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="mono text-[10px] uppercase tracking-[0.12em] text-muted-dark">
            Dividend Earn
          </span>
          <span className={`mono text-[10px] ${positionStatus === "POSITION VERIFIED" ? "text-positive" : "text-muted"}`}>
            {positionStatus}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-muted-dark">
          {hasPosition
            ? `YT ${currentYtAmount} · separate cash claim unavailable`
            : "No verified Mainnet Trading Yield position"}
        </div>
        <div className="mt-1 text-[11px] text-muted-dark">
          Source {latestEvent ? "detected" : eventLoading ? "checking" : eventReadFailed ? "unavailable" : "not detected"} · Separate claim unavailable
        </div>
        <div className="mt-1 text-[11px] text-muted-dark">
          Accrued {accrued} · Claimable unavailable · Settlement {settlementStatus}
        </div>
      </div>
    );
  }

  return (
    <section
      className="border border-white/15 bg-surface/70 p-5 sm:p-6"
      aria-labelledby="dividend-earn-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-dark">
            Trading Yield enhancement
          </div>
          <h2
            id="dividend-earn-title"
            className="mt-2 text-[20px] font-normal text-foreground"
          >
            Dividend Earn
          </h2>
        </div>
        <span
          className={`mono rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${statusClass(positionStatus)}`}
        >
          {positionStatus}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 border-y border-white/10 py-4 text-[13px] sm:grid-cols-2">
        <div>
          <dt className="text-muted-dark">Connected wallet</dt>
          <dd className="mt-1 break-all font-mono text-foreground">
            {account.address || "Not connected"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-dark">Wallet network</dt>
          <dd className={`mt-1 font-mono ${account.chainId === ROBINHOOD_CHAIN_ID ? "text-foreground" : "text-amber"}`}>
            {networkStatus}
          </dd>
        </div>
        <div>
          <dt className="text-muted-dark">Trading Yield market</dt>
          <dd className="mt-1 break-all font-mono text-foreground">
            {market.marketAddress || marketConfig.marketId}
          </dd>
        </div>
        <div>
          <dt className="text-muted-dark">YT token</dt>
          <dd className="mt-1 break-all font-mono text-foreground">
            {mainnetPosition.data?.ytAddress || market.ytAddress || "Unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-dark">Owned YT</dt>
          <dd className="mt-1 font-mono text-foreground">
            {currentYtAmount === undefined
              ? !account.isConnected
                ? "Connect wallet to read"
                : hasMarketReadMetadata && mainnetPosition.isLoading
                  ? "Reading Mainnet balance…"
                  : "—"
              : `${currentYtAmount} YT`}
          </dd>
        </div>
        <div>
          <dt className="text-muted-dark">Position lifecycle</dt>
          <dd className="mt-1 font-mono text-foreground">{lifecycle}</dd>
        </div>
        <div>
          <dt className="text-muted-dark">Position maturity</dt>
          <dd className="mt-1 font-mono text-foreground">{maturity}</dd>
        </div>
        <div>
          <dt className="text-muted-dark">Dividend source</dt>
          <dd className="mt-1 font-mono text-foreground">
            {sourceLabel(marketConfig.source)} · {sourceStatus}
          </dd>
        </div>
        <div>
          <dt className="text-muted-dark">Latest source event · process date</dt>
          <dd className="mt-1 font-mono text-amber">
            {eventLoading
              ? "Reading source…"
              : latestEvent
                ? `${latestEvent.rate} USD / share · ${latestEvent.processDate || "Date unavailable"}`
                : eventReadFailed
                  ? "Corporate-action source unavailable"
                  : "No source event available"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-dark">Underlying multiplier / SY rate</dt>
          <dd className="mt-1 font-mono text-foreground">
            {mainnetPosition.data
              ? mainnetPosition.data.multiplierAligned
                ? "Aligned · event-specific entitlement not proven"
                : "Not aligned · separate review required"
              : "Mainnet market read unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-dark">Separate cash Dividend Earn entitlement</dt>
          <dd className="mt-1 font-mono text-amber">
            Not supported · no separate funded claim path
          </dd>
        </div>
        <div>
          <dt className="text-muted-dark">Historical record-date evidence</dt>
          <dd className="mt-1 font-mono text-muted">Unavailable · current balance only</dd>
        </div>
        <div>
          <dt className="text-muted-dark">Dividend Earn activation</dt>
          <dd className="mt-1 font-mono text-muted">{activationStatus}</dd>
        </div>
        <div>
          <dt className="text-muted-dark">Accrued · on-chain accounting</dt>
          <dd className="mt-1 font-mono text-foreground">{accrued}</dd>
        </div>
        <div>
          <dt className="text-muted-dark">Claimable</dt>
          <dd className="mt-1 font-mono text-muted">
            Unavailable · no funded claim module
          </dd>
        </div>
        <div>
          <dt className="text-muted-dark">Settlement</dt>
          <dd className="mt-1 font-mono text-muted">{settlementStatus}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 max-w-[760px] text-[12px] leading-5 text-muted-dark">
          {positionStatus === "CONNECT WALLET" ? (
            <>
              Connect a wallet to read its actual YT balance from Robinhood Chain
              Mainnet. The current NVDA multiplier matches the Pendle SY rate;
              that confirms rate alignment, not a separate cash entitlement or
              historical event eligibility.
            </>
          ) : positionStatus === "NO TRADING YIELD POSITION" ? (
            <>No YT balance was found for this wallet at the latest Mainnet read. No eligibility or accrual is inferred from the market event.</>
          ) : positionStatus === "POSITION READ UNAVAILABLE" ? (
            <>The Mainnet market/YT read could not be verified. No position or dividend eligibility is assumed.</>
          ) : (
            <>Current YT ownership is verified on-chain, but it does not prove historical ownership at a corporate-action record date. Robinhood&apos;s process date is a scheduling field, not proof of payment or eligibility. The NVDA multiplier and Pendle SY exchange rate currently match on-chain; this is rate alignment, not proof of a separate event entitlement. No separate Mainnet Registry or funded claim path is configured.</>
          )}
        </p>
        {!account.isConnected ? (
          <button
            type="button"
            onClick={() => openConnectModal?.()}
            className="inline-flex h-9 items-center justify-center rounded-md border border-ice/40 px-3 text-[11px] font-medium text-ice transition-colors hover:border-ice hover:bg-ice/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
          >
            Connect Wallet
          </button>
        ) : positionStatus === "NO TRADING YIELD POSITION" ? (
          <Link
            href={buildTradeWorkspaceHref(market.id, "long")}
            className="inline-flex h-9 items-center justify-center rounded-md border border-amber/40 px-3 text-[11px] font-medium text-amber transition-colors hover:border-amber hover:bg-amber/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          >
            Open Trading Yield
          </Link>
        ) : null}
      </div>

      <details className="mt-5 border-t border-white/10 pt-4">
        <summary className="cursor-pointer text-[11px] text-muted-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
          Separate Testnet technical inspection
        </summary>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-[12px] leading-5 text-muted-dark">
            Testnet canary data is development-only and is not this Mainnet wallet&apos;s position.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {interactiveDemoEnabled && (
              <Link
                href="/dividend/demo"
                className="whitespace-nowrap text-[12px] text-amber transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber"
              >
                Interactive Testnet Demo →
              </Link>
            )}
            <Link
              href="/dividend/canary"
              className="whitespace-nowrap text-[12px] text-ice transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice"
            >
              Canary inspection →
            </Link>
          </div>
        </div>
      </details>
    </section>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import type { YieldMarket } from "@/types/market";
import {
  getDividendCoverage,
  getDividendMarketConfig,
  hasTradingYieldProduct,
  type DividendMarketReference,
} from "@/lib/dividend/dividend-config";
import { useDividendEarn } from "@/hooks/useDividendEarn";
import { useDividendSourceSnapshot } from "@/hooks/useDividendSourceSnapshot";
import { useMainnetDividendYtPosition } from "@/hooks/useMainnetDividendYtPosition";
import { isMarketExecutable } from "@/lib/markets/status";
import { buildTradeWorkspaceHref } from "@/lib/markets/trade-strategy";
import { ROBINHOOD_CHAIN_ID } from "@/lib/web3/chains";

type DividendPanelMarket = DividendMarketReference &
  Partial<Pick<YieldMarket, "maturity" | "symbol">>;

type DividendPanelProps = {
  market: DividendPanelMarket;
  mode?: "availability" | "position";
  surface?: "market-detail" | "trading-yield" | "portfolio";
  compact?: boolean;
  interactiveDemoEnabled?: boolean;
};

const NVDA_CANARY_UNDERLYING = "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec";

function statusTone(status: string): string {
  switch (status) {
    case "SUPPORTED":
    case "POSITION VERIFIED":
      return "border-positive/30 bg-positive/5 text-positive";
    case "SOURCE DETECTED":
    case "MATURED":
    case "NO TRADING YIELD POSITION":
    case "WRONG NETWORK":
      return "border-amber/30 bg-amber/5 text-amber";
    default:
      return "border-white/15 bg-surface text-muted";
  }
}

function displayAmount(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function focusTradeAmount(): void {
  const input = document.getElementById("trade-amount");
  if (!(input instanceof HTMLElement)) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  input.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  input.focus({ preventScroll: true });
}

export function DividendEarnPanel({
  market,
  mode = "availability",
  surface = "market-detail",
  compact = false,
  interactiveDemoEnabled = false,
}: DividendPanelProps) {
  const account = useAccount();
  const { openConnectModal } = useConnectModal();
  const { snapshot, isLoading: sourcesLoading, unavailable: sourcesUnavailable } =
    useDividendSourceSnapshot();
  const marketConfig = getDividendMarketConfig(market);
  const isPositionView = mode === "position";
  const hasProduct = hasTradingYieldProduct(market);
  const canTrade = isMarketExecutable(market as YieldMarket);
  const mainnetPosition = useMainnetDividendYtPosition(
    market,
    isPositionView && hasProduct,
  );
  const [now, setNow] = useState<number>();

  useEffect(() => setNow(Date.now()), []);

  const coverage = getDividendCoverage(market, snapshot, { now: now ?? 0 });
  const hasMarketReadMetadata = Boolean(
    market.marketAddress && market.ytAddress && market.underlyingTokenAddress,
  );
  const hasVerifiedYtPosition = Boolean(
    isPositionView && hasMarketReadMetadata && mainnetPosition.hasPosition,
  );
  const verifiedPosition = hasVerifiedYtPosition && mainnetPosition.data?.owner &&
    mainnetPosition.data.positionId
    ? {
        id: mainnetPosition.data.positionId,
        owner: mainnetPosition.data.owner,
        marketId: mainnetPosition.data.marketId,
      }
    : undefined;
  const dividend = useDividendEarn(verifiedPosition);

  const positionStatus = !account.isConnected
      ? "CONNECT WALLET"
      : account.chainId !== ROBINHOOD_CHAIN_ID
        ? "WRONG NETWORK"
        : !hasMarketReadMetadata
          ? "POSITION READ UNAVAILABLE"
      : hasVerifiedYtPosition
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
  const currentYtAmount = hasVerifiedYtPosition && mainnetPosition.formattedBalance !== undefined
    ? mainnetPosition.formattedBalance
    : undefined;
  const dividendActivation = dividend.state?.enabled
    ? "Enabled · verified on-chain"
    : !hasVerifiedYtPosition
      ? "Unavailable · no verified YT position"
      : !dividend.configured
        ? "Unavailable · no separate Dividend Registry"
        : dividend.error === "DIVIDEND_MARKET_NOT_ENABLED"
          ? "Market is not enabled on the Dividend Registry"
          : dividend.error === "POSITION_REGISTRATION_PENDING" ||
              dividend.error === "POSITION_NOT_REGISTERED_OR_MISMATCHED"
            ? "Position is not registered for Dividend Earn"
            : "No on-chain activation record";
  const accrued = dividend.state && dividend.rewardDecimals !== undefined
    ? `${formatUnits(dividend.state.accruedBaseUnits, dividend.rewardDecimals)} USD`
    : "Unavailable · no verified accounting read";
  const settlement = dividend.state
    ? dividend.state.settlementEnabled ? "Enabled on-chain" : "Settlement pending"
    : "Not configured";
  const canShowCanaryInspection = Boolean(
    interactiveDemoEnabled &&
      market.underlyingTokenAddress?.toLowerCase() === NVDA_CANARY_UNDERLYING,
  );

  const statusBadge = (
    <span className={`mono inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusTone(coverage.status)}`}>
      {coverage.status}
    </span>
  );

  if (!isPositionView) {
    return (
      <section className={`border border-white/15 bg-surface/70 ${compact ? "p-4" : "p-5 sm:p-6"}`} aria-label="Dividend Earn availability">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-dark">YELTRA market feature</div>
            <h2 className="m-0 mt-1 text-[18px] font-normal text-foreground">Dividend Earn</h2>
          </div>
          {statusBadge}
        </div>
        <p className="mb-0 mt-3 max-w-[780px] text-[13px] leading-6 text-muted">
          {sourcesLoading && coverage.status === "VERIFICATION PENDING"
            ? "Checking the market’s registered distribution sources and matching events."
            : coverage.reason}
        </p>
        {coverage.event && (
          <div className="mt-3 border-l-2 border-amber/50 pl-3 text-[12px] leading-5 text-muted-dark">
            <span className="text-amber">Source event detected</span>
            {" · "}{coverage.event.type.replaceAll("_", " ")}
            {coverage.event.rate ? ` · ${coverage.event.rate} per share` : ""}
            {coverage.event.processDate ? ` · process date ${coverage.event.processDate}` : ""}
            {" · event detection does not establish YT entitlement or payout."}
          </div>
        )}
        {sourcesUnavailable && (
          <p className="mb-0 mt-2 text-[11px] text-muted-dark">Distribution source verification is currently unavailable.</p>
        )}
        {surface === "market-detail" && hasProduct && canTrade && (
          <Link
            href={buildTradeWorkspaceHref(market.id, "long")}
            className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-amber/35 px-3 text-[12px] font-medium text-amber transition-colors hover:border-amber hover:bg-amber/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          >
            Open Trading Yield
          </Link>
        )}
        {canShowCanaryInspection && (
          <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-muted-dark">
            Testnet development canary · separate from Mainnet market support. {" "}
            <Link href="/dividend/canary" className="text-ice hover:text-white">Inspect canary →</Link>
            {" · "}
            <Link href="/dividend/demo" className="text-amber hover:text-white">Interactive demo →</Link>
          </div>
        )}
      </section>
    );
  }

  if (compact) {
    return (
      <div className="w-full rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-right" aria-label="Dividend Earn position status">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mono text-[10px] uppercase tracking-[0.12em] text-muted-dark">Dividend Earn</span>
          <span className={`mono rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] ${statusTone(coverage.status)}`}>
            {coverage.status}
          </span>
          <span className={`mono text-[10px] ${statusTone(positionStatus)}`}>{positionStatus}</span>
        </div>
        <div className="mt-1 text-[11px] text-muted-dark">
          {hasVerifiedYtPosition
            ? `On-chain YT ${currentYtAmount ?? "—"} · separate cash entitlement not verified`
            : account.isConnected
              ? "No verified Mainnet YT position for this wallet"
              : "Connect a wallet to check its Mainnet YT balance"}
        </div>
        <div className="mt-1 text-[11px] text-muted-dark">
          {coverage.event
            ? `Source event detected · process date ${coverage.event.processDate || "unavailable"}`
            : coverage.reason}
        </div>
        <div className="mt-1 text-[11px] text-muted-dark">
          Accrued {accrued} · Settlement {settlement}
        </div>
      </div>
    );
  }

  const canScrollToTradeForm = surface === "trading-yield" && hasProduct && canTrade;

  return (
    <section className="border border-white/15 bg-surface/70 p-5 sm:p-6" aria-labelledby="dividend-earn-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-dark">Trading Yield enhancement</div>
          <h2 id="dividend-earn-title" className="mt-2 text-[20px] font-normal text-foreground">Dividend Earn</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {statusBadge}
          <span className={`mono rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusTone(positionStatus)}`}>
            {positionStatus}
          </span>
        </div>
      </div>

      <p className="mb-0 mt-3 text-[13px] leading-6 text-muted">{coverage.reason}</p>

      <dl className="mt-4 grid gap-3 border-y border-white/10 py-4 text-[12px] sm:grid-cols-2">
        <div>
          <dt className="text-muted-dark">Connected wallet</dt>
          <dd className="mt-1 break-all font-mono text-foreground">{account.address || "Not connected"}</dd>
        </div>
        <div>
          <dt className="text-muted-dark">Wallet network</dt>
          <dd className={`mt-1 font-mono ${account.isConnected && account.chainId !== ROBINHOOD_CHAIN_ID ? "text-amber" : "text-foreground"}`}>{networkStatus}</dd>
        </div>
        <div>
          <dt className="text-muted-dark">Trading Yield market</dt>
          <dd className="mt-1 break-all font-mono text-foreground">{market.marketAddress || marketConfig?.marketId || "Unavailable"}</dd>
        </div>
        <div>
          <dt className="text-muted-dark">YT token</dt>
          <dd className="mt-1 break-all font-mono text-foreground">{mainnetPosition.data?.ytAddress || market.ytAddress || "Unavailable"}</dd>
        </div>
        <div>
          <dt className="text-muted-dark">Owned YT · on-chain</dt>
          <dd className="mt-1 font-mono text-foreground">
            {currentYtAmount === undefined
              ? !account.isConnected ? "Connect wallet to read" : mainnetPosition.isLoading ? "Reading Mainnet balance…" : "No verified balance"
              : `${currentYtAmount} YT`}
          </dd>
        </div>
        <div>
          <dt className="text-muted-dark">Dividend source</dt>
          <dd className="mt-1 font-mono text-foreground">
            {coverage.event ? "Robinhood corporate action · source detected" : sourcesLoading ? "Checking registered source" : sourcesUnavailable ? "Source verification unavailable" : coverage.sourceAsset ? "Robinhood stock-token source · no matching event" : "No separate source verified"}
          </dd>
        </div>
        {coverage.event && (
          <div>
            <dt className="text-muted-dark">Source event · process date</dt>
            <dd className="mt-1 font-mono text-amber">
              {coverage.event.type.replaceAll("_", " ")} · {coverage.event.rate} per share · {coverage.event.processDate || "Date unavailable"}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-muted-dark">Separate cash entitlement</dt>
          <dd className="mt-1 font-mono text-amber">Not verified · no supported claim path</dd>
        </div>
        {account.isConnected && (
          <>
            <div>
              <dt className="text-muted-dark">Dividend Earn activation</dt>
              <dd className="mt-1 font-mono text-muted">{dividendActivation}</dd>
            </div>
            <div>
              <dt className="text-muted-dark">Accrued · on-chain accounting</dt>
              <dd className="mt-1 font-mono text-foreground">{accrued}</dd>
            </div>
            <div>
              <dt className="text-muted-dark">Settlement</dt>
              <dd className="mt-1 font-mono text-muted">{settlement}</dd>
            </div>
          </>
        )}
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 max-w-[760px] text-[12px] leading-5 text-muted-dark">
          A source event is not proof of YT ownership at a record date or of a separate economic entitlement. No Dividend Earn Enable or Claim action is available for this market until entitlement and settlement infrastructure are verified.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!account.isConnected && surface !== "trading-yield" && (
            <button
              type="button"
              onClick={() => openConnectModal?.()}
              className="inline-flex h-9 items-center justify-center rounded-md border border-ice/40 px-3 text-[11px] font-medium text-ice transition-colors hover:border-ice hover:bg-ice/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
            >
              Connect Wallet
            </button>
          )}
          {canScrollToTradeForm && (
            <button
              type="button"
              onClick={focusTradeAmount}
              className="inline-flex h-9 items-center justify-center rounded-md border border-amber/40 px-3 text-[11px] font-medium text-amber transition-colors hover:border-amber hover:bg-amber/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
            >
              Open Trading Yield
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

"use client";

import React from "react";
import { formatUnits } from "viem";
import { useDividendCanary } from "@/hooks/useDividendCanary";
import { ROBINHOOD_TESTNET_CHAIN_ID } from "@/lib/web3/chains";

function compactAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function timestampLabel(value?: bigint): string {
  if (!value || value === BigInt(0)) return "Unavailable";
  return new Date(Number(value) * 1_000).toISOString().slice(0, 10);
}

function lensStatusLabel(status?: number): string {
  return (
    ["UNAVAILABLE", "ELIGIBLE", "ACTIVE", "PENDING", "CLAIMABLE"][status ?? 0] ??
    "UNAVAILABLE"
  );
}

export function DividendCanaryPanel() {
  const canary = useDividendCanary();
  const status = !canary.isHydrated
      ? "READING TESTNET STATE"
    : canary.error
      ? "UNAVAILABLE"
      : canary.state
        ? lensStatusLabel(canary.state.status)
        : canary.market?.enabled
          ? "POSITION INSPECTION REQUIRED"
          : "UNAVAILABLE";
  const rewardDecimals = canary.accountingMarket?.rewardDecimals ?? 6;
  const accrued = canary.state
    ? formatUnits(canary.state.accruedBaseUnits, rewardDecimals)
    : undefined;

  return (
    <section
      className="border border-white/15 bg-surface/70 p-5 sm:p-7"
      aria-labelledby="dividend-canary-title"
      data-testid="dividend-testnet-canary"
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-dark">
            Development inspection flow
          </div>
          <h1
            id="dividend-canary-title"
            className="mt-2 text-[26px] font-normal tracking-[-0.02em] text-foreground"
          >
            Dividend Earn
          </h1>
          <p className="mt-2 max-w-[620px] text-[13px] leading-6 text-muted">
            Real YELTRA Testnet canary state using simulated development event
            data. This is not a funded Mainnet payout or a production Portfolio
            position.
          </p>
        </div>
        <span className="mono rounded-full border border-amber/30 bg-amber/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-amber">
          Development Canary
        </span>
      </div>

      <div className="mt-6 grid gap-3 border-y border-white/10 py-4 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <span className="block text-muted-dark">Network</span>
          <span className="mt-1 block font-mono text-foreground">
            Robinhood Chain Testnet · {ROBINHOOD_TESTNET_CHAIN_ID}
          </span>
        </div>
        <div>
          <span className="block text-muted-dark">Dividend source</span>
          <span className="mt-1 block font-mono text-foreground">
            Robinhood Corporate Actions
          </span>
        </div>
        <div>
          <span className="block text-muted-dark">Underlying asset</span>
          <span className="mt-1 block font-mono text-foreground">NVDA</span>
        </div>
        <div>
          <span className="block text-muted-dark">Data</span>
          <span className="mt-1 block font-mono text-positive">
            Live Testnet On-chain Read
          </span>
        </div>
        <div>
          <span className="block text-muted-dark">Market enabled</span>
          <span className={`mt-1 block font-mono ${canary.market?.enabled && !canary.market.paused ? "text-positive" : "text-amber"}`}>
            {canary.isLoading ? "Reading…" : canary.market?.enabled && !canary.market.paused ? "YES" : "UNAVAILABLE"}
          </span>
        </div>
        <div>
          <span className="block text-muted-dark">Latest dividend event</span>
          <span className="mt-1 block font-mono text-amber">
            {canary.market ? `${formatUnits(canary.market.lastRateBaseUnits, canary.market.lastRateDecimals)} USD / share · ${timestampLabel(canary.market.lastEventTimestamp)}` : "Unavailable"}
          </span>
        </div>
        <div>
          <span className="block text-muted-dark">Settlement</span>
          <span className="mt-1 block font-mono text-amber">
            {canary.publicState?.settlementEnabled ? "Enabled" : "Not Enabled"}
          </span>
        </div>
      </div>

      <div className="mt-5 border border-white/10 bg-black/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-dark">
              Position-linked state
            </div>
            <div className={`mt-2 font-mono text-[18px] ${status === "PENDING" ? "text-amber" : status === "ACTIVE" ? "text-positive" : "text-foreground"}`}>
              {status}
            </div>
          </div>
          <div className="text-right text-[12px] text-muted-dark">
            <div>Canary owner</div>
            <div className="mt-1 font-mono text-muted">
              {compactAddress(canary.canaryOwner)}
            </div>
          </div>
        </div>

        {!canary.isHydrated ? (
          <p className="mt-4 m-0 text-[12px] leading-5 text-muted-dark">
            Reading the Robinhood Chain Testnet canary state…
          </p>
        ) : !canary.configured ? (
          <p className="mt-4 m-0 text-[12px] leading-5 text-amber">
            Testnet Dividend Registry metadata is not configured in this build.
          </p>
        ) : canary.error ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-amber">
            <p className="m-0">
              On-chain Testnet read unavailable. Confirm the RPC connection and
              retry.
            </p>
            <button
              type="button"
              onClick={() => void canary.refresh()}
              className="border border-amber/35 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-amber transition-colors hover:border-amber hover:bg-amber/10"
            >
              Retry read
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 border-t border-white/10 pt-4 text-[12px] leading-5 text-muted-dark">
              <span className="font-mono uppercase tracking-[0.1em] text-amber">
                Development canary · public read-only state
              </span>
              <p className="mt-2 m-0">
                This position is the deployed Testnet canary, not the connected
                wallet&apos;s holdings. No claim or settlement action is available.
                {canary.isConnected &&
                canary.chainId !== ROBINHOOD_TESTNET_CHAIN_ID
                  ? " The wallet network does not affect this Testnet read."
                  : canary.isConnected && !canary.ownsPosition
                    ? " The connected wallet is not the canary owner."
                    : !canary.isConnected
                      ? " Connect a wallet only when wallet-specific authorization is needed."
                      : " The canary owner is connected; this view remains read-only."}
              </p>
            </div>
            <dl className="mt-4 grid gap-3 border-t border-white/10 pt-4 text-[13px] sm:grid-cols-2">
              <div>
                <dt className="text-muted-dark">Position enabled</dt>
                <dd className="mt-1 font-mono text-positive">
                  {canary.state?.enabled ? "YES" : "NO"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-dark">Eligibility</dt>
                <dd className="mt-1 font-mono text-positive">
                  {canary.state?.eligible ? "ELIGIBLE" : "NOT ELIGIBLE"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-dark">Accrued dividend</dt>
                <dd className="mt-1 font-mono text-amber">
                  {accrued || "0"} USD reference accounting
                  <span className="ml-2 text-[11px] text-muted-dark">
                    ({canary.state?.accruedBaseUnits.toString() || "0"} base units)
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-muted-dark">Settlement status</dt>
                <dd className="mt-1 font-mono text-amber">
                  {canary.state?.settlementEnabled
                    ? "Enabled"
                    : "Not Enabled · no funded claim"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-dark">Latest event ID</dt>
                <dd className="mt-1 break-all font-mono text-muted">
                  {canary.state?.lastEventId || "Unavailable"}
                </dd>
              </div>
            </dl>
          </>
        )}
      </div>
    </section>
  );
}

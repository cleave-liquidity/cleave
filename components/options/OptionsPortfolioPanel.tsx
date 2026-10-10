"use client";

import Link from "next/link";
import { formatUnits } from "viem";
import { useOptionsPositions } from "@/hooks/useOptionsPositions";

function rateLabel(value: bigint): string {
  return `${Number(formatUnits(value, 16)).toFixed(2)}%`;
}

function expiryLabel(value: bigint): string {
  return `${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Number(value) * 1000))} UTC`;
}

function PositionSummary({
  position,
}: {
  position: ReturnType<typeof useOptionsPositions>["positions"][number];
}) {
  const href = `/options/testnet-usdg-rate?optionId=${position.optionId.toString()}`;
  return (
    <article className="border border-white/[0.08] bg-background/35 p-4 sm:p-5" data-testid="testnet-option-position">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">
            #{position.optionId.toString()} · {position.kind} · Testnet
          </div>
          <div className="mt-2 font-mono text-[18px] text-amber">{rateLabel(position.strike)} strike</div>
        </div>
        <span className="mono border border-white/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-muted">
          {position.state}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/[0.07] pt-3 text-[10px] sm:grid-cols-4">
        <div><dt className="text-muted-dark">Expiry</dt><dd className="mb-0 mt-1 text-muted">{expiryLabel(position.expiry)}</dd></div>
        <div><dt className="text-muted-dark">Notional</dt><dd className="mb-0 mt-1 font-mono text-muted">{formatUnits(position.notional, position.collateralDecimals)} yDEVUSD</dd></div>
        <div><dt className="text-muted-dark">Premium</dt><dd className="mb-0 mt-1 font-mono text-muted">{formatUnits(position.premium, position.collateralDecimals)} yDEVUSD</dd></div>
        <div><dt className="text-muted-dark">Payout</dt><dd className="mb-0 mt-1 font-mono text-muted">{position.state === "OPEN" ? "Pending settlement" : `${formatUnits(position.payout, position.collateralDecimals)} yDEVUSD`}</dd></div>
      </dl>
      <Link href={href} className="mt-4 inline-flex min-h-9 items-center text-[11px] text-ice transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
        Inspect on-chain position →
      </Link>
    </article>
  );
}

export function OptionsPortfolioPanel() {
  const {
    positions,
    configured,
    historyConfigured,
    connectedAddress,
    isLoading,
    error,
  } = useOptionsPositions();

  return (
    <div className="mt-8 space-y-4" data-testid="options-portfolio">
      <section className="flex flex-wrap items-center justify-between gap-4 border border-amber/20 bg-amber/[0.025] px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" aria-hidden="true" />
          <div>
            <h2 className="m-0 text-[14px] font-normal text-foreground">Mainnet Yield Rate Options · not live</h2>
            <p className="mb-0 mt-1 text-[11px] leading-5 text-muted-dark">No Mainnet Options contract is configured. Preview values are not holdings.</p>
          </div>
        </div>
        <Link href="/options/robinhood-mainnet-preview" className="shrink-0 text-[11px] text-ice hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
          Product preview →
        </Link>
      </section>

      <section className="border border-white/10 bg-surface/50 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.07] pb-4">
          <div>
            <div className="mono text-[9px] uppercase tracking-[0.16em] text-muted-dark">Separate development environment · chain 46630</div>
            <h2 className="mb-0 mt-2 text-[19px] font-normal text-foreground">Testnet option positions</h2>
          </div>
          <span className="mono text-[9px] uppercase tracking-[0.1em] text-muted-dark">Wallet-owner matched · on-chain reads</span>
        </div>

        {!configured ? (
          <p className="mb-0 mt-4 text-[11px] leading-5 text-muted-dark">No Testnet Options deployment is configured. No preview selections or simulated trades are shown as holdings.</p>
        ) : !connectedAddress ? (
          <p className="mb-0 mt-4 text-[11px] leading-5 text-muted-dark">Connect a wallet to inspect positions owned by that address on Robinhood Chain Testnet.</p>
        ) : !historyConfigured ? (
          <p className="mb-0 mt-4 text-[11px] leading-5 text-amber">Position history is unavailable because the deployment start block is not configured. No empty-position result is inferred.</p>
        ) : isLoading ? (
          <p role="status" className="mb-0 mt-4 text-[11px] text-muted">Reading Testnet option events and contract state…</p>
        ) : error ? (
          <div className="mt-4">
            <p className="mb-0 text-[11px] text-amber">Testnet positions could not be read just now. No holdings are shown.</p>
            <details className="mt-3 text-[10px] text-muted-dark">
              <summary className="cursor-pointer text-muted hover:text-foreground">RPC read details</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[9px] leading-4">{error instanceof Error ? error.message : String(error)}</pre>
            </details>
          </div>
        ) : positions.length === 0 ? (
          <p className="mb-0 mt-4 text-[11px] leading-5 text-muted-dark">No on-chain Testnet Options positions found for the connected wallet.</p>
        ) : (
          <div className="mt-4 grid gap-3" aria-live="polite">
            {positions.map((position) => <PositionSummary key={position.optionId.toString()} position={position} />)}
          </div>
        )}
      </section>
    </div>
  );
}

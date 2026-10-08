"use client";

import React from "react";
import { formatUnits } from "viem";
import { toast } from "sonner";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { useDividendDemoPosition } from "@/hooks/useDividendDemoPosition";
import { DIVIDEND_DEMO_MARKET_ID } from "@/lib/dividend/dividend-demo-contract";
import { ROBINHOOD_TESTNET_CHAIN_ID } from "@/lib/web3/chains";

const EXPLORER = "https://explorer.testnet.chain.robinhood.com";
const ZERO_ID = `0x${"0".repeat(64)}`;

export function DividendDemoPanel() {
  const demo = useDividendDemoPosition();
  const position = demo.snapshot;
  const isOwner = Boolean(
    demo.isHydrated && demo.isConnected && demo.address && position &&
      demo.address.toLowerCase() === position.owner.toLowerCase(),
  );
  const onCorrectNetwork = demo.isHydrated && demo.chainId === ROBINHOOD_TESTNET_CHAIN_ID;
  const enabled = Boolean(position?.position.enabled && position.lens.enabled);
  const hasReferenceEvent = Boolean(position && position.lens.lastEventId !== ZERO_ID);
  const eligible = Boolean(position?.verified && position.lens.eligible && !enabled);

  const handleEnable = async () => {
    try {
      await demo.enable();
      toast.success("Testnet transaction confirmed. Dividend Earn is enabled for this position.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to enable this position.");
    }
  };

  return (
    <section className="border border-white/15 bg-surface/70 p-5 sm:p-6" aria-labelledby="dividend-demo-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.16em] text-amber">
            Development · Robinhood Chain Testnet · 46630
          </div>
          <h1 id="dividend-demo-title" className="mt-2 text-[22px] font-normal text-foreground">
            Dividend Earn · Interactive Demo
          </h1>
          <p className="mt-2 max-w-[720px] text-[13px] leading-6 text-muted-dark">
            A synthetic, non-transferable development position demonstrates owner opt-in and reference accounting only.
            It is not an NVDA security, Pendle position, cash dividend, or production payout.
          </p>
        </div>
        <span className={`mono rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${
          enabled ? "border-positive/30 bg-positive/5 text-positive" : eligible ? "border-amber/30 bg-amber/5 text-amber" : "border-white/15 bg-surface text-muted"
        }`}>
          {enabled ? (hasReferenceEvent ? "PENDING" : "ENABLED") : eligible ? "ELIGIBLE · NOT ENABLED" : "POSITION UNAVAILABLE"}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 border-y border-white/10 py-4 text-[12px] sm:grid-cols-2">
        <DemoField label="Market" value="Development NVDA · simulated exposure" />
        <DemoField label="Position" value={position?.verified ? "Verified from Testnet contracts" : "Awaiting authorized setup"} />
        <DemoField label="Owner" value={position?.owner || "Not registered"} mono />
        <DemoField label="Token" value={position ? `${position.tokenName} (${position.tokenSymbol})` : "Development token not configured"} />
        <DemoField label="Verified exposure" value={position ? `${formatUnits(position.exposureBaseUnits, 18)} ${position.tokenSymbol}` : "—"} mono />
        <DemoField label="Eligibility" value={position?.verified ? (position.lens.eligible ? "ELIGIBLE" : "NOT ELIGIBLE") : "Not verified"} />
        <DemoField label="Position ID" value={position?.positionId || "—"} mono />
        <DemoField label="Market ID" value={DIVIDEND_DEMO_MARKET_ID} mono />
        <DemoField label="Dividend Earn" value={enabled ? "ENABLED · on-chain" : "NOT ENABLED"} />
        <DemoField label="Accrued reference accounting" value={position ? `${formatUnits(position.lens.accruedBaseUnits, 6)} USD reference` : "—"} mono />
        <DemoField label="Latest development event" value={hasReferenceEvent ? position!.lens.lastEventId : "No event processed"} mono />
        <DemoField label="Settlement" value="SETTLEMENT PENDING · no claim/payout" />
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void demo.refresh()}
          disabled={demo.isLoading}
          className="inline-flex h-10 items-center justify-center border border-white/20 px-4 text-[12px] text-foreground transition-colors hover:border-ice/60 disabled:opacity-50"
        >
          {demo.isLoading ? "Reading Testnet…" : "Check eligibility / refresh"}
        </button>
        {!demo.isConnected && <ConnectButton />}
        {demo.isConnected && !onCorrectNetwork && (
          <button
            type="button"
            onClick={() => void demo.switchToTestnet()}
            disabled={demo.isSwitchPending}
            className="inline-flex h-10 items-center justify-center border border-amber/40 px-4 text-[12px] text-amber hover:bg-amber/10 disabled:opacity-50"
          >
            {demo.isSwitchPending ? "Switching…" : "Switch to Testnet 46630"}
          </button>
        )}
        {demo.isConnected && onCorrectNetwork && !isOwner && (
          <span className="text-[12px] text-muted-dark">Connected wallet is not the registered position owner.</span>
        )}
        {isOwner && eligible && (
          <button
            type="button"
            onClick={() => void handleEnable()}
            disabled={demo.isPending || demo.isLoading}
            className="inline-flex h-10 items-center justify-center border border-amber/50 bg-amber/10 px-4 text-[12px] font-medium text-amber transition-colors hover:bg-amber/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {demo.isPending ? "Waiting for confirmation…" : "Enable Dividend Earn"}
          </button>
        )}
        {demo.error && <p role="alert" className="m-0 basis-full text-[12px] leading-5 text-amber">{demo.error}</p>}
      </div>

      {(demo.enableTxHash || demo.eventTxHash) && (
        <div className="mt-5 grid gap-2 border-t border-white/10 pt-4 text-[12px]">
          {demo.enableTxHash && <TransactionLink label="Wallet enable transaction" hash={demo.enableTxHash} />}
          {demo.eventTxHash && <TransactionLink label="Authorized simulated event transaction" hash={demo.eventTxHash} />}
        </div>
      )}

      <p className="mt-5 border-t border-white/10 pt-4 text-[11px] leading-5 text-muted-dark">
        Any development accrual must come from a fresh authorized Testnet event after opt-in. It is reference accounting only;
        no cash, claim, settlement, or Mainnet dividend is enabled.
      </p>
    </section>
  );
}

function DemoField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-dark">{label}</dt>
      <dd className={`mt-1 m-0 break-all text-foreground ${mono ? "font-mono text-[11px]" : "text-[12px]"}`}>{value}</dd>
    </div>
  );
}

function TransactionLink({ label, hash }: { label: string; hash: `0x${string}` }) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1 text-muted-dark">
      <span>{label}:</span>
      <a className="break-all font-mono text-ice underline-offset-2 hover:underline" href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer">
        {hash}
      </a>
    </div>
  );
}

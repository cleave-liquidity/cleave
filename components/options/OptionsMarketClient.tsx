"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatUnits } from "viem";
import { toast } from "sonner";
import { useYieldRateOptions, type OptionsKind, optionsErrorMessage, OptionsTransactionRevertedError } from "@/hooks/useYieldRateOptions";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { getOptionsBreakevenRate, getOptionsTestnetStrikeLadder, optionsExpiryFrom } from "@/lib/options/options-economics";
import { optionsExplorerBase } from "@/lib/options/options-contract";

const MARKET_ROUTE_ID = "testnet-usdg-rate";

function rateLabel(rate: bigint | undefined): string {
  if (rate === undefined) return "—";
  return `${Number(formatUnits(rate, 16)).toFixed(2)}%`;
}

function expiryLabel(expiry: bigint): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(Number(expiry) * 1000)) + " UTC";
}

export function OptionsMarketClient({ optionId }: { optionId?: bigint }) {
  const options = useYieldRateOptions(optionId);
  const [kind, setKind] = useState<OptionsKind>("CALL");
  const [selectedStrike, setSelectedStrike] = useState("");
  const [notional, setNotional] = useState("100");
  const [txHash, setTxHash] = useState<string>();
  const [txStatus, setTxStatus] = useState<string>();
  const [quoteCreatedAt, setQuoteCreatedAt] = useState<number>();
  const [nowSeconds, setNowSeconds] = useState<bigint>();

  useEffect(() => {
    const updateClock = () => setNowSeconds(BigInt(Math.floor(Date.now() / 1000)));
    updateClock();
    const timer = window.setInterval(updateClock, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const currentRate = options.readState?.currentRate;
  const strikes = useMemo(
    () => currentRate === undefined ? [] : getOptionsTestnetStrikeLadder(currentRate),
    [currentRate],
  );
  const strike = strikes.find((value) => value.toString() === selectedStrike)
    ?? strikes[1]
    ?? strikes[0];
  const canTrade = options.configured && Boolean(options.readState?.fresh);
  const walletReady = Boolean(options.connectedAddress && options.connectedChainId === options.chainId);
  const quote = options.quote;
  const enoughVaultCapacity = Boolean(
    quote && options.readState && options.readState.availableCollateral >= quote.notional,
  );
  const enoughWalletBalance = Boolean(
    quote && options.readState?.walletCollateralBalance !== undefined
      && options.readState.walletCollateralBalance >= quote.premium,
  );
  const premiumApproved = Boolean(
    quote && options.readState?.premiumAllowance !== undefined
      && options.readState.premiumAllowance >= quote.premium,
  );
  const quoteWithinWindow = quoteCreatedAt !== undefined
    && nowSeconds !== undefined
    && Number(nowSeconds) - quoteCreatedAt <= 300;
  const canOpen = Boolean(
    quote && quote.fresh && quote.kind === kind && walletReady && canTrade
      && enoughVaultCapacity && enoughWalletBalance && premiumApproved
      && quoteWithinWindow && !options.isPending,
  );
  const breakeven = quote
    ? getOptionsBreakevenRate(quote.kind, quote.strike, quote.premium, quote.notional)
    : undefined;

  const clearCurrentQuote = () => {
    options.clearQuote();
    setQuoteCreatedAt(undefined);
  };

  const buildTerms = () => {
    if (!options.readState || strike === undefined) return undefined;
    try {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const parsedNotional = options.parseCollateral(notional);
      if (parsedNotional <= BigInt(0)) return undefined;
      return {
        strike,
        expiry: optionsExpiryFrom(now),
        notional: parsedNotional,
        deadline: now + BigInt(300),
      };
    } catch {
      return undefined;
    }
  };

  const handleQuote = async () => {
    const terms = buildTerms();
    if (!terms) {
      toast.error("Enter a valid notional greater than zero.");
      return;
    }
    try {
      await options.getQuote({ kind, ...terms });
      setQuoteCreatedAt(Math.floor(Date.now() / 1000));
      setTxStatus(undefined);
    } catch (error) {
      toast.error(optionsErrorMessage(error));
    }
  };

  const handleApprove = async () => {
    if (!quote) return;
    setTxStatus("WAITING FOR WALLET AND TESTNET RECEIPT");
    try {
      const hash = await options.approvePremium(quote.premium);
      setTxHash(hash);
      setTxStatus("APPROVAL CONFIRMED");
      toast.success("Premium allowance confirmed on Testnet.");
    } catch (error) {
      if (error instanceof OptionsTransactionRevertedError) {
        setTxHash(error.hash);
        setTxStatus("APPROVAL REVERTED");
      } else {
        setTxStatus("APPROVAL NOT CONFIRMED");
      }
      toast.error(optionsErrorMessage(error));
    }
  };

  const handleOpen = async () => {
    if (!quote) return;
    if (!quoteWithinWindow) {
      clearCurrentQuote();
      toast.error("Quote window elapsed. Read a fresh quote before opening.");
      return;
    }
    setTxStatus("WAITING FOR WALLET AND TESTNET RECEIPT");
    try {
      const hash = await options.openOption({
        kind: quote.kind,
        strike: quote.strike,
        expiry: quote.expiry,
        notional: quote.notional,
        maximumPremium: quote.premium,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 300),
      });
      setTxHash(hash);
      setTxStatus("OPTION OPEN CONFIRMED");
      toast.success("Option opening confirmed on Robinhood Chain Testnet.");
    } catch (error) {
      if (error instanceof OptionsTransactionRevertedError) {
        setTxHash(error.hash);
        setTxStatus("OPEN REVERTED");
      } else {
        setTxStatus("OPEN NOT CONFIRMED");
      }
      toast.error(optionsErrorMessage(error));
    }
  };

  const handleSettle = async () => {
    setTxStatus("WAITING FOR SETTLEMENT RECEIPT");
    try {
      const hash = await options.settleOption();
      setTxHash(hash);
      setTxStatus("SETTLEMENT CONFIRMED");
      toast.success("Option settlement confirmed on Testnet.");
    } catch (error) {
      if (error instanceof OptionsTransactionRevertedError) {
        setTxHash(error.hash);
        setTxStatus("SETTLEMENT REVERTED");
      } else {
        setTxStatus("SETTLEMENT NOT CONFIRMED");
      }
      toast.error(optionsErrorMessage(error));
    }
  };

  const handleClaim = async () => {
    setTxStatus("WAITING FOR CLAIM RECEIPT");
    try {
      const hash = await options.claimOption();
      setTxHash(hash);
      setTxStatus("CLAIM CONFIRMED");
      toast.success("Option payout claim confirmed on Testnet.");
    } catch (error) {
      if (error instanceof OptionsTransactionRevertedError) {
        setTxHash(error.hash);
        setTxStatus("CLAIM REVERTED");
      } else {
        setTxStatus("CLAIM NOT CONFIRMED");
      }
      toast.error(optionsErrorMessage(error));
    }
  };

  if (!options.configured) {
    return (
      <section className="border border-amber/25 bg-amber/[0.04] p-6 sm:p-8">
        <div className="mono text-[10px] uppercase tracking-[0.16em] text-amber">TESTNET DEPLOYMENT REQUIRED</div>
        <h1 className="mt-3 text-[30px] font-normal text-foreground">Yield Rate Options</h1>
        <p className="mt-4 max-w-[680px] text-[14px] leading-6 text-muted">
          This market has no configured on-chain addresses yet. Trading controls remain unavailable; no simulated quote, position, or payout is shown.
        </p>
      </section>
    );
  }

  const settlementSnapshotReady = Boolean(
    options.position && options.readState?.fresh && options.readState.observedAt >= options.position.expiry,
  );
  const settlementTimeReached = Boolean(
    options.position && nowSeconds !== undefined && nowSeconds > options.position.expiry,
  );

  return (
    <section className="border border-white/15 bg-surface/70 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.16em] text-amber">TESTNET / DEVELOPMENT ONLY</div>
          <h1 className="mt-3 text-[30px] font-normal tracking-[-0.03em] text-foreground">Yield Rate Options</h1>
          <p className="mt-3 max-w-[680px] text-[14px] leading-6 text-muted">
            European CALL / PUT options on an operator-published development rate index. This rate is not a verified live yield source or market APY.
          </p>
        </div>
        <ConnectButton />
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Development index rate</div>
          <div className="mt-2 font-mono text-[20px] text-amber">{rateLabel(options.readState?.currentRate)}</div>
        </div>
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Vault capacity</div>
          <div className="mt-2 font-mono text-[20px] text-foreground">
            {options.readState ? `${options.formatCollateral(options.readState.availableCollateral)} ${options.readState.collateralSymbol}` : "—"}
          </div>
        </div>
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Rate source / freshness</div>
          <div className={`mt-2 text-[13px] ${options.readState?.fresh ? "text-positive" : "text-amber"}`}>
            {options.readState ? `${options.readState.sourceLabel} · ${options.readState.fresh ? "FRESH" : "STALE"}` : "UNAVAILABLE"}
          </div>
        </div>
      </div>

      {options.error && <p className="mt-5 text-[12px] text-negative">{options.error}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">30-day development market</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] text-muted">Direction
              <select
                value={kind}
                onChange={(event) => { setKind(event.target.value as OptionsKind); clearCurrentQuote(); }}
                className="mt-2 block h-11 w-full border border-white/15 bg-background px-3 text-foreground"
              >
                <option value="CALL">CALL · rate above strike</option>
                <option value="PUT">PUT · rate below strike</option>
              </select>
            </label>
            <label className="text-[12px] text-muted">Strike · limited ladder
              <select
                value={strike?.toString() ?? ""}
                onChange={(event) => { setSelectedStrike(event.target.value); clearCurrentQuote(); }}
                disabled={!strikes.length}
                className="mt-2 block h-11 w-full border border-white/15 bg-background px-3 font-mono text-foreground disabled:opacity-50"
              >
                {strikes.map((value) => <option key={value.toString()} value={value.toString()}>{rateLabel(value)}</option>)}
              </select>
            </label>
            <div className="border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[12px] text-muted">
              Expiry <span className="ml-2 font-mono text-foreground">30 days · fixed</span>
            </div>
            <label className="text-[12px] text-muted">Notional ({options.readState?.collateralSymbol || "collateral"})
              <input
                value={notional}
                onChange={(event) => { setNotional(event.target.value); clearCurrentQuote(); }}
                inputMode="decimal"
                className="mt-2 block h-11 w-full border border-white/15 bg-background px-3 font-mono text-foreground"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleQuote}
            disabled={!canTrade || strike === undefined || options.isPending}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md border border-amber/50 px-5 text-[12px] font-medium text-amber transition-colors hover:bg-amber/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Read Testnet quote
          </button>
        </div>

        <div className="border border-white/10 bg-white/[0.02] p-5">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Quote / risk</div>
          <dl className="mt-4 space-y-3 text-[13px]">
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Deterministic premium</dt><dd className="font-mono text-amber">{quote ? `${options.formatCollateral(quote.premium)} ${options.readState?.collateralSymbol}` : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Maximum loss</dt><dd className="font-mono text-foreground">{quote ? `${options.formatCollateral(quote.premium)} ${options.readState?.collateralSymbol}` : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Maximum payout</dt><dd className="font-mono text-foreground">{quote ? `${options.formatCollateral(quote.maxPayout)} ${options.readState?.collateralSymbol}` : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Breakeven rate</dt><dd className="font-mono text-foreground">{quote ? (breakeven === undefined ? "Outside 0–100% range" : rateLabel(breakeven)) : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Expiry</dt><dd className="font-mono text-muted">{quote ? expiryLabel(quote.expiry) : "30 days after quote"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Wallet balance</dt><dd className="font-mono text-muted">{options.readState?.walletCollateralBalance === undefined ? "Connect wallet" : `${options.formatCollateral(options.readState.walletCollateralBalance)} ${options.readState.collateralSymbol}`}</dd></div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={!quote || !walletReady || premiumApproved || options.isPending}
              className="inline-flex h-10 items-center justify-center rounded-md border border-white/20 px-4 text-[12px] text-foreground hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {premiumApproved ? "Premium approved" : "Approve premium"}
            </button>
            <button
              type="button"
              onClick={handleOpen}
              disabled={!canOpen}
              className="inline-flex h-10 items-center justify-center rounded-md bg-amber px-4 text-[12px] font-medium text-[#0A0B0C] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Open Option
            </button>
          </div>

          {!options.connectedAddress && quote && <p className="mt-3 text-[11px] text-muted-dark">Connect a Testnet wallet to read its yDEVUSD balance and sign.</p>}
          {options.connectedAddress && !walletReady && <p className="mt-3 text-[11px] text-amber">Switch the connected wallet to Robinhood Chain Testnet · 46630.</p>}
          {walletReady && quote && !enoughWalletBalance && <p className="mt-3 text-[11px] text-amber">Insufficient yDEVUSD for the quoted premium. This development token is not real USDG or USDC.</p>}
          {walletReady && quote && enoughWalletBalance && !premiumApproved && <p className="mt-3 text-[11px] text-muted-dark">Approve the exact premium before opening.</p>}
          {walletReady && quote && !enoughVaultCapacity && <p className="mt-3 text-[11px] text-amber">Vault collateral capacity is insufficient for this notional.</p>}
          {quote && !quoteWithinWindow && <p className="mt-3 text-[11px] text-amber">Quote window elapsed. Read a fresh quote before opening.</p>}
          {txStatus && <p className="mt-4 text-[11px] text-muted">{txStatus}</p>}
          {txHash && <p className="mt-2 break-all font-mono text-[10px] text-muted-dark"><a href={`${optionsExplorerBase}/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline">Transaction receipt · {txHash}</a></p>}
          {options.lastOpenedOptionId !== undefined && <Link className="mt-3 inline-block text-[12px] text-ice hover:text-white" href={`/options/${MARKET_ROUTE_ID}?optionId=${options.lastOpenedOptionId}`}>View confirmed position #{options.lastOpenedOptionId.toString()} →</Link>}
        </div>
      </div>

      <p className="mt-7 border-t border-white/10 pt-5 text-[12px] leading-5 text-muted-dark">
        Testnet development only. Premium is a deterministic demonstration formula, not an actuarial market price. The operator-published rate is not verified against a live yield source. yDEVUSD has no production redemption value.
      </p>

      {optionId !== undefined && (
        <div className="mt-6 border-t border-white/10 pt-5">
          {!options.position ? <p className="text-[12px] text-muted-dark">{options.isLoading ? "Reading this option from Testnet…" : options.error || "No on-chain option exists for this ID."}</p> : <>
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">On-chain option #{optionId.toString()} · Testnet development</div>
            <div className="mt-3 grid gap-3 text-[12px] sm:grid-cols-4">
              <div><span className="text-muted-dark">Owner</span><span className="mt-1 block break-all font-mono text-muted">{options.position.owner}</span></div>
              <div><span className="text-muted-dark">Status</span><span className="mt-1 block font-mono text-foreground">{["OPEN", "SETTLED", "CLAIMED"][options.position.state] || "UNKNOWN"}</span></div>
              <div><span className="text-muted-dark">Settlement rate</span><span className="mt-1 block font-mono text-amber">{options.position.settlementRate ? rateLabel(options.position.settlementRate) : "Pending"}</span></div>
              <div><span className="text-muted-dark">Payout</span><span className="mt-1 block font-mono text-foreground">{options.position.payout ? `${options.formatCollateral(options.position.payout)} ${options.readState?.collateralSymbol}` : "—"}</span></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {options.position.state === 0 && settlementTimeReached && settlementSnapshotReady && <button type="button" onClick={handleSettle} disabled={options.isPending} className="inline-flex h-10 items-center justify-center rounded-md border border-white/20 px-4 text-[12px] text-foreground hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50">Settle from Testnet snapshot</button>}
              {options.position.state === 0 && !settlementTimeReached && <span className="text-[11px] text-muted-dark">Settlement available after {expiryLabel(options.position.expiry)}.</span>}
              {options.position.state === 0 && settlementTimeReached && !settlementSnapshotReady && <span className="text-[11px] text-amber">Expired · waiting for a fresh rate observation timestamped at or after expiry.</span>}
              {options.position.state === 1 && <button type="button" onClick={handleClaim} disabled={options.isPending || options.position.owner.toLowerCase() !== options.connectedAddress?.toLowerCase()} className="inline-flex h-10 items-center justify-center rounded-md bg-amber px-4 text-[12px] font-medium text-[#0A0B0C] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">Claim payout</button>}
              {options.position.state === 1 && options.position.owner.toLowerCase() !== options.connectedAddress?.toLowerCase() && <span className="text-[11px] text-muted-dark">Only the connected on-chain owner can claim.</span>}
            </div>
          </>}
        </div>
      )}
    </section>
  );
}

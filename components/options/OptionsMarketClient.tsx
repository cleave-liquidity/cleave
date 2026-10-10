"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatUnits, parseUnits } from "viem";
import { toast } from "sonner";
import {
  useYieldRateOptions,
  type OptionsKind,
  optionsErrorMessage,
  OptionsTransactionRevertedError,
} from "@/hooks/useYieldRateOptions";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import {
  getOptionsBreakevenRate,
  getOptionsTestnetStrikeLadder,
} from "@/lib/options/options-economics";
import {
  calculateOptionsDevelopmentPreview,
  calculateOptionsScenarioPayout,
  OPTIONS_DEVELOPMENT_PREVIEW_RATE,
} from "@/lib/options/options-preview";
import { optionsExplorerBase, OPTIONS_TESTNET_CHAIN_ID } from "@/lib/options/options-contract";

const MARKET_ROUTE_ID = "testnet-usdg-rate";
const PREVIEW_COLLATERAL_DECIMALS = 6;
const PREVIEW_COLLATERAL_SYMBOL = "yDEVUSD";
const OPTIONS_RATE_SCALE = BigInt("1000000000000000000");
type OptionsMarketMode = "mainnet-preview" | "testnet-development";

function rateLabel(rate: bigint | undefined): string {
  if (rate === undefined) return "—";
  return `${Number(formatUnits(rate, 16)).toFixed(2)}%`;
}

function expiryLabel(expiry: bigint): string {
  return `${new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(Number(expiry) * 1000))} UTC`;
}

function formatCollateral(value: bigint, decimals: number): string {
  return Number(formatUnits(value, decimals)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function OptionsMarketClient({
  optionId,
  mode = "testnet-development",
}: { optionId?: bigint; mode?: OptionsMarketMode }) {
  const mainnetPreview = mode === "mainnet-preview";
  const options = useYieldRateOptions(mainnetPreview ? undefined : optionId, !mainnetPreview);
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

  // Preview terms are deterministic and independent of RPC/wallet state.
  const strikes = useMemo(
    () => getOptionsTestnetStrikeLadder(OPTIONS_DEVELOPMENT_PREVIEW_RATE),
    [],
  );
  const strike = strikes.find((value) => value.toString() === selectedStrike)
    ?? strikes[1]
    ?? strikes[0];
  let previewNotional = BigInt(0);
  let previewInputError: string | undefined;
  try {
    previewNotional = parseUnits(notional || "0", PREVIEW_COLLATERAL_DECIMALS);
    if (previewNotional <= BigInt(0)) previewInputError = "Enter a notional greater than zero.";
  } catch {
    previewInputError = "Enter a valid yDEVUSD amount with up to 6 decimal places.";
  }
  let liveNotional = previewNotional;
  if (options.readState) {
    try {
      liveNotional = options.parseCollateral(notional);
    } catch {
      liveNotional = BigInt(0);
    }
  }
  const preview = nowSeconds !== undefined && strike !== undefined && !previewInputError
    ? calculateOptionsDevelopmentPreview({
        kind,
        strike,
        notional: previewNotional,
        nowSeconds,
      })
    : undefined;

  const quote = options.quote;
  const liveCollateralCompatible = Boolean(
    options.readState?.collateralSymbol === PREVIEW_COLLATERAL_SYMBOL
      && options.readState.collateralDecimals === PREVIEW_COLLATERAL_DECIMALS,
  );
  const quoteWithinWindow = quoteCreatedAt !== undefined
    && nowSeconds !== undefined
    && Number(nowSeconds) >= quoteCreatedAt
    && Number(nowSeconds) - quoteCreatedAt <= 300;
  const liveQuoteMatchesForm = Boolean(
    quote && strike !== undefined && quote.kind === kind
      && quote.strike === strike && quote.notional === liveNotional,
  );
  const liveQuoteUsable = Boolean(quote && quote.fresh && quoteWithinWindow && liveQuoteMatchesForm);
  const liveStateFresh = Boolean(options.configured && options.readState?.fresh);
  const walletReady = Boolean(
    options.connectedAddress && options.connectedChainId === OPTIONS_TESTNET_CHAIN_ID,
  );
  const enoughVaultCapacity = Boolean(
    liveQuoteUsable && options.readState
      && options.readState.availableCollateral >= quote!.notional,
  );
  const enoughWalletBalance = Boolean(
    liveQuoteUsable && options.readState?.walletCollateralBalance !== undefined
      && options.readState.walletCollateralBalance >= quote!.premium,
  );
  const premiumApproved = Boolean(
    liveQuoteUsable && options.readState?.premiumAllowance !== undefined
      && options.readState.premiumAllowance >= quote!.premium,
  );
  const canReadLiveQuote = Boolean(
    !mainnetPreview && options.configured && options.readState?.fresh && liveCollateralCompatible
      && nowSeconds !== undefined && strike !== undefined
      && previewNotional > BigInt(0) && !options.isPending,
  );
  const canApprove = Boolean(
    !mainnetPreview && liveQuoteUsable && walletReady && enoughVaultCapacity && enoughWalletBalance
      && !premiumApproved && !options.isPending,
  );
  const canOpen = Boolean(
    !mainnetPreview && liveQuoteUsable && walletReady && enoughVaultCapacity && enoughWalletBalance
      && premiumApproved && !options.isPending,
  );

  const displayedPremium = liveQuoteUsable ? quote?.premium : preview?.premium;
  const displayedMaxPayout = liveQuoteUsable ? quote?.maxPayout : preview?.maxPayout;
  const displayedExpiry = liveQuoteUsable ? quote?.expiry : preview?.expiry;
  const displayedBreakeven = liveQuoteUsable && quote
    ? getOptionsBreakevenRate(quote.kind, quote.strike, quote.premium, quote.notional)
    : preview?.breakevenRate;
  const displayDecimals = liveQuoteUsable && options.readState
    ? options.readState.collateralDecimals
    : PREVIEW_COLLATERAL_DECIMALS;
  const displaySymbol = liveQuoteUsable && options.readState
    ? options.readState.collateralSymbol
    : mainnetPreview ? "reference units" : PREVIEW_COLLATERAL_SYMBOL;
  const chartStrike = liveQuoteUsable && quote ? quote.strike : preview?.strike;
  const chartNotional = liveQuoteUsable && quote ? quote.notional : preview?.notional;
  const chartRates = chartStrike === undefined ? [] : [BigInt(0), chartStrike, OPTIONS_RATE_SCALE];
  const chartPoints = chartNotional === undefined || chartStrike === undefined
    ? ""
    : chartRates.map((rate) => {
        const x = 14 + Number((rate * BigInt(332)) / OPTIONS_RATE_SCALE);
        const payout = calculateOptionsScenarioPayout(kind, chartStrike, chartNotional, rate);
        const y = 94 - Number((payout * BigInt(66)) / chartNotional);
        return `${x},${y}`;
      }).join(" ");
  const chartStrikeX = chartStrike === undefined
    ? undefined
    : 14 + Number((chartStrike * BigInt(332)) / OPTIONS_RATE_SCALE);

  const clearCurrentQuote = () => {
    options.clearQuote();
    setQuoteCreatedAt(undefined);
  };

  const buildTerms = () => {
    if (mainnetPreview) return undefined;
    if (!options.readState || !liveCollateralCompatible || nowSeconds === undefined
      || strike === undefined || previewNotional <= BigInt(0)) return undefined;
    if (liveNotional <= BigInt(0)) return undefined;
    const now = nowSeconds;
    return {
      strike,
      expiry: now + BigInt(30 * 24 * 60 * 60),
      notional: liveNotional,
      deadline: now + BigInt(300),
    };
  };

  const handleQuote = async () => {
    if (mainnetPreview) return;
    const terms = buildTerms();
    if (!terms) {
      toast.error(previewInputError || "A fresh Testnet contract read is required before quoting.");
      return;
    }
    try {
      await options.getQuote({ kind, ...terms });
      setQuoteCreatedAt(Number(nowSeconds ?? BigInt(0)));
      setTxStatus(undefined);
    } catch (error) {
      toast.error(optionsErrorMessage(error));
    }
  };

  const handleApprove = async () => {
    if (mainnetPreview || !quote || !canApprove) return;
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
    if (mainnetPreview || !quote || !canOpen) return;
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

  const settlementSnapshotReady = Boolean(
    options.position && options.readState?.fresh
      && options.readState.observedAt >= options.position.expiry,
  );
  const settlementTimeReached = Boolean(
    options.position && nowSeconds !== undefined && nowSeconds > options.position.expiry,
  );

  return (
    <section className="border border-white/15 bg-surface/70 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.16em] text-amber">{mainnetPreview ? "ROBINHOOD CHAIN MAINNET · PREVIEW ONLY" : "ROBINHOOD CHAIN TESTNET · DEVELOPMENT ONLY"}</div>
          <h1 className="mt-3 text-[30px] font-normal tracking-[-0.03em] text-foreground">Yield Rate Options</h1>
          <p className="mt-3 max-w-[680px] text-[14px] leading-6 text-muted">
            {mainnetPreview
              ? "Explore illustrative European CALL / PUT terms. No Mainnet Options contracts or production rate methodology are configured, so every value below is non-executable."
              : "Interactive CALL / PUT terms for the isolated Testnet development market. Testnet contract actions are separate from Fixed Yield and Trading Yield."}
          </p>
        </div>
        {!mainnetPreview && <ConnectButton />}
      </div>

      <div className="mt-6 border border-amber/30 bg-amber/[0.05] p-4" data-testid="options-preview-badge">
        <div className="mono text-[10px] uppercase tracking-[0.14em] text-amber">{mainnetPreview ? "MAINNET PRODUCT PREVIEW · NOT AN EXECUTABLE QUOTE" : "TESTNET PREVIEW · NOT A LIVE CONTRACT QUOTE"}</div>
        <p className="mb-0 mt-2 text-[12px] leading-5 text-muted">
          No wallet or RPC is needed to explore these calculations. The 5.00% rate and demo pricing assumptions are illustrative only; they are not a market oracle, approved economics, forecast, available collateral, or position.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Illustrative reference rate</div>
          <div className="mt-2 font-mono text-[20px] text-amber">{rateLabel(OPTIONS_DEVELOPMENT_PREVIEW_RATE)}</div>
          <div className="mt-1 text-[11px] text-muted-dark">Not an oracle value</div>
        </div>
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">{mainnetPreview ? "Mainnet contracts" : "Live Testnet vault capacity"}</div>
          <div className="mt-2 font-mono text-[20px] text-foreground">
            {mainnetPreview ? "Not configured" : options.readState ? `${options.formatCollateral(options.readState.availableCollateral)} ${options.readState.collateralSymbol}` : "Unavailable"}
          </div>
        </div>
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">{mainnetPreview ? "Production rate source" : "Live Testnet rate status"}</div>
          <div className={`mt-2 text-[13px] ${options.readState?.fresh ? "text-positive" : "text-amber"}`}>
            {mainnetPreview ? "Not selected / verified" : options.readState ? `${options.readState.sourceLabel} · ${options.readState.fresh ? "FRESH" : "STALE"}` : "Unavailable"}
          </div>
        </div>
      </div>

      {!mainnetPreview && options.error && <p className="mt-4 text-[12px] text-amber">Live Testnet reads unavailable: {options.error}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">30-day preview terms</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] text-muted">Option direction
              <select
                value={kind}
                onChange={(event) => { setKind(event.target.value as OptionsKind); clearCurrentQuote(); }}
                className="mt-2 block h-11 w-full border border-white/15 bg-background px-3 text-foreground"
                data-testid="options-direction"
              >
                <option value="CALL">CALL · rate above strike</option>
                <option value="PUT">PUT · rate below strike</option>
              </select>
            </label>
            <label className="text-[12px] text-muted">Strike · limited preview ladder
              <select
                value={strike?.toString() ?? ""}
                onChange={(event) => { setSelectedStrike(event.target.value); clearCurrentQuote(); }}
                className="mt-2 block h-11 w-full border border-white/15 bg-background px-3 font-mono text-foreground"
                data-testid="options-strike"
              >
                {strikes.map((value) => <option key={value.toString()} value={value.toString()}>{rateLabel(value)}</option>)}
              </select>
            </label>
            <div className="border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[12px] text-muted">
              Expiry tenor <span className="ml-2 font-mono text-foreground">30 days · illustrative</span>
            </div>
            <label className="text-[12px] text-muted">Notional ({mainnetPreview ? "illustrative units" : "yDEVUSD reference"})
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={notional}
                onChange={(event) => { setNotional(event.target.value); clearCurrentQuote(); }}
                inputMode="decimal"
                className="mt-2 block h-11 w-full border border-white/15 bg-background px-3 font-mono text-foreground"
                data-testid="options-notional"
              />
            </label>
          </div>
          {previewInputError && <p className="mt-3 text-[11px] text-amber">{previewInputError}</p>}
          <button
            type="button"
            onClick={handleQuote}
            disabled={!canReadLiveQuote}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md border border-white/20 px-5 text-[12px] font-medium text-muted transition-colors hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mainnetPreview ? "Mainnet quote unavailable" : liveStateFresh ? "Read live Testnet quote" : "Live quote unavailable"}
          </button>
          {mainnetPreview && <p className="mt-3 text-[11px] text-amber">Mainnet execution is disabled pending a selected underlying, verified rate source, approved settlement model, collateral token, reviewed contracts, and deployment.</p>}
          {!mainnetPreview && !options.configured && <p className="mt-3 text-[11px] text-muted-dark">Testnet execution contracts are not fully configured here. Preview remains available; live quote and transactions are disabled.</p>}
          {options.configured && !options.readState?.fresh && <p className="mt-3 text-[11px] text-amber">A fresh Testnet rate is required for a real contract quote. Current on-chain rate may be stale or RPC may be unavailable.</p>}
          {options.readState && !liveCollateralCompatible && <p className="mt-3 text-[11px] text-amber">Live trading is disabled because the configured Testnet collateral is not the expected 6-decimal yDEVUSD development token.</p>}
        </div>

        <div className="border border-white/10 bg-white/[0.02] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Premium / risk</div>
            <span className={`mono text-[9px] uppercase tracking-[0.12em] ${liveQuoteUsable ? "text-positive" : "text-amber"}`}>
              {liveQuoteUsable ? "LIVE TESTNET CONTRACT QUOTE" : mainnetPreview ? "MAINNET PRODUCT PREVIEW" : "TESTNET DEVELOPMENT PREVIEW"}
            </span>
          </div>
          {quote && !liveQuoteUsable && <p className="mt-3 text-[11px] text-amber">The contract quote no longer matches these terms or its 5-minute window elapsed. Showing preview values; request a fresh live quote.</p>}
          <dl className="mt-4 space-y-3 text-[13px]">
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">{liveQuoteUsable ? "Contract premium" : "Illustrative premium"}</dt><dd className="font-mono text-amber" data-testid="options-preview-premium">{displayedPremium === undefined ? "—" : `${formatCollateral(displayedPremium, displayDecimals)} ${displaySymbol}`}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Maximum loss</dt><dd className="font-mono text-foreground">{displayedPremium === undefined ? "—" : `${formatCollateral(displayedPremium, displayDecimals)} ${displaySymbol}`}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Maximum payout</dt><dd className="font-mono text-foreground">{displayedMaxPayout === undefined ? "—" : `${formatCollateral(displayedMaxPayout, displayDecimals)} ${displaySymbol}`}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Breakeven rate</dt><dd className="font-mono text-foreground">{displayedPremium === undefined ? "—" : displayedBreakeven === undefined ? "Outside 0–100% range" : rateLabel(displayedBreakeven)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Expiry</dt><dd className="font-mono text-muted">{!liveQuoteUsable || displayedExpiry === undefined ? "30 days · illustrative" : expiryLabel(displayedExpiry)}</dd></div>
            {preview && !liveQuoteUsable && <>
              <div className="flex justify-between gap-4"><dt className="text-muted-dark">Illustrative expiry scenario</dt><dd className="font-mono text-muted">{rateLabel(preview.settlementScenarioRate)} · not a forecast</dd></div>
              <div className="flex justify-between gap-4" data-testid="options-preview-payoff"><dt className="text-muted-dark">Illustrative scenario payout</dt><dd className="font-mono text-muted">{formatCollateral(preview.settlementScenarioPayout, PREVIEW_COLLATERAL_DECIMALS)} {displaySymbol}</dd></div>
            </>}
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Connected wallet balance</dt><dd className="font-mono text-muted">{options.readState?.walletCollateralBalance === undefined ? "Unavailable" : `${options.formatCollateral(options.readState.walletCollateralBalance)} ${options.readState.collateralSymbol}`}</dd></div>
          </dl>

          {chartPoints && chartStrikeX !== undefined && (
            <div className="mt-5 border-t border-white/10 pt-4" data-testid="options-payoff-chart">
              <div className="mono text-[10px] uppercase tracking-[0.12em] text-muted-dark">Gross payout shape · before premium</div>
              <svg viewBox="0 0 360 120" role="img" aria-label={`${kind} illustrative gross payout at expiry across rates from zero to one hundred percent`} className="mt-3 h-auto w-full">
                <line x1="14" y1="28" x2="346" y2="28" stroke="currentColor" strokeOpacity="0.12" />
                <line x1="14" y1="94" x2="346" y2="94" stroke="currentColor" strokeOpacity="0.4" />
                <line x1={chartStrikeX} y1="26" x2={chartStrikeX} y2="96" stroke="currentColor" strokeOpacity="0.45" strokeDasharray="3 4" />
                <polyline points={chartPoints} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" className="text-amber" />
                <text x="14" y="112" fill="currentColor" className="text-muted-dark" fontSize="9">0%</text>
                <text x="346" y="112" textAnchor="end" fill="currentColor" className="text-muted-dark" fontSize="9">100% rate</text>
                <text x={chartStrikeX} y="20" textAnchor="middle" fill="currentColor" className="text-amber" fontSize="9">Strike</text>
                <text x="14" y="17" fill="currentColor" className="text-muted-dark" fontSize="9">Up to notional</text>
              </svg>
              <p className="mb-0 mt-1 text-[10px] leading-4 text-muted-dark">Illustrative gross contract payoff only; premium is shown separately. This is not a Mainnet price or settlement forecast.</p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={!canApprove}
              className="inline-flex h-10 items-center justify-center rounded-md border border-white/20 px-4 text-[12px] text-foreground hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {premiumApproved && liveQuoteUsable ? "Premium approved" : mainnetPreview ? "Approval unavailable" : "Approve premium"}
            </button>
            <button
              type="button"
              onClick={handleOpen}
              disabled={!canOpen}
              className="inline-flex h-10 items-center justify-center rounded-md bg-amber px-4 text-[12px] font-medium text-[#0A0B0C] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mainnetPreview ? "Buy unavailable on Mainnet" : "Open Option"}
            </button>
          </div>

          {!liveQuoteUsable && <p className="mt-3 text-[11px] text-amber">Preview only — approval and purchase are unavailable. No transaction or position is created by changing these values.</p>}
          {liveQuoteUsable && !walletReady && <p className="mt-3 text-[11px] text-amber">Connect a wallet on Robinhood Chain Testnet · 46630 to use live actions.</p>}
          {liveQuoteUsable && walletReady && !enoughWalletBalance && <p className="mt-3 text-[11px] text-amber">Insufficient yDEVUSD for the quoted premium. yDEVUSD is development collateral, not real USDG or USDC.</p>}
          {liveQuoteUsable && walletReady && enoughWalletBalance && !enoughVaultCapacity && <p className="mt-3 text-[11px] text-amber">Testnet vault capacity is insufficient for this notional.</p>}
          {liveQuoteUsable && walletReady && enoughVaultCapacity && enoughWalletBalance && !premiumApproved && <p className="mt-3 text-[11px] text-muted-dark">Approve the quoted premium before opening.</p>}
          {quote && !quoteWithinWindow && <p className="mt-3 text-[11px] text-amber">Live quote window elapsed. Read a fresh quote before any approval or purchase.</p>}
          {txStatus && <p className="mt-4 text-[11px] text-muted">{txStatus}</p>}
          {txHash && <p className="mt-2 break-all font-mono text-[10px] text-muted-dark"><a href={`${optionsExplorerBase}/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline">Testnet transaction receipt · {txHash}</a></p>}
          {options.lastOpenedOptionId !== undefined && <Link className="mt-3 inline-block text-[12px] text-ice hover:text-white" href={`/options/${MARKET_ROUTE_ID}?optionId=${options.lastOpenedOptionId}`}>View confirmed position #{options.lastOpenedOptionId.toString()} →</Link>}
        </div>
      </div>

      <p className="mt-7 border-t border-white/10 pt-5 text-[12px] leading-5 text-muted-dark">
        {mainnetPreview
          ? "Mainnet Options are not deployed. The shown premium and payoff shape reuse an unapproved Testnet demonstration formula for interaction only. No Mainnet underlying, collateral, oracle methodology, or settlement source is selected. Do not treat values as prices or a recommendation."
          : "Yield Rate Options is a Testnet development product only. Preview premiums use a deterministic demonstration formula, not actuarial pricing. Rates are not verified against a live yield source; yDEVUSD has no production redemption value. Nothing here implies Mainnet Options availability."}
      </p>

      {optionId !== undefined && (
        <div className="mt-6 border-t border-white/10 pt-5">
          {!options.position ? <p className="text-[12px] text-muted-dark">{!options.configured ? "No Testnet deployment is configured; this preview has no associated on-chain position." : options.isLoading ? "Reading this option from Testnet…" : options.error || "No on-chain option exists for this ID."}</p> : <>
            <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">On-chain option #{optionId.toString()} · Testnet development</div>
            <div className="mt-3 grid gap-3 text-[12px] sm:grid-cols-4">
              <div><span className="text-muted-dark">Owner</span><span className="mt-1 block break-all font-mono text-muted">{options.position.owner}</span></div>
              <div><span className="text-muted-dark">Status</span><span className="mt-1 block font-mono text-foreground">{["OPEN", "SETTLED", "CLAIMED"][options.position.state] || "UNKNOWN"}</span></div>
              <div><span className="text-muted-dark">Settlement rate</span><span className="mt-1 block font-mono text-amber">{options.position.settlementRate ? rateLabel(options.position.settlementRate) : "Pending"}</span></div>
              <div><span className="text-muted-dark">Payout</span><span className="mt-1 block font-mono text-foreground">{options.position.payout ? `${options.formatCollateral(options.position.payout)} ${options.readState?.collateralSymbol}` : "—"}</span></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {options.position.state === 0 && settlementTimeReached && settlementSnapshotReady && <button type="button" onClick={handleSettle} disabled={!walletReady || options.isPending} className="inline-flex h-10 items-center justify-center rounded-md border border-white/20 px-4 text-[12px] text-foreground hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50">Settle from Testnet snapshot</button>}
              {options.position.state === 0 && !settlementTimeReached && <span className="text-[11px] text-muted-dark">Settlement available after {expiryLabel(options.position.expiry)}.</span>}
              {options.position.state === 0 && settlementTimeReached && !settlementSnapshotReady && <span className="text-[11px] text-amber">Expired · waiting for a fresh rate observation timestamped at or after expiry.</span>}
              {options.position.state === 1 && <button type="button" onClick={handleClaim} disabled={!walletReady || options.isPending || options.position.owner.toLowerCase() !== options.connectedAddress?.toLowerCase()} className="inline-flex h-10 items-center justify-center rounded-md bg-amber px-4 text-[12px] font-medium text-[#0A0B0C] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">Claim payout</button>}
              {options.position.state === 1 && options.position.owner.toLowerCase() !== options.connectedAddress?.toLowerCase() && <span className="text-[11px] text-muted-dark">Only the connected on-chain owner on Testnet can claim.</span>}
              {!walletReady && options.position.state !== 2 && <span className="text-[11px] text-amber">Connect a wallet on Testnet · 46630 for settlement actions.</span>}
            </div>
          </>}
        </div>
      )}
    </section>
  );
}

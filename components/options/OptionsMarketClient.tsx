"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { toast } from "sonner";
import { useYieldRateOptions, type OptionsKind } from "@/hooks/useYieldRateOptions";
import { ConnectButton } from "@/components/wallet/ConnectButton";

function rateLabel(rate: bigint | undefined): string {
  if (rate === undefined) return "—";
  return `${Number(formatUnits(rate, 16)).toFixed(2)}%`;
}

export function OptionsMarketClient({ optionId }: { optionId?: bigint }) {
  const options = useYieldRateOptions(optionId);
  const [kind, setKind] = useState<OptionsKind>("CALL");
  const [strikePercent, setStrikePercent] = useState("5");
  const [expiryHours, setExpiryHours] = useState("24");
  const [notional, setNotional] = useState("100");
  const [txHash, setTxHash] = useState<string>();

  const canTrade = options.configured && options.readState && options.readState.fresh;
  const walletReady = Boolean(
    options.connectedAddress && options.connectedChainId === options.chainId,
  );
  const hasCapacity = Boolean(
    options.quote &&
      options.readState &&
      options.readState.availableCollateral >= options.quote.notional,
  );
  const buildTerms = () => {
    if (!options.readState) return undefined;
    const hours = Number(expiryHours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 365 * 24) return undefined;
    try {
      const now = BigInt(Math.floor(Date.now() / 1000));
      return {
        strike: options.parseRatePercent(strikePercent),
        expiry: now + BigInt(Math.floor(hours * 3600)),
        notional: options.parseCollateral(notional),
        deadline: now + BigInt(300),
      };
    } catch {
      return undefined;
    }
  };

  const handleQuote = async () => {
    const terms = buildTerms();
    if (!terms) {
      toast.error("Enter a valid strike, expiry, and notional.");
      return;
    }
    try {
      await options.getQuote({ kind, ...terms });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Quote unavailable.");
    }
  };

  const handleApprove = async () => {
    if (!options.quote) return;
    try {
      const hash = await options.approvePremium(options.quote.premium);
      setTxHash(hash);
      toast.success("Premium allowance confirmed on Testnet.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approval failed.");
    }
  };

  const handleOpen = async () => {
    if (!options.quote) return;
    try {
      const hash = await options.openOption({
        kind,
        strike: options.quote.strike,
        expiry: options.quote.expiry,
        notional: options.quote.notional,
        maximumPremium: options.quote.premium,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 300),
      });
      setTxHash(hash);
      toast.success("Yield Rate Option opened on Robinhood Chain Testnet.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Open Option failed.");
    }
  };

  const handleSettle = async () => {
    try {
      const hash = await options.settleOption();
      setTxHash(hash);
      toast.success("Option settlement confirmed on Testnet.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Settlement failed.");
    }
  };

  const handleClaim = async () => {
    try {
      const hash = await options.claimOption();
      setTxHash(hash);
      toast.success("Option payout claim confirmed on Testnet.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Claim failed.");
    }
  };

  if (!options.configured) {
    return (
      <section className="border border-amber/25 bg-amber/[0.04] p-6 sm:p-8">
        <div className="mono text-[10px] uppercase tracking-[0.16em] text-amber">TESTNET DEPLOYMENT REQUIRED</div>
        <h1 className="mt-3 text-[30px] font-normal text-foreground">Yield Rate Options</h1>
        <p className="mt-4 max-w-[680px] text-[14px] leading-6 text-muted">
          This market has no configured on-chain addresses yet. Trading controls
          remain unavailable; no simulated approval, quote, position, or payout is shown.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-white/15 bg-surface/70 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.16em] text-amber">TESTNET / DEVELOPMENT</div>
          <h1 className="mt-3 text-[30px] font-normal tracking-[-0.03em] text-foreground">USDG Yield Rate</h1>
          <p className="mt-3 max-w-[680px] text-[14px] leading-6 text-muted">
            Choose a European option on the published yield rate. The vault must
            have real collateral capacity before any position can open.
          </p>
        </div>
        <ConnectButton />
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <div className="border border-white/10 bg-white/[0.02] p-4"><div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Current rate</div><div className="mt-2 font-mono text-[20px] text-amber">{rateLabel(options.readState?.currentRate)}</div></div>
        <div className="border border-white/10 bg-white/[0.02] p-4"><div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Capacity</div><div className="mt-2 font-mono text-[20px] text-foreground">{options.readState ? `${options.formatCollateral(options.readState.availableCollateral)} ${options.readState.collateralSymbol}` : "—"}</div></div>
        <div className="border border-white/10 bg-white/[0.02] p-4"><div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Oracle</div><div className={`mt-2 font-mono text-[13px] ${options.readState?.fresh ? "text-positive" : "text-amber"}`}>{options.readState?.fresh ? "FRESH" : "STALE / UNAVAILABLE"}</div></div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Position terms</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] text-muted">Direction
              <select value={kind} onChange={(event) => setKind(event.target.value as OptionsKind)} className="mt-2 block h-11 w-full border border-white/15 bg-background px-3 text-foreground">
                <option value="CALL">CALL · rate above strike</option>
                <option value="PUT">PUT · rate below strike</option>
              </select>
            </label>
            <label className="text-[12px] text-muted">Strike rate (%)
              <input value={strikePercent} onChange={(event) => setStrikePercent(event.target.value)} inputMode="decimal" className="mt-2 block h-11 w-full border border-white/15 bg-background px-3 font-mono text-foreground" />
            </label>
            <label className="text-[12px] text-muted">Expiry (hours)
              <input value={expiryHours} onChange={(event) => setExpiryHours(event.target.value)} inputMode="decimal" className="mt-2 block h-11 w-full border border-white/15 bg-background px-3 font-mono text-foreground" />
            </label>
            <label className="text-[12px] text-muted">Notional ({options.readState?.collateralSymbol || "collateral"})
              <input value={notional} onChange={(event) => setNotional(event.target.value)} inputMode="decimal" className="mt-2 block h-11 w-full border border-white/15 bg-background px-3 font-mono text-foreground" />
            </label>
          </div>
          <button type="button" onClick={handleQuote} disabled={!canTrade || options.isPending} className="mt-5 inline-flex h-11 items-center justify-center rounded-md border border-amber/50 px-5 text-[12px] font-medium text-amber transition-colors hover:bg-amber/10 disabled:cursor-not-allowed disabled:opacity-50">Get live Testnet quote</button>
        </div>

        <div className="border border-white/10 bg-white/[0.02] p-5">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">Quote / risk</div>
          <dl className="mt-4 space-y-3 text-[13px]">
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Premium</dt><dd className="font-mono text-amber">{options.quote ? `${options.formatCollateral(options.quote.premium)} ${options.readState?.collateralSymbol}` : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Maximum loss</dt><dd className="font-mono text-foreground">{options.quote ? `${options.formatCollateral(options.quote.premium)} ${options.readState?.collateralSymbol}` : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Maximum payout</dt><dd className="font-mono text-foreground">{options.quote ? `${options.formatCollateral(options.quote.maxPayout)} ${options.readState?.collateralSymbol}` : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-dark">Settlement</dt><dd className="font-mono text-muted">After expiry</dd></div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={handleApprove} disabled={!options.quote || !walletReady || options.isPending} className="inline-flex h-10 items-center justify-center rounded-md border border-white/20 px-4 text-[12px] text-foreground hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50">Approve premium</button>
            <button type="button" onClick={handleOpen} disabled={!options.quote || !walletReady || !hasCapacity || options.isPending} className="inline-flex h-10 items-center justify-center rounded-md bg-amber px-4 text-[12px] font-medium text-[#0A0B0C] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">Open Option</button>
          </div>
          {!walletReady && options.quote && <p className="mt-3 text-[11px] text-muted-dark">Connect the authorized demo wallet on Robinhood Chain Testnet before signing.</p>}
          {walletReady && options.quote && !hasCapacity && <p className="mt-3 text-[11px] text-amber">Vault collateral capacity is insufficient for this notional. Funding is required before Open Option.</p>}
          {txHash && <p className="mt-4 break-all font-mono text-[10px] text-muted-dark">Last transaction: {txHash}</p>}
        </div>
      </div>

      <p className="mt-7 border-t border-white/10 pt-5 text-[12px] leading-5 text-muted-dark">
        Rates are operator-published Testnet development observations. This is not a production oracle, and settlement remains unavailable if the expiry snapshot is missing or stale.
      </p>
      {optionId !== undefined && options.position && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="mono text-[10px] uppercase tracking-[0.14em] text-muted-dark">On-chain option #{optionId.toString()}</div>
          <div className="mt-3 grid gap-3 text-[12px] sm:grid-cols-4">
            <div><span className="text-muted-dark">Owner</span><span className="mt-1 block break-all font-mono text-muted">{options.position.owner}</span></div>
            <div><span className="text-muted-dark">Status</span><span className="mt-1 block font-mono text-foreground">{["OPEN", "SETTLED", "CLAIMED"][options.position.state] || "UNKNOWN"}</span></div>
            <div><span className="text-muted-dark">Settlement rate</span><span className="mt-1 block font-mono text-amber">{options.position.settlementRate ? rateLabel(options.position.settlementRate) : "Pending"}</span></div>
            <div><span className="text-muted-dark">Payout</span><span className="mt-1 block font-mono text-foreground">{options.position.payout ? `${options.formatCollateral(options.position.payout)} ${options.readState?.collateralSymbol}` : "—"}</span></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {options.position.state === 0 && <button type="button" onClick={handleSettle} disabled={options.isPending} className="inline-flex h-10 items-center justify-center rounded-md border border-white/20 px-4 text-[12px] text-foreground hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50">Settle after expiry</button>}
            {options.position.state === 1 && <button type="button" onClick={handleClaim} disabled={options.isPending} className="inline-flex h-10 items-center justify-center rounded-md bg-amber px-4 text-[12px] font-medium text-[#0A0B0C] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50">Claim payout</button>}
          </div>
        </div>
      )}
    </section>
  );
}

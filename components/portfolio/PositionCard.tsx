"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { FixedYieldPosition, LongYieldPosition, YieldPosition } from "@/types/position";
import { formatTokenAmount, formatUsd } from "@/lib/utils/formatters";
import { useClaimYield, useRedeemFixed, useSellPosition } from "@/hooks/usePositionActions";
import { getYieldErrorMessage } from "@/types/errors";
import { AssetIcon } from "@/components/markets/AssetIcon";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function PositionCard({
  position,
  onActionComplete,
}: {
  position: YieldPosition;
  onActionComplete?: () => void;
}) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const { address } = useAccount();
  const claimYield = useClaimYield();
  const redeemFixed = useRedeemFixed();
  const sellPosition = useSellPosition();

  const isFixed = position.strategy === "fixed";
  const fixedPos = isFixed ? (position as FixedYieldPosition) : null;
  const longPos = !isFixed ? (position as LongYieldPosition) : null;

  const isMatured = position.status === "matured";
  const isRedeemed = position.status === "redeemed";
  const isActive = position.status === "active";
  const canClaim =
    !isFixed &&
    (isActive || isMatured) &&
    (longPos?.claimableYield || 0) > 0;
  const canSell = isActive;

  const handleClaim = async () => {
    if (!longPos || !canClaim) return;
    try {
      setLoadingAction("claim");
      if (!address) throw new Error("Connect a wallet to claim yield.");
      const res = await claimYield.mutateAsync({ positionId: position.id, userAddress: address });
      toast.success(
        `Claimed ${formatTokenAmount(res.claimedAmount ?? 0)} ${position.assetSymbol}!`
      );
      onActionComplete?.();
    } catch (error: unknown) {
      toast.error(getYieldErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRedeem = async () => {
    if (!fixedPos) return;
    try {
      setLoadingAction("redeem");
      if (!address) throw new Error("Connect a wallet to redeem PT.");
      const res = await redeemFixed.mutateAsync({ positionId: position.id, userAddress: address });
      toast.success(
        `Redeemed ${formatTokenAmount(res.redeemedAmount ?? 0)} ${position.assetSymbol} at maturity!`
      );
      onActionComplete?.();
    } catch (error: unknown) {
      toast.error(getYieldErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSellEarly = async () => {
    try {
      setLoadingAction("sell");
      if (!address) throw new Error("Connect a wallet to sell this position.");
      const res = await sellPosition.mutateAsync({ positionId: position.id, userAddress: address });
      toast.success(
        `Sold position early for ${formatUsd(res.returnedAmount ?? 0)}!`
      );
      onActionComplete?.();
    } catch (error: unknown) {
      toast.error(getYieldErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div
      className={`relative overflow-hidden border border-white/16 rounded-[10px] bg-surface p-5 sm:p-7 flex flex-col gap-5 ${
        isFixed ? "border-l-2 border-l-ice" : "border-l-2 border-l-amber"
      }`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute right-[-30px] top-[-36px] opacity-40">
        <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
          <path d="M-20 120C50 25 120 20 250 70" stroke={isFixed ? "#A9C8EE" : "#F0A85C"} strokeOpacity="0.32" strokeDasharray="2 9" />
          <circle cx="142" cy="48" r="3" fill={isFixed ? "#A9C8EE" : "#F0A85C"} />
        </svg>
      </div>
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2">
            <AssetIcon
              symbol={position.assetSymbol}
              name={position.assetSymbol}
              size="sm"
            />
            <span className="text-[19px] font-medium text-foreground">
              {isFixed ? "Fixed" : "Long"} · {position.assetSymbol}
            </span>
            <span
              className={`mono text-[11px] px-2 py-0.5 rounded-full border ${
                isFixed
                  ? "border-ice/30 text-ice bg-ice/10"
                  : "border-amber/30 text-amber bg-amber/10"
              }`}
            >
              {isFixed ? "PT" : "YT"}
            </span>
          </div>
          <div className="text-[13px] text-muted-dark mt-0.5">
            Opened {position.openedAt} · Ends {position.maturity}
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <span
            className={`mono text-[12px] tracking-wider uppercase font-medium ${
              isFixed ? "text-ice" : "text-amber"
            }`}
          >
            {isFixed
              ? `Locked ${fixedPos?.quotedFixedApy}%`
              : `Underlying ${longPos?.currentUnderlyingApy}%`}
          </span>
          <span className="text-[12px] text-muted-faint capitalize">
            {position.status}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-white/10">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-muted-dark">Deposited</span>
          <span className="mono text-[17px] text-foreground">
            {formatTokenAmount(position.depositedAmount)}{" "}
            <span className="text-[13px] text-muted">{position.assetSymbol}</span>
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-muted-dark">Current Value</span>
          <span className="mono text-[17px] text-foreground">
            {formatUsd(position.currentValue)}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-muted-dark">Unrealized PnL</span>
          <span
            className={`mono text-[17px] ${
              position.pnl >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {position.pnl >= 0 ? `+${position.pnl.toFixed(2)}` : position.pnl.toFixed(2)} USDG
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-muted-dark">
            {isFixed ? "At Maturity" : "Claimable Yield"}
          </span>
          <span
            className={`mono text-[17px] ${
              isFixed ? "text-ice" : "text-amber"
            }`}
          >
            {isFixed
              ? `${formatTokenAmount(fixedPos?.ptAmount || 0)} USDG`
              : `${formatTokenAmount(longPos?.claimableYield || 0)} USDG`}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
        <Link
          href={`/markets/${position.marketId}`}
          className="text-[13px] text-muted hover:text-white transition-colors"
        >
          View Market →
        </Link>

        <div className="flex items-center gap-3">
          {/* Long Strategy Actions */}
          {!isFixed && (isActive || isMatured) && (
            <button
              type="button"
              disabled={
                loadingAction !== null || !canClaim
              }
              onClick={handleClaim}
              className="min-h-[42px] px-4.5 rounded-lg bg-amber text-[#0A0B0C] text-[14px] font-medium flex items-center gap-1.5 hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {loadingAction === "claim" && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>Claim Yield ({formatTokenAmount(longPos?.claimableYield || 0)})</span>
            </button>
          )}

          {/* Fixed Strategy Redeem Action at Maturity */}
          {isFixed && !isRedeemed && position.status !== "closed" && (
            <button
              type="button"
              disabled={!isMatured || isRedeemed || loadingAction !== null}
              onClick={handleRedeem}
              className={`min-h-[42px] px-4.5 rounded-lg text-[14px] font-medium flex items-center gap-1.5 transition-all ${
                isMatured && !isRedeemed
                  ? "bg-ice text-[#0A0B0C] hover:brightness-105 cursor-pointer"
                  : "bg-surface border border-white/14 text-muted-dark cursor-not-allowed"
              }`}
            >
              {loadingAction === "redeem" && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>{isRedeemed ? "Redeemed" : "Redeem at Maturity"}</span>
            </button>
          )}

          {/* Sell Early Option */}
          {canSell && (
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={handleSellEarly}
              className="min-h-[42px] px-4 border border-white/25 rounded-lg bg-transparent text-foreground hover:border-white/50 text-[14px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {loadingAction === "sell" && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>Sell Early</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

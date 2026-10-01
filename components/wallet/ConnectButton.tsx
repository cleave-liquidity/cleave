"use client";

import React, { useState, useEffect } from "react";
import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { truncateAddress } from "@/lib/utils/formatters";

export function ConnectButton() {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <button
        type="button"
        className="inline-flex items-center justify-center min-h-[46px] px-6 border border-amber/55 bg-background/80 text-foreground text-[15px] font-medium"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="inline-flex items-center justify-center min-h-[46px] px-6 border border-amber/55 bg-background/80 hover:bg-amber/10 hover:border-amber transition-colors text-foreground text-[15px] font-medium"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="inline-flex items-center justify-center min-h-[46px] px-5 border border-negative bg-negative/10 text-negative text-[15px] font-medium"
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="hidden sm:inline-flex items-center gap-2 min-h-[46px] px-3.5 border border-white/10 bg-surface text-muted text-[13px] hover:border-white/20 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-positive" />
                    <span>{chain.name}</span>
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="inline-flex items-center gap-2.5 min-h-[46px] px-4 border border-white/16 bg-surface hover:border-white/30 text-foreground font-mono text-[14px] transition-colors"
                  >
                    <span className="text-muted-dark hidden md:inline">
                      {account.displayBalance ? `${account.displayBalance}` : ""}
                    </span>
                    <span className="text-ice font-medium">
                      {truncateAddress(account.address)}
                    </span>
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import { truncateAddress } from "@/lib/utils/formatters";
import { getNetworkShortLabel } from "@/lib/web3/environment";

type ConnectButtonProps = {
  /**
   * "navbar" is the internal header: connected controls collapse in a fixed order (balance, then the network name)
   * as width shrinks, so the header stays on one row. "default" keeps the original sizing (used by the Portfolio CTA).
   */
  variant?: "default" | "navbar";
};

export function ConnectButton({ variant = "default" }: ConnectButtonProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const navbar = variant === "navbar";
  // Below 360 px the header has no room for the wide paddings; the default variant never adds this.
  const squeeze = navbar ? " max-[359px]:px-3.5" : "";

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <button
        type="button"
        className={`inline-flex items-center justify-center min-h-[46px] px-6 border border-amber/55 bg-background/80 text-foreground text-[15px] font-medium${squeeze}`}
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
                    className={`inline-flex items-center justify-center min-h-[46px] px-6 border border-amber/55 bg-background/80 hover:bg-amber/10 hover:border-amber transition-colors text-foreground text-[15px] font-medium${squeeze}`}
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
                    className={`inline-flex items-center justify-center min-h-[46px] px-5 border border-negative bg-negative/10 text-negative text-[15px] font-medium${squeeze}`}
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
                    {...(navbar && {
                      "aria-label": `Network: ${chain.name}. Switch network`,
                      title: chain.name,
                    })}
                    className={`hidden sm:inline-flex items-center gap-2 min-h-[46px] px-3.5 border border-white/10 bg-surface text-muted text-[13px] hover:border-white/20 transition-colors${navbar ? " shrink-0 whitespace-nowrap" : ""}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-positive" />
                    {navbar ? (
                      // The full name ("Robinhood Chain Testnet") is in the title/aria-label and in the strip under the header.
                      <span className="hidden sm:inline md:hidden lg:inline">
                        {getNetworkShortLabel(chain.id, true)}
                      </span>
                    ) : (
                      <span>{chain.name}</span>
                    )}
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className={`inline-flex items-center gap-2.5 min-h-[46px] px-4 border border-white/16 bg-surface hover:border-white/30 text-foreground font-mono text-[14px] transition-colors${navbar ? " shrink-0 whitespace-nowrap" : ""}`}
                  >
                    <span
                      className={
                        navbar
                          ? "text-muted-dark hidden xl:block max-w-[7.5rem] truncate"
                          : "text-muted-dark hidden md:inline"
                      }
                    >
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

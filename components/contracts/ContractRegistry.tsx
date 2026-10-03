"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ContractCategory, ContractDeployment } from "@/lib/contracts/deployments";
import { getContractDeployments } from "@/lib/contracts/deployments";
import { getProjectContractDeployments } from "@/lib/contracts/project-deployments";
import type { RobinhoodNetwork } from "@/types/market";
import { getConfiguredNetwork } from "@/lib/web3/environment";
import { NetworkSelect, type NetworkOption } from "@/components/contracts/NetworkSelect";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { isMarketTradable } from "@/lib/markets/status";
import type { YieldMarket } from "@/types/market";

const networkOptions: readonly NetworkOption[] = [
  { value: "mainnet", label: "Robinhood Chain Mainnet", chainId: 4663, hint: "Production" },
  { value: "testnet", label: "Robinhood Chain Testnet", chainId: 46630, hint: "Testing" },
];

const categoryLabels: Record<ContractCategory, string> = {
  core: "Core",
  integration: "Integration",
  risk: "Risk",
  execution: "Execution",
  read: "Read",
  market: "Market",
  router: "Router",
  pt: "PT",
  yt: "YT",
  adapter: "Adapter",
  quote: "Quote",
  other: "Other",
};

function LiveMarketContracts({ network }: { network: RobinhoodNetwork }) {
  const liveEnabled = network === "mainnet" && yieldAdapter.mode === "live";
  const { data: markets = [], isLoading, isError } = useQuery<YieldMarket[]>({
    queryKey: ["contract-registry-live-markets", network],
    enabled: liveEnabled,
    staleTime: 60_000,
    queryFn: async () => {
      const liveMarkets = await yieldAdapter.getMarkets();
      return liveMarkets
        .filter((market) => isMarketTradable(market))
        .sort((a, b) => b.liquidityUsd - a.liquidityUsd || a.id.localeCompare(b.id));
    },
  });

  return (
    <section className="flex flex-col gap-4">
      <div>
        <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-dark">Runtime market metadata</div>
        <h2 className="mt-2 text-[24px] font-normal tracking-[-0.03em] text-foreground">Pendle market and PT / YT / SY addresses</h2>
        <p className="mt-2 max-w-[760px] text-[13px] leading-6 text-muted">
          These addresses are resolved from the live Pendle market response for the selected chain. They are not CLEAVE-owned deployments and are not copied into the static registry.
        </p>
      </div>

      {network === "testnet" ? (
        <div className="border border-amber/35 bg-amber/5 px-5 py-5 text-[13px] leading-6 text-muted">
          <span className="mono block text-[10px] uppercase tracking-[0.14em] text-amber">Not verified</span>
          No verified Pendle market, PT, YT, or SY deployments are available for Robinhood Chain Testnet `46630`. Live Testnet trading is unavailable; no Mainnet address is reused here.
        </div>
      ) : yieldAdapter.mode !== "live" ? (
        <div className="border border-amber/35 bg-amber/5 px-5 py-5 text-[13px] leading-6 text-muted">
          <span className="mono block text-[10px] uppercase tracking-[0.14em] text-amber">Live inventory hidden</span>
          The application is running in explicit mock mode, so no mock market address is presented as a verified deployment.
        </div>
      ) : isLoading ? (
        <div className="border border-white/15 bg-surface/70 px-5 py-6 text-[13px] text-muted">Loading live Pendle market metadata…</div>
      ) : isError ? (
        <div className="border border-amber/35 bg-amber/5 px-5 py-5 text-[13px] leading-6 text-muted">
          <span className="mono block text-[10px] uppercase tracking-[0.14em] text-amber">Live source unavailable</span>
          No market address is shown because the current Pendle response could not be verified.
        </div>
      ) : markets.length === 0 ? (
        <div className="border border-amber/35 bg-amber/5 px-5 py-5 text-[13px] leading-6 text-muted">
          <span className="mono block text-[10px] uppercase tracking-[0.14em] text-amber">No tradeable market</span>
          Pendle returned no currently tradeable Mainnet market metadata.
        </div>
      ) : (
        <div className="overflow-x-auto border border-white/15 bg-surface/70">
          <div className="min-w-[1040px]">
            <div className="mono grid grid-cols-[1.3fr_1.5fr_1.5fr_1.5fr_1.5fr] gap-4 border-b border-white/15 px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-dark">
              <span>Market / chain</span><span>Market</span><span>PT</span><span>YT</span><span>SY</span>
            </div>
            {markets.map((market) => (
              <div key={market.id} className="grid grid-cols-[1.3fr_1.5fr_1.5fr_1.5fr_1.5fr] gap-4 border-b border-white/10 px-5 py-4 text-[11px] last:border-b-0">
                <div>
                  <span className="block text-[13px] text-foreground">{market.name}</span>
                  <span className="mono text-muted-dark">Mainnet · {market.chainId}</span>
                </div>
                <code className="break-all text-muted" title={market.marketAddress}>{market.marketAddress || "Not verified"}</code>
                <code className="break-all text-muted" title={market.ptAddress}>{market.ptAddress || "Not verified"}</code>
                <code className="break-all text-muted" title={market.ytAddress}>{market.ytAddress || "Not verified"}</code>
                <code className="break-all text-muted" title={market.syAddress}>{market.syAddress || "Not verified"}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function ContractRegistry() {
  const [network, setNetwork] = useState<RobinhoodNetwork>(() => getConfiguredNetwork());
  const [category, setCategory] = useState<ContractCategory | "all">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const deployments = getContractDeployments(network);
  const projectDeployments = getProjectContractDeployments(network === "mainnet" ? 4663 : 46630);
  const representedCategories = useMemo(
    () => Array.from(new Set(deployments.map((deployment) => deployment.category))),
    [deployments],
  );
  const filteredDeployments = category === "all"
    ? deployments
    : deployments.filter((deployment) => deployment.category === category);

  const copyAddress = async (deployment: ContractDeployment) => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(deployment.address);
    setCopiedId(deployment.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mono text-[11px] uppercase tracking-[0.18em] text-muted-dark">Deployment registry / Transparency</div>
          <h1 className="mt-3 text-[36px] font-normal leading-none tracking-[-0.04em] text-foreground sm:text-[48px]">CLEAVE Contract Registry</h1>
          <p className="mt-4 max-w-[620px] text-[15px] leading-6 text-muted">
            External protocol addresses used by CLEAVE are shown alongside any real CLEAVE-owned deployments. Static rows come from the deployment registry; live market, PT, YT, and SY rows come from verified Pendle metadata.
          </p>
        </div>
        <div className="shrink-0 border-l-2 border-amber bg-amber/5 px-4 py-3 text-[12px] leading-5 text-muted">
          <span className="mono block text-[10px] uppercase tracking-[0.14em] text-amber">Registry only</span>
          <span>Changing this view does not switch your wallet network.</span>
        </div>
      </div>

      <div className="flex flex-col gap-5 border-y border-white/10 py-5 sm:flex-row sm:items-end sm:justify-between">
        <NetworkSelect
          label="Network"
          value={network}
          options={networkOptions}
          onChange={(next) => {
            setNetwork(next);
            setCategory("all");
          }}
        />

        <div className="mono pb-3.5 text-[11px] uppercase tracking-[0.12em] text-muted-dark">
          {filteredDeployments.filter((deployment) => deployment.verified).length} verified · {filteredDeployments.length} registry {filteredDeployments.length === 1 ? "entry" : "entries"}
        </div>
      </div>

      <div className="mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {network === "mainnet" ? "Robinhood Chain Mainnet · Chain 4663" : "Robinhood Chain Testnet · Chain 46630"}
      </div>

      {representedCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filter contract categories">
          <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")} className="min-h-[34px] border-b-2 border-transparent px-2 text-[12px] text-muted transition-colors aria-pressed:border-ice aria-pressed:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">All</button>
          {representedCategories.map((item) => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className="min-h-[34px] border-b-2 border-transparent px-2 text-[12px] text-muted transition-colors aria-pressed:border-ice aria-pressed:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
              {categoryLabels[item]}
            </button>
          ))}
        </div>
      )}

      {filteredDeployments.length === 0 ? (
        <div className="border border-white/15 bg-surface/70 px-6 py-16 text-center sm:px-12">
          <div className="mono text-[11px] uppercase tracking-[0.16em] text-amber">{network === "mainnet" ? "Robinhood Chain Mainnet" : "Robinhood Chain Testnet"}</div>
          <h2 className="mt-3 text-[22px] font-normal text-foreground">No verified external deployments configured.</h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[14px] leading-6 text-muted">
            No address is fabricated for this network. Preview or Mainnet market addresses are not copied into the Testnet registry.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-white/15 bg-surface/70">
          <div className="min-w-[1220px]">
            <div className="mono grid grid-cols-[1.5fr_0.75fr_0.6fr_1.7fr_0.75fr_0.85fr_1.35fr_1fr] gap-4 border-b border-white/15 px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-dark">
              <span>Contract / role</span><span>Category</span><span>Version</span><span>Address</span><span>Ownership</span><span>Status</span><span>Used by runtime</span><span className="text-right">Actions</span>
            </div>
            {filteredDeployments.map((deployment) => (
              <div key={deployment.id} className="grid grid-cols-[1.5fr_0.75fr_0.6fr_1.7fr_0.75fr_0.85fr_1.35fr_1fr] items-center gap-4 border-b border-white/10 px-5 py-4 text-[13px] last:border-b-0">
                <div><span className="block text-foreground">{deployment.name}</span><span className="text-[11px] text-muted-dark">{deployment.runtimeRole}</span></div>
                <span className="text-muted">{categoryLabels[deployment.category]}</span>
                <span className="mono text-muted">{deployment.version || "—"}</span>
                <code className="break-all text-[11px] text-muted" title={deployment.address}>{deployment.address}</code>
                <span className="text-muted">{deployment.ownership === "project" ? "Project" : "External"}</span>
                <span className={deployment.verified ? "text-positive" : "text-amber"}>{deployment.verified ? "Verified" : "Unverified"}</span>
                <span className={deployment.usedByRuntime ? "text-positive" : "text-muted-dark"}>{deployment.usedByRuntime ? "YES" : "NO · registry"}</span>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => copyAddress(deployment)} aria-label={`Copy ${deployment.name} address`} className="inline-flex min-h-[30px] items-center gap-1 border border-white/15 px-2 text-[11px] text-muted hover:border-white/35 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
                    {copiedId === deployment.id ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />} Copy
                  </button>
                  {deployment.source && <a href={deployment.source} target="_blank" rel="noopener noreferrer" aria-label={`Open ${deployment.name} deployment source`} className="inline-flex min-h-[30px] items-center border border-white/15 px-2 text-[11px] text-muted hover:border-white/35 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">Source</a>}
                  {deployment.explorerUrl && <a href={deployment.explorerUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${deployment.name} in explorer`} className="inline-flex min-h-[30px] items-center border border-white/15 px-2 text-muted hover:border-white/35 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <LiveMarketContracts network={network} />

      <section className="flex flex-col gap-3">
        <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted-dark">Project-owned contracts</div>
        {projectDeployments.length === 0 ? (
          <div className="border border-white/15 bg-surface/70 px-5 py-5 text-[13px] leading-6 text-muted">
            <span className="block text-foreground">Not deployed</span>
            No CLEAVE-owned {network === "mainnet" ? "Mainnet" : "Testnet"} contract is represented in the synchronized registry. No placeholder address is shown.
          </div>
        ) : (
          <div className="flex flex-col gap-3 border border-white/15 bg-surface/70 px-5 py-5 text-[13px] leading-6 text-muted">
            {projectDeployments.map((deployment) => (
              <div key={deployment.id} className="grid gap-2 sm:grid-cols-[1.1fr_2fr_1fr] sm:items-start">
                <div>
                  <span className="block text-foreground">{deployment.name}</span>
                  <span className="mono text-[10px] uppercase tracking-[0.12em] text-amber">{deployment.verificationStatus || (deployment.verified ? "VERIFIED" : "UNVERIFIED")}</span>
                </div>
                <code className="break-all text-[11px]">{deployment.address}</code>
                <span className="text-[12px]">Used by current runtime: {deployment.usedByRuntime ? "YES" : "NO · registry only"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

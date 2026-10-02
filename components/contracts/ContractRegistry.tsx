"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { ContractCategory, ContractDeployment } from "@/lib/contracts/deployments";
import { getContractDeployments } from "@/lib/contracts/deployments";
import type { RobinhoodNetwork } from "@/types/market";
import { getConfiguredNetwork } from "@/lib/web3/environment";
import { NetworkSelect, type NetworkOption } from "@/components/contracts/NetworkSelect";

const networkOptions: readonly NetworkOption[] = [
  { value: "mainnet", label: "Robinhood Chain Mainnet", chainId: 4663, hint: "Production" },
  { value: "testnet", label: "Robinhood Chain Testnet", chainId: 46630, hint: "Testing" },
];

const categoryLabels: Record<ContractCategory, string> = {
  market: "Market",
  router: "Router",
  pt: "PT",
  yt: "YT",
  adapter: "Adapter",
  quote: "Quote",
  other: "Other",
};

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ContractRegistry() {
  const [network, setNetwork] = useState<RobinhoodNetwork>(() => getConfiguredNetwork());
  const [category, setCategory] = useState<ContractCategory | "all">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const deployments = getContractDeployments(network);
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
            Verified deployment addresses used by CLEAVE. This registry only lists addresses explicitly configured as verified integrations.
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
          {filteredDeployments.length} verified {filteredDeployments.length === 1 ? "deployment" : "deployments"}
        </div>
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
          <h2 className="mt-3 text-[22px] font-normal text-foreground">No verified CLEAVE contracts configured.</h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[14px] leading-6 text-muted">
            Contract deployments will appear here once the protocol integration is deployed and verified. Preview market addresses are not listed as deployments.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-white/15 bg-surface/70">
          <div className="min-w-[760px]">
            <div className="mono grid grid-cols-[1.7fr_0.8fr_0.7fr_1.4fr_0.7fr_0.9fr] gap-4 border-b border-white/15 px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-dark">
              <span>Contract</span><span>Category</span><span>Version</span><span>Address</span><span>Status</span><span className="text-right">Actions</span>
            </div>
            {filteredDeployments.map((deployment) => (
              <div key={deployment.id} className="grid grid-cols-[1.7fr_0.8fr_0.7fr_1.4fr_0.7fr_0.9fr] items-center gap-4 border-b border-white/10 px-5 py-4 text-[13px] last:border-b-0">
                <div><span className="block text-foreground">{deployment.name}</span><span className="text-[11px] text-muted-dark">{deployment.description}</span></div>
                <span className="text-muted">{categoryLabels[deployment.category]}</span>
                <span className="mono text-muted">{deployment.version || "—"}</span>
                <span className="mono text-muted">{shortAddress(deployment.address)}</span>
                <span className={deployment.verified ? "text-positive" : "text-amber"}>{deployment.verified ? "Verified" : "Unverified"}</span>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => copyAddress(deployment)} aria-label={`Copy ${deployment.name} address`} className="inline-flex min-h-[30px] items-center gap-1 border border-white/15 px-2 text-[11px] text-muted hover:border-white/35 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
                    {copiedId === deployment.id ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />} Copy
                  </button>
                  {deployment.explorerUrl && <a href={deployment.explorerUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${deployment.name} in explorer`} className="inline-flex min-h-[30px] items-center border border-white/15 px-2 text-muted hover:border-white/35 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

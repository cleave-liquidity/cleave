import { keccak256, stringToHex, type Address, type Hex, type PublicClient } from "viem";
import { getContractByName } from "@/lib/contracts/deployments";
import { ROBINHOOD_CHAIN_ID } from "@/lib/web3/chains";
import { YieldDomainError } from "@/types/errors";

export const CLEAVE_PENDLE_ADAPTER_ID =
  "0x50454e444c450000000000000000000000000000000000000000000000000000" as Hex;

const executionRouterAbi = [
  {
    type: "function",
    name: "validateExecution",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [
      { name: "allowed", type: "bool" },
      { name: "adapterId", type: "bytes32" },
      { name: "externalRouter", type: "address" },
    ],
  },
] as const;

const lifecycleManagerAbi = [
  {
    type: "function",
    name: "getLifecycle",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "strategy", type: "uint8" },
    ],
    outputs: [
      {
        name: "lifecycle",
        type: "tuple",
        components: [
          { name: "state", type: "uint8" },
          { name: "sellEarlyEligible", type: "bool" },
          { name: "redeemAtMaturityEligible", type: "bool" },
          { name: "claimYieldEligible", type: "bool" },
          { name: "maturity", type: "uint256" },
        ],
      },
    ],
  },
] as const;

const lensAbi = [
  {
    type: "function",
    name: "getMarketSummary",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [
      {
        name: "summary",
        type: "tuple",
        components: [
          { name: "adapterId", type: "bytes32" },
          { name: "market", type: "address" },
          { name: "pt", type: "address" },
          { name: "yt", type: "address" },
          { name: "sy", type: "address" },
          { name: "underlying", type: "address" },
          { name: "maturity", type: "uint256" },
          { name: "chainId", type: "uint256" },
          { name: "marketEnabled", type: "bool" },
          { name: "adapterEnabled", type: "bool" },
          { name: "globalPaused", type: "bool" },
          { name: "marketPaused", type: "bool" },
          { name: "adapterPaused", type: "bool" },
          { name: "executionAllowed", type: "bool" },
          { name: "fixedState", type: "uint8" },
          { name: "tradingYieldState", type: "uint8" },
          { name: "fixedSellEarlyEligible", type: "bool" },
          { name: "fixedRedeemAtMaturityEligible", type: "bool" },
          { name: "tradingYieldSellEarlyEligible", type: "bool" },
          { name: "tradingYieldClaimYieldEligible", type: "bool" },
        ],
      },
    ],
  },
] as const;

export type CleaveLifecycle = {
  state: number;
  sellEarlyEligible: boolean;
  redeemAtMaturityEligible: boolean;
  claimYieldEligible: boolean;
  maturity: bigint;
};

export type CleaveMarketSummary = {
  marketEnabled: boolean;
  adapterEnabled: boolean;
  globalPaused: boolean;
  marketPaused: boolean;
  adapterPaused: boolean;
  executionAllowed: boolean;
  fixedState: number;
  tradingYieldState: number;
  fixedSellEarlyEligible: boolean;
  fixedRedeemAtMaturityEligible: boolean;
  tradingYieldSellEarlyEligible: boolean;
  tradingYieldClaimYieldEligible: boolean;
};

export function cleaveMarketKey(marketId: string): Hex {
  return keccak256(stringToHex(marketId));
}

function requireMainnetDeployment(name: string): Address {
  const deployment = getContractByName(ROBINHOOD_CHAIN_ID, name);
  if (!deployment?.address || deployment.chainId !== ROBINHOOD_CHAIN_ID) {
    throw new YieldDomainError("live-source-unavailable", `CLEAVE ${name} is not configured for Mainnet.`);
  }
  return deployment.address;
}

function assertMainnetClient(publicClient: PublicClient): void {
  if (publicClient.chain?.id && publicClient.chain.id !== ROBINHOOD_CHAIN_ID) {
    throw new YieldDomainError("wrong-network", "Switch your wallet to Robinhood Chain Mainnet.");
  }
}

function normalizeError(error: unknown): YieldDomainError {
  return error instanceof YieldDomainError
    ? error
    : new YieldDomainError("rpc-unavailable", "CLEAVE Mainnet validation could not be read.");
}

export async function validateCleaveExecution(
  marketId: string,
  publicClient: PublicClient,
): Promise<{ marketKey: Hex; adapterId: Hex; externalRouter: Address }> {
  assertMainnetClient(publicClient);
  const marketKey = cleaveMarketKey(marketId);
  const executionRouter = requireMainnetDeployment("CleaveExecutionRouter");
  const pendleRouter = requireMainnetDeployment("Pendle Router V2");

  try {
    const [allowed, adapterId, externalRouter] = await publicClient.readContract({
      address: executionRouter,
      abi: executionRouterAbi,
      functionName: "validateExecution",
      args: [marketKey],
    });
    if (!allowed) {
      throw new YieldDomainError("live-source-unavailable", "CLEAVE did not allow execution for this market.");
    }
    if (adapterId.toLowerCase() !== CLEAVE_PENDLE_ADAPTER_ID.toLowerCase()) {
      throw new YieldDomainError("live-source-unavailable", "CLEAVE returned an unapproved yield adapter.");
    }
    if (externalRouter.toLowerCase() !== pendleRouter.toLowerCase()) {
      throw new YieldDomainError("live-source-unavailable", "CLEAVE returned an unapproved Pendle router.");
    }
    return { marketKey, adapterId, externalRouter };
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function readCleaveLifecycle(
  marketId: string,
  strategy: "fixed" | "long",
  publicClient: PublicClient,
): Promise<CleaveLifecycle> {
  assertMainnetClient(publicClient);
  try {
    const lifecycle = await publicClient.readContract({
      address: requireMainnetDeployment("CleaveLifecycleManager"),
      abi: lifecycleManagerAbi,
      functionName: "getLifecycle",
      args: [cleaveMarketKey(marketId), strategy === "fixed" ? 0 : 1],
    });
    return {
      state: Number(lifecycle.state),
      sellEarlyEligible: lifecycle.sellEarlyEligible,
      redeemAtMaturityEligible: lifecycle.redeemAtMaturityEligible,
      claimYieldEligible: lifecycle.claimYieldEligible,
      maturity: lifecycle.maturity,
    };
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function readCleaveMarketSummary(
  marketId: string,
  publicClient: PublicClient,
): Promise<CleaveMarketSummary> {
  assertMainnetClient(publicClient);
  try {
    const summary = await publicClient.readContract({
      address: requireMainnetDeployment("CleaveLens"),
      abi: lensAbi,
      functionName: "getMarketSummary",
      args: [cleaveMarketKey(marketId)],
    });
    return {
      marketEnabled: summary.marketEnabled,
      adapterEnabled: summary.adapterEnabled,
      globalPaused: summary.globalPaused,
      marketPaused: summary.marketPaused,
      adapterPaused: summary.adapterPaused,
      executionAllowed: summary.executionAllowed,
      fixedState: Number(summary.fixedState),
      tradingYieldState: Number(summary.tradingYieldState),
      fixedSellEarlyEligible: summary.fixedSellEarlyEligible,
      fixedRedeemAtMaturityEligible: summary.fixedRedeemAtMaturityEligible,
      tradingYieldSellEarlyEligible: summary.tradingYieldSellEarlyEligible,
      tradingYieldClaimYieldEligible: summary.tradingYieldClaimYieldEligible,
    };
  } catch (error) {
    throw normalizeError(error);
  }
}

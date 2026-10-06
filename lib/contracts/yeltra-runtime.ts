import { keccak256, stringToHex, type Address, type Hex, type PublicClient } from "viem";
import { getContractByName } from "@/lib/contracts/deployments";
import { ROBINHOOD_CHAIN_ID } from "@/lib/web3/chains";
import { YieldDomainError } from "@/types/errors";

export const YELTRA_PENDLE_ADAPTER_ID =
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

export type YeltraLifecycle = {
  state: number;
  sellEarlyEligible: boolean;
  redeemAtMaturityEligible: boolean;
  claimYieldEligible: boolean;
  maturity: bigint;
};

export type YeltraMarketSummary = {
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

export function yeltraMarketKey(marketId: string): Hex {
  return keccak256(stringToHex(marketId));
}

const DEPLOYMENT_NAME_CANDIDATES = {
  executionRouter: ["YeltraExecutionRouter", "CleaveExecutionRouter"],
  lifecycleManager: ["YeltraLifecycleManager", "CleaveLifecycleManager"],
  lens: ["YeltraLens", "CleaveLens"],
} as const;
const YELTRA_DEPLOYMENT_LABELS = {
  executionRouter: "Execution Router",
  lifecycleManager: "Lifecycle Manager",
  lens: "Lens",
} as const;

function requireYeltraDeployment(name: keyof typeof DEPLOYMENT_NAME_CANDIDATES): Address {
  const deployment = DEPLOYMENT_NAME_CANDIDATES[name]
    .map((candidate) => getContractByName(ROBINHOOD_CHAIN_ID, candidate))
    .find((candidate) => candidate?.address);
  if (!deployment?.address || deployment.chainId !== ROBINHOOD_CHAIN_ID) {
    throw new YieldDomainError("live-source-unavailable", `YELTRA ${YELTRA_DEPLOYMENT_LABELS[name]} is not configured for Mainnet.`);
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
    : new YieldDomainError("rpc-unavailable", "YELTRA Mainnet validation could not be read.");
}

export async function validateYeltraExecution(
  marketId: string,
  publicClient: PublicClient,
): Promise<{ marketKey: Hex; adapterId: Hex; externalRouter: Address }> {
  assertMainnetClient(publicClient);
  const marketKey = yeltraMarketKey(marketId);
  const executionRouter = requireYeltraDeployment("executionRouter");
  const pendleRouter = getContractByName(ROBINHOOD_CHAIN_ID, "Pendle Router V2")?.address;
  if (!pendleRouter) {
    throw new YieldDomainError("live-source-unavailable", "YELTRA Pendle Router V2 is not configured for Mainnet.");
  }

  try {
    const [allowed, adapterId, externalRouter] = await publicClient.readContract({
      address: executionRouter,
      abi: executionRouterAbi,
      functionName: "validateExecution",
      args: [marketKey],
    });
    if (!allowed) {
      throw new YieldDomainError("live-source-unavailable", "YELTRA did not allow execution for this market.");
    }
    if (adapterId.toLowerCase() !== YELTRA_PENDLE_ADAPTER_ID.toLowerCase()) {
      throw new YieldDomainError("live-source-unavailable", "YELTRA returned an unapproved yield adapter.");
    }
    if (externalRouter.toLowerCase() !== pendleRouter.toLowerCase()) {
      throw new YieldDomainError("live-source-unavailable", "YELTRA returned an unapproved Pendle router.");
    }
    return { marketKey, adapterId, externalRouter };
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function readYeltraLifecycle(
  marketId: string,
  strategy: "fixed" | "long",
  publicClient: PublicClient,
): Promise<YeltraLifecycle> {
  assertMainnetClient(publicClient);
  try {
    const lifecycle = await publicClient.readContract({
      address: requireYeltraDeployment("lifecycleManager"),
      abi: lifecycleManagerAbi,
      functionName: "getLifecycle",
      args: [yeltraMarketKey(marketId), strategy === "fixed" ? 0 : 1],
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

export async function readYeltraMarketSummary(
  marketId: string,
  publicClient: PublicClient,
): Promise<YeltraMarketSummary> {
  assertMainnetClient(publicClient);
  try {
    const summary = await publicClient.readContract({
      address: requireYeltraDeployment("lens"),
      abi: lensAbi,
      functionName: "getMarketSummary",
      args: [yeltraMarketKey(marketId)],
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

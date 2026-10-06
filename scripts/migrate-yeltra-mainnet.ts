import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseAbi,
  parseAbiItem,
  privateKeyToAccount,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { robinhoodChain } from "../lib/web3/chains";

const MAINNET_CHAIN_ID = 4663;
const LEGACY_DEPLOYMENT_BLOCK = BigInt(79841471);
const OLD_MARKET_REGISTRY_BLOCK = BigInt(79841487);
const broadcastPath = join(process.cwd(), "contracts", "broadcast", "DeployYeltraMainnet.s.sol", "4663", "run-latest.json");
const snapshotDir = join(process.cwd(), "artifacts", "yeltra-migration");
const snapshotPath = join(snapshotDir, "mainnet-legacy-snapshot.json");
const rpcUrl = process.env.ROBINHOOD_MAINNET_RPC_URL || process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL;
if (!rpcUrl) throw new Error("Missing Mainnet RPC URL.");

const legacy = {
  registry: "0xaa58afad613b2048ef526325c6989ec74703152b" as Address,
  accessManager: "0x8ba198d9275c65ee208eadd22084f38d0f193395" as Address,
  adapterRegistry: "0xc6a3d3e37f917f971d73f3aa4ec4019a04cb7cac" as Address,
  marketRegistry: "0xf48ac38c6a4342135c3ff4e45c4cd750576fe8e7" as Address,
  riskGuard: "0x4f3e119ddcd8d12b57b7c5b856f40ff85544913b" as Address,
  router: "0xc392c88a59d129af9a0c8dc2fcaaf9de3f635b03" as Address,
  lifecycleManager: "0xc3c60d0680a5db41d68187c62af2dd499220a865" as Address,
  lens: "0x8a41d30eb2ea283d12505449a478f20c314c2cf9" as Address,
};

const abi = parseAbi([
  "function owner() view returns (address)",
  "function pendleRouter() view returns (address)",
  "function approvedMarkets(address) view returns (bool)",
  "function setPendleRouter(address)",
  "function setMarketApproval(address,bool)",
  "function hasRole(bytes32,address) view returns (bool)",
  "function grantRole(bytes32,address)",
  "function accessManager() view returns (address)",
  "function adapterRegistry() view returns (address)",
  "function marketRegistry() view returns (address)",
  "function riskGuard() view returns (address)",
  "function getAdapter(bytes32) view returns (bytes32 protocolId,address router,uint256 chainId,bool enabled)",
  "function registerAdapter(bytes32,bytes32,address,uint256)",
  "function setAdapterEnabled(bytes32,bool)",
  "function isAdapterEnabled(bytes32) view returns (bool)",
  "function getMarket(bytes32) view returns (bytes32 adapterId,address market,address pt,address yt,address sy,address underlying,uint256 maturity,uint256 chainId,bool enabled)",
  "function registerMarket(bytes32,bytes32,address,address,address,address,address,uint256,uint256)",
  "function setMarketEnabled(bytes32,bool)",
  "function isMarketSupported(bytes32) view returns (bool)",
  "function globalPaused() view returns (bool)",
  "function marketPaused(bytes32) view returns (bool)",
  "function adapterPaused(bytes32) view returns (bool)",
  "function setGlobalPause(bool)",
  "function setMarketPause(bytes32,bool)",
  "function setAdapterPause(bytes32,bool)",
]);
const marketRegisteredEvent = parseAbiItem(
  "event MarketRegistered(bytes32 indexed marketId, bytes32 indexed adapterId, address indexed market, uint256 chainId, uint256 maturity)",
);
const marketApprovalEvent = parseAbiItem("event MarketApprovalUpdated(address indexed market,bool approved)");
const roleGrantedEvent = parseAbiItem("event RoleGranted(bytes32 indexed role,address indexed account,address indexed sender)");
const roleRevokedEvent = parseAbiItem("event RoleRevoked(bytes32 indexed role,address indexed account,address indexed sender)");

const adapterId = stringToHex("PENDLE", { size: 32 });
const roles = [
  ["ADMIN_ROLE", keccak256(stringToHex("CLEAVE_ADMIN"))],
  ["OPERATOR_ROLE", keccak256(stringToHex("CLEAVE_OPERATOR"))],
  ["GUARDIAN_ROLE", keccak256(stringToHex("CLEAVE_GUARDIAN"))],
] as const;

const publicClient = createPublicClient({ chain: robinhoodChain, transport: http(rpcUrl) });

type JsonObject = Record<string, unknown>;
type MarketConfig = {
  adapterId: Hex;
  market: Address;
  pt: Address;
  yt: Address;
  sy: Address;
  underlying: Address;
  maturity: bigint;
  chainId: bigint;
  enabled: boolean;
};
type AdapterConfig = { protocolId: Hex; router: Address; chainId: bigint; enabled: boolean };
type DeploymentAddresses = Record<string, Address>;

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function tupleValue(value: unknown, index: number, key: string): unknown {
  if (Array.isArray(value)) return value[index];
  return asObject(value)[key];
}

function readBroadcast(): JsonObject {
  const broadcast = JSON.parse(readFileSync(broadcastPath, "utf8")) as JsonObject;
  if (Number(broadcast.chain) !== MAINNET_CHAIN_ID) throw new Error("YELTRA Mainnet broadcast is not for chain 4663.");
  return broadcast;
}

function readDeployments(broadcast: JsonObject): DeploymentAddresses {
  const names = ["YeltraRegistry", "YeltraAccessManager", "YeltraAdapterRegistry", "YeltraMarketRegistry", "YeltraRiskGuard", "YeltraExecutionRouter", "YeltraLifecycleManager", "YeltraLens"];
  const transactions = Array.isArray(broadcast.transactions) ? broadcast.transactions.map(asObject) : [];
  return Object.fromEntries(names.map((name) => {
    const transaction = transactions.find((item) => item.transactionType === "CREATE" && item.contractName === name);
    if (typeof transaction?.contractAddress !== "string") throw new Error(`YELTRA broadcast has no ${name} address.`);
    return [name, transaction.contractAddress as Address];
  }));
}

async function read(address: Address, functionName: string, args: readonly unknown[] = []): Promise<unknown> {
  return publicClient.readContract({ address, abi, functionName: functionName as never, args: args as never }) as Promise<unknown>;
}

async function readMarket(address: Address, marketId: Hex): Promise<MarketConfig> {
  const value = await read(address, "getMarket", [marketId]);
  return {
    adapterId: tupleValue(value, 0, "adapterId") as Hex,
    market: tupleValue(value, 1, "market") as Address,
    pt: tupleValue(value, 2, "pt") as Address,
    yt: tupleValue(value, 3, "yt") as Address,
    sy: tupleValue(value, 4, "sy") as Address,
    underlying: tupleValue(value, 5, "underlying") as Address,
    maturity: tupleValue(value, 6, "maturity") as bigint,
    chainId: tupleValue(value, 7, "chainId") as bigint,
    enabled: tupleValue(value, 8, "enabled") as boolean,
  };
}

async function readAdapter(address: Address, id: Hex): Promise<AdapterConfig> {
  const value = await read(address, "getAdapter", [id]);
  return {
    protocolId: tupleValue(value, 0, "protocolId") as Hex,
    router: tupleValue(value, 1, "router") as Address,
    chainId: tupleValue(value, 2, "chainId") as bigint,
    enabled: tupleValue(value, 3, "enabled") as boolean,
  };
}

function serialize(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  return value;
}

function sameAddress(left: Address, right: Address): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function sameMarket(left: MarketConfig, right: MarketConfig): boolean {
  return sameAddress(left.market, right.market)
    && sameAddress(left.pt, right.pt)
    && sameAddress(left.yt, right.yt)
    && sameAddress(left.sy, right.sy)
    && sameAddress(left.underlying, right.underlying)
    && left.adapterId.toLowerCase() === right.adapterId.toLowerCase()
    && left.maturity === right.maturity
    && left.chainId === right.chainId
    && left.enabled === right.enabled;
}

async function snapshotLegacy() {
  const latestBlock = await publicClient.getBlockNumber();
  const marketLogs = await publicClient.getLogs({ address: legacy.marketRegistry, event: marketRegisteredEvent, fromBlock: OLD_MARKET_REGISTRY_BLOCK, toBlock: latestBlock });
  const markets = await Promise.all(marketLogs.map(async (log) => ({ marketId: log.args.marketId as Hex, config: await readMarket(legacy.marketRegistry, log.args.marketId as Hex), paused: await read(legacy.riskGuard, "marketPaused", [log.args.marketId]) })));
  const adapter = await readAdapter(legacy.adapterRegistry, adapterId);
  const rolesSnapshot = await Promise.all(roles.map(async ([name, role]) => ({ name, role, members: await roleMembers(role, latestBlock) })));
  const approvalLogs = await publicClient.getLogs({ address: legacy.registry, event: marketApprovalEvent, fromBlock: LEGACY_DEPLOYMENT_BLOCK, toBlock: latestBlock });
  const approvalMarkets = [...new Set(approvalLogs.map((log) => log.args.market as Address))].filter(Boolean);
  const approvals = await Promise.all(approvalMarkets.map(async (market) => ({ market, approved: await read(legacy.registry, "approvedMarkets", [market]) })));
  const globalPaused = await read(legacy.riskGuard, "globalPaused");
  const adapterPaused = await read(legacy.riskGuard, "adapterPaused", [adapterId]);
  return {
    chainId: MAINNET_CHAIN_ID,
    blockNumber: latestBlock,
    legacy,
    owner: await read(legacy.registry, "owner"),
    pendleRouter: await read(legacy.registry, "pendleRouter"),
    adapter,
    globalPaused,
    adapterPaused,
    markets,
    approvals,
    roles: rolesSnapshot,
  };
}

async function roleMembers(role: Hex, latestBlock: bigint): Promise<Address[]> {
  const granted = await publicClient.getLogs({ address: legacy.accessManager, event: roleGrantedEvent, fromBlock: LEGACY_DEPLOYMENT_BLOCK, toBlock: latestBlock });
  const revoked = await publicClient.getLogs({ address: legacy.accessManager, event: roleRevokedEvent, fromBlock: LEGACY_DEPLOYMENT_BLOCK, toBlock: latestBlock });
  const accounts = [...new Set([
    ...granted.filter((log) => log.args.role?.toLowerCase() === role.toLowerCase()).map((log) => log.args.account as Address),
    ...revoked.filter((log) => log.args.role?.toLowerCase() === role.toLowerCase()).map((log) => log.args.account as Address),
  ])];
  const active = await Promise.all(accounts.map(async (account) => ({ account, active: await read(legacy.accessManager, "hasRole", [role, account]) })));
  return active.filter((item) => item.active).map((item) => item.account);
}

async function send(
  walletClient: ReturnType<typeof createWalletClient>,
  address: Address,
  functionName: string,
  args: readonly unknown[],
): Promise<Hex> {
  const hash = await walletClient.writeContract({ address, abi, functionName: functionName as never, args: args as never, account: walletClient.account!, chain: robinhoodChain });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${functionName} transaction reverted: ${hash}`);
  console.log(`${functionName} confirmed: ${hash}`);
  return hash;
}

async function main(): Promise<void> {
  if (process.argv.includes("--testnet")) throw new Error("This migration runner is Mainnet-only.");
  const broadcast = readBroadcast();
  const deployments = readDeployments(broadcast);
  const actualChainId = await publicClient.getChainId();
  if (actualChainId !== MAINNET_CHAIN_ID) throw new Error(`Refusing migration on chain ${actualChainId}; expected 4663.`);
  const privateKey = process.env.MAINNET_DEPLOYER_PRIVATE_KEY;
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) throw new Error("MAINNET_DEPLOYER_PRIVATE_KEY is required and must be a 32-byte key.");
  const account = privateKeyToAccount(privateKey as Hex);
  const owner = await read(legacy.registry, "owner") as Address;
  if (!sameAddress(owner, account.address)) throw new Error("Mainnet migration key is not the legacy registry owner.");
  const snapshot = await snapshotLegacy();
  mkdirSync(snapshotDir, { recursive: true });
  writeFileSync(snapshotPath, JSON.stringify(serialize(snapshot), null, 2) + "\n", "utf8");
  console.log(`Legacy Mainnet snapshot written to ${snapshotPath}`);
  console.log(`Legacy market records: ${snapshot.markets.length}`);

  const newAdapter = await readAdapter(deployments.YeltraAdapterRegistry, adapterId);
  const pending: Array<{ address: Address; functionName: string; args: readonly unknown[] }> = [];
  const oldPendleRouter = snapshot.pendleRouter as Address;
  if (!sameAddress(oldPendleRouter, "0x0000000000000000000000000000000000000000") && !sameAddress(oldPendleRouter, await read(deployments.YeltraRegistry, "pendleRouter") as Address)) {
    pending.push({ address: deployments.YeltraRegistry, functionName: "setPendleRouter", args: [oldPendleRouter] });
  }
  const oldAdapter = snapshot.adapter;
  if (!sameAddress(newAdapter.router, oldAdapter.router) || newAdapter.chainId !== oldAdapter.chainId || newAdapter.enabled !== oldAdapter.enabled) {
    pending.push({ address: deployments.YeltraAdapterRegistry, functionName: "registerAdapter", args: [adapterId, oldAdapter.protocolId, oldAdapter.router, oldAdapter.chainId] });
    if (!oldAdapter.enabled) pending.push({ address: deployments.YeltraAdapterRegistry, functionName: "setAdapterEnabled", args: [adapterId, false] });
  }
  for (const item of snapshot.markets) {
    const current = await readMarket(deployments.YeltraMarketRegistry, item.marketId);
    if (!sameMarket(current, item.config)) {
      pending.push({ address: deployments.YeltraMarketRegistry, functionName: "registerMarket", args: [item.marketId, item.config.adapterId, item.config.market, item.config.pt, item.config.yt, item.config.sy, item.config.underlying, item.config.maturity, item.config.chainId] });
      if (!item.config.enabled) pending.push({ address: deployments.YeltraMarketRegistry, functionName: "setMarketEnabled", args: [item.marketId, false] });
    }
    const paused = await read(deployments.YeltraRiskGuard, "marketPaused", [item.marketId]);
    if (paused !== item.paused) pending.push({ address: deployments.YeltraRiskGuard, functionName: "setMarketPause", args: [item.marketId, item.paused] });
  }
  const newGlobalPaused = await read(deployments.YeltraRiskGuard, "globalPaused");
  if (newGlobalPaused !== snapshot.globalPaused) pending.push({ address: deployments.YeltraRiskGuard, functionName: "setGlobalPause", args: [snapshot.globalPaused] });
  const newAdapterPaused = await read(deployments.YeltraRiskGuard, "adapterPaused", [adapterId]);
  if (newAdapterPaused !== snapshot.adapterPaused) pending.push({ address: deployments.YeltraRiskGuard, functionName: "setAdapterPause", args: [adapterId, snapshot.adapterPaused] });
  for (const approval of snapshot.approvals) {
    if (approval.approved && !(await read(deployments.YeltraRegistry, "approvedMarkets", [approval.market]))) {
      pending.push({ address: deployments.YeltraRegistry, functionName: "setMarketApproval", args: [approval.market, true] });
    }
  }
  for (const item of snapshot.roles) {
    for (const member of item.members) {
      if (!(await read(deployments.YeltraAccessManager, "hasRole", [item.role, member]))) {
        pending.push({ address: deployments.YeltraAccessManager, functionName: "grantRole", args: [item.role, member] });
      }
    }
  }

  if (!process.argv.includes("--broadcast")) {
    console.log(`Dry run only: ${pending.length} Mainnet configuration transactions would be sent.`);
    return;
  }
  const walletClient = createWalletClient({ account, chain: robinhoodChain, transport: http(rpcUrl) });
  for (const transaction of pending) await send(walletClient, transaction.address, transaction.functionName, transaction.args);
  console.log(`YELTRA Mainnet configuration complete: ${pending.length} transactions confirmed.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "YELTRA Mainnet migration failed.");
  process.exitCode = 1;
});

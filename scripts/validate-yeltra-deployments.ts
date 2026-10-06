import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient,
  http,
  keccak256,
  parseAbi,
  parseAbiItem,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { robinhoodChain, robinhoodChainTestnet } from "../lib/web3/chains";

type NetworkName = "testnet" | "mainnet";
type JsonObject = Record<string, unknown>;
type DeploymentAddresses = Record<string, Address>;
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

const repoDir = process.cwd();
const network = process.argv.includes("--mainnet") ? "mainnet" : "testnet";
const chainId = network === "mainnet" ? 4663 : 46630;
const rpcUrl = network === "mainnet"
  ? "https://rpc.mainnet.chain.robinhood.com"
  : "https://rpc.testnet.chain.robinhood.com";

if (!rpcUrl) throw new Error(`Missing RPC URL for ${network}.`);

const client = createPublicClient({
  chain: network === "mainnet" ? robinhoodChain : robinhoodChainTestnet,
  transport: http(rpcUrl),
});

const moduleAbi = parseAbi([
  "function accessManager() view returns (address)",
  "function adapterRegistry() view returns (address)",
  "function marketRegistry() view returns (address)",
  "function riskGuard() view returns (address)",
  "function executionRouter() view returns (address)",
  "function lifecycleManager() view returns (address)",
  "function owner() view returns (address)",
  "function pendleRouter() view returns (address)",
  "function globalPaused() view returns (bool)",
  "function marketPaused(bytes32) view returns (bool)",
  "function adapterPaused(bytes32) view returns (bool)",
  "function hasRole(bytes32,address) view returns (bool)",
  "function getAdapter(bytes32) view returns (bytes32 protocolId,address router,uint256 chainId,bool enabled)",
  "function getMarket(bytes32) view returns (bytes32 adapterId,address market,address pt,address yt,address sy,address underlying,uint256 maturity,uint256 chainId,bool enabled)",
  "function isAdapterEnabled(bytes32) view returns (bool)",
  "function isMarketSupported(bytes32) view returns (bool)",
  "function validateExecution(bytes32) view returns (bool allowed,bytes32 adapterId,address externalRouter)",
  "function getProtocolModules() view returns (address registry,address accessManager,address adapterRegistry,address marketRegistry,address riskGuard,address executionRouter,address lifecycleManager)",
]);
const marketRegisteredEvent = parseAbiItem(
  "event MarketRegistered(bytes32 indexed marketId, bytes32 indexed adapterId, address indexed market, uint256 chainId, uint256 maturity)",
);
const roleGrantedEvent = parseAbiItem(
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
);
const roleRevokedEvent = parseAbiItem(
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
);

const legacy = {
  registry: "0xaa58afad613b2048ef526325c6989ec74703152b" as Address,
  accessManager: "0x8ba198d9275c65ee208eadd22084f38d0f193395" as Address,
  adapterRegistry: "0xc6a3d3e37f917f971d73f3aa4ec4019a04cb7cac" as Address,
  marketRegistry: "0xf48ac38c6a4342135c3ff4e45c4cd750576fe8e7" as Address,
  riskGuard: "0x4f3e119ddcd8d12b57b7c5b856f40ff85544913b" as Address,
};
const legacyDeploymentBlock = BigInt(79841471);
const pendleAdapterId = stringToHex("PENDLE", { size: 32 });
const roles = {
  admin: keccak256(stringToHex("CLEAVE_ADMIN")),
  operator: keccak256(stringToHex("CLEAVE_OPERATOR")),
  guardian: keccak256(stringToHex("CLEAVE_GUARDIAN")),
};

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function readBroadcast(path: string): JsonObject {
  const broadcast = JSON.parse(readFileSync(path, "utf8")) as JsonObject;
  if (Number(broadcast.chain) !== chainId) throw new Error(`Broadcast ${path} is not for chain ${chainId}.`);
  return broadcast;
}

function readDeployments(broadcast: JsonObject): DeploymentAddresses {
  const transactions = Array.isArray(broadcast.transactions) ? broadcast.transactions.map(asObject) : [];
  const names = [
    "YeltraRegistry",
    "YeltraAccessManager",
    "YeltraAdapterRegistry",
    "YeltraMarketRegistry",
    "YeltraRiskGuard",
    "YeltraExecutionRouter",
    "YeltraLifecycleManager",
    "YeltraLens",
  ];
  const deployments: DeploymentAddresses = {};
  for (const name of names) {
    const transaction = transactions.find((item) => item.transactionType === "CREATE" && item.contractName === name);
    const address = transaction?.contractAddress;
    if (typeof address !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      throw new Error(`Broadcast contains no valid ${name} deployment.`);
    }
    deployments[name] = address as Address;
  }
  return deployments;
}

function broadcastStartBlock(broadcast: JsonObject): bigint {
  const receipts = Array.isArray(broadcast.receipts) ? broadcast.receipts.map(asObject) : [];
  const blocks = receipts
    .map((receipt) => receipt.blockNumber)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.startsWith("0x") ? BigInt(value) : BigInt(value));
  if (blocks.length === 0) throw new Error("YELTRA broadcast contains no receipts.");
  return blocks.reduce((lowest, value) => value < lowest ? value : lowest, blocks[0]);
}

function tupleValue(value: unknown, index: number, key: string): unknown {
  if (Array.isArray(value)) return value[index];
  return asObject(value)[key];
}

async function read(address: Address, functionName: string, args: readonly unknown[] = []): Promise<unknown> {
  return client.readContract({
    address,
    abi: moduleAbi,
    functionName: functionName as never,
    args: args as never,
  }) as Promise<unknown>;
}

function normalize(value: string): string {
  return value.toLowerCase();
}

function requireEqual(label: string, actual: unknown, expected: unknown): void {
  const left = typeof actual === "string" ? normalize(actual) : actual;
  const right = typeof expected === "string" ? normalize(expected) : expected;
  if (left !== right) throw new Error(`${label} mismatch: ${String(actual)} != ${String(expected)}`);
}

function requireTrue(label: string, value: unknown): void {
  if (value !== true) throw new Error(`${label} is not true.`);
}

async function marketLogs(address: Address, fromBlock: bigint) {
  return client.getLogs({ address, event: marketRegisteredEvent, fromBlock });
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

function compareMarket(id: Hex, oldMarket: MarketConfig, newMarket: MarketConfig): void {
  requireEqual(`${id} adapter`, newMarket.adapterId, oldMarket.adapterId);
  requireEqual(`${id} market`, newMarket.market, oldMarket.market);
  requireEqual(`${id} PT`, newMarket.pt, oldMarket.pt);
  requireEqual(`${id} YT`, newMarket.yt, oldMarket.yt);
  requireEqual(`${id} SY`, newMarket.sy, oldMarket.sy);
  requireEqual(`${id} underlying`, newMarket.underlying, oldMarket.underlying);
  requireEqual(`${id} maturity`, newMarket.maturity, oldMarket.maturity);
  requireEqual(`${id} chainId`, newMarket.chainId, oldMarket.chainId);
  requireEqual(`${id} enabled`, newMarket.enabled, oldMarket.enabled);
}

async function validateRoleSet(accessManager: Address, deployer: Address): Promise<void> {
  requireTrue("admin role", await read(accessManager, "hasRole", [roles.admin, deployer]));
  requireTrue("operator role", await read(accessManager, "hasRole", [roles.operator, deployer]));
  requireTrue("guardian role", await read(accessManager, "hasRole", [roles.guardian, deployer]));
}

async function main(): Promise<void> {
  const actualChainId = await client.getChainId();
  requireEqual("chainId", actualChainId, chainId);
  const broadcastName = network === "mainnet" ? "DeployYeltraMainnet.s.sol" : "DeployYeltraTestnet.s.sol";
  const broadcast = readBroadcast(join(repoDir, "contracts", "broadcast", broadcastName, String(chainId), "run-latest.json"));
  const deployments = readDeployments(broadcast);
  const firstCreation = (Array.isArray(broadcast.transactions) ? broadcast.transactions.map(asObject) : [])
    .find((item) => item.transactionType === "CREATE");
  const deployerValue = asObject(firstCreation?.transaction).from;
  if (typeof deployerValue !== "string") throw new Error("YELTRA broadcast contains no deployer address.");
  const deployer = deployerValue as Address;

  for (const [name, address] of Object.entries(deployments)) {
    const bytecode = await client.getBytecode({ address });
    if (!bytecode || bytecode === "0x") throw new Error(`${name} has no deployed bytecode at ${address}.`);
  }

  const registry = deployments.YeltraRegistry;
  const accessManager = deployments.YeltraAccessManager;
  const adapterRegistry = deployments.YeltraAdapterRegistry;
  const marketRegistry = deployments.YeltraMarketRegistry;
  const riskGuard = deployments.YeltraRiskGuard;
  const executionRouter = deployments.YeltraExecutionRouter;
  const lifecycleManager = deployments.YeltraLifecycleManager;
  const lens = deployments.YeltraLens;

  requireEqual("registry owner", await read(registry, "owner"), deployer);
  await validateRoleSet(accessManager, deployer);
  requireEqual("adapter access manager", await read(adapterRegistry, "accessManager"), accessManager);
  requireEqual("market access manager", await read(marketRegistry, "accessManager"), accessManager);
  requireEqual("market adapter registry", await read(marketRegistry, "adapterRegistry"), adapterRegistry);
  requireEqual("risk access manager", await read(riskGuard, "accessManager"), accessManager);
  requireEqual("router access manager", await read(executionRouter, "accessManager"), accessManager);
  requireEqual("router adapter registry", await read(executionRouter, "adapterRegistry"), adapterRegistry);
  requireEqual("router market registry", await read(executionRouter, "marketRegistry"), marketRegistry);
  requireEqual("router risk guard", await read(executionRouter, "riskGuard"), riskGuard);
  requireEqual("lifecycle market registry", await read(lifecycleManager, "marketRegistry"), marketRegistry);

  const modules = await read(lens, "getProtocolModules");
  const moduleKeys = ["registry", "accessManager", "adapterRegistry", "marketRegistry", "riskGuard", "executionRouter", "lifecycleManager"];
  const moduleValues = [registry, accessManager, adapterRegistry, marketRegistry, riskGuard, executionRouter, lifecycleManager];
  moduleKeys.forEach((key, index) => requireEqual(`lens ${key}`, tupleValue(modules, index, key), moduleValues[index]));
  requireTrue("global pause", (await read(riskGuard, "globalPaused")) === false);

  const newLogs = await marketLogs(marketRegistry, broadcastStartBlock(broadcast));
  const newMarketIds = newLogs.map((log) => (log.args as { marketId: Hex }).marketId);
  const newAdapter = await read(adapterRegistry, "getAdapter", [pendleAdapterId]);
  const newAdapterRouter = tupleValue(newAdapter, 1, "router");
  const newAdapterChainId = tupleValue(newAdapter, 2, "chainId");
  const newAdapterEnabled = tupleValue(newAdapter, 3, "enabled");

  if (network === "testnet") {
    requireEqual("Testnet registry Pendle router", await read(registry, "pendleRouter"), "0x0000000000000000000000000000000000000000");
    requireEqual("Testnet adapter enabled", newAdapterEnabled, false);
    requireEqual("Testnet market count", newMarketIds.length, 0);
    console.log(`YELTRA Testnet validation passed: ${Object.keys(deployments).length} contracts, 0 adapters, 0 markets.`);
    return;
  }

  const oldLogs = await marketLogs(legacy.marketRegistry, legacyDeploymentBlock);
  requireEqual("Mainnet market count", newMarketIds.length, oldLogs.length);
  const oldAdapter = await read(legacy.adapterRegistry, "getAdapter", [pendleAdapterId]);
  requireEqual("Mainnet adapter router", newAdapterRouter, tupleValue(oldAdapter, 1, "router"));
  requireEqual("Mainnet adapter chainId", newAdapterChainId, tupleValue(oldAdapter, 2, "chainId"));
  requireEqual("Mainnet adapter enabled", newAdapterEnabled, tupleValue(oldAdapter, 3, "enabled"));
  requireEqual("Mainnet registry Pendle router", await read(registry, "pendleRouter"), await read(legacy.registry, "pendleRouter"));

  for (const log of oldLogs) {
    const args = log.args as { marketId: Hex };
    const oldMarket = await readMarket(legacy.marketRegistry, args.marketId);
    const newMarket = await readMarket(marketRegistry, args.marketId);
    compareMarket(args.marketId, oldMarket, newMarket);
    requireTrue(`${args.marketId} supported`, await read(marketRegistry, "isMarketSupported", [args.marketId]));
    const validation = await read(executionRouter, "validateExecution", [args.marketId]);
    requireTrue(`${args.marketId} execution`, tupleValue(validation, 0, "allowed"));
  }

  console.log(`YELTRA Mainnet validation passed: ${Object.keys(deployments).length} contracts, ${newMarketIds.length} markets, adapter state matched legacy.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "YELTRA deployment validation failed.");
  process.exitCode = 1;
});

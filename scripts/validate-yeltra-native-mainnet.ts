import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient,
  http,
  keccak256,
  parseAbi,
  stringToHex,
  type Address,
} from "viem";
import { robinhoodChain } from "../lib/web3/chains";

const CHAIN_ID = 4663;
const RPC_URL = process.env.ROBINHOOD_MAINNET_RPC_URL?.trim()
  || process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL?.trim()
  || "https://rpc.mainnet.chain.robinhood.com";
const config = JSON.parse(
  readFileSync(join(process.cwd(), "contracts", "config", "yeltra-native-mainnet.json"), "utf8"),
) as { marketIdLabel: string; sourceVault: Address; underlying: Address };

const abi = parseAbi([
  "function factory() view returns (address)",
  "function accessManager() view returns (address)",
  "function registry() view returns (address)",
  "function router() view returns (address)",
  "function approvedSources(address) view returns (bool)",
  "function getMarket(bytes32) view returns (address market,address pt,address yt,address underlying,address sourceAdapter,uint256 maturity,uint256 chainId,uint8 underlyingDecimals,uint256 createdAt,uint256 createdBlock,bool enabled,bool paused)",
  "function isMarketActive(bytes32) view returns (bool)",
  "function sourceAdapter() view returns (address)",
  "function underlying() view returns (address)",
  "function pt() view returns (address)",
  "function yt() view returns (address)",
  "function maturity() view returns (uint256)",
  "function asset() view returns (address)",
  "function market() view returns (address)",
  "function vault() view returns (address)",
  "function controller() view returns (address)",
  "function shareDecimals() view returns (uint8)",
  "function decimals() view returns (uint8)",
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
]);

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(RPC_URL),
});

function requiredAddress(name: string): Address {
  const value = process.env[name]?.trim();
  if (!value || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`${name} is required after the native canary is deployed.`);
  }
  return value as Address;
}

function tupleValue(value: unknown, index: number, key: string): unknown {
  if (Array.isArray(value)) return value[index];
  if (value !== null && typeof value === "object") return (value as Record<string, unknown>)[key];
  return undefined;
}

function sameAddress(actual: unknown, expected: Address): boolean {
  return typeof actual === "string" && actual.toLowerCase() === expected.toLowerCase();
}

async function read(address: Address, functionName: string, args: readonly unknown[] = []): Promise<unknown> {
  return client.readContract({
    address,
    abi,
    functionName: functionName as never,
    args: args as never,
  }) as Promise<unknown>;
}

async function main(): Promise<void> {
  if (await client.getChainId() !== CHAIN_ID) throw new Error("RPC is not Robinhood Chain Mainnet 4663.");

  const registry = requiredAddress("YELTRA_NATIVE_REGISTRY");
  const factory = requiredAddress("YELTRA_NATIVE_FACTORY");
  const router = requiredAddress("YELTRA_NATIVE_ROUTER");
  const market = requiredAddress("YELTRA_NATIVE_MARKET");
  const pt = requiredAddress("YELTRA_NATIVE_PT");
  const yt = requiredAddress("YELTRA_NATIVE_YT");
  const adapter = requiredAddress("YELTRA_NATIVE_ADAPTER");
  const sourceVault = (process.env.YELTRA_NATIVE_SOURCE_VAULT?.trim() || config.sourceVault) as Address;
  const underlying = (process.env.YELTRA_NATIVE_UNDERLYING?.trim() || config.underlying) as Address;
  const marketId = (process.env.YELTRA_NATIVE_MARKET_ID?.trim() || keccak256(stringToHex(config.marketIdLabel))) as `0x${string}`;

  for (const [label, address] of Object.entries({ registry, factory, router, market, pt, yt, adapter })) {
    const code = await client.getBytecode({ address });
    if (!code || code === "0x") throw new Error(`${label} has no bytecode at ${address}.`);
  }

  const configValue = await read(registry, "getMarket", [marketId]);
  const active = await read(registry, "isMarketActive", [marketId]);
  const registryFactory = await read(registry, "factory");
  if (!sameAddress(registryFactory, factory)) throw new Error("Registry factory mismatch.");
  if (!sameAddress(tupleValue(configValue, 0, "market"), market)) throw new Error("Registry market mismatch.");
  if (!sameAddress(tupleValue(configValue, 1, "pt"), pt)) throw new Error("Registry PT mismatch.");
  if (!sameAddress(tupleValue(configValue, 2, "yt"), yt)) throw new Error("Registry YT mismatch.");
  if (!sameAddress(tupleValue(configValue, 3, "underlying"), underlying)) throw new Error("Registry underlying mismatch.");
  if (!sameAddress(tupleValue(configValue, 4, "sourceAdapter"), adapter)) throw new Error("Registry adapter mismatch.");
  if (tupleValue(configValue, 6, "chainId") !== BigInt(CHAIN_ID)) throw new Error("Registry chainId mismatch.");
  if (tupleValue(configValue, 10, "enabled") !== true || tupleValue(configValue, 11, "paused") !== false) {
    throw new Error("Native market is disabled or paused.");
  }

  if (!sameAddress(await read(factory, "registry"), registry)) throw new Error("Factory registry mismatch.");
  if (!sameAddress(await read(factory, "router"), router)) throw new Error("Factory router mismatch.");
  if (await read(factory, "approvedSources", [sourceVault]) !== true) throw new Error("Source vault is not approved.");
  if (!sameAddress(await read(router, "registry"), registry)) throw new Error("Router registry mismatch.");
  if (!sameAddress(await read(market, "sourceAdapter"), adapter)) throw new Error("Market adapter mismatch.");
  if (!sameAddress(await read(market, "underlying"), underlying)) throw new Error("Market underlying mismatch.");
  if (!sameAddress(await read(market, "pt"), pt)) throw new Error("Market PT mismatch.");
  if (!sameAddress(await read(market, "yt"), yt)) throw new Error("Market YT mismatch.");
  if (!sameAddress(await read(market, "router"), router)) throw new Error("Market router mismatch.");
  if (!sameAddress(await read(adapter, "market"), market)) throw new Error("Adapter market mismatch.");
  if (!sameAddress(await read(adapter, "vault"), sourceVault)) throw new Error("Adapter vault mismatch.");
  if (!sameAddress(await read(adapter, "asset"), underlying)) throw new Error("Adapter asset mismatch.");
  if (!sameAddress(await read(sourceVault, "asset"), underlying)) throw new Error("Vault asset mismatch.");
  if (!sameAddress(await read(pt, "market"), market)) throw new Error("PT market mismatch.");
  if (!sameAddress(await read(yt, "market"), market)) throw new Error("YT market mismatch.");
  if (!sameAddress(await read(pt, "controller"), factory)) throw new Error("PT controller mismatch.");
  if (!sameAddress(await read(yt, "controller"), factory)) throw new Error("YT controller mismatch.");

  console.log(`YELTRA native Mainnet canary validated on chain ${CHAIN_ID}.`);
  console.log(`Registry: ${registry}`);
  console.log(`Market: ${market}`);
  console.log(`PT / YT: ${pt} / ${yt}`);
  console.log(`Source vault / asset: ${sourceVault} / ${underlying}`);
  console.log(`Active before maturity: ${active ? "YES" : "NO"}`);
  console.log(`Source assets / shares: ${String(await read(adapter, "totalAssets"))} / ${String(await read(sourceVault, "totalSupply"))}`);
  console.log(`No writes sent. Validation is read-only.`);
}

await main();

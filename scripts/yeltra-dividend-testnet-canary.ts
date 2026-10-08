import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  stringToBytes,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { robinhoodChainTestnet } from "../lib/web3/chains";

const CHAIN_ID = 46630;
const TESTNET_RPC =
  process.env.ROBINHOOD_TESTNET_RPC_URL?.trim() ||
  process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL?.trim() ||
  "https://rpc.testnet.chain.robinhood.com";
const ACCESS_MANAGER =
  process.env.YELTRA_DIVIDEND_ACCESS_MANAGER?.trim() ||
  "0x3aab079e0017af37c15c7ab11e319995cf426097";
const REGISTRY = process.env.NEXT_PUBLIC_YELTRA_DIVIDEND_REGISTRY_TESTNET?.trim();
const LENS = process.env.NEXT_PUBLIC_YELTRA_DIVIDEND_LENS_TESTNET?.trim();
const SOURCE_ADAPTER = process.env.YELTRA_DIVIDEND_TESTNET_SOURCE_ADAPTER?.trim();
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY?.trim();
const mode = process.argv[2] || "status";

const MARKET_ID = stringToHex("NVDA-TRADING-YIELD", { size: 32 });
const UNDERLYING = "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec" as Address;
const TEST_EVENT_ID = keccak256(stringToBytes("YELTRA-TESTNET-NVDA-DIVIDEND-1"));
const TEST_POSITION_ID = keccak256(stringToBytes("YELTRA-TESTNET-NVDA-POSITION-1"));

const registryAbi = [
  {
    type: "function",
    name: "accounting",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "getMarket",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [
      {
        name: "market",
        type: "tuple",
        components: [
          { name: "underlying", type: "address" },
          { name: "sourceAdapter", type: "address" },
          { name: "protocolFeeBps", type: "uint16" },
          { name: "lastRateBaseUnits", type: "uint256" },
          { name: "lastRateDecimals", type: "uint8" },
          { name: "lastEventId", type: "bytes32" },
          { name: "lastEventTimestamp", type: "uint64" },
          { name: "lastSequence", type: "uint64" },
          { name: "enabled", type: "bool" },
          { name: "paused", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "configureMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "underlying", type: "address" },
      { name: "sourceAdapter", type: "address" },
      { name: "exposureDecimals", type: "uint8" },
      { name: "rewardDecimals", type: "uint8" },
      { name: "protocolFeeBps", type: "uint16" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "registerPosition",
    stateMutability: "nonpayable",
    inputs: [
      { name: "positionId", type: "bytes32" },
      { name: "marketId", type: "bytes32" },
      { name: "owner", type: "address" },
      { name: "exposureBaseUnits", type: "uint256" },
      { name: "openedAt", type: "uint64" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "processDividend",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "eventId", type: "bytes32" },
      { name: "underlying", type: "address" },
      { name: "rateBaseUnits", type: "uint256" },
      { name: "rateDecimals", type: "uint8" },
      { name: "processedAt", type: "uint64" },
      { name: "sequence", type: "uint64" },
    ],
    outputs: [],
  },
] as const;

const accountingAbi = [
  {
    type: "function",
    name: "getPosition",
    stateMutability: "view",
    inputs: [{ name: "positionId", type: "bytes32" }],
    outputs: [
      {
        name: "position",
        type: "tuple",
        components: [
          { name: "marketId", type: "bytes32" },
          { name: "owner", type: "address" },
          { name: "exposureBaseUnits", type: "uint256" },
          { name: "lastIndex", type: "uint256" },
          { name: "accruedBaseUnits", type: "uint256" },
          { name: "openedAt", type: "uint64" },
          { name: "enabled", type: "bool" },
          { name: "closed", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "enablePosition",
    stateMutability: "nonpayable",
    inputs: [
      { name: "positionId", type: "bytes32" },
      { name: "enabled", type: "bool" },
    ],
    outputs: [],
  },
] as const;

const lensAbi = [
  {
    type: "function",
    name: "dividendState",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "positionId", type: "bytes32" },
    ],
    outputs: [
      {
        name: "state",
        type: "tuple",
        components: [
          { name: "eligible", type: "bool" },
          { name: "enabled", type: "bool" },
          { name: "status", type: "uint8" },
          { name: "underlying", type: "address" },
          { name: "sourceAdapter", type: "address" },
          { name: "currentRateBaseUnits", type: "uint256" },
          { name: "currentRateDecimals", type: "uint8" },
          { name: "accruedBaseUnits", type: "uint256" },
          { name: "lastEventId", type: "bytes32" },
          { name: "lastEventTimestamp", type: "uint64" },
          { name: "settlementEnabled", type: "bool" },
        ],
      },
    ],
  },
] as const;

function address(value: string | undefined, name: string): Address {
  if (!value || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`${name} is required and must be a 20-byte address.`);
  }
  return value as Address;
}

function printLine(label: string, value: string): void {
  console.log(`${label.padEnd(28, " ")}${value}`);
}

function requireDeployment(): { registry: Address; lens: Address } {
  return {
    registry: address(REGISTRY, "NEXT_PUBLIC_YELTRA_DIVIDEND_REGISTRY_TESTNET"),
    lens: address(LENS, "NEXT_PUBLIC_YELTRA_DIVIDEND_LENS_TESTNET"),
  };
}

function getClients() {
  const publicClient = createPublicClient({
    chain: robinhoodChainTestnet,
    transport: http(TESTNET_RPC),
  });
  if (!PRIVATE_KEY) return { publicClient };
  const account = privateKeyToAccount(PRIVATE_KEY as Hex);
  const walletClient = createWalletClient({
    account,
    chain: robinhoodChainTestnet,
    transport: http(TESTNET_RPC),
  });
  return { publicClient, walletClient, account };
}

async function status(): Promise<void> {
  const { publicClient } = getClients();
  const actualChainId = await publicClient.getChainId();
  console.log("YELTRA DIVIDEND TESTNET CANARY");
  printLine("MODE", "READ-ONLY STATUS");
  printLine("NETWORK", "Robinhood Chain Testnet");
  printLine("CHAIN ID", `${actualChainId} · expected ${CHAIN_ID}`);
  if (actualChainId !== CHAIN_ID) throw new Error("Wrong Robinhood Chain network.");

  if (!REGISTRY || !LENS) {
    printLine("DEPLOYMENT", "NOT CONFIGURED");
    printLine("NEXT STEP", "Broadcast guarded deployment, then add actual addresses");
    return;
  }

  const deployment = requireDeployment();
  const [registryCode, lensCode, accounting] = await Promise.all([
    publicClient.getBytecode({ address: deployment.registry }),
    publicClient.getBytecode({ address: deployment.lens }),
    publicClient.readContract({
      address: deployment.registry,
      abi: registryAbi,
      functionName: "accounting",
    }),
  ]);
  const market = await publicClient.readContract({
    address: deployment.registry,
    abi: registryAbi,
    functionName: "getMarket",
    args: [MARKET_ID],
  });
  const position = await publicClient.readContract({
    address: accounting,
    abi: accountingAbi,
    functionName: "getPosition",
    args: [TEST_POSITION_ID],
  });
  const state = await publicClient.readContract({
    address: deployment.lens,
    abi: lensAbi,
    functionName: "dividendState",
    args: [MARKET_ID, TEST_POSITION_ID],
  });
  printLine("REGISTRY", registryCode && registryCode !== "0x" ? deployment.registry : "NO BYTECODE");
  printLine("ACCOUNTING", accounting);
  printLine("LENS", lensCode && lensCode !== "0x" ? deployment.lens : "NO BYTECODE");
  printLine("MARKET UNDERLYING", market.underlying);
  printLine("MARKET SOURCE", market.sourceAdapter);
  printLine("MARKET ENABLED", String(market.enabled));
  printLine("TEST POSITION OWNER", position.owner);
  printLine("POSITION ENABLED", String(position.enabled));
  printLine("LENS ELIGIBLE", String(state.eligible));
  printLine("LENS STATUS", String(state.status));
  printLine("ACCRUED", `${state.accruedBaseUnits.toString()} base units`);
  printLine("SETTLEMENT", state.settlementEnabled ? "ENABLED" : "SETTLEMENT_NOT_ENABLED");
}

async function runCanary(): Promise<void> {
  const deployment = requireDeployment();
  const confirmation = process.env.YELTRA_DIVIDEND_TESTNET_CANARY_CONFIRMATION?.trim();
  if (confirmation !== "YELTRA_DIVIDEND_TESTNET_CANARY_46630") {
    throw new Error("Set YELTRA_DIVIDEND_TESTNET_CANARY_CONFIRMATION=YELTRA_DIVIDEND_TESTNET_CANARY_46630 to enable Testnet writes.");
  }
  if (process.env.RUN_YELTRA_DIVIDEND_TESTNET_CANARY !== "1") {
    throw new Error("Set RUN_YELTRA_DIVIDEND_TESTNET_CANARY=1 to enable Testnet writes.");
  }
  const sourceAdapter = address(SOURCE_ADAPTER, "YELTRA_DIVIDEND_TESTNET_SOURCE_ADAPTER");
  const { publicClient, walletClient, account } = getClients();
  if (!walletClient || !account) throw new Error("DEPLOYER_PRIVATE_KEY is required for the guarded canary.");
  if ((await publicClient.getChainId()) !== CHAIN_ID) throw new Error("Wrong Robinhood Chain network.");
  if (!(await publicClient.getBytecode({ address: deployment.registry }))) throw new Error("Dividend registry has no bytecode.");

  const existingMarket = await publicClient.readContract({
    address: deployment.registry,
    abi: registryAbi,
    functionName: "getMarket",
    args: [MARKET_ID],
  });
  if (existingMarket.underlying !== "0x0000000000000000000000000000000000000000") {
    throw new Error("NVDA test market is already configured; refusing to overwrite it.");
  }
  const existingAccounting = await publicClient.readContract({
    address: deployment.registry,
    abi: registryAbi,
    functionName: "accounting",
  });
  const existingPosition = await publicClient.readContract({
    address: existingAccounting,
    abi: accountingAbi,
    functionName: "getPosition",
    args: [TEST_POSITION_ID],
  });
  if (existingPosition.owner !== "0x0000000000000000000000000000000000000000") {
    throw new Error("Test position is already registered; refusing to replay the canary.");
  }

  const now = BigInt(Math.floor(Date.now() / 1000));
  const send = async (label: string, request: Parameters<typeof walletClient.writeContract>[0]) => {
    console.log(`${label} · sending guarded Testnet transaction`);
    const hash = await walletClient.writeContract(request);
    console.log(`${label} · ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  };

  console.log("YELTRA DIVIDEND TESTNET CANARY · TEST DATA / SIMULATION");
  printLine("NETWORK", "Robinhood Chain Testnet · 46630");
  printLine("REGISTRY", deployment.registry);
  printLine("LENS", deployment.lens);
  printLine("ACCESS MANAGER", ACCESS_MANAGER);
  printLine("MARKET ID", MARKET_ID);
  printLine("UNDERLYING", UNDERLYING);
  printLine("SOURCE ADAPTER", sourceAdapter);
  printLine("POSITION", TEST_POSITION_ID);
  printLine("EVENT", TEST_EVENT_ID);
  printLine("EXPOSURE", "2.000000000000000000 YT");
  printLine("RATE", "0.25 USD / underlying share");

  await send("1/4 Configure market", {
    account,
    address: deployment.registry,
    abi: registryAbi,
    functionName: "configureMarket",
    args: [MARKET_ID, UNDERLYING, sourceAdapter, 18, 6, 0],
    chain: robinhoodChainTestnet,
  });
  await send("2/4 Register position", {
    account,
    address: deployment.registry,
    abi: registryAbi,
    functionName: "registerPosition",
    args: [TEST_POSITION_ID, MARKET_ID, account.address, BigInt("2000000000000000000"), now],
    chain: robinhoodChainTestnet,
  });
  await send("3/4 Enable Dividend Earn", {
    account,
    address: existingAccounting,
    abi: accountingAbi,
    functionName: "enablePosition",
    args: [TEST_POSITION_ID, true],
    chain: robinhoodChainTestnet,
  });
  await send("4/4 Process test dividend", {
    account,
    address: deployment.registry,
    abi: registryAbi,
    functionName: "processDividend",
    args: [MARKET_ID, TEST_EVENT_ID, UNDERLYING, BigInt(25), 2, now + BigInt(1), BigInt(1)],
    chain: robinhoodChainTestnet,
  });

  await status();
  console.log("FINAL STATUS          TESTNET SIMULATION COMPLETE · SETTLEMENT NOT ENABLED");
}

if (mode === "run") {
  await runCanary();
} else if (mode === "status") {
  await status();
} else {
  throw new Error("Usage: bun scripts/yeltra-dividend-testnet-canary.ts <status|run>");
}

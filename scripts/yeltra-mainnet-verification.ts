import { readFileSync } from "node:fs";
import { join } from "node:path";

export const YELTRA_MAINNET_CHAIN_ID = 4663;
export const YELTRA_MAINNET_RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
export const BLOCKSCOUT_MAINNET_URL = "https://robinhoodchain.blockscout.com";
export const BLOCKSCOUT_MAINNET_API = `${BLOCKSCOUT_MAINNET_URL}/api`;
export const YELTRA_SOLC_VERSION = "v0.8.24+commit.e11b9ed9";

export type VerificationStatus =
  | "VERIFIED"
  | "NOT VERIFIED"
  | "BLOCKED BY BLOCKSCOUT CLOUDFLARE"
  | "UNAVAILABLE";

export type YeltraMainnetContract = {
  name: string;
  address: `0x${string}`;
  identifier: string;
  jsonPath: string;
  constructorArgs: string[];
  constructorArgsEncoded: string;
  sourceJson: string;
};

type JsonObject = Record<string, unknown>;

const repoDir = process.cwd();
const broadcastPath = join(
  repoDir,
  "contracts",
  "broadcast",
  "DeployYeltraMainnet.s.sol",
  String(YELTRA_MAINNET_CHAIN_ID),
  "run-latest.json",
);

const contractAddresses: Readonly<Record<string, `0x${string}`>> = {
  YeltraAccessManager: "0xb12c7112446bfe88d6e82b516f5df90449fa3dc4",
  YeltraRegistry: "0x98ad9f5a69ae5b6400847f98181b4d917d9c32b9",
  YeltraAdapterRegistry: "0x1c6827d9997f224df8b6a356fa5024c1458ac2fe",
  YeltraMarketRegistry: "0x68d468a6b13b1123ff21d21e0f7aaf0a9c8d7e98",
  YeltraRiskGuard: "0x0b40937337dd65bae64c260164e303c6c8184a48",
  YeltraExecutionRouter: "0x51892704370a3b9246de5ba71d572abdf20b42a1",
  YeltraLifecycleManager: "0x3ba49c7d18d0741c1808f46e085c9f049fdfaee2",
  YeltraLens: "0x37a1aa4ce1ab0c05d033ac13d3e51e5f72dfeb82",
};

const contractNames = [
  "YeltraAccessManager",
  "YeltraRegistry",
  "YeltraAdapterRegistry",
  "YeltraMarketRegistry",
  "YeltraRiskGuard",
  "YeltraExecutionRouter",
  "YeltraLifecycleManager",
  "YeltraLens",
] as const;

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing ${label}.`);
  }
  return value;
}

function isCloudflareChallenge(body: string): boolean {
  const normalized = body.toLowerCase();
  return normalized.includes("just a moment") ||
    normalized.includes("cf-chl-") ||
    normalized.includes("cloudflare managed challenge");
}

function parseJson(body: string): JsonObject | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    return asObject(parsed);
  } catch {
    return undefined;
  }
}

export function loadYeltraMainnetContracts(): YeltraMainnetContract[] {
  const broadcast = JSON.parse(readFileSync(broadcastPath, "utf8")) as JsonObject;
  if (Number(broadcast.chain) !== YELTRA_MAINNET_CHAIN_ID) {
    throw new Error(`Refusing verification for chain ${String(broadcast.chain)}.`);
  }
  const transactions = Array.isArray(broadcast.transactions)
    ? broadcast.transactions.map(asObject)
    : [];

  return contractNames.map((name) => {
    const address = contractAddresses[name];
    const transaction = transactions.find(
      (candidate) =>
        candidate.contractName === name && candidate.transactionType === "CREATE",
    );
    if (!transaction) throw new Error(`No ${name} CREATE transaction found.`);

    const broadcastAddress = requireString(
      transaction.contractAddress,
      `${name} broadcast address`,
    );
    if (broadcastAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error(`${name} broadcast address does not match the canonical Mainnet address.`);
    }

    const input = asObject(transaction.transaction).input;
    const artifactPath = join(
      repoDir,
      "contracts",
      "out",
      `${name}.sol`,
      `${name}.json`,
    );
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as {
      bytecode?: { object?: unknown };
    };
    const creationBytecode = requireString(
      artifact.bytecode?.object,
      `${name} artifact creation bytecode`,
    );
    const transactionInput = requireString(input, `${name} broadcast input`);
    if (!transactionInput.startsWith(creationBytecode)) {
      throw new Error(`${name} broadcast input does not match the Foundry artifact bytecode.`);
    }

    const argumentsValue = Array.isArray(transaction.arguments)
      ? transaction.arguments.filter((value): value is string => typeof value === "string")
      : [];
    const constructorArgsEncoded = `0x${transactionInput.slice(creationBytecode.length)}`;
    const jsonPath = join(repoDir, "verification", "mainnet", `${name}.json`);
    const sourceJson = readFileSync(jsonPath, "utf8");

    return {
      name,
      address,
      identifier: `src/${name}.sol:${name}`,
      jsonPath,
      constructorArgs: argumentsValue,
      constructorArgsEncoded,
      sourceJson,
    };
  });
}

type ApiResponse = {
  httpStatus: number;
  body: string;
  json?: JsonObject;
  blocked: boolean;
};

async function requestApi(
  url: string,
  init?: RequestInit,
): Promise<ApiResponse> {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.headers || {}),
    },
  });
  const body = await response.text();
  return {
    httpStatus: response.status,
    body,
    json: parseJson(body),
    blocked: isCloudflareChallenge(body),
  };
}

function statusFromApiResponse(response: ApiResponse): VerificationStatus {
  if (response.blocked) return "BLOCKED BY BLOCKSCOUT CLOUDFLARE";

  const json = response.json;
  if (json) {
    if (json.is_verified === true || json.is_fully_verified === true) return "VERIFIED";
    if (json.is_verified === false || json.is_fully_verified === false) return "NOT VERIFIED";

    const result = json.result;
    if (Array.isArray(result)) {
      const first = asObject(result[0]);
      if (typeof first.SourceCode === "string" && first.SourceCode.length > 0) {
        return "VERIFIED";
      }
      if (typeof first.ABI === "string" && first.ABI !== "Contract source code not verified") {
        return "VERIFIED";
      }
    }
    if (typeof result === "string" && /not verified|does not exist/i.test(result)) {
      return "NOT VERIFIED";
    }
  }

  if (response.httpStatus === 404) return "NOT VERIFIED";
  return "UNAVAILABLE";
}

export async function getVerificationStatus(
  contract: YeltraMainnetContract,
): Promise<VerificationStatus> {
  const v2 = await requestApi(
    `${BLOCKSCOUT_MAINNET_URL}/api/v2/smart-contracts/${contract.address}`,
  );
  const v2Status = statusFromApiResponse(v2);
  if (v2Status !== "UNAVAILABLE") return v2Status;

  const legacy = await requestApi(
    `${BLOCKSCOUT_MAINNET_API}?module=contract&action=getsourcecode&address=${contract.address}`,
  );
  return statusFromApiResponse(legacy);
}

export async function verifyChainId(): Promise<number> {
  const response = await fetch(YELTRA_MAINNET_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_chainId",
      params: [],
    }),
  });
  const payload = asObject(await response.json());
  const result = requireString(payload.result, "RPC chain ID");
  return Number(BigInt(result));
}

export function explorerAddress(contract: YeltraMainnetContract): string {
  return `${BLOCKSCOUT_MAINNET_URL}/address/${contract.address}`;
}

export async function submitVerification(
  contract: YeltraMainnetContract,
): Promise<{ status: VerificationStatus; guid?: string; detail?: string }> {
  const form = new URLSearchParams({
    module: "contract",
    action: "verifysourcecode",
    contractaddress: contract.address,
    codeformat: "solidity-standard-json-input",
    contractname: contract.identifier,
    compilerversion: YELTRA_SOLC_VERSION,
    optimizationUsed: "1",
    runs: "200",
    evmversion: "cancun",
    licenseType: "3",
    constructorArguements: contract.constructorArgsEncoded.slice(2),
    sourceCode: contract.sourceJson,
  });
  const response = await requestApi(BLOCKSCOUT_MAINNET_API, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (response.blocked) {
    return { status: "BLOCKED BY BLOCKSCOUT CLOUDFLARE" };
  }
  const result = response.json?.result;
  if (typeof result !== "string") {
    return {
      status: "UNAVAILABLE",
      detail: response.body.slice(0, 240),
    };
  }
  if (/already verified/i.test(result)) return { status: "VERIFIED", detail: result };
  if (response.json?.status !== "1") return { status: "UNAVAILABLE", detail: result };
  return { status: "UNAVAILABLE", guid: result, detail: result };
}

export async function pollVerification(guid: string): Promise<VerificationStatus> {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await requestApi(
      `${BLOCKSCOUT_MAINNET_API}?module=contract&action=checkverifystatus&guid=${encodeURIComponent(guid)}`,
    );
    if (response.blocked) return "BLOCKED BY BLOCKSCOUT CLOUDFLARE";
    const result = response.json?.result;
    if (typeof result !== "string") return "UNAVAILABLE";
    if (/pass|already verified/i.test(result)) return "VERIFIED";
    if (/fail|error|not verified/i.test(result)) return "NOT VERIFIED";
  }
  return "UNAVAILABLE";
}

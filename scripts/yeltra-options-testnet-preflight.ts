import {
  createPublicClient,
  formatEther,
  formatUnits,
  http,
  keccak256,
  parseAbiItem,
  stringToHex,
  type Address,
} from "viem";
import { robinhoodChainTestnet } from "../lib/web3/chains";
import {
  getOptionsDeployment,
  OPTIONS_TESTNET_CHAIN_ID,
  optionsErc20Abi,
  optionsMarketAbi,
  optionsVaultAbi,
  rateIndexAbi,
} from "../lib/options/options-contract";
import { calculateOptionsFundingPlan } from "../lib/options/options-funding";
import {
  optionsHeader,
  optionsLine,
  optionsSection,
  optionsCheck,
} from "./options-terminal";

const historicalDeploymentSender = "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b" as Address;
const adminRole = keccak256(stringToHex("CLEAVE_ADMIN"));
const operatorRole = keccak256(stringToHex("CLEAVE_OPERATOR"));
const roleGrantedEvent = parseAbiItem(
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
);
const roleRevokedEvent = parseAbiItem(
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
);

const accessAbi = [
  { type: "function", name: "hasRole", stateMutability: "view", inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], outputs: [{ type: "bool" }] },
] as const;

let activePreflightStep = "initialization";

function configuredAddress(value: string | undefined): Address | undefined {
  const candidate = value?.trim();
  return candidate && /^0x[0-9a-fA-F]{40}$/.test(candidate)
    ? candidate as Address
    : undefined;
}

function rawAmount(name: string): bigint | undefined {
  const value = process.env[name]?.trim();
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be a non-negative integer in raw 6-decimal units.`);
  return BigInt(value);
}

function shortError(): string {
  return "RPC read failed or the configured deployment is inconsistent; no data or transaction is fabricated.";
}

async function resolveRoleAccounts(
  client: ReturnType<typeof createPublicClient>,
  manager: Address,
  fromBlock: bigint,
  toBlock: bigint,
  candidates: Address[],
): Promise<{ accounts: Array<{ account: Address; admin: boolean; operator: boolean }>; logsAvailable: boolean }> {
  const addresses = new Set(candidates.map((account) => account.toLowerCase()));
  let logsAvailable = true;
  const chunkSize = BigInt(100_000);
  try {
    for (let start = fromBlock; start <= toBlock; start += chunkSize) {
      const end = start + chunkSize - BigInt(1) > toBlock ? toBlock : start + chunkSize - BigInt(1);
      const [grants, revokes] = await Promise.all([
        client.getLogs({ address: manager, event: roleGrantedEvent, fromBlock: start, toBlock: end }),
        client.getLogs({ address: manager, event: roleRevokedEvent, fromBlock: start, toBlock: end }),
      ]);
      for (const log of [...grants, ...revokes]) {
        if (log.args.account) addresses.add(log.args.account.toLowerCase());
      }
    }
  } catch {
    logsAvailable = false;
  }

  const accounts = await Promise.all([...addresses].map(async (lowercaseAddress) => {
    const account = lowercaseAddress as Address;
    try {
      const [admin, operator] = await Promise.all([
        client.readContract({ address: manager, abi: accessAbi, functionName: "hasRole", args: [adminRole, account] }),
        client.readContract({ address: manager, abi: accessAbi, functionName: "hasRole", args: [operatorRole, account] }),
      ]);
      return { account, admin, operator };
    } catch {
      return { account, admin: false, operator: false };
    }
  }));
  return { accounts: accounts.filter(({ admin, operator }) => admin || operator), logsAvailable };
}

async function main(): Promise<void> {
  await optionsHeader("preflight");
  optionsSection("NETWORK AND CONFIGURATION");

  const rpcUrl = process.env.ROBINHOOD_TESTNET_RPC_URL?.trim()
    || process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL?.trim();
  activePreflightStep = "RPC and configured deployment resolution";
  if (!rpcUrl) throw new Error("Set a Robinhood Chain Testnet RPC endpoint in the local environment.");
  const deployment = getOptionsDeployment(OPTIONS_TESTNET_CHAIN_ID);
  if (!deployment?.collateralToken) throw new Error("Testnet Options addresses are not fully configured.");
  const collateralAddress = deployment.collateralToken as Address;

  const deploymentAddresses = {
    collateralToken: deployment.collateralToken,
    rateIndex: deployment.rateIndex,
    collateralVault: deployment.collateralVault,
    market: deployment.market,
  };
  const configuredAddressesValid = Object.values(deploymentAddresses).every(
    (address) => /^0x[0-9a-fA-F]{40}$/.test(address),
  );
  optionsCheck("Configured Testnet addresses", configuredAddressesValid);
  if (!configuredAddressesValid) throw new Error("One or more configured Options addresses are invalid.");

  const client = createPublicClient({ chain: robinhoodChainTestnet, transport: http(rpcUrl) });
  activePreflightStep = "reading Testnet chain ID and latest block";
  const [chainId, block] = await Promise.all([client.getChainId(), client.getBlock()]);
  optionsLine("Chain ID", String(chainId));
  if (chainId !== OPTIONS_TESTNET_CHAIN_ID) throw new Error(`Expected chain ${OPTIONS_TESTNET_CHAIN_ID}; received ${chainId}.`);

  optionsSection("DEPLOYMENT AND WIRING");
  activePreflightStep = "checking contract bytecode";
  const code = await Promise.all(Object.values(deploymentAddresses).map(async (address) => {
    const bytecode = await client.getBytecode({ address });
    return Boolean(bytecode && bytecode !== "0x");
  }));
  for (const [index, [label, address]] of Object.entries(deploymentAddresses).entries()) {
    optionsLine(label, `${address} · ${code[index] ? "BYTECODE PRESENT" : "NO BYTECODE"}`);
  }
  if (code.some((present) => !present)) throw new Error("At least one supplied address has no deployed bytecode.");

  activePreflightStep = "reading rate index, AccessManager, vault, and token state";
  const [indexManager, currentRate, observedAt, fresh, sourceLabel, maxStaleness,
    vaultManager, vaultToken, vaultMarket, vaultBalance, locked, reserved, available,
    marketIndex, marketVault, marketToken, tokenManager, tokenDecimals, tokenSymbol,
    developmentOnly, totalSupply, nextOptionId] = await Promise.all([
    client.readContract({ address: deployment.rateIndex, abi: rateIndexAbi, functionName: "accessManager" }),
    client.readContract({ address: deployment.rateIndex, abi: rateIndexAbi, functionName: "latestRate" }),
    client.readContract({ address: deployment.rateIndex, abi: rateIndexAbi, functionName: "latestObservedAt" }),
    client.readContract({ address: deployment.rateIndex, abi: rateIndexAbi, functionName: "isFresh" }),
    client.readContract({ address: deployment.rateIndex, abi: rateIndexAbi, functionName: "sourceLabel" }),
    client.readContract({ address: deployment.rateIndex, abi: rateIndexAbi, functionName: "maxStaleness" }),
    client.readContract({ address: deployment.collateralVault, abi: optionsVaultAbi, functionName: "accessManager" }),
    client.readContract({ address: deployment.collateralVault, abi: optionsVaultAbi, functionName: "collateralToken" }),
    client.readContract({ address: deployment.collateralVault, abi: optionsVaultAbi, functionName: "market" }),
    client.readContract({ address: deployment.collateralVault, abi: optionsVaultAbi, functionName: "totalBalance" }),
    client.readContract({ address: deployment.collateralVault, abi: optionsVaultAbi, functionName: "lockedCollateral" }),
    client.readContract({ address: deployment.collateralVault, abi: optionsVaultAbi, functionName: "reservedPayout" }),
    client.readContract({ address: deployment.collateralVault, abi: optionsVaultAbi, functionName: "availableCollateral" }),
    client.readContract({ address: deployment.market, abi: optionsMarketAbi, functionName: "rateIndex" }),
    client.readContract({ address: deployment.market, abi: optionsMarketAbi, functionName: "collateralVault" }),
    client.readContract({ address: deployment.market, abi: optionsMarketAbi, functionName: "collateralToken" }),
    client.readContract({ address: deployment.collateralToken, abi: optionsErc20Abi, functionName: "accessManager" }),
    client.readContract({ address: deployment.collateralToken, abi: optionsErc20Abi, functionName: "decimals" }),
    client.readContract({ address: deployment.collateralToken, abi: optionsErc20Abi, functionName: "symbol" }),
    client.readContract({ address: deployment.collateralToken, abi: optionsErc20Abi, functionName: "DEVELOPMENT_ONLY" }),
    client.readContract({ address: deployment.collateralToken, abi: optionsErc20Abi, functionName: "totalSupply" }),
    client.readContract({ address: deployment.market, abi: optionsMarketAbi, functionName: "nextOptionId" }),
  ]);

  const wiringMatches = indexManager.toLowerCase() === vaultManager.toLowerCase()
    && indexManager.toLowerCase() === tokenManager.toLowerCase()
    && vaultToken.toLowerCase() === deployment.collateralToken.toLowerCase()
    && vaultMarket.toLowerCase() === deployment.market.toLowerCase()
    && marketIndex.toLowerCase() === deployment.rateIndex.toLowerCase()
    && marketVault.toLowerCase() === deployment.collateralVault.toLowerCase()
    && marketToken.toLowerCase() === deployment.collateralToken.toLowerCase()
    && tokenDecimals === 6
    && tokenSymbol === "yDEVUSD"
    && developmentOnly;
  optionsCheck("Registry-free contract and token wiring", wiringMatches);
  if (!wiringMatches) throw new Error("Options contract wiring or development token marker does not match.");

  optionsSection("RATE INDEX · DEVELOPMENT DATA ONLY");
  optionsLine("Source label", sourceLabel);
  optionsLine("Rate", `${formatUnits(currentRate, 16)}% · 1e18 scale`);
  optionsLine("Observed at", `${observedAt} · ${fresh ? "FRESH" : "STALE"}`);
  optionsLine("Maximum staleness", `${maxStaleness} seconds`);
  optionsLine("Settlement source", "OPERATOR-PUBLISHED DEVELOPMENT INPUT · NOT A VERIFIED ORACLE");

  optionsSection("COLLATERAL AND EXISTING OBLIGATIONS");
  activePreflightStep = "reconciling open positions and collateral obligations";
  const [callNotional, putNotional] = [
    rawAmount("YELTRA_OPTIONS_CALL_NOTIONAL_TESTNET"),
    rawAmount("YELTRA_OPTIONS_PUT_NOTIONAL_TESTNET"),
  ];
  const decimals = Number(tokenDecimals);
  const derivedAvailable = vaultBalance > locked + reserved ? vaultBalance - locked - reserved : BigInt(0);
  optionsLine("Token supply", `${formatUnits(totalSupply, decimals)} ${tokenSymbol}`);
  optionsLine("Vault balance", `${formatUnits(vaultBalance, decimals)} ${tokenSymbol}`);
  optionsLine("Open locked collateral", `${formatUnits(locked, decimals)} ${tokenSymbol}`);
  optionsLine("Settled reserved payout", `${formatUnits(reserved, decimals)} ${tokenSymbol}`);
  optionsLine("Available collateral", `${formatUnits(available, decimals)} ${tokenSymbol}`);
  optionsCheck("Vault accounting", derivedAvailable === available);
  if (derivedAvailable !== available) throw new Error("Vault's availableCollateral does not reconcile with balance and liabilities.");

  let observedOpenNotional = BigInt(0);
  let observedReservedPayout = BigInt(0);
  let observedOpenCount = 0;
  const optionCount = nextOptionId > BigInt(0) ? nextOptionId - BigInt(1) : BigInt(0);
  if (optionCount > BigInt(1_000)) throw new Error("Options history exceeds the safe status scan bound; use the explorer/indexer before funding.");
  for (let offset = BigInt(1); offset <= optionCount; offset += BigInt(1)) {
    const position = await client.readContract({
      address: deployment.market,
      abi: optionsMarketAbi,
      functionName: "options",
      args: [offset],
    });
    if (position[0] === "0x0000000000000000000000000000000000000000") continue;
    if (Number(position[2]) === 0) {
      observedOpenNotional += position[5];
      observedOpenCount += 1;
    } else if (Number(position[2]) === 1) {
      observedReservedPayout += position[8];
    }
  }
  const obligationsReconcile = observedOpenNotional === locked && observedReservedPayout === reserved;
  optionsLine("Outstanding positions", `${observedOpenCount} open · max payout ${formatUnits(observedOpenNotional, decimals)} ${tokenSymbol}`);
  optionsCheck("Open/settled obligations match vault counters", obligationsReconcile);
  if (!obligationsReconcile) throw new Error("Position records and vault collateral obligations do not reconcile.");

  const demoWallet = configuredAddress(process.env.YELTRA_OPTIONS_DEMO_WALLET_TESTNET);
  let demoBalance = BigInt(0);
  let demoAllowance = BigInt(0);
  if (demoWallet) {
    [demoBalance, demoAllowance] = await Promise.all([
      client.readContract({ address: deployment.collateralToken, abi: optionsErc20Abi, functionName: "balanceOf", args: [demoWallet] }),
      client.readContract({ address: deployment.collateralToken, abi: optionsErc20Abi, functionName: "allowance", args: [demoWallet, deployment.market] }),
    ]);
    optionsLine("Demo wallet", demoWallet);
    optionsLine("Wallet yDEVUSD", `${formatUnits(demoBalance, decimals)} ${tokenSymbol}`);
    optionsLine("Wallet market allowance", `${formatUnits(demoAllowance, decimals)} ${tokenSymbol}`);
  } else {
    optionsLine("Demo wallet", "NOT CONFIGURED · no owner/account assumed");
  }

  let plan: ReturnType<typeof calculateOptionsFundingPlan> | undefined;
  if (callNotional && putNotional) {
    plan = calculateOptionsFundingPlan({
      vaultBalance,
      lockedCollateral: locked,
      reservedPayout: reserved,
      callNotional,
      putNotional,
      demoWalletBalance: demoBalance,
    });
    optionsLine("Planned Call notional", `${formatUnits(callNotional, decimals)} ${tokenSymbol}`);
    optionsLine("Planned Put notional", `${formatUnits(putNotional, decimals)} ${tokenSymbol}`);
    optionsLine("Combined max payout", `${formatUnits(plan.combinedNotional, decimals)} ${tokenSymbol}`);
    optionsLine("Exact minimum vault deposit", `${formatUnits(plan.requiredVaultDeposit, decimals)} ${tokenSymbol}`);
    optionsLine("Maximum combined premium budget", `${formatUnits(plan.totalPremiumBudget, decimals)} ${tokenSymbol}`);
    optionsLine("Exact minimum wallet mint", `${formatUnits(plan.requiredDemoMint, decimals)} ${tokenSymbol}`);
    optionsLine("Funding rule", "FULL NOTIONAL BACKING · excludes future premiums");
  } else {
    optionsLine("Demo notionals", "SET CALL AND PUT RAW UNITS TO CALCULATE FUNDING");
  }

  optionsSection("AUTHORIZED SIGNERS AND GAS");
  activePreflightStep = "enumerating active roles and account gas balances";
  const configuredAdmin = configuredAddress(process.env.YELTRA_OPTIONS_FUNDING_ADMIN_TESTNET);
  const configuredPublisher = configuredAddress(process.env.YELTRA_OPTIONS_RATE_PUBLISHER_TESTNET);
  const roleStart = BigInt(process.env.YELTRA_OPTIONS_ACCESS_MANAGER_DEPLOYMENT_BLOCK_TESTNET || "129892824");
  const roleCandidates = [historicalDeploymentSender, demoWallet, configuredAdmin, configuredPublisher]
    .filter((candidate): candidate is Address => Boolean(candidate));
  const roleData = await resolveRoleAccounts(client, indexManager, roleStart, block.number, roleCandidates);
  const expectedAccessManager = configuredAddress(process.env.YELTRA_OPTIONS_ACCESS_MANAGER_TESTNET);
  const managerMatches = !expectedAccessManager || expectedAccessManager.toLowerCase() === indexManager.toLowerCase();
  optionsLine("Access Manager", `${indexManager} · ${managerMatches ? "INDEX / TOKEN / VAULT AUTHORITY" : "CONFIGURED ADDRESS MISMATCH"}`);
  if (!managerMatches) throw new Error("The configured AccessManager differs from the deployed Options wiring.");
  optionsLine("Role-event scan", roleData.logsAvailable ? "COMPLETE" : "LIMITED · RPC LOG RANGE OR READ FAILED");
  if (!roleData.accounts.length) {
    optionsLine("Current Admin / Operator", "NOT RESOLVED · DO NOT SIGN UNTIL ROLE READBACK PASSES");
  }
  for (const signer of roleData.accounts) {
    const labels = [signer.admin ? "CLEAVE_ADMIN" : "", signer.operator ? "CLEAVE_OPERATOR" : ""].filter(Boolean).join(" + ");
    const balance = await client.getBalance({ address: signer.account });
    const historicalWarning = signer.account.toLowerCase() === historicalDeploymentSender.toLowerCase()
      ? " · EXPOSED HISTORICAL ADMIN · DO NOT USE"
      : "";
    optionsLine("Role holder (read-only)", `${signer.account} · ${labels} · ${formatEther(balance)} testnet ETH${historicalWarning}`);
  }
  if (configuredAdmin) {
    const isAdmin = await client.readContract({ address: indexManager, abi: accessAbi, functionName: "hasRole", args: [adminRole, configuredAdmin] });
    const isHistorical = configuredAdmin.toLowerCase() === historicalDeploymentSender.toLowerCase();
    optionsLine("Configured funding admin", `${configuredAdmin} · ${isHistorical ? "EXPOSED HISTORICAL · FORBIDDEN" : isAdmin ? "CLEAVE_ADMIN" : "NOT AUTHORIZED"}`);
  } else {
    optionsLine("Funding admin", "CHOOSE AN ENUMERATED CURRENT CLEAVE_ADMIN");
  }
  if (configuredPublisher) {
    const [isAdmin, isOperator] = await Promise.all([
      client.readContract({ address: indexManager, abi: accessAbi, functionName: "hasRole", args: [adminRole, configuredPublisher] }),
      client.readContract({ address: indexManager, abi: accessAbi, functionName: "hasRole", args: [operatorRole, configuredPublisher] }),
    ]);
    const isHistorical = configuredPublisher.toLowerCase() === historicalDeploymentSender.toLowerCase();
    optionsLine("Configured rate publisher", `${configuredPublisher} · ${isHistorical ? "EXPOSED HISTORICAL · FORBIDDEN" : isAdmin || isOperator ? "AUTHORIZED" : "NOT AUTHORIZED"}`);
  } else {
    optionsLine("Rate publisher", "CHOOSE AN ENUMERATED CURRENT CLEAVE_ADMIN / CLEAVE_OPERATOR");
  }
  if (demoWallet) {
    const buyerEth = await client.getBalance({ address: demoWallet });
    optionsLine("Demo wallet gas", `${formatEther(buyerEth)} Testnet ETH · gas estimate below if actions simulate`);
  }

  optionsSection("READ-ONLY GAS ESTIMATES");
  activePreflightStep = "estimating non-broadcast transactions";
  let gasPrice: bigint | undefined;
  try {
    gasPrice = await client.getGasPrice();
  } catch {
    optionsLine("Gas price", "UNAVAILABLE");
  }
  const printEstimate = async (label: string, operation: () => Promise<bigint>) => {
    try {
      const gas = await operation();
      optionsLine(label, gasPrice === undefined
        ? `${gas} gas · fee quote unavailable`
        : `${gas} gas · ~${formatEther(gas * gasPrice)} Testnet ETH at current gas price`);
    } catch {
      optionsLine(label, "NOT ESTIMABLE FROM CURRENT STATE · no transaction sent");
    }
  };
  const requestedRate = process.env.YELTRA_OPTIONS_UPDATED_RATE_TESTNET?.trim();
  const configuredPublisherIsSafe = configuredPublisher?.toLowerCase() !== historicalDeploymentSender.toLowerCase();
  const publisher = configuredPublisherIsSafe ? configuredPublisher : undefined;
  if (publisher && requestedRate && /^\d+$/.test(requestedRate) && BigInt(requestedRate) <= BigInt(10) ** BigInt(18)) {
    await printEstimate("Publish rate", () => client.estimateContractGas({
      account: publisher,
      address: deployment.rateIndex,
      abi: rateIndexAbi,
      functionName: "publishRate",
      args: [BigInt(requestedRate), BigInt(block.timestamp)],
    }));
  } else {
    optionsLine("Publish rate", "SET AN AUTHORIZED PUBLISHER AND EXPLICIT DEV RATE FIRST");
  }
  const fundingAdmin = configuredAddress(process.env.YELTRA_OPTIONS_FUNDING_ADMIN_TESTNET);
  if (fundingAdmin && plan) {
    const isFundingAdmin = await client.readContract({
      address: indexManager,
      abi: accessAbi,
      functionName: "hasRole",
      args: [adminRole, fundingAdmin],
    });
    if (isFundingAdmin) {
      if (plan.requiredDemoMint > BigInt(0) && demoWallet) {
        await printEstimate("Mint demo-wallet premium buffer", () => client.estimateContractGas({
          account: fundingAdmin,
          address: collateralAddress,
          abi: optionsErc20Abi,
          functionName: "mint",
          args: [demoWallet, plan!.requiredDemoMint],
        }));
      }
      if (plan.requiredVaultDeposit > BigInt(0)) {
        await printEstimate("Mint vault funding", () => client.estimateContractGas({
          account: fundingAdmin,
          address: collateralAddress,
          abi: optionsErc20Abi,
          functionName: "mint",
          args: [fundingAdmin, plan!.requiredVaultDeposit],
        }));
        await printEstimate("Approve vault funding", () => client.estimateContractGas({
          account: fundingAdmin,
          address: collateralAddress,
          abi: optionsErc20Abi,
          functionName: "approve",
          args: [deployment.collateralVault, plan!.requiredVaultDeposit],
        }));
        const fundingAllowance = await client.readContract({
          address: deployment.collateralToken,
          abi: optionsErc20Abi,
          functionName: "allowance",
          args: [fundingAdmin, deployment.collateralVault],
        });
        if (fundingAllowance >= plan.requiredVaultDeposit) {
          await printEstimate("Deposit vault funding", () => client.estimateContractGas({
            account: fundingAdmin,
            address: deployment.collateralVault,
            abi: [{ type: "function", name: "deposit", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] }] as const,
            functionName: "deposit",
            args: [plan!.requiredVaultDeposit],
          }));
        } else {
          optionsLine("Deposit vault funding", "DEFERRED · approve must be mined first");
        }
      }
    } else {
      optionsLine("Funding transactions", "BLOCKED · configured funding account is not CLEAVE_ADMIN");
    }
  } else {
    optionsLine("Funding transactions", "SET AN AUTHORIZED ADMIN AND BOTH EXPLICIT NOTIONALS");
  }

  if (demoWallet) {
    await printEstimate("Wallet approve", () => client.estimateContractGas({
      account: demoWallet,
      address: collateralAddress,
      abi: optionsErc20Abi,
      functionName: "approve",
      args: [deployment.market, plan?.totalPremiumBudget ?? BigInt(1)],
    }));
  } else {
    optionsLine("Wallet approve", "DEMO WALLET NOT CONFIGURED");
  }
  if (fresh && plan && available >= plan.combinedNotional && demoWallet) {
    const expiry = BigInt(block.timestamp) + BigInt(30 * 24 * 60 * 60);
    const quoteInputs: Array<{ label: string; kind: 0 | 1; notional: bigint | undefined }> = [
      { label: "CALL", kind: 0, notional: callNotional },
      { label: "PUT", kind: 1, notional: putNotional },
    ];
    const atTheMoneyQuotes: Array<{ label: string; kind: 0 | 1; notional: bigint; premium: bigint }> = [];
    for (const input of quoteInputs) {
      if (!input.notional) continue;
      const quote = await client.readContract({
        address: deployment.market,
        abi: optionsMarketAbi,
        functionName: "quote",
        args: [input.kind, currentRate, expiry, input.notional],
      });
      optionsLine(`${input.label} ATM quote`, `${formatUnits(quote[0], decimals)} ${tokenSymbol} · read-only · not a locked quote`);
      atTheMoneyQuotes.push({ label: input.label, kind: input.kind, notional: input.notional as bigint, premium: quote[0] });
    }
    const combinedActualPremium = atTheMoneyQuotes.reduce((sum, quote) => sum + quote.premium, BigInt(0));
    optionsLine("Combined current ATM premium", `${formatUnits(combinedActualPremium, decimals)} ${tokenSymbol} · current quote only`);
    const walletCanOpenBoth = demoBalance >= combinedActualPremium && demoAllowance >= combinedActualPremium;
    for (const quote of atTheMoneyQuotes) {
      if (walletCanOpenBoth && available >= plan.combinedNotional) {
        await printEstimate(`${quote.label} open at current rate`, () => client.estimateContractGas({
          account: demoWallet,
          address: deployment.market,
          abi: optionsMarketAbi,
          functionName: "openOption",
          args: [quote.kind, currentRate, expiry, quote.notional, quote.premium, BigInt(block.timestamp) + BigInt(300)],
        }));
      } else {
        optionsLine(`${quote.label} open estimate`, "BLOCKED · combined premium balance/allowance or full two-position vault capacity is missing");
      }
    }
  } else {
    optionsLine("Option purchase", "BLOCKED · rate freshness, explicit notionals, wallet, or vault capacity is missing");
  }

  optionsSection("NEXT SAFE ACTION");
  optionsLine("Command", "bun run options:testnet:preflight");
  optionsLine("Broadcasts", "NONE · READ-ONLY PREFLIGHT ONLY");
}

try {
  await main();
} catch {
  optionsSection("PREFLIGHT RESULT");
  optionsLine("Status", "BLOCKED · LIVE TESTNET READBACK UNAVAILABLE OR INCONSISTENT");
  optionsLine("Failed step", activePreflightStep);
  optionsLine("Detail", shortError());
  process.exitCode = 1;
}

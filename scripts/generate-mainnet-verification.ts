import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type Artifact = {
  metadata: {
    language: string;
    settings: Record<string, unknown>;
    sources: Record<string, unknown>;
    compiler: { version: string };
  };
};

const repoDir = process.cwd();
const contractsDir = join(repoDir, "contracts");
const outputDir = join(repoDir, "verification", "mainnet");

const contracts = [
  "YeltraAccessManager",
  "YeltraRegistry",
  "YeltraAdapterRegistry",
  "YeltraMarketRegistry",
  "YeltraRiskGuard",
  "YeltraExecutionRouter",
  "YeltraLifecycleManager",
  "YeltraLens",
] as const;

mkdirSync(outputDir, { recursive: true });

for (const contractName of contracts) {
  const artifactPath = join(
    contractsDir,
    "out",
    `${contractName}.sol`,
    `${contractName}.json`,
  );
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as Artifact;
  const metadata = artifact.metadata;
  const sources = Object.fromEntries(
    Object.keys(metadata.sources).map((sourceName) => [
      sourceName,
      { content: readFileSync(join(contractsDir, sourceName), "utf8") },
    ]),
  );
  const settings = {
    ...metadata.settings,
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"],
      },
    },
  };
  const standardJsonInput = {
    language: metadata.language,
    sources,
    settings,
  };
  const outputPath = join(outputDir, `${contractName}.json`);
  writeFileSync(outputPath, `${JSON.stringify(standardJsonInput, null, 2)}\n`);
  console.log(`${contractName}: ${outputPath}`);
}

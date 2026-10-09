import {
  centerYeltraText,
  cinematicPause,
  renderTerminalDivider,
  renderYeltraLogo,
  terminalPaint,
  type TerminalColor,
} from "./terminal-branding";

export type OptionsTerminalMode = "deployment" | "funding" | "status" | "rate" | "preflight";

const RULE_WIDTH = 66;
const useColor = Boolean(process.stdout.isTTY);

const titles: Record<OptionsTerminalMode, string> = {
  deployment: "YIELD RATE OPTIONS / TESTNET DEPLOYMENT",
  funding: "YIELD RATE OPTIONS / TESTNET FUNDING",
  status: "YIELD RATE OPTIONS / TESTNET STATUS",
  rate: "YIELD RATE OPTIONS / TESTNET RATE UPDATE",
  preflight: "YIELD RATE OPTIONS / TESTNET PREFLIGHT",
};

export function optionsPaint(value: string, color: TerminalColor): string {
  return terminalPaint(value, color, useColor);
}

export function optionsValueColor(value: string): TerminalColor {
  if (
    value.includes("FAIL") ||
    value.includes("ERROR") ||
    value.includes("REVERT") ||
    value.includes("MISMATCH")
  ) {
    return "red";
  }
  if (
    value.includes("UNAVAILABLE") ||
    value.includes("NOT CONFIGURED") ||
    value.includes("NOT DEPLOYED") ||
    value.includes("REQUIRED") ||
    value.includes("PENDING") ||
    value.includes("ZERO") ||
    value.includes("BLOCKED")
  ) {
    return "yellow";
  }
  if (
    value.includes("PASS") ||
    value.includes("PRESENT") ||
    value.includes("CONFIRMED") ||
    value.includes("SUCCESS") ||
    value.includes("DEPLOYED") ||
    value.includes("FUNDED") ||
    value.includes("FRESH")
  ) {
    return "green";
  }
  return "white";
}

export function optionsLine(label: string, value: string): void {
  const paddedLabel = `${label} `.padEnd(38, " ");
  console.log(
    `${optionsPaint(paddedLabel, "dim")}${optionsPaint(value, optionsValueColor(value))}`,
  );
}

export function optionsSection(title: string): void {
  console.log();
  console.log(optionsPaint(`◆ ${title}`, "yeltraBlue"));
  console.log(renderTerminalDivider(RULE_WIDTH, useColor));
}

export function optionsCheck(
  label: string,
  passed: boolean,
  warning = false,
): void {
  const marker = passed ? "✓" : warning ? "!" : "✕";
  const tone: TerminalColor = passed ? "green" : warning ? "yellow" : "red";
  const state = passed ? "PASS" : warning ? "WARN" : "FAIL";
  console.log(
    `${optionsPaint(`  ${marker}`, tone)} ${optionsPaint(label, "white")} ${optionsPaint(state, tone)}`,
  );
}

export async function optionsHeader(
  mode: OptionsTerminalMode,
  cinematic = false,
): Promise<void> {
  console.log();
  for (const row of renderYeltraLogo(useColor)) {
    console.log(row);
    await cinematicPause(70, cinematic);
  }
  await cinematicPause(260, cinematic);
  console.log();
  console.log(optionsPaint(centerYeltraText(titles[mode]), "dim"));
  console.log(optionsPaint(centerYeltraText("ROBINHOOD CHAIN · 46630"), "dim"));
  console.log(renderTerminalDivider(RULE_WIDTH, useColor));
  console.log(optionsPaint("YIELD RATE OPTIONS · TESTNET DEVELOPMENT", "ice"));
  console.log(renderTerminalDivider(RULE_WIDTH, useColor));
  await cinematicPause(300, cinematic);
}

export async function optionsCinematicStep(
  label: string,
  results: Array<{ text: string; tone: "green" | "yellow" | "red" }>,
  pauseMilliseconds: number,
  cinematic: boolean,
): Promise<void> {
  if (!cinematic) return;
  console.log();
  console.log(optionsPaint(`→ ${label}`, "dim"));
  await cinematicPause(140, true);
  for (const result of results) {
    const marker = result.tone === "green" ? "✓" : result.tone === "yellow" ? "!" : "✕";
    console.log(`${optionsPaint(marker, result.tone)} ${optionsPaint(result.text, "white")}`);
  }
  await cinematicPause(pauseMilliseconds, true);
}

async function main(): Promise<void> {
  const mode = process.argv[2] as OptionsTerminalMode | undefined;
  if (mode !== "deployment" && mode !== "funding" && mode !== "status" && mode !== "rate" && mode !== "preflight") {
    throw new Error("Usage: bun scripts/options-terminal.ts <deployment|funding|status|rate|preflight> [--cinematic]");
  }
  await optionsHeader(mode, process.argv.includes("--cinematic"));
}

if (import.meta.main) await main();

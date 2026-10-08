import type {
  DividendEvent,
  DividendEventStatus,
  DividendSource,
  DividendType,
} from "./dividend-types";

export const ROBINHOOD_CORPORATE_ACTIONS_URL =
  "https://api.robinhood.com/rhj/corporate-actions";
export const ROBINHOOD_STOCK_TOKEN_ASSETS_URL =
  "https://api.robinhood.com/rhj/assets";

export interface RobinhoodStockTokenAsset {
  tokenSymbol: string;
  tokenName: string;
  status: string;
  currentMultiplier: string;
  tokenDecimals: number;
  tokenAddress: `0x${string}`;
  chainId: number;
}

export function normalizeRobinhoodStockTokenAssets(
  raw: unknown,
  chainId = 4663,
): RobinhoodStockTokenAsset[] {
  const payload = record(raw);
  const assets = Array.isArray(payload?.assets) ? payload.assets : [];
  return assets.flatMap((rawAsset): RobinhoodStockTokenAsset[] => {
    const asset = record(rawAsset);
    const deployments = Array.isArray(asset?.deployments) ? asset.deployments : [];
    const deployment = deployments
      .map(record)
      .find((candidate) => numberValue(candidate?.chainId) === chainId);
    const tokenAddress = addressValue(deployment?.contractAddress);
    const tokenSymbol = stringValue(asset?.tokenSymbol);
    const tokenName = stringValue(asset?.tokenName);
    const status = stringValue(asset?.status);
    const currentMultiplier = stringValue(asset?.currentMultiplier);
    const tokenDecimals = numberValue(asset?.tokenDecimals);
    if (
      !deployment || !tokenAddress || !tokenSymbol || !tokenName || !status ||
      !currentMultiplier || tokenDecimals === undefined
    ) return [];
    return [{
      tokenSymbol,
      tokenName,
      status,
      currentMultiplier,
      tokenDecimals,
      tokenAddress,
      chainId,
    }];
  });
}

interface RawRecord {
  [key: string]: unknown;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function record(value: unknown): RawRecord | undefined {
  return value && typeof value === "object" ? value as RawRecord : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function addressValue(value: unknown): `0x${string}` | undefined {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value)
    ? value as `0x${string}`
    : undefined;
}

function dateValue(value: unknown): string | undefined {
  const parts = record(value);
  if (!parts) return stringValue(value);
  const year = numberValue(parts.year);
  const month = numberValue(parts.month);
  const day = numberValue(parts.day);
  if (!year || !month || !day) return undefined;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function normalizeEventStatus(value: unknown): DividendEventStatus | undefined {
  const status = stringValue(value);
  if (status?.endsWith("IN_PROGRESS")) return "IN_PROGRESS";
  if (status?.endsWith("COMPLETED")) return "COMPLETED";
  return undefined;
}

function normalizeEventType(value: unknown): DividendType | undefined {
  const type = stringValue(value);
  if (type?.endsWith("CASH_DIVIDEND")) return "CASH_DIVIDEND";
  if (type?.endsWith("STOCK_DIVIDEND")) return "STOCK_DIVIDEND";
  return undefined;
}

function firstDeployment(value: unknown, chainId: number): { address?: `0x${string}`; chainId: number } {
  const deployments = Array.isArray(value) ? value : [];
  const deployment = deployments
    .map(record)
    .find((item) => numberValue(item?.chainId) === chainId) || record(deployments[0]);
  return {
    address: addressValue(deployment?.contractAddress),
    chainId: numberValue(deployment?.chainId) || chainId,
  };
}

export function normalizeRobinhoodCorporateAction(
  raw: unknown,
  chainId = 4663,
): DividendEvent | undefined {
  const value = record(raw);
  if (!value) return undefined;
  const eventId = stringValue(value.id);
  const type = normalizeEventType(value.type);
  const status = normalizeEventStatus(value.status);
  const tokenSymbol = stringValue(value.tokenSymbol);
  const details = record(value.details);
  const detailKey = type === "CASH_DIVIDEND" ? "cashDividend" : "stockDividend";
  const detail = record(details?.[detailKey]);
  const rate = stringValue(detail?.rate);
  const underlyingSymbol = stringValue(detail?.underlyingSymbol) || tokenSymbol;
  const deployment = firstDeployment(value.deployments, chainId);
  if (!eventId || !type || !status || !tokenSymbol || !rate || !underlyingSymbol) return undefined;
  if (deployment.chainId !== chainId) return undefined;
  return {
    eventId,
    type,
    status,
    tokenSymbol,
    underlyingSymbol,
    rate,
    processDate: dateValue(value.processDate),
    tokenAddress: deployment.address,
    chainId,
    source: "ROBINHOOD_CORPORATE_ACTIONS",
    isSimulation: false,
  };
}

export function dedupeDividendEvents(events: DividendEvent[]): DividendEvent[] {
  return [...new Map(events.map((event) => [event.eventId, event])).values()];
}

export function createSimulationDividendEvent(input: {
  tokenSymbol: string;
  tokenAddress?: `0x${string}`;
  chainId: number;
  processDate: string;
  rate: string;
  eventId?: string;
}): DividendEvent {
  return {
    eventId: input.eventId || `simulation:${input.tokenSymbol.toLowerCase()}:${input.processDate}`,
    type: "CASH_DIVIDEND",
    status: "COMPLETED",
    tokenSymbol: input.tokenSymbol,
    underlyingSymbol: input.tokenSymbol,
    rate: input.rate,
    processDate: input.processDate,
    tokenAddress: input.tokenAddress,
    chainId: input.chainId,
    source: "SIMULATION",
    isSimulation: true,
  };
}

export async function fetchRobinhoodStockTokenAsset(
  input: { tokenSymbol?: string; tokenAddress?: string; chainId?: number },
  fetcher: FetchLike = fetch,
): Promise<RobinhoodStockTokenAsset | undefined> {
  const response = await fetcher(ROBINHOOD_STOCK_TOKEN_ASSETS_URL, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) return undefined;
  const assets = normalizeRobinhoodStockTokenAssets(await response.json(), input.chainId || 4663);
  const expectedSymbol = input.tokenSymbol?.toUpperCase();
  const expectedAddress = input.tokenAddress?.toLowerCase();
  return assets.find((asset) =>
    (!expectedAddress || asset.tokenAddress.toLowerCase() === expectedAddress) &&
    (!expectedSymbol || asset.tokenSymbol.toUpperCase() === expectedSymbol),
  );
}

export async function fetchRobinhoodDividendEvents(
  input: { tokenSymbol?: string; tokenAddress?: string; chainId: number },
  fetcher: FetchLike = fetch,
): Promise<DividendEvent[]> {
  const response = await fetcher(ROBINHOOD_CORPORATE_ACTIONS_URL, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) return [];
  const payload = record(await response.json());
  const actions = Array.isArray(payload?.corpActions) ? payload.corpActions : [];
  const expectedSymbol = input.tokenSymbol?.toUpperCase();
  const expectedAddress = input.tokenAddress?.toLowerCase();
  return dedupeDividendEvents(actions
    .map((action) => normalizeRobinhoodCorporateAction(action, input.chainId))
    .filter((event): event is DividendEvent => Boolean(event))
    .filter((event) => {
      const symbolMatches = !expectedSymbol || event.tokenSymbol.toUpperCase() === expectedSymbol;
      const addressMatches = !expectedAddress || event.tokenAddress?.toLowerCase() === expectedAddress;
      return symbolMatches && addressMatches;
    }));
}

export function sourceLabel(source: DividendSource): string {
  return source === "SIMULATION" ? "DETERMINISTIC TEST DATA" : "ROBINHOOD CORPORATE ACTIONS API";
}

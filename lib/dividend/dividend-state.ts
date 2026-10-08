import { calculateCashDividendAccrual } from "./dividend-accounting";
import { evaluateDividendEligibility } from "./dividend-eligibility";
import type {
  DividendEarnState,
  DividendEvent,
  DividendPosition,
} from "./dividend-types";

const OUTPUT_DECIMALS = 6;

export function buildDividendEarnState(input: {
  position: DividendPosition;
  marketId: string;
  event?: DividendEvent;
  asOf: string;
  enabled?: boolean;
  expectedUnderlying?: `0x${string}`;
  elapsedSeconds?: bigint;
  accrualPeriodSeconds?: bigint;
}): DividendEarnState {
  const base = {
    positionId: input.position.positionId,
    marketId: input.marketId,
    accrued: "0.000000",
    claimable: "0.000000",
    settlementMode: input.event?.isSimulation ? "SIMULATION ONLY" as const : "READ-ONLY" as const,
    claimSettlementEnabled: false as const,
    settlementStatus: "NOT_ENABLED" as const,
  };
  if (!input.event) {
    return {
      ...base,
      eligible: false,
      enabled: false,
      status: "UNAVAILABLE",
      reason: "NO DIVIDEND EVENT DETECTED",
    };
  }
  const eligibility = evaluateDividendEligibility(
    input.position,
    input.event,
    input.marketId,
    input.expectedUnderlying,
  );
  if (!eligibility.eligible || input.position.marketId !== input.marketId) {
    return {
      ...base,
      eligible: false,
      enabled: false,
      status: "UNAVAILABLE",
      dividendType: input.event.type,
      source: input.event.source,
      rate: input.event.rate,
      lastEventId: input.event.eventId,
      lastEventTimestamp: input.event.processDate,
      reason: input.position.marketId !== input.marketId ? "MARKET MAPPING DOES NOT MATCH POSITION" : eligibility.reason,
    };
  }
  if (!input.enabled) {
    return {
      ...base,
      eligible: true,
      enabled: false,
      status: "ELIGIBLE",
      dividendType: input.event.type,
      source: input.event.source,
      rate: input.event.rate,
      lastEventId: input.event.eventId,
      lastEventTimestamp: input.event.processDate,
      reason: "ELIGIBLE TRADING YIELD POSITION REQUIRES EXPLICIT OPT-IN",
    };
  }
  const accrual = calculateCashDividendAccrual({
    positionUnits: BigInt(input.position.ytAmountBaseUnits),
    positionDecimals: input.position.ytDecimals,
    rate: input.event.rate,
    rateDecimals: Math.max(0, (input.event.rate.split(".")[1] || "").length),
    elapsedSeconds: input.elapsedSeconds || BigInt(0),
    accrualPeriodSeconds: input.accrualPeriodSeconds || BigInt(1),
    outputDecimals: OUTPUT_DECIMALS,
  });
  const status = input.event.status === "IN_PROGRESS" || accrual.accruedBaseUnits > BigInt(0)
    ? "PENDING"
    : "ACTIVE";
  return {
    ...base,
    eligible: true,
    enabled: true,
    status,
    dividendType: input.event.type,
    source: input.event.source,
    rate: input.event.rate,
    accrued: accrual.accrued,
    claimable: "0.000000",
    lastEventId: input.event.eventId,
    lastEventTimestamp: input.event.processDate,
    reason: "ACTIVE LONG POSITION MATCHES DIVIDEND EVENT",
  };
}

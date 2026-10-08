import { describe, expect, it } from "bun:test";
import {
  createSimulationDividendEvent,
  dedupeDividendEvents,
  normalizeRobinhoodCorporateAction,
} from "./dividend-source-adapter";
import { evaluateDividendEligibility } from "./dividend-eligibility";
import { calculateCashDividendAccrual } from "./dividend-accounting";
import { buildDividendEarnState } from "./dividend-state";

const NVDA_MARKET_ID = "0x206a5cd00e9ffabb8ca564076b64799a78df19b9";
const NVDA_TOKEN = "0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec";

const event = normalizeRobinhoodCorporateAction({
  id: "0xdividend-1",
  type: "CORPORATE_ACTION_TYPE_CASH_DIVIDEND",
  status: "CORPORATE_ACTION_STATUS_COMPLETED",
  processDate: { year: 2026, month: 10, day: 1 },
  tokenSymbol: "NVDA",
  deployments: [{ contractAddress: NVDA_TOKEN, chainId: 4663 }],
  details: { cashDividend: { underlyingSymbol: "NVDA", rate: "0.25" } },
});

const position = {
  positionId: "position-1",
  marketId: NVDA_MARKET_ID,
  chainId: 4663,
  assetSymbol: "NVDA",
  underlyingTokenAddress: NVDA_TOKEN as `0x${string}`,
  strategy: "long" as const,
  ytAmountBaseUnits: "2000000000000000000",
  ytDecimals: 18,
  openedAt: "2026-09-01T00:00:00.000Z",
  maturityDate: "2026-10-15T00:00:00.000Z",
  status: "active" as const,
};

describe("Dividend Earn development model", () => {
  it("normalizes a Robinhood cash dividend and preserves the event identity", () => {
    expect(event).toMatchObject({
      eventId: "0xdividend-1",
      type: "CASH_DIVIDEND",
      status: "COMPLETED",
      tokenSymbol: "NVDA",
      rate: "0.25",
      source: "ROBINHOOD_CORPORATE_ACTIONS",
      chainId: 4663,
      tokenAddress: NVDA_TOKEN,
    });
    expect(event?.processDate).toBe("2026-10-01");
  });

  it("does not normalize unsupported corporate-action types", () => {
    expect(normalizeRobinhoodCorporateAction({
      id: "split-1",
      type: "CORPORATE_ACTION_TYPE_STOCK_SPLIT",
      status: "CORPORATE_ACTION_STATUS_COMPLETED",
      tokenSymbol: "NVDA",
      details: {},
    })).toBeUndefined();
  });

  it("deduplicates repeated event IDs", () => {
    expect(dedupeDividendEvents([event!, event!])).toHaveLength(1);
  });

  it("requires a long position in the selected market", () => {
    expect(evaluateDividendEligibility(position, event)).toEqual({
      eligible: true,
      reason: "ACTIVE LONG POSITION MATCHES DIVIDEND EVENT",
    });
    expect(evaluateDividendEligibility({ ...position, marketId: "other" }, event, NVDA_MARKET_ID).eligible).toBe(false);
    expect(evaluateDividendEligibility({ ...position, status: "closed" }, event).eligible).toBe(false);
  });

  it("calculates deterministic decimal accrual without floating point drift", () => {
    const result = calculateCashDividendAccrual({
      positionUnits: 2_000000000000000000n,
      positionDecimals: 18,
      rate: "0.25",
      rateDecimals: 2,
      elapsedSeconds: 50n,
      accrualPeriodSeconds: 100n,
      outputDecimals: 6,
    });
    expect(result.grossBaseUnits).toBe(500000n);
    expect(result.accruedBaseUnits).toBe(250000n);
    expect(result.gross).toBe("0.500000");
    expect(result.accrued).toBe("0.250000");
    expect(calculateCashDividendAccrual({
      positionUnits: 2_000000000000000000n,
      positionDecimals: 18,
      rate: "0",
      rateDecimals: 0,
      elapsedSeconds: 50n,
      accrualPeriodSeconds: 100n,
      outputDecimals: 6,
    }).accrued).toBe("0.000000");
  });

  it("builds a pending read-model while keeping settlement disabled", () => {
    const state = buildDividendEarnState({
      position,
      marketId: NVDA_MARKET_ID,
      event,
      asOf: "2026-10-08T00:00:00.000Z",
      enabled: true,
      expectedUnderlying: NVDA_TOKEN as `0x${string}`,
      accrualPeriodSeconds: 100n,
      elapsedSeconds: 50n,
    });
    expect(state).toMatchObject({
      eligible: true,
      enabled: true,
      status: "PENDING",
      dividendType: "CASH_DIVIDEND",
      source: "ROBINHOOD_CORPORATE_ACTIONS",
      rate: "0.25",
      accrued: "0.250000",
      claimable: "0.000000",
      lastEventId: "0xdividend-1",
      settlementMode: "READ-ONLY",
      claimSettlementEnabled: false,
      settlementStatus: "NOT_ENABLED",
    });
    const simulation = createSimulationDividendEvent({
      tokenSymbol: "NVDA",
      chainId: 46630,
      processDate: "2026-10-01",
      rate: "0.25",
    });
    expect(simulation.source).toBe("SIMULATION");
    expect(simulation.isSimulation).toBe(true);
  });
});

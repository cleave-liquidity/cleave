import {
  dedupeDividendEvents,
  normalizeRobinhoodCorporateAction,
  ROBINHOOD_CORPORATE_ACTIONS_URL,
} from "@/lib/dividend/dividend-source-adapter";
import {
  NVDA_DIVIDEND_MARKET_ID,
  NVDA_ROBINHOOD_TOKEN,
} from "@/lib/dividend/dividend-config";
import { ROBINHOOD_CHAIN_ID } from "@/lib/web3/chains";

export async function GET(): Promise<Response> {
  try {
    const response = await fetch(ROBINHOOD_CORPORATE_ACTIONS_URL, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return Response.json(
        { error: "Corporate-action source unavailable." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const payload = (await response.json()) as { corpActions?: unknown };
    const actions = Array.isArray(payload.corpActions) ? payload.corpActions : [];
    const events = dedupeDividendEvents(
      actions
        .map((action) => normalizeRobinhoodCorporateAction(action, ROBINHOOD_CHAIN_ID))
        .filter((event) =>
          Boolean(
            event &&
              event.tokenSymbol === "NVDA" &&
              event.chainId === ROBINHOOD_CHAIN_ID &&
              event.tokenAddress?.toLowerCase() === NVDA_ROBINHOOD_TOKEN.toLowerCase(),
          ),
        )
        .filter((event): event is NonNullable<typeof event> => Boolean(event)),
    );

    return Response.json(
      { marketId: NVDA_DIVIDEND_MARKET_ID, events },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Corporate-action source unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

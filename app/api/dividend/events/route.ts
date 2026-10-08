import {
  dedupeDividendEvents,
  normalizeRobinhoodStockTokenAssets,
  normalizeRobinhoodCorporateAction,
  ROBINHOOD_CORPORATE_ACTIONS_URL,
  ROBINHOOD_STOCK_TOKEN_ASSETS_URL,
} from "@/lib/dividend/dividend-source-adapter";
import { ROBINHOOD_CHAIN_ID } from "@/lib/web3/chains";

async function readSource(url: string): Promise<{ verified: boolean; payload?: unknown }> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok
      ? { verified: true, payload: await response.json() }
      : { verified: false };
  } catch {
    return { verified: false };
  }
}

export async function GET(): Promise<Response> {
  const [assetsResult, eventsResult] = await Promise.all([
    readSource(ROBINHOOD_STOCK_TOKEN_ASSETS_URL),
    readSource(ROBINHOOD_CORPORATE_ACTIONS_URL),
  ]);
  if (!assetsResult.verified && !eventsResult.verified) {
    return Response.json(
      { error: "Robinhood distribution sources are unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const assets = assetsResult.verified
    ? normalizeRobinhoodStockTokenAssets(assetsResult.payload, ROBINHOOD_CHAIN_ID)
    : [];
  const eventPayload = eventsResult.payload;
  const payload = eventPayload && typeof eventPayload === "object"
    ? eventPayload as { corpActions?: unknown }
    : undefined;
  const actions = Array.isArray(payload?.corpActions) ? payload.corpActions : [];
  const events = dedupeDividendEvents(
    actions
      .map((action) => normalizeRobinhoodCorporateAction(action, ROBINHOOD_CHAIN_ID))
      .filter((event): event is NonNullable<typeof event> => Boolean(event))
      .filter((event) => event.chainId === ROBINHOOD_CHAIN_ID && Boolean(event.tokenAddress)),
  );

  return Response.json(
    {
      chainId: ROBINHOOD_CHAIN_ID,
      assets,
      events,
      assetsVerified: assetsResult.verified,
      eventsVerified: eventsResult.verified,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}

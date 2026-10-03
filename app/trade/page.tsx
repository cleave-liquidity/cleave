import Link from "next/link";
import { redirect } from "next/navigation";
import { MarketDetailClient } from "@/components/markets/MarketDetailClient";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { DataModeBadge } from "@/components/layout/DataModeBadge";
import { yieldAdapter } from "@/lib/adapters/mock-adapter";
import { resolveTradeMarket } from "@/lib/markets/trade-market";
import { getConfiguredDataMode } from "@/lib/adapters/config";
import { MAX_SAFE_DISPLAY_AMOUNT } from "@/lib/utils/amounts";

type SearchParams = { [key: string]: string | string[] | undefined };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function parseStrategy(value: string | undefined): "fixed" | "long" | undefined {
  return value === "fixed" || value === "long" ? value : undefined;
}

function parseAmount(value: string | undefined): string | undefined {
  if (!value || value.length > 18) return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= MAX_SAFE_DISPLAY_AMOUNT
    ? String(amount)
    : undefined;
}

export default async function TradePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const requestedId = first(query.market);
  let selection;

  try {
    selection = await resolveTradeMarket(yieldAdapter, requestedId);
  } catch {
    selection = {
      kind: "unavailable" as const,
    };
  }

  if (selection.kind === "selected" || selection.kind === "default") {
    const strategy = parseStrategy(first(query.strategy));
    const amount = parseAmount(first(query.amount));

    if (selection.kind === "selected" && selection.market.id.toLowerCase() !== selection.requestedId.toLowerCase()) {
      const canonicalQuery = new URLSearchParams({ market: selection.market.id });
      if (strategy) canonicalQuery.set("strategy", strategy);
      if (amount) canonicalQuery.set("amount", amount);
      redirect(`/trade?${canonicalQuery.toString()}`);
    }

    return (
      <MarketDetailClient
        market={selection.market}
        initialStrategy={strategy}
        initialAmount={amount}
      />
    );
  }

  return (
    <TradeRouteState
      kind={selection.kind}
      mode={getConfiguredDataMode()}
    />
  );
}

function TradeRouteState({
  kind,
  mode,
}: {
  kind: "invalid-market" | "unavailable";
  mode: "live" | "mock";
}) {
  const invalid = kind === "invalid-market";
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ApplicationBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar isLanding={false} />
        <main id="main-content" className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-10">
          <DataModeBadge mode={mode} />
          <h1 className="mt-6 text-[32px] font-normal tracking-[-0.03em] text-foreground">
            {invalid ? "Market not found" : "Live trading is unavailable"}
          </h1>
          <p className="mt-3 max-w-[520px] text-[15px] leading-6 text-muted">
            {invalid
              ? "Choose a verified market from the Markets page and try again."
              : "The configured market source did not return a verified market. No mock market was substituted."}
          </p>
          <Link href="/markets" className="mt-7 inline-flex min-h-[44px] items-center border border-ice/50 bg-ice/10 px-5 text-[14px] text-ice transition-colors hover:bg-ice/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
            Browse live markets
          </Link>
        </main>
        <Footer />
      </div>
    </div>
  );
}

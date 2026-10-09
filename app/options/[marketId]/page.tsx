import { OptionsMarketClient } from "@/components/options/OptionsMarketClient";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { notFound } from "next/navigation";

export default async function OptionsMarketPage({ params, searchParams }: { params: Promise<{ marketId: string }>; searchParams: Promise<{ optionId?: string }> }) {
  const { marketId } = await params;
  if (marketId !== "testnet-usdg-rate") notFound();
  const query = await searchParams;
  const optionId = query.optionId && /^\d+$/.test(query.optionId) ? BigInt(query.optionId) : undefined;
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ApplicationBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar isLanding={false} />
        <main id="main-content" className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
          <div className="mb-7"><div className="mono text-[11px] uppercase tracking-[0.18em] text-muted-dark">YELTRA / Yield Rate Options</div><p className="mt-2 m-0 text-[13px] text-muted-dark">Direct Testnet development market inspection.</p></div>
          <OptionsMarketClient optionId={optionId} />
        </main>
        <Footer />
      </div>
    </div>
  );
}

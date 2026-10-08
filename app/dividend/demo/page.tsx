import { notFound } from "next/navigation";
import Link from "next/link";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { DividendDemoPanel } from "@/components/dividend/DividendDemoPanel";
import { isDividendDemoStagingEnabled } from "@/lib/dividend/dividend-demo-staging";

export default async function DividendDemoPage() {
  if (!(await isDividendDemoStagingEnabled())) notFound();

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
      <ApplicationBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar isLanding={false} />
        <main id="main-content" className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-5 px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
          <Link href="/markets" className="w-fit text-[13px] text-ice hover:text-white">← Back to Markets</Link>
          <DividendDemoPanel />
        </main>
        <Footer />
      </div>
    </div>
  );
}

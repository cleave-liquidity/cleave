import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function MarketNotFound() {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <Navbar isLanding={false} />
      <div id="main-content" className="flex-grow flex flex-col items-center justify-center gap-4 text-center px-4">
        <h1 className="text-[28px] font-normal text-foreground">
          Market Not Found
        </h1>
        <p className="text-muted text-[15px]">
          The requested yield market does not exist or has been archived.
        </p>
        <Link
          href="/markets"
          className="px-6 py-2.5 bg-foreground text-background font-medium rounded-lg text-[14px]"
        >
          Back to Markets
        </Link>
      </div>
      <Footer />
    </div>
  );
}

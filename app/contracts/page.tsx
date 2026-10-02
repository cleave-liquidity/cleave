import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationBackdrop } from "@/components/layout/ApplicationBackdrop";
import { ContractRegistry } from "@/components/contracts/ContractRegistry";

export default function ContractsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ApplicationBackdrop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar isLanding={false} />
        <main id="main-content" className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-10 sm:px-6 sm:py-16 lg:px-10">
          <ContractRegistry />
        </main>
        <Footer />
      </div>
    </div>
  );
}

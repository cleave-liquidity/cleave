import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import dynamic from "next/dynamic";

// SplashScreen uses useState/useEffect — must be client-only (ssr: false)
const SplashScreen = dynamic(
  () => import("@/components/SplashScreen").then((m) => ({ default: m.SplashScreen })),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Cleave — Yield trading for everyone on Robinhood Chain",
  description:
    "Lock a fixed rate on your USDG, or go long on where yield is heading. Two choices, every number in dollars. Built on Robinhood Chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-background text-foreground min-h-screen selection:bg-amber/30 selection:text-white">
        <Providers>
          {/* Splash runs client-only, on top of everything, unmounts itself when done */}
          <SplashScreen />
          {children}
        </Providers>
      </body>
    </html>
  );
}
